import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectClassroomSocket } from '../../services/socket';
import RoomHeader from './RoomHeader';
import CollaborativeWhiteboard from './CollaborativeWhiteboard';
import CollaborativeCodeEditor from './CollaborativeCodeEditor';
import Sidebar from './Sidebar';

export default function RoomLayout({ courseId: propCourseId, sessionId: propSessionId, onClose }) {
  const params = useParams();
  const navigate = useNavigate();

  const courseId = propCourseId || params.courseId || 'demo-course-id';
  const sessionId = propSessionId || params.sessionId || courseId;

  const [viewMode, setViewMode] = useState('half');
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [codeSnapshot, setCodeSnapshot] = useState('');
  const [notesSnapshot, setNotesSnapshot] = useState('');

  const containerRef = useRef(null);

  useEffect(() => {
    let activeSocket = null;

    connectClassroomSocket()
      .then((s) => {
        activeSocket = s;
        setSocket(s);

        s.on('connect', () => {
          setIsConnected(true);
          s.emit('room:join', { sessionId, courseId });
        });

        s.on('disconnect', () => {
          setIsConnected(false);
        });

        s.on('room:participants', (list) => {
          if (Array.isArray(list)) setParticipants(list);
        });

        s.on('room:user-joined', (user) => {
          if (!user?.id) return;
          setParticipants((prev) => {
            if (prev.some((p) => p.id === user.id)) return prev;
            return [...prev, user];
          });
        });

        s.on('room:state-sync', ({ notes }) => {
          if (typeof notes === 'string') setNotesSnapshot(notes);
        });

        s.on('notes:update', ({ notes }) => {
          if (typeof notes === 'string') setNotesSnapshot(notes);
        });

        s.on('code:awareness', (data) => {
          if (data?.userId && data?.cursor) {
            setRemoteCursors((prev) => ({
              ...prev,
              [data.userId]: { ...data.cursor, fullName: data.fullName }
            }));
          }
        });
      })
      .catch(() => {
        setIsConnected(false);
      });

    return () => {
      activeSocket?.disconnect();
    };
  }, [sessionId, courseId]);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotesSnapshot(val);
    socket?.emit('notes:update', { sessionId, notes: val });
  };

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

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newLeftWidth > 20 && newLeftWidth < 80) setLeftWidth(newLeftWidth);
    },
    [isDragging]
  );

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

  const handleSaveSession = () => {
    socket?.emit('room:end-session', {
      sessionId,
      codeSnapshot,
      notesSnapshot
    });
    alert('Session artifacts (Whiteboard, Code, Notes) saved successfully!');
  };

  const handleLeaveRoom = () => {
    socket?.disconnect();
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-[#11151c] text-white overflow-hidden font-sans">
      <RoomHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        isConnected={isConnected}
        sessionId={sessionId}
        onSaveSession={handleSaveSession}
        onLeaveRoom={handleLeaveRoom}
      />

      <div ref={containerRef} className="flex flex-1 overflow-hidden p-3 gap-1 relative">
        {isDragging && <div className="absolute inset-0 z-50 cursor-col-resize" />}

        {viewMode !== 'full-code' && (
          <div
            style={viewMode === 'full-whiteboard' ? { flex: 1 } : { width: `${leftWidth}%` }}
            className="shrink-0 bg-white rounded-lg overflow-hidden shadow-lg border border-gray-700 relative"
          >
            <div className="absolute top-4 left-4 z-10 text-[11px] font-bold text-gray-500 pointer-events-none">
              {viewMode === 'full-whiteboard'
                ? 'WHITEBOARD CANVAS (Fabric.js - Full Workspace)'
                : 'WHITEBOARD CANVAS (Fabric.js)'}
            </div>
            <CollaborativeWhiteboard socket={socket} sessionId={sessionId} />
          </div>
        )}

        {viewMode === 'half' && (
          <div
            className="w-2 flex flex-col justify-center items-center cursor-col-resize group hover:bg-gray-700 rounded transition-colors z-10 shrink-0"
            onMouseDown={handleMouseDown}
          >
            <div className="w-1 h-1 bg-gray-500 rounded-full mb-1 group-hover:bg-blue-400" />
            <div className="w-1 h-1 bg-gray-500 rounded-full mb-1 group-hover:bg-blue-400" />
            <div className="w-1 h-1 bg-gray-500 rounded-full group-hover:bg-blue-400" />
          </div>
        )}

        {viewMode !== 'full-whiteboard' && (
          <div className="flex-1 flex flex-col gap-3 min-w-0 pr-1">
            <div
              className={`${
                viewMode === 'full-code' ? 'h-[70%]' : 'h-[65%]'
              } rounded-lg overflow-hidden shadow-lg border border-gray-700 bg-[#1e1e1e] relative transition-all duration-300`}
            >
              <CollaborativeCodeEditor
                socket={socket}
                sessionId={sessionId}
                onCodeChange={setCodeSnapshot}
              />
            </div>

            <div className="flex-1 bg-[#1c212c] rounded-lg border border-gray-700 flex flex-col shadow-lg overflow-hidden">
              <div className="p-2.5 text-xs font-bold tracking-wider border-b border-gray-700 flex items-center justify-between bg-[#151921]">
                <span>📝 SHARED SESSION NOTES</span>
                <span className="text-[10px] text-gray-400 font-normal">Saved with session artifacts</span>
              </div>
              <textarea
                value={notesSnapshot}
                onChange={handleNotesChange}
                placeholder="Write collaborative session notes, algorithm explanations, or review feedback here..."
                className="flex-1 w-full bg-[#161a23] text-gray-200 p-3 text-xs outline-none resize-none"
              />
            </div>
          </div>
        )}

        <Sidebar
          isExpanded={isSidebarExpanded}
          setIsExpanded={setIsSidebarExpanded}
          participants={participants}
          remoteCursors={remoteCursors}
        />
      </div>
    </div>
  );
}