import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabricNamespace from 'fabric';

const fabric = fabricNamespace.fabric || fabricNamespace;

const COLORS = ['#1e293b', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const getObjectSignature = (obj) => {
  if (!obj) return '';
  try {
    const raw = typeof obj.toObject === 'function' ? obj.toObject() : obj;
    return JSON.stringify({
      type: raw.type,
      left: Math.round(Number(raw.left) || 0),
      top: Math.round(Number(raw.top) || 0),
      width: Math.round(Number(raw.width) || 0),
      height: Math.round(Number(raw.height) || 0),
      radius: Math.round(Number(raw.radius) || 0),
      stroke: raw.stroke,
      fill: raw.fill,
      text: raw.text || null,
      path: Array.isArray(raw.path) ? raw.path.length : null
    });
  } catch (_e) {
    return '';
  }
};

export default function CollaborativeWhiteboard({ socket, sessionId }) {
  const containerRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const socketRef = useRef(socket);
  const sessionIdRef = useRef(sessionId);
  const isApplyingRemoteRef = useRef(false);
  const renderedSignaturesRef = useRef(new Set());
  const offlineStrokeQueueRef = useRef([]);

  const [activeTool, setActiveTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#1e293b');
  const [brushSize, setBrushSize] = useState(3);

  useEffect(() => {
    socketRef.current = socket;
    sessionIdRef.current = sessionId;
  }, [socket, sessionId]);

  const emitOrQueueStroke = useCallback((fabricObject) => {
    if (!fabricObject) return;
    const sig = getObjectSignature(fabricObject);
    if (sig) renderedSignaturesRef.current.add(sig);

    const activeSocket = socketRef.current;
    if (activeSocket && activeSocket.connected && navigator.onLine !== false) {
      activeSocket.emit('whiteboard:draw', {
        sessionId: sessionIdRef.current,
        fabricObject
      });
    } else {
      offlineStrokeQueueRef.current.push(fabricObject);
    }
  }, []);

  const enlivenAndAddObjects = useCallback((objectsArray = [], clearExisting = false) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    isApplyingRemoteRef.current = true;
    if (clearExisting) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      renderedSignaturesRef.current.clear();
    }

    const validObjects = (Array.isArray(objectsArray) ? objectsArray : []).filter((item) => {
      const sig = getObjectSignature(item);
      if (!sig) return false;
      if (renderedSignaturesRef.current.has(sig)) return false;
      renderedSignaturesRef.current.add(sig);
      return true;
    });

    if (validObjects.length === 0) {
      canvas.renderAll();
      isApplyingRemoteRef.current = false;
      return;
    }

    if (fabric.util && typeof fabric.util.enlivenObjects === 'function') {
      try {
        const maybePromise = fabric.util.enlivenObjects(validObjects, (enlivened) => {
          if (Array.isArray(enlivened)) {
            enlivened.forEach((obj) => canvas.add(obj));
            canvas.renderAll();
          }
          isApplyingRemoteRef.current = false;
        });

        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise
            .then((enlivened) => {
              if (Array.isArray(enlivened)) {
                enlivened.forEach((obj) => canvas.add(obj));
                canvas.renderAll();
              }
              isApplyingRemoteRef.current = false;
            })
            .catch(() => {
              isApplyingRemoteRef.current = false;
            });
        }
        return;
      } catch (_e) {
        isApplyingRemoteRef.current = false;
      }
    }

    isApplyingRemoteRef.current = false;
  }, []);

  // Initialize Fabric.js Canvas once without breaking DOM structure
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return undefined;

    const { clientWidth, clientHeight } = containerRef.current;
    const canvas = new fabric.Canvas(canvasElRef.current, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      width: clientWidth || 800,
      height: clientHeight || 600,
      selection: true
    });

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = brushSize;
    }

    fabricRef.current = canvas;

    const handlePathCreated = (opt) => {
      if (isApplyingRemoteRef.current || !opt?.path) return;
      const serialized = opt.path.toObject();
      emitOrQueueStroke(serialized);
    };

    canvas.on('path:created', handlePathCreated);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && fabricRef.current) {
          fabricRef.current.setDimensions({ width, height });
          fabricRef.current.renderAll();
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      canvas.off('path:created', handlePathCreated);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [emitOrQueueStroke]);

  // Update brush mode and properties when toolbar changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === 'pen' || activeTool === 'eraser';
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = activeTool === 'eraser' ? '#ffffff' : strokeColor;
      canvas.freeDrawingBrush.width = activeTool === 'eraser' ? brushSize * 5 : brushSize;
    }
  }, [activeTool, strokeColor, brushSize]);

  // Bind Socket.io events for real-time drawing and reconnection state reconciliation
  useEffect(() => {
    if (!socket) return undefined;

    const handleRemoteDraw = ({ fabricObject }) => {
      if (!fabricObject) return;
      enlivenAndAddObjects([fabricObject], false);
    };

    const handleRemoteClear = () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      isApplyingRemoteRef.current = true;
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      renderedSignaturesRef.current.clear();
      canvas.renderAll();
      isApplyingRemoteRef.current = false;
    };

    const handleStateSync = ({ whiteboard, replaceCanvas }) => {
      if (!Array.isArray(whiteboard)) return;
      const queuedOffline = [...offlineStrokeQueueRef.current];
      const mergedStrokes = [...whiteboard, ...queuedOffline];

      // Replace canvas cleanly without duplicate strokes
      enlivenAndAddObjects(mergedStrokes, replaceCanvas !== false);

      // Flush any strokes drawn while disconnected
      if (queuedOffline.length > 0 && socket.connected) {
        offlineStrokeQueueRef.current = [];
        queuedOffline.forEach((stroke) => {
          socket.emit('whiteboard:draw', {
            sessionId: sessionIdRef.current,
            fabricObject: stroke
          });
        });
      }
    };

    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:clear', handleRemoteClear);
    socket.on('room:state-sync', handleStateSync);

    return () => {
      socket.off('whiteboard:draw', handleRemoteDraw);
      socket.off('whiteboard:clear', handleRemoteClear);
      socket.off('room:state-sync', handleStateSync);
    };
  }, [socket, enlivenAndAddObjects]);

  const handleAddShape = (shapeType) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setActiveTool('select');
    canvas.isDrawingMode = false;

    let shape = null;
    if (shapeType === 'rect') {
      shape = new fabric.Rect({
        left: 120 + Math.floor(Math.random() * 80),
        top: 120 + Math.floor(Math.random() * 80),
        width: 110,
        height: 75,
        fill: 'transparent',
        stroke: strokeColor,
        strokeWidth: brushSize
      });
    } else if (shapeType === 'circle') {
      shape = new fabric.Circle({
        left: 150 + Math.floor(Math.random() * 80),
        top: 140 + Math.floor(Math.random() * 80),
        radius: 45,
        fill: 'transparent',
        stroke: strokeColor,
        strokeWidth: brushSize
      });
    } else if (shapeType === 'text') {
      shape = new fabric.IText('Label', {
        left: 140,
        top: 140,
        fontSize: 18,
        fill: strokeColor,
        fontFamily: 'sans-serif'
      });
    }

    if (shape) {
      isApplyingRemoteRef.current = true;
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
      isApplyingRemoteRef.current = false;
      emitOrQueueStroke(shape.toObject());
    }
  };

  const handleClearCanvas = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    isApplyingRemoteRef.current = true;
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    renderedSignaturesRef.current.clear();
    offlineStrokeQueueRef.current = [];
    canvas.renderAll();
    isApplyingRemoteRef.current = false;

    socketRef.current?.emit('whiteboard:clear', {
      sessionId: sessionIdRef.current
    });
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-white overflow-hidden select-none">
      {/* Floating Whiteboard Toolbar */}
      <div className="absolute top-10 left-4 z-20 bg-[#1c212c]/95 border border-gray-700 rounded-xl p-2 shadow-xl flex flex-col gap-2 text-white">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition ${
              activeTool === 'select' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
            }`}
            title="Select / Move"
          >
            ↖
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition ${
              activeTool === 'pen' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
            }`}
            title="Freehand Pen"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={() => handleAddShape('rect')}
            className="w-8 h-8 rounded-lg hover:bg-gray-700 flex items-center justify-center text-xs"
            title="Add Rectangle"
          >
            🟦
          </button>
          <button
            type="button"
            onClick={() => handleAddShape('circle')}
            className="w-8 h-8 rounded-lg hover:bg-gray-700 flex items-center justify-center text-xs"
            title="Add Circle"
          >
            🔵
          </button>
          <button
            type="button"
            onClick={() => handleAddShape('text')}
            className="w-8 h-8 rounded-lg hover:bg-gray-700 flex items-center justify-center text-xs font-bold"
            title="Add Text"
          >
            T
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition ${
              activeTool === 'eraser' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
            }`}
            title="Eraser"
          >
            🧽
          </button>
          <button
            type="button"
            onClick={handleClearCanvas}
            className="w-8 h-8 rounded-lg hover:bg-red-600/80 flex items-center justify-center text-xs"
            title="Clear Canvas"
          >
            🧹
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-700">
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setStrokeColor(c);
                  if (activeTool === 'eraser') setActiveTool('pen');
                }}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full border ${
                  strokeColor === c ? 'border-white scale-110' : 'border-transparent'
                }`}
              />
            ))}
          </div>

          <input
            type="range"
            min="1"
            max="12"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-16 accent-blue-500 cursor-pointer"
            title="Stroke Width"
          />
        </div>
      </div>

      <canvas ref={canvasElRef} />
    </div>
  );
}