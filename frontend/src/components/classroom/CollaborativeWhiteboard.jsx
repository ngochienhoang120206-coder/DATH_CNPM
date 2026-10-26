import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';

export default function CollaborativeWhiteboard({ socket, sessionId }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const socketRef = useRef(socket);
  const sessionIdRef = useRef(sessionId);

  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [zoomLevel, setZoomLevel] = useState(1);

  const activeToolRef = useRef(activeTool);
  const colorRef = useRef(color);
  const isDrawingShape = useRef(false);
  const originPos = useRef({ x: 0, y: 0 });
  const currentShape = useRef(null);
  const historyRef = useRef([]);
  const isUndoing = useRef(false);
  const isRemoteDrawing = useRef(false);

  useEffect(() => {
    socketRef.current = socket;
    sessionIdRef.current = sessionId;
  }, [socket, sessionId]);

  const emitCanvasObject = useCallback((fabricObj) => {
    if (!isRemoteDrawing.current && socketRef.current && fabricObj) {
      socketRef.current.emit('whiteboard:draw', {
        sessionId: sessionIdRef.current,
        fabricObject: fabricObj.toJSON()
      });
    }
  }, []);

  const updateCursor = useCallback((canvas, tool, brushColor) => {
    if (!canvas) return;
    if (tool === 'pen' || tool === 'eraser') {
      const size = tool === 'eraser' ? 25 : 6;
      const cursorColor = tool === 'eraser' ? '#ffffff' : brushColor;
      const strokeColor = tool === 'eraser' ? '#000000' : 'none';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${cursorColor}" stroke="${strokeColor}" stroke-width="1"/>
                  </svg>`;
      const cursorUrl = `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') ${size / 2} ${size / 2}, auto`;
      canvas.freeDrawingCursor = cursorUrl;
      canvas.defaultCursor = cursorUrl;
      canvas.hoverCursor = cursorUrl;
    } else if (tool === 'select') {
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
    } else if (tool === 'pan') {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
    } else {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
    }
  }, []);

  useEffect(() => {
    activeToolRef.current = activeTool;
    colorRef.current = color;
    if (fabricRef.current) {
      if (activeTool === 'pen') fabricRef.current.freeDrawingBrush.color = color;
      updateCursor(fabricRef.current, activeTool, color);
    }
  }, [activeTool, color, updateCursor]);

  const saveState = useCallback(() => {
    if (!isUndoing.current && fabricRef.current) {
      if (historyRef.current.length > 30) historyRef.current.shift();
      historyRef.current.push(JSON.stringify(fabricRef.current.toJSON()));
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length > 1) {
      isUndoing.current = true;
      historyRef.current.pop();
      const prevState = historyRef.current[historyRef.current.length - 1];
      fabricRef.current.loadFromJSON(prevState, () => {
        fabricRef.current.renderAll();
        isUndoing.current = false;
        updateCursor(fabricRef.current, activeToolRef.current, colorRef.current);
      });
    } else if (historyRef.current.length === 1) {
      isUndoing.current = true;
      historyRef.current = [];
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = '#ffffff';
      saveState();
      isUndoing.current = false;
    }
  }, [updateCursor, saveState]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: wrapperRef.current ? wrapperRef.current.clientWidth : 800,
      height: wrapperRef.current ? wrapperRef.current.clientHeight : 600,
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: false
    });

    canvas.freeDrawingBrush.width = 3;
    fabricRef.current = canvas;
    saveState();
    updateCursor(canvas, 'pen', '#000000');

    const resizeObserver = new ResizeObserver(() => {
      if (fabricRef.current && wrapperRef.current) {
        fabricRef.current.setWidth(wrapperRef.current.clientWidth);
        fabricRef.current.setHeight(wrapperRef.current.clientHeight);
        fabricRef.current.calcOffset();
        fabricRef.current.renderAll();
      }
    });

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    canvas.on('mouse:wheel', function (opt) {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      setZoomLevel(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on('path:created', (e) => {
      saveState();
      emitCanvasObject(e.path);
    });

    canvas.on('object:modified', (e) => {
      saveState();
      emitCanvasObject(e.target);
    });

    canvas.on('mouse:down', (o) => {
      const tool = activeToolRef.current;
      if (tool === 'pan') {
        canvas.isDragging = true;
        canvas.selection = false;
        canvas.lastPosX = o.e.clientX;
        canvas.lastPosY = o.e.clientY;
        return;
      }

      if (tool === 'rect' || tool === 'circle') {
        isDrawingShape.current = true;
        const pointer = canvas.getPointer(o.e);
        originPos.current = { x: pointer.x, y: pointer.y };

        if (tool === 'rect') {
          currentShape.current = new fabric.Rect({
            left: originPos.current.x,
            top: originPos.current.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: colorRef.current,
            strokeWidth: 3,
            selectable: false
          });
        } else {
          currentShape.current = new fabric.Circle({
            left: originPos.current.x,
            top: originPos.current.y,
            radius: 0,
            fill: 'transparent',
            stroke: colorRef.current,
            strokeWidth: 3,
            selectable: false,
            originX: 'center',
            originY: 'center'
          });
        }
        canvas.add(currentShape.current);
      }
    });

    canvas.on('mouse:move', (o) => {
      if (canvas.isDragging && activeToolRef.current === 'pan') {
        const e = o.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - canvas.lastPosX;
        vpt[5] += e.clientY - canvas.lastPosY;
        canvas.requestRenderAll();
        canvas.lastPosX = e.clientX;
        canvas.lastPosY = e.clientY;
        return;
      }

      if (!isDrawingShape.current || !currentShape.current) return;
      const pointer = canvas.getPointer(o.e);
      const tool = activeToolRef.current;
      if (tool === 'rect') {
        currentShape.current.set({
          width: Math.abs(pointer.x - originPos.current.x),
          height: Math.abs(pointer.y - originPos.current.y)
        });
        if (pointer.x < originPos.current.x) currentShape.current.set({ left: pointer.x });
        if (pointer.y < originPos.current.y) currentShape.current.set({ top: pointer.y });
      } else if (tool === 'circle') {
        currentShape.current.set({
          radius: Math.max(
            Math.abs(pointer.x - originPos.current.x),
            Math.abs(pointer.y - originPos.current.y)
          )
        });
      }
      canvas.renderAll();
    });

    canvas.on('mouse:up', () => {
      if (canvas.isDragging && activeToolRef.current === 'pan') {
        canvas.setViewportTransform(canvas.viewportTransform);
        canvas.isDragging = false;
      }
      if (isDrawingShape.current && currentShape.current) {
        currentShape.current.setCoords();
        saveState();
        emitCanvasObject(currentShape.current);
      }
      isDrawingShape.current = false;
      currentShape.current = null;
    });

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
    };
  }, [updateCursor, saveState, emitCanvasObject]);
  
  useEffect(() => {
    if (!socket) return;

    const handleRemoteDraw = ({ fabricObject }) => {
      if (!fabricRef.current || !fabricObject) return;
      isRemoteDrawing.current = true;
      fabric.util.enlivenObjects([fabricObject], (objects) => {
        objects.forEach((obj) => {
          obj.set({ selectable: activeToolRef.current === 'select' });
          fabricRef.current.add(obj);
        });
        fabricRef.current.renderAll();
        saveState();
        isRemoteDrawing.current = false;
      });
    };

    const handleRemoteClear = () => {
      if (!fabricRef.current) return;
      isRemoteDrawing.current = true;
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = '#ffffff';
      fabricRef.current.renderAll();
      saveState();
      isRemoteDrawing.current = false;
    };

    const handleStateSync = ({ whiteboard }) => {
      if (!fabricRef.current || !Array.isArray(whiteboard) || whiteboard.length === 0) return;
      isRemoteDrawing.current = true;
      fabric.util.enlivenObjects(whiteboard, (objects) => {
        objects.forEach((obj) => fabricRef.current.add(obj));
        fabricRef.current.renderAll();
        saveState();
        isRemoteDrawing.current = false;
      });
    };

    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:clear', handleRemoteClear);
    socket.on('room:state-sync', handleStateSync);

    return () => {
      socket.off('whiteboard:draw', handleRemoteDraw);
      socket.off('whiteboard:clear', handleRemoteClear);
      socket.off('room:state-sync', handleStateSync);
    };
  }, [socket, saveState]);

  const toggleTool = (tool) => {
    setActiveTool(tool);
    const canvas = fabricRef.current;
    if (!canvas) return;

    const makeSelectable = (isSelectable) => {
      canvas.getObjects().forEach((obj) => {
        obj.set('selectable', isSelectable);
        obj.set('evented', isSelectable);
      });
    };

    if (tool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = 3;
      canvas.selection = false;
      makeSelectable(false);
    } else if (tool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = '#ffffff';
      canvas.freeDrawingBrush.width = 25;
      canvas.selection = false;
      makeSelectable(false);
    } else if (tool === 'select') {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      makeSelectable(true);
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      makeSelectable(false);
    }
  };

  const handleZoom = (factor) => {
    if (!fabricRef.current) return;
    let newZoom = fabricRef.current.getZoom() * factor;
    if (newZoom > 20) newZoom = 20;
    if (newZoom < 0.1) newZoom = 0.1;
    fabricRef.current.zoomToPoint(
      { x: fabricRef.current.width / 2, y: fabricRef.current.height / 2 },
      newZoom
    );
    setZoomLevel(newZoom);
  };

  const clearCanvas = () => {
    if (fabricRef.current) {
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = '#ffffff';
      saveState();
      socket?.emit('whiteboard:clear', { sessionId });
    }
  };

  return (
    <div ref={wrapperRef} className="w-full h-full relative overflow-hidden bg-gray-200">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-[#1c212c] text-white px-2 py-1.5 rounded-lg shadow-xl border border-gray-700 gap-1.5 flex-wrap justify-center w-max max-w-full">
        <button
          onClick={() => toggleTool('select')}
          className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            activeTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'
          }`}
          title="Select"
        >
          👆
        </button>
        <button
          onClick={() => toggleTool('pan')}
          className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            activeTool === 'pan' ? 'bg-blue-600' : 'hover:bg-gray-700'
          }`}
          title="Move Canvas"
        >
          ✋
        </button>
        <button
          onClick={() => toggleTool('pen')}
          className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            activeTool === 'pen' ? 'bg-blue-600' : 'hover:bg-gray-700'
          }`}
          title="Pen"
        >
          ✏️
        </button>
        <button
          onClick={() => toggleTool('eraser')}
          className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            activeTool === 'eraser' ? 'bg-gray-500' : 'hover:bg-gray-700'
          }`}
          title="Eraser"
        >
          🧽
        </button>

        <div className="w-px h-5 bg-gray-600 mx-0.5" />

        <button
          onClick={() => toggleTool('rect')}
          className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            activeTool === 'rect' ? 'bg-blue-600' : 'hover:bg-gray-700'
          }`}
          title="Rectangle"
        >
          🟦
        </button>
        <button
          onClick={() => toggleTool('circle')}
          className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            activeTool === 'circle' ? 'bg-blue-600' : 'hover:bg-gray-700'
          }`}
          title="Circle"
        >
          🔵
        </button>
        <div className="flex items-center px-1 hover:bg-gray-700 rounded py-1 cursor-pointer">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-5 h-5 border-0 bg-transparent cursor-pointer rounded overflow-hidden"
            title="Change Color"
          />
        </div>

        <div className="w-px h-5 bg-gray-600 mx-0.5" />

        <div className="flex items-center bg-[#232834] rounded px-1">
          <button
            onClick={() => handleZoom(0.8)}
            className="p-1 hover:text-blue-400 text-xs transition-colors"
            title="Zoom Out"
          >
            🔍-
          </button>
          <span className="text-[10px] w-8 text-center text-gray-400">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => handleZoom(1.2)}
            className="p-1 hover:text-blue-400 text-xs transition-colors"
            title="Zoom In"
          >
            🔍+
          </button>
        </div>

        <div className="w-px h-5 bg-gray-600 mx-0.5" />

        <button
          onClick={handleUndo}
          className="px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-700 flex items-center gap-1"
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={clearCanvas}
          className="px-2 py-1.5 rounded text-xs font-medium text-red-400 hover:bg-gray-700 hover:text-red-300 flex items-center gap-1"
          title="Clear Canvas"
        >
          🧹
        </button>
      </div>

      <div className="w-full h-full">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
}