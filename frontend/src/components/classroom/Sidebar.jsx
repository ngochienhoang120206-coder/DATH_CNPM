import React from 'react';

const DEFAULT_MEMBERS = [
  { id: '1', fullName: 'Nguyen Hoang Minh', role: 'student', active: true, bg: 'bg-blue-500' },
  { id: '2', fullName: 'Vu Minh Phu', role: 'student', active: true, bg: 'bg-green-500' },
  { id: '3', fullName: 'Nguyen Le Duy', role: 'student', active: true, bg: 'bg-orange-500' },
  { id: '4', fullName: 'Hoang Ngoc Hien [Host]', role: 'instructor', active: true, bg: 'bg-red-500' }
];

export default function Sidebar({ isExpanded, setIsExpanded, participants = [], remoteCursors = {} }) {
  const members = participants.length > 0 ? participants : DEFAULT_MEMBERS;

  return (
    <div
      className={`bg-[#1c212c] border-l border-gray-700 h-full flex flex-col shadow-lg transition-all duration-300 shrink-0 ${
        isExpanded ? 'w-[280px]' : 'w-14'
      }`}
    >
      {isExpanded ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-[#151921] h-14 shrink-0">
            <span className="font-bold text-xs tracking-wider text-gray-300">
              👥 PARTICIPANTS ({members.length})
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="w-6 h-6 hover:bg-gray-700 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="Collapse sidebar"
            >
              ▶
            </button>
          </div>

          <div className="p-3 overflow-y-auto flex-1 space-y-3">
            {members.map((m, idx) => {
              const name = m.fullName || m.name || 'User';
              const initial = name.charAt(0).toUpperCase();
              const cursorInfo = remoteCursors[m.id];

              return (
                <div key={m.id || idx} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-8 h-8 rounded-full ${
                        m.bg || 'bg-blue-600'
                      } text-xs flex items-center justify-center font-bold text-white relative`}
                    >
                      {initial}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[#1c212c] rounded-full" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-200">{name}</span>
                      <span className="text-[10px] text-gray-400 capitalize">{m.role || 'student'}</span>
                      {cursorInfo && (
                        <span className="text-[10px] text-blue-400">
                          Editing Line {cursorInfo.lineNumber}, Col {cursorInfo.column}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center py-3 gap-4 overflow-hidden">
          <button
            onClick={() => setIsExpanded(true)}
            className="w-8 h-8 bg-[#232834] border border-gray-600 hover:bg-gray-700 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            title="Expand sidebar"
          >
            ◀
          </button>
          <div className="w-8 h-0.5 bg-gray-700 rounded my-1" />
          {members.map((m, idx) => {
            const name = m.fullName || m.name || 'U';
            return (
              <div key={m.id || idx} className="relative cursor-pointer" title={name}>
                <span className="w-8 h-8 rounded-full bg-blue-600 text-xs flex items-center justify-center font-bold text-white border border-gray-600">
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[#1c212c] rounded-full" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}