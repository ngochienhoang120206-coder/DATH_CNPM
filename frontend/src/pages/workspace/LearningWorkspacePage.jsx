// frontend/src/pages/workspace/LearningWorkspacePage.jsx (Issue #9 - Phú, tích hợp #14 & #15 của Minh)
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { connectClassroomSocket } from '../../services/socket';
import { renderSafeMarkdown } from '../../utils/sanitize';
import CollaborativeWhiteboard from '../../components/classroom/CollaborativeWhiteboard';
import CollaborativeCodeEditor from '../../components/classroom/CollaborativeCodeEditor';

export default function LearningWorkspacePage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [showLiveRoom, setShowLiveRoom] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    api.get(`/courses/${courseId}`).then((res) => {
      const courseData = res.data.data;
      setCourse(courseData);
      const firstLesson = courseData?.chapters?.[0]?.lessons?.[0] || null;
      setActiveLesson(firstLesson);
    });
  }, [courseId]);

  useEffect(() => {
    if (!showLiveRoom) {
      socket?.disconnect();
      setSocket(null);
      return;
    }
    let activeSocket;
    connectClassroomSocket()
      .then((s) => {
        activeSocket = s;
        s.emit('room:join', { sessionId: courseId, courseId });
        setSocket(s);
      })
      .catch((err) => console.error('Socket connection failed:', err));

    return () => activeSocket?.disconnect();
  }, [showLiveRoom, courseId]);

  const handleEnrollToggle = async () => {
    if (isEnrolled) {
      await api.delete(`/courses/${courseId}/enroll`);
      setIsEnrolled(false);
    } else {
      await api.post(`/courses/${courseId}/enroll`);
      setIsEnrolled(true);
    }
  };

  const handleMarkCompleted = async (lessonId) => {
    await api.put(`/progress/${lessonId}`, {
      courseId,
      isCompleted: true,
      lastPositionSeconds: 0
    });
    if (!completedLessonIds.includes(lessonId)) {
      const updated = [...completedLessonIds, lessonId];
      setCompletedLessonIds(updated);
      const allLessons = course?.chapters?.flatMap((ch) => ch.lessons) || [];
      if (allLessons.length > 0) {
        setProgressPercent(Math.round((updated.length / allLessons.length) * 100));
      }
    }
  };

  if (!course) return <p style={{ padding: 24 }}>Loading workspace...</p>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar: Thanh tiến độ & Danh sách chương/bài học (Issue #9 - Phú) */}
      <aside style={{ width: 300, borderRight: '1px solid #ddd', padding: 16 }}>
        <h3>{course.title}</h3>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Progress: {progressPercent}%</div>
          <div style={{ width: '100%', background: '#eee', height: 8, borderRadius: 4 }}>
            <div style={{ width: `${progressPercent}%`, background: '#28a745', height: '100%', borderRadius: 4 }} />
          </div>
        </div>

        <button onClick={handleEnrollToggle} style={{ width: '100%', marginBottom: 16 }}>
          {isEnrolled ? 'Leave Course' : 'Enroll Course'}
        </button>

        {course.chapters?.map((chapter) => (
          <div key={chapter.id} style={{ marginBottom: 12 }}>
            <strong>{chapter.title}</strong>
            <ul style={{ listStyle: 'none', paddingLeft: 8, marginTop: 6 }}>
              {chapter.lessons?.map((lesson) => (
                <li
                  key={lesson.id}
                  onClick={() => setActiveLesson(lesson)}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    background: activeLesson?.id === lesson.id ? '#f0f4ff' : 'transparent',
                    borderRadius: 4
                  }}
                >
                  <span>{completedLessonIds.includes(lesson.id) ? '✅ ' : '⬜ '}</span>
                  {lesson.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      {/* Khu vực nội dung bài học & Phòng học cộng tác thời gian thực */}
      <main style={{ flex: 1, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>{activeLesson?.title || 'Select a lesson'}</h2>
          <button onClick={() => setShowLiveRoom(!showLiveRoom)}>
            {showLiveRoom ? 'Close Real-Time Classroom' : 'Join Real-Time Collaborative Room'}
          </button>
        </div>

        {/* Nội dung Video Iframe và Text Markdown (Issue #9 - Phú) */}
        {activeLesson && (
          <section style={{ marginBottom: 24 }}>
            {activeLesson.materials?.map((mat) => (
              <div key={mat.id} style={{ marginBottom: 16 }}>
                {mat.type === 'video' && mat.url && (
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      src={mat.url}
                      title={mat.title || 'Lesson Video'}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      frameBorder="0"
                      allowFullScreen
                    />
                  </div>
                )}
                {mat.type === 'text' && mat.content && (
                  <div
                    onScroll={(e) => {
                      const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 5;
                      if (bottom) handleMarkCompleted(activeLesson.id);
                    }}
                    dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(mat.content) }}
                  />
                )}
              </div>
            ))}
            <button onClick={() => handleMarkCompleted(activeLesson.id)}>
              Mark Lesson as Completed
            </button>
          </section>
        )}

        {/* Khu vực nhúng Bảng trắng (#14) và Code Editor (#15) của Minh */}
        {showLiveRoom && (
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
            <CollaborativeWhiteboard socket={socket} sessionId={courseId} />
            <CollaborativeCodeEditor socket={socket} sessionId={courseId} />
          </section>
        )}
      </main>
    </div>
  );
}