import React from 'react';

export default function RoomHeader({
  viewMode,
  setViewMode,
  isConnected,
  sessionId,
  onSaveSession,
  onLeaveRoom
}) {
  return (
    <div className="h-14 bg-[#151921] border-b border-gray-700 flex justify-between items-center px-4 shrink-0">
      <div className="font-bold text-sm tracking-wide text-white">
        Real-Time Collaborative Classroom (Session: {sessionId ? sessionId.slice(0, 8) : 'Demo'})
      </div>

      <div className="flex bg-[#1c212c] rounded p-1 gap-1 border border-gray-700">
        <button
          onClick={() => setViewMode('half')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            viewMode === 'half' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          ◫ Split View
        </button>
        <button
          onClick={() => setViewMode('full-whiteboard')}
          className={`px-3 py-1.5 rounded text-xs transition-colors ${
            viewMode === 'full-whiteboard' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          ◻ Whiteboard (Full)
        </button>
        <button
          onClick={() => setViewMode('full-code')}
          className={`px-3 py-1.5 rounded text-xs transition-colors ${
            viewMode === 'full-code' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          ⌨ Code Editor (Full)
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border ${
            isConnected
              ? 'bg-green-900 text-green-400 border-green-700'
              : 'bg-yellow-900 text-yellow-400 border-yellow-700'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
          {isConnected ? 'Connected (<100ms)' : 'Offline / Local Mode'}
        </div>
        <button
          onClick={onSaveSession}
          className="text-gray-300 hover:text-white text-xs border border-gray-600 bg-[#232834] px-4 py-1.5 rounded"
        >
          💾 Save Session Artifacts
        </button>
        <button
          onClick={onLeaveRoom}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-xs font-medium"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}