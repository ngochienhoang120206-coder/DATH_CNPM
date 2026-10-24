import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

export default function CollaborativeWhiteboard({ socket, sessionId }) {
  const canvasEl = useRef(null);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasEl.current, { isDrawingMode: true, width: 500, height: 360 });
    canvas.on('path:created', (e) => {
      socket?.emit('whiteboard:draw', { sessionId, fabricObject: e.path.toJSON() });
    });

    socket?.on('whiteboard:draw', ({ fabricObject }) => {
      fabric.util.enlivenObjects([fabricObject], (objects) => {
        objects.forEach((obj) => canvas.add(obj));
        canvas.renderAll();
      });
    });

    return () => canvas.dispose();
  }, [socket, sessionId]);

  return (
    <div style={{ border: '1px solid #ddd' }}>
      <canvas ref={canvasEl} />
    </div>
  );
}