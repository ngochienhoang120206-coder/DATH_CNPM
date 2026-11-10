import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { renderSafeMarkdown } from '../../utils/sanitize';
import NotificationBell from '../../components/interaction/NotificationBell';
import LessonInteractionSection from '../../components/interaction/LessonInteractionSection';

export default function LearningWorkspacePage() {
  const { courseId } = useParams();
  const { user: authUser } = useAuth() || {};

  const [user, setUser] = useState(authUser || null);
  const [course, setCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [progressPercent, setProgressPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [banner, setBanner] = useState('');

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      return;
    }
    api
      .get('/users/profile')
      .then((res) => {
        if (res.data?.data) setUser(res.data.data);
      })
      .catch(() => {});
  }, [authUser]);

  const loadWorkspaceData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const courseRes = await api.get(`/courses/${courseId}`);
      const courseData = courseRes.data?.data;
      setCourse(courseData);

      const allLessons = [];
      (courseData?.chapters || []).forEach((ch) => {
        (ch.lessons || []).forEach((les) => {
          allLessons.push(les);
        });
      });

      let resumeLessonId = null;
      try {
        const enrollRes = await api.get('/enrollments/me');
        const list = Array.isArray(enrollRes.data?.data) ? enrollRes.data.data : [];
        const matched = list.find((e) => e.course_id === courseId);
        if (matched) {
          setProgressPercent(Math.round(Number(matched.progress_percent) || 0));
          resumeLessonId = matched.last_lesson_id;
          if (Array.isArray(matched.progress)) {
            setCompletedLessonIds(
              new Set(matched.progress.filter((p) => p.is_completed).map((p) => p.lesson_id))
            );
          }
        }
      } catch (_e) {
        // Ignore if not logged in
      }

      if (allLessons.length > 0) {
        const initialLesson =
          allLessons.find((l) => l.id === resumeLessonId) || allLessons[0];
        setActiveLesson(initialLesson);
      }
    } catch (_err) {
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleMarkCompleted = async () => {
    if (!activeLesson || marking) return;
    setMarking(true);
    try {
      const res = await api.post(`/lessons/${activeLesson.id}/progress`, {
        is_completed: true,
        last_position_seconds: 120
      });
      const updatedPercent = res.data?.data?.progress_percent;
      if (updatedPercent !== undefined) {
        setProgressPercent(Math.round(Number(updatedPercent)));
      } else {
        setProgressPercent(100);
      }
      setCompletedLessonIds((prev) => new Set([...prev, activeLesson.id]));
      setBanner(`Completed ${activeLesson.title}!`);
    } catch (_err) {
      setCompletedLessonIds((prev) => new Set([...prev, activeLesson.id]));
      setBanner(`Completed ${activeLesson.title}!`);
    } finally {
      setMarking(false);
    }
  };

  const totalLessons = (course?.chapters || []).reduce(
    (sum, ch) => sum + (ch.lessons?.length || 0),
    0
  );

  const videoMaterial = (activeLesson?.materials || []).find((m) => m.type === 'video');
  const textMaterials = (activeLesson?.materials || []).filter((m) => m.type === 'text');
  const isCurrentCompleted = activeLesson ? completedLessonIds.has(activeLesson.id) : false;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Workspace Header with Notification Bell */}
      <header className="h-14 bg-[#111827] border-b border-slate-800 px-5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to={`/courses/${courseId}`}
            className="text-xs text-slate-400 hover:text-white transition shrink-0"
          >
            ← Course Overview
          </Link>
          <h1 className="text-sm font-bold text-white truncate">
            {course?.title || 'Learning Workspace'}
          </h1>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-400">Progress:</span>
            <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            <span className="font-bold text-emerald-400">{progressPercent}%</span>
          </div>

          <Link
            to={`/courses/${courseId}/assessments`}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            📝 Assessments
          </Link>

          <Link
            to={`/room/${courseId}`}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow"
          >
            ⚡ Join Live Classroom
          </Link>

          <NotificationBell dark />
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Curriculum Sidebar */}
        <aside className="w-full lg:w-80 bg-[#111827] border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto p-4 shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            COURSE CURRICULUM ({totalLessons} LESSONS)
          </div>

          <div className="space-y-4">
            {(course?.chapters || []).map((chapter, cIdx) => (
              <div key={chapter.id} className="space-y-1.5">
                <div className="text-xs font-bold text-slate-300 px-2 py-1">
                  Chapter {cIdx + 1}: {chapter.title}
                </div>
                <div className="space-y-1">
                  {(chapter.lessons || []).map((lesson) => {
                    const isSelected = activeLesson?.id === lesson.id;
                    const isDone = completedLessonIds.has(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => {
                          setActiveLesson(lesson);
                          setBanner('');
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center justify-between gap-2 transition ${
                          isSelected
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-700/70 font-semibold'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">▶ {lesson.title}</span>
                        {isDone && (
                          <span className="text-emerald-400 font-bold shrink-0">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Lecture Viewer + Lesson Q&A Interaction */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="p-12 text-center text-sm text-slate-400">
                Loading lesson materials...
              </div>
            ) : !activeLesson ? (
              <div className="p-12 text-center text-sm text-slate-400">
                No lessons available in this course yet.
              </div>
            ) : (
              <>
                {banner && (
                  <div className="mb-5 px-4 py-3 rounded-lg bg-emerald-950/70 border border-emerald-700/70 text-emerald-300 text-xs font-semibold">
                    {banner}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                      {videoMaterial ? 'VIDEO LECTURE' : 'READING MATERIAL'}
                    </span>
                    <h2 className="text-xl font-bold text-white mt-0.5">
                      {activeLesson.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    disabled={marking}
                    onClick={handleMarkCompleted}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                      isCurrentCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isCurrentCompleted ? '✓ Lesson Completed' : '✓ Mark Lesson Completed'}
                  </button>
                </div>

                {/* Embedded Video Lecture */}
                {videoMaterial?.url && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 shadow-xl mb-6">
                    <iframe
                      src={videoMaterial.url}
                      title={activeLesson.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Sanitized Markdown Reading Materials */}
                {textMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-6 rounded-xl bg-[#111827] border border-slate-800 prose prose-invert max-w-none text-sm text-slate-200 space-y-2 mb-6"
                    dangerouslySetInnerHTML={{
                      __html: renderSafeMarkdown(mat.content || '')
                    }}
                  />
                ))}

                {/* Issue #12: Lesson Q&A Comments, Course Reviews & Violation Reporting */}
                <LessonInteractionSection
                  lessonId={activeLesson.id}
                  courseId={courseId}
                  currentUser={user}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}