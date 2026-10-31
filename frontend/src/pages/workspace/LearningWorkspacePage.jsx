import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { demoCourses } from '../courses/courseData';

function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : url;
    }
    if (parsed.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function LearningWorkspacePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const fetchWorkspaceData = async () => {
      try {
        let courseData = null;
        if (courseId?.startsWith('demo-')) {
          courseData = demoCourses.find((c) => c.id === courseId);
        } else {
          const res = await api.get(`/courses/${courseId}`);
          courseData = res.data?.data;
        }

        if (!courseData) throw new Error('Course not found');
        if (!active) return;

        setCourse(courseData);
        const firstLesson = courseData.chapters?.[0]?.lessons?.[0] || null;

        if (user && !courseId?.startsWith('demo-')) {
          try {
            const enrollRes = await api.get('/enrollments/me');
            const myEnrollments = enrollRes.data?.data || [];
            const found = myEnrollments.find((e) => e.course_id === courseId);
            if (found) {
              setEnrollment(found);
              if (found.last_lesson_id) {
                const allLessons = (courseData.chapters || []).flatMap((ch) => ch.lessons || []);
                const lastVisited = allLessons.find((l) => l.id === found.last_lesson_id);
                setActiveLesson(lastVisited || firstLesson);
              } else {
                setActiveLesson(firstLesson);
              }
            } else {
              setActiveLesson(firstLesson);
            }
          } catch {
            setActiveLesson(firstLesson);
          }
        } else {
          setActiveLesson(firstLesson);
        }
      } catch {
        const fallback = demoCourses.find((c) => c.id === courseId) || demoCourses[0];
        if (active && fallback) {
          setCourse(fallback);
          setActiveLesson(fallback.chapters?.[0]?.lessons?.[0] || null);
        } else if (active) {
          setError('Unable to load course workspace.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchWorkspaceData();
    return () => {
      active = false;
    };
  }, [courseId, user]);

  const allLessons = useMemo(
    () => (course?.chapters || []).flatMap((ch) => ch.lessons || []),
    [course]
  );

  const progressPercent = useMemo(() => {
    if (enrollment?.progress_percent !== undefined) {
      return Number(enrollment.progress_percent);
    }
    if (!allLessons.length) return 0;
    return Math.round((completedLessonIds.size / allLessons.length) * 100);
  }, [enrollment, completedLessonIds, allLessons]);

  const handleEnrollNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post(`/courses/${courseId}/enroll`);
      setEnrollment(res.data?.data);
      setNotice('Enrolled successfully! Your learning progress is now tracked.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll in course.');
    }
  };

  const handleMarkCompleted = async () => {
    if (!activeLesson) return;
    setSavingProgress(true);
    setNotice('');
    setError('');

    try {
      if (!courseId?.startsWith('demo-') && user) {
        if (!enrollment) {
          await api.post(`/courses/${courseId}/enroll`);
        }
        const res = await api.post(`/lessons/${activeLesson.id}/progress`, {
          is_completed: true,
          last_position_seconds: 600
        });
        if (res.data?.data) {
          setEnrollment(res.data.data);
        }
      }
      setCompletedLessonIds((prev) => new Set([...prev, activeLesson.id]));
      setNotice(`Completed "${activeLesson.title}"!`);

      const currentIndex = allLessons.findIndex((l) => l.id === activeLesson.id);
      if (currentIndex >= 0 && currentIndex + 1 < allLessons.length) {
        setActiveLesson(allLessons[currentIndex + 1]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update lesson progress.');
    } finally {
      setSavingProgress(false);
    }
  };

  const activeMaterial = activeLesson?.materials?.[0] || {
    type: activeLesson?.type || 'text',
    url: activeLesson?.url || 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
    content:
      activeLesson?.content ||
      `# ${activeLesson?.title || 'Lesson Notes'}\n\nWelcome to this lesson. Review the key concepts below and join the **Live Collaborative Classroom** to practice on the whiteboard and code editor.`
  };

  const sanitizedHtml = useMemo(() => {
    if (activeMaterial.type !== 'text') return '';
    const rawHtml = marked.parse(activeMaterial.content || '');
    return DOMPurify.sanitize(rawHtml);
  }, [activeMaterial]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#11151c] text-white flex items-center justify-center text-sm">
        Loading learning workspace...
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-[#11151c] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 rounded text-xs font-semibold">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const embedUrl = activeMaterial.type === 'video' ? getYoutubeEmbedUrl(activeMaterial.url) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#0f131a] text-gray-100 font-sans">
      {/* Top Header */}
      <header className="h-14 bg-[#151921] border-b border-gray-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to={`/courses/${course.id}`} className="text-xs text-gray-400 hover:text-white">
            ← Course Overview
          </Link>
          <span className="text-gray-700">|</span>
          <h1 className="text-sm font-bold text-white truncate max-w-md">{course.title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Progress:</span>
            <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            <span className="font-bold text-green-400">{progressPercent}%</span>
          </div>

          <Link
            to={`/room/${course.id}`}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded transition-colors"
          >
            ⚡ Join Live Classroom
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Curriculum Sidebar */}
        <aside className="w-80 bg-[#151921] border-r border-gray-800 overflow-y-auto p-4 shrink-0">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Course Curriculum ({allLessons.length} Lessons)
          </div>

          {!enrollment && user && !courseId?.startsWith('demo-') && (
            <div className="mb-4 p-3 rounded bg-blue-950/60 border border-blue-800 text-xs">
              <p className="text-blue-200 mb-2">Enroll to save your lesson progress.</p>
              <button
                onClick={handleEnrollNow}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-white"
              >
                Enroll Now
              </button>
            </div>
          )}

          <div className="space-y-4">
            {(course.chapters || []).map((chapter, cIdx) => (
              <div key={chapter.id} className="border border-gray-800 rounded-lg overflow-hidden">
                <div className="bg-[#1c212c] px-3 py-2 text-xs font-semibold text-gray-200">
                  Chapter {cIdx + 1}: {chapter.title}
                </div>
                <div className="divide-y divide-gray-800/60">
                  {(chapter.lessons || []).map((lesson, lIdx) => {
                    const isSelected = activeLesson?.id === lesson.id;
                    const isDone =
                      completedLessonIds.has(lesson.id) ||
                      enrollment?.last_lesson_id === lesson.id ||
                      progressPercent >= 100;
                    const matType = lesson.type || lesson.materials?.[0]?.type || 'video';

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setActiveLesson(lesson);
                          setNotice('');
                        }}
                        className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                            : 'hover:bg-[#1c212c] text-gray-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="text-gray-500 mr-1.5">
                            {cIdx + 1}.{lIdx + 1}
                          </span>
                          {lesson.title}
                        </div>
                        <span className="text-[10px] shrink-0 text-gray-400">
                          {isDone ? '✅' : matType === 'video' ? '▷' : '▤'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Lesson Viewer */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {notice && (
              <div className="p-3 rounded bg-green-950/70 border border-green-700 text-green-300 text-xs">
                {notice}
              </div>
            )}
            {error && (
              <div className="p-3 rounded bg-red-950/70 border border-red-700 text-red-300 text-xs">
                {error}
              </div>
            )}

            {activeLesson ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-blue-400 font-semibold">
                      {activeMaterial.type === 'video' ? 'Video Lecture' : 'Reading Material'}
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">{activeLesson.title}</h2>
                  </div>

                  <button
                    onClick={handleMarkCompleted}
                    disabled={savingProgress}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
                  >
                    {savingProgress ? 'Saving...' : '✓ Mark Lesson Completed'}
                  </button>
                </div>

                {activeMaterial.type === 'video' ? (
                  <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-gray-800 shadow-lg">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title={activeLesson.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={activeMaterial.url} controls className="w-full h-full" />
                    )}
                  </div>
                ) : (
                  <article
                    className="prose prose-invert max-w-none bg-[#151921] p-6 rounded-xl border border-gray-800 text-sm leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-20 text-gray-400 text-sm">
                Select a lesson from the curriculum sidebar to start learning.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}