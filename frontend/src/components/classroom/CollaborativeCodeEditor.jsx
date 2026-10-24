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

  return <Editor height="360px" defaultLanguage="javascript" defaultValue="// Collaborative Pair Programming" onMount={handleEditorDidMount} />;
}