import React from 'react';

export default function Sidebar({ isExpanded, setIsExpanded }) {
  // Thành viên giả lập
  const members = [
    { id: 1, name: "Nguyễn Hoàng Minh (Bạn)", role: "", active: true, avatar: "M", bg: "bg-blue-500", text: "text-blue-400" },
    { id: 2, name: "Vũ Minh Phú", role: "", active: true, avatar: "P", bg: "bg-green-500", text: "text-green-400" },
    { id: 3, name: "Nguyễn Lê Duy", role: "", active: false, avatar: "D", bg: "bg-orange-500", text: "text-orange-400" },
    { id: 4, name: "Hoàng Văn A [Host]", note: "Giảng viên phụ trách", role: "host", active: true, avatar: "H", bg: "bg-red-500", text: "text-red-400" },
  ];

  return (
    <div 
      className={`bg-[#1c212c] border-l border-gray-700 h-full flex flex-col shadow-lg transition-all duration-300 ${
        isExpanded ? 'w-[300px]' : 'w-14'
      }`}
    >
      {/* EXPANDED */}
      {isExpanded ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header & Nút Thu Nhỏ */}
          <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-[#151921] h-14 shrink-0">
            <span className="font-bold text-xs tracking-wider text-gray-300">👥 THÀNH VIÊN TRONG PHÒNG ({members.length})</span>
            <button 
              onClick={() => setIsExpanded(false)} 
              className="w-6 h-6 hover:bg-gray-700 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="Thu nhỏ thanh bên"
            >
              ▶
            </button>
          </div>

          {/* Danh sách */}
          <div className="p-3 overflow-y-auto max-h-[45%] border-b border-gray-700 space-y-3 shrink-0">
            {members.map(m => (
              <div key={m.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full ${m.bg} text-xs flex items-center justify-center font-bold text-white relative`}>
                    {m.avatar}
                    {m.active && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[#1c212c] rounded-full" />
                    )}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-200">{m.name}</span>
                    {m.note && <span className="text-[10px] text-orange-400 font-medium">{m.note}</span>}
                  </div>
                </div>
                {/* Dấu ba chấm */}
                <button className="text-gray-500 hover:text-white text-xs px-1">⋮</button>
              </div>
            ))}
          </div>

          {/* CHAT */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#161a23]">
            <div className="p-3 text-xs font-bold tracking-wider border-b border-gray-700 flex items-center gap-2 shrink-0 bg-[#151921] text-gray-300">
              💬 KHUNG CHAT TRAO ĐỔI
            </div>
            
            {/* Giả lập */}
            <div className="flex-grow p-3 overflow-y-auto space-y-4 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-green-500 text-[10px] flex items-center justify-center font-bold">P</span>
                  <strong className="text-xs text-green-400">Vũ Minh Phú</strong>
                  <span className="text-[10px] text-gray-500">10:40 AM</span>
                </div>
                <p className="ml-7 text-xs text-gray-300">test</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-[10px] flex items-center justify-center font-bold">M</span>
                  <strong className="text-xs text-blue-400">Nguyễn Hoàng Minh</strong>
                  <span className="text-[10px] text-gray-500">10:41 AM</span>
                </div>
                <p className="ml-7 text-xs text-gray-300">test</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-red-500 text-[10px] flex items-center justify-center font-bold">H</span>
                  <strong className="text-xs text-red-400">Hoàng Ngọc Hiển [Host]</strong>
                  <span className="text-[10px] text-gray-500">10:42 AM</span>
                </div>
                <p className="ml-7 text-xs text-gray-300">test</p>
              </div>
            </div>

            {/* Chat input */}
            <div className="p-3 border-t border-gray-700 bg-[#151921] shrink-0">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nhập tin nhắn..." 
                  className="flex-grow bg-[#232834] border border-gray-600 rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 text-gray-200" 
                />
                <button className="bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded text-xs font-semibold">Gửi</button>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* COLLAPSED */
        <div className="flex-1 flex flex-col items-center py-3 gap-4 overflow-hidden">
          {/* Nút Mở rộng */}
          <button 
            onClick={() => setIsExpanded(true)} 
            className="w-8 h-8 bg-[#232834] border border-gray-600 hover:bg-gray-700 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            title="Mở rộng thanh bên"
          >
            ◀
          </button>
          
          <div className="w-8 h-0.5 bg-gray-700 rounded my-1" />

          {/* Chỉ hiển thị Avatar */}
          {members.map(m => (
            <div key={m.id} className="relative cursor-pointer group" title={m.name}>
              <span className={`w-8 h-8 rounded-full ${m.bg} text-xs flex items-center justify-center font-bold text-white border border-gray-600 transition-transform duration-150 active:scale-95`}>
                {m.avatar}
              </span>
              {m.active && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[#1c212c] rounded-full" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}