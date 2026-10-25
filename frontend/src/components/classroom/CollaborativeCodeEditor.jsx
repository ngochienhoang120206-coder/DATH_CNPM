import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

export default function CollaborativeCodeEditor({ socket, sessionId }) {
  const bindingRef = useRef(null);

  const handleEditorDidMount = (editor) => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('monaco');
    bindingRef.current = new MonacoBinding(ytext, editor.getModel(), new Set([editor]));

    ydoc.on('update', (update) => {
      socket?.emit('code:yjs-update', { sessionId, update: Array.from(update) });
    });

    socket?.on('code:yjs-update', ({ update }) => {
      Y.applyUpdate(ydoc, new Uint8Array(update));
    });
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#1e1e1e] overflow-hidden rounded-lg">
      
      {}
      <div className="bg-[#1c212c] text-gray-400 text-xs flex justify-between items-center border-b border-gray-700 h-10">
        <div className="flex h-full">
          {}
          <div className="flex items-center gap-2 px-4 h-full bg-[#1e1e1e] text-gray-200 border-r border-gray-700 cursor-pointer">
            <span className="font-medium">main.cpp</span>
            <span className="hover:text-red-400 cursor-pointer text-[10px] ml-1">✕</span>
          </div>
          
          {}
          <div className="flex items-center px-4 h-full hover:bg-[#2a2f3a] cursor-pointer border-r border-gray-700 transition-colors">
            <span className="text-gray-500 hover:text-gray-300 font-medium">+ New tab</span>
          </div>
        </div>
        
        {}
        <div className="px-4 flex items-center cursor-pointer hover:text-white text-gray-400 transition-colors">
          <span>Ngôn ngữ: C++ ▼</span>
        </div>
      </div>
      
      {}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          defaultLanguage="cpp"
          theme="vs-dark"
          defaultValue={`#include <iostream>\n\nint main() {\n    std::cout << "Hello World!" << std::endl;\n    return 0;\n}`}
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