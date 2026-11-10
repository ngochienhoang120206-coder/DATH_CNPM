import React from 'react';

export default function RoomHeader({
  viewMode,
  setViewMode,
  isConnected,
  connectionState = 'connected',
  reconnectAttempt = 0,
  sessionId,
  onSaveSession,
  onLeaveRoom
}) {
  const renderConnectionBadge = () => {
    if (isConnected && connectionState === 'connected') {
      return (
        <div
          data-testid="room-connection-badge"
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600 text-emerald-400 text-xs font-semibold"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Connected (&lt;100ms)</span>
        </div>
      );
    }

    if (connectionState === 'reconnecting') {
      return (
        <div
          data-testid="room-connection-badge"
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500 text-amber-300 text-xs font-semibold"
        >
          <span className="w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
          <span>
            Đang kết nối lại... {reconnectAttempt > 0 ? `(#${reconnectAttempt})` : ''}
          </span>
        </div>
      );
    }

    return (
      <div
        data-testid="room-connection-badge"
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/90 border border-red-500 text-red-300 text-xs font-semibold"
      >
        <span className="w-3 h-3 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
        <span>Đang mất kết nối, đang thử lại...</span>
      </div>
    );
  };

  return (
    <header className="h-14 bg-[#151921] border-b border-gray-800 px-4 flex items-center justify-between gap-3 shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white truncate">
            Real-Time Collaborative Classroom (Session: {String(sessionId || '').slice(0, 8)})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-[#1c212c] p-1 rounded-lg border border-gray-700">
        <button
          type="button"
          onClick={() => setViewMode('half')}
          className={`px-3 py-1 rounded text-xs font-semibold transition ${
            viewMode === 'half'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Split View
        </button>
        <button
          type="button"
          onClick={() => setViewMode('full-whiteboard')}
          className={`px-3 py-1 rounded text-xs font-semibold transition ${
            viewMode === 'full-whiteboard'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🎨 Whiteboard (Full)
        </button>
        <button
          type="button"
          onClick={() => setViewMode('full-code')}
          className={`px-3 py-1 rounded text-xs font-semibold transition ${
            viewMode === 'full-code'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          💻 Code Editor (Full)
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        {renderConnectionBadge()}

        <button
          type="button"
          onClick={onSaveSession}
          className="px-3 py-1.5 rounded-lg bg-[#232834] hover:bg-gray-700 border border-gray-600 text-xs font-semibold text-gray-200 transition"
        >
          💾 Save Session Artifacts
        </button>

        <button
          type="button"
          onClick={onLeaveRoom}
          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition"
        >
          Leave Room
        </button>
      </div>
    </header>
  );
}