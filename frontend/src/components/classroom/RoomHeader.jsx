import React from 'react';

export default function RoomHeader({ viewMode, setViewMode }) {
  return (
    <div className="h-14 bg-[#151921] border-b border-gray-700 flex justify-between items-center px-4">
      <div className="font-bold text-sm tracking-wide text-white">
        Cấu trúc dữ liệu & Giải thuật (Room #101)
      </div>
      
      <div className="flex bg-[#1c212c] rounded p-1 gap-1 border border-gray-700">
        <button onClick={() => setViewMode('half')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'half' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
          ◫ Chia đôi
        </button>
        <button onClick={() => setViewMode('full-whiteboard')} className={`px-3 py-1.5 rounded text-xs transition-colors ${viewMode === 'full-whiteboard' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
          ◻ Bảng (Full)
        </button>
        <button onClick={() => setViewMode('full-code')} className={`px-3 py-1.5 rounded text-xs transition-colors ${viewMode === 'full-code' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
          ⌨ Code (Full)
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-green-900 text-green-400 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border border-green-700">
          <span className="w-2 h-2 rounded-full bg-green-400"></span> Connected (24ms)
        </div>
        <button className="text-gray-300 hover:text-white text-xs border border-gray-600 bg-[#232834] px-4 py-1.5 rounded">💾 Lưu bài học</button>
        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-xs font-medium">Rời phòng</button>
      </div>
    </div>
  );
}