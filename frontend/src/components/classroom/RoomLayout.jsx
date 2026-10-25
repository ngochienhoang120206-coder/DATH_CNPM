import React, { useState, useRef, useEffect, useCallback } from 'react';
import RoomHeader from './RoomHeader';
import CollaborativeWhiteboard from './CollaborativeWhiteboard';
import CollaborativeCodeEditor from './CollaborativeCodeEditor';
import Sidebar from './Sidebar';

export default function RoomLayout() {
  const [viewMode, setViewMode] = useState('half');
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false); 
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const containerRef = useRef(null);

  const handleMouseDown = () => {
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newLeftWidth > 20 && newLeftWidth < 80) setLeftWidth(newLeftWidth);
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#11151c] text-white overflow-hidden font-sans">
      <RoomHeader viewMode={viewMode} setViewMode={setViewMode} />
      
      <div ref={containerRef} className="flex flex-1 overflow-hidden p-3 gap-1 relative">
        {isDragging && <div className="absolute inset-0 z-50 cursor-col-resize" />}

        {viewMode !== 'full-code' && (
          <div style={viewMode === 'full-whiteboard' ? { flex: 1 } : { width: `${leftWidth}%` }} className="shrink-0 bg-white rounded-lg overflow-hidden shadow-lg border border-gray-700 relative">
            <div className="absolute top-4 left-4 z-10 text-[11px] font-bold text-gray-500 pointer-events-none">
              {viewMode === 'full-whiteboard' ? 'WHITEBOARD CANVAS (Fabric.js - Full Workspace)' : 'WHITEBOARD CANVAS (Fabric.js)'}
            </div>
            <CollaborativeWhiteboard />
          </div>
        )}

        {viewMode === 'half' && (
          <div className="w-2 flex flex-col justify-center items-center cursor-col-resize group hover:bg-gray-700 rounded transition-colors z-10 shrink-0" onMouseDown={handleMouseDown}>
            <div className="w-1 h-1 bg-gray-500 rounded-full mb-1 group-hover:bg-blue-400"></div>
            <div className="w-1 h-1 bg-gray-500 rounded-full mb-1 group-hover:bg-blue-400"></div>
            <div className="w-1 h-1 bg-gray-500 rounded-full group-hover:bg-blue-400"></div>
          </div>
        )}

        {viewMode !== 'full-whiteboard' && (
          <div className="flex-1 flex flex-col gap-3 min-w-0 pr-1">
            <div className={`${viewMode === 'full-code' ? 'h-[70%]' : 'h-[60%]'} rounded-lg overflow-hidden shadow-lg border border-gray-700 bg-[#1e1e1e] relative transition-all duration-300`}>
              <CollaborativeCodeEditor />
            </div>
            
            <div className="flex-1 bg-[#1c212c] rounded-lg border border-gray-700 flex flex-col shadow-lg overflow-hidden">
              <div className="p-3 text-xs font-bold tracking-wider border-b border-gray-700 flex items-center gap-2">
                💬 KHUNG CHAT TRAO ĐỔI
              </div>
              <div className="flex-grow p-4 overflow-y-auto space-y-4 text-sm bg-[#161a23]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-xs flex items-center justify-center font-bold">P</span>
                    <strong className="text-green-400">Vũ Minh Phú</strong><span className="text-[10px] text-gray-500">10:40 AM</span>
                  </div>
                  <p className="ml-8 text-gray-300">test</p>
                </div>
              </div>
              <div className="p-3 border-t border-gray-700 bg-[#151921]">
                <div className="flex gap-2">
                  <input type="text" placeholder="Nhập tin nhắn..." className="flex-1 bg-[#232834] border border-gray-600 rounded px-3 py-1.5 text-xs outline-none focus:border-blue-500" />
                  <button className="bg-blue-500 hover:bg-blue-600 px-4 py-1.5 rounded text-xs font-semibold">Gửi</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      </div>
    </div>
  );
}