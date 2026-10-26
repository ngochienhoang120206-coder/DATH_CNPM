import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

const LANGUAGE_FILES = {
  cpp: 'main.cpp',
  javascript: 'index.js',
  python: 'solution.py'
};

export default function CollaborativeCodeEditor({ socket, sessionId, onCodeChange }) {
  const [language, setLanguage] = useState('cpp');
  const editorRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const socketRef = useRef(socket);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    socketRef.current = socket;
    sessionIdRef.current = sessionId;
  }, [socket, sessionId]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');

    if (ytext.length === 0) {
      ytext.insert(0, '#include <iostream>\n\nint main() {\n    std::cout << "Hello World!" << std::endl;\n    return 0;\n}');
    }

    bindingRef.current = new MonacoBinding(ytext, editor.getModel(), new Set([editor]));
    onCodeChange?.(ytext.toString());

    ydoc.on('update', (_update, origin) => {
      onCodeChange?.(ytext.toString());
      if (origin !== 'remote' && socketRef.current) {
        const fullState = Y.encodeStateAsUpdate(ydoc);
        socketRef.current.emit('code:yjs-update', {
          sessionId: sessionIdRef.current,
          update: Array.from(fullState)
        });
      }
    });

    editor.onDidChangeCursorPosition((e) => {
      socketRef.current?.emit('code:awareness', {
        sessionId: sessionIdRef.current,
        userId: socketRef.current.id,
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column
        }
      });
    });
  };

  useEffect(() => {
    if (!socket) return;

    const applyRemoteYjs = (rawUpdate) => {
      if (!ydocRef.current || !rawUpdate) return;
      const uint8 = Array.isArray(rawUpdate)
        ? new Uint8Array(rawUpdate)
        : typeof rawUpdate === 'string'
        ? new Uint8Array(JSON.parse(rawUpdate))
        : new Uint8Array(Object.values(rawUpdate));
      Y.applyUpdate(ydocRef.current, uint8, 'remote');
    };

    const handleYjsUpdate = ({ update }) => applyRemoteYjs(update);
    const handleStateSync = ({ yjsState }) => {
      if (yjsState) applyRemoteYjs(yjsState);
    };

    socket.on('code:yjs-update', handleYjsUpdate);
    socket.on('room:state-sync', handleStateSync);

    return () => {
      socket.off('code:yjs-update', handleYjsUpdate);
      socket.off('room:state-sync', handleStateSync);
    };
  }, [socket]);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  return (
    <div className="flex flex-col w-full h-full bg-[#1e1e1e] overflow-hidden rounded-lg">
      <div className="bg-[#1c212c] text-gray-400 text-xs flex justify-between items-center border-b border-gray-700 h-10 shrink-0">
        <div className="flex h-full">
          <div className="flex items-center gap-2 px-4 h-full bg-[#1e1e1e] text-gray-200 border-r border-gray-700">
            <span className="font-medium">{LANGUAGE_FILES[language]}</span>
          </div>
        </div>

        <div className="px-4 flex items-center gap-2 text-gray-300">
          <span>Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-[#232834] border border-gray-600 rounded px-2 py-1 text-xs text-white outline-none"
          >
            <option value="cpp">C++</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </div>
      </div>

      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            padding: { top: 16 }
          }}
        />
      </div>
    </div>
  );
}