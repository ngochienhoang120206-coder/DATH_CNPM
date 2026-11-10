import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

const LANGUAGE_FILES = {
  cpp: 'main.cpp',
  javascript: 'index.js',
  python: 'solution.py'
};

const DEFAULT_CODE =
  '#include <iostream>\n\nint main() {\n    std::cout << "Hello World!" << std::endl;\n    return 0;\n}';

export default function CollaborativeCodeEditor({ socket, sessionId, onCodeChange }) {
  const [language, setLanguage] = useState('cpp');
  const editorRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const socketRef = useRef(socket);
  const sessionIdRef = useRef(sessionId);
  const pendingSyncRef = useRef(null);
  const hasDirtyOfflineEditsRef = useRef(false);

  useEffect(() => {
    socketRef.current = socket;
    sessionIdRef.current = sessionId;
  }, [socket, sessionId]);

  const applyRemoteYjs = useCallback(
    (rawUpdate, isFullStateSync = false) => {
      if (!rawUpdate) return;
      if (!ydocRef.current) {
        pendingSyncRef.current = rawUpdate;
        return;
      }
      try {
        const arr =
          typeof rawUpdate === 'string'
            ? JSON.parse(rawUpdate)
            : Array.isArray(rawUpdate)
            ? rawUpdate
            : Object.values(rawUpdate);
        const uint8 = new Uint8Array(arr);

        const ytext = ydocRef.current.getText('monaco');
        if (isFullStateSync && !hasDirtyOfflineEditsRef.current && ytext.toString() === DEFAULT_CODE) {
          ydocRef.current.transact(() => {
            ytext.delete(0, ytext.length);
          }, 'remote');
        }

        Y.applyUpdate(ydocRef.current, uint8, 'remote');
        onCodeChange?.(ytext.toString());

        // If user typed while offline, push merged CRDT state back to server after state-sync
        if (
          isFullStateSync &&
          hasDirtyOfflineEditsRef.current &&
          socketRef.current?.connected
        ) {
          hasDirtyOfflineEditsRef.current = false;
          const mergedState = Y.encodeStateAsUpdate(ydocRef.current);
          socketRef.current.emit('code:yjs-update', {
            sessionId: sessionIdRef.current,
            update: Array.from(mergedState),
            codeSnapshot: ytext.toString()
          });
        }
      } catch (err) {
        console.error('Failed to apply Yjs update:', err);
      }
    },
    [onCodeChange]
  );

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');

    bindingRef.current = new MonacoBinding(ytext, editor.getModel(), new Set([editor]));

    if (pendingSyncRef.current) {
      applyRemoteYjs(pendingSyncRef.current, true);
      pendingSyncRef.current = null;
    } else if (ytext.length === 0) {
      ydoc.transact(() => {
        ytext.insert(0, DEFAULT_CODE);
      }, 'remote');
    }

    onCodeChange?.(ytext.toString());

    ydoc.on('update', (_update, origin) => {
      const currentCode = ytext.toString();
      onCodeChange?.(currentCode);

      if (origin !== 'remote') {
        const fullState = Y.encodeStateAsUpdate(ydoc);
        if (socketRef.current && socketRef.current.connected && navigator.onLine !== false) {
          hasDirtyOfflineEditsRef.current = false;
          socketRef.current.emit('code:yjs-update', {
            sessionId: sessionIdRef.current,
            update: Array.from(fullState),
            codeSnapshot: currentCode
          });
        } else {
          hasDirtyOfflineEditsRef.current = true;
        }
      }
    });

    editor.onDidChangeCursorPosition((e) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('code:awareness', {
          sessionId: sessionIdRef.current,
          cursor: {
            lineNumber: e.position.lineNumber,
            column: e.position.column
          }
        });
      }
    });
  };

  useEffect(() => {
    if (!socket) return undefined;

    const handleYjsUpdate = ({ update }) => applyRemoteYjs(update, false);
    const handleStateSync = ({ yjsState }) => {
      if (yjsState) {
        applyRemoteYjs(yjsState, true);
      } else if (hasDirtyOfflineEditsRef.current && ydocRef.current && socket.connected) {
        hasDirtyOfflineEditsRef.current = false;
        const fullState = Y.encodeStateAsUpdate(ydocRef.current);
        socket.emit('code:yjs-update', {
          sessionId: sessionIdRef.current,
          update: Array.from(fullState),
          codeSnapshot: ydocRef.current.getText('monaco').toString()
        });
      }
    };

    socket.on('code:yjs-update', handleYjsUpdate);
    socket.on('room:state-sync', handleStateSync);

    return () => {
      socket.off('code:yjs-update', handleYjsUpdate);
      socket.off('room:state-sync', handleStateSync);
    };
  }, [socket, applyRemoteYjs]);

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