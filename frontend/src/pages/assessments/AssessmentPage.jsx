import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const formatTimeLeft = (totalSeconds) => {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatDateTime = (isoString) => {
  if (!isoString) return 'No deadline';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'No deadline';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function AssessmentPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const routeId = params.assessmentId || params.id || searchParams.get('assessmentId') || '';
  const routeCourseId = params.courseId || searchParams.get('courseId') || '';

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (_e) {
      return null;
    }
  });

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(routeCourseId);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [currentAssessment, setCurrentAssessment] = useState(null);

  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'history' | 'grading'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Toast / Alert state
  const [toast, setToast] = useState(null); // { type: 'error' | 'success' | 'warning', message: string }

  // Quiz state & Timer
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [isQuizLocked, setIsQuizLocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [quizResult, setQuizResult] = useState(null);

  // File assignment state
  const [fileUrlInput, setFileUrlInput] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  // Student submission history
  const [mySubmissions, setMySubmissions] = useState([]);

  // Instructor grading state
  const [classSubmissions, setClassSubmissions] = useState([]);
  const [gradingFilter, setGradingFilter] = useState('ungraded'); // 'all' | 'ungraded' | 'graded'
  const [gradeInputs, setGradeInputs] = useState({});
  const [gradingId, setGradingId] = useState(null);
  const [previewSubmission, setPreviewSubmission] = useState(null);

  // Instructor create assessment modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    type: 'quiz',
    title: '',
    description: '',
    time_limit_minutes: 15,
    due_at: '',
    max_attempts: 3,
    pass_score: 60,
    questions: [
      {
        content: '',
        points: 10,
        answers: [
          { content: '', is_correct: true },
          { content: '', is_correct: false },
          { content: '', is_correct: false }
        ]
      }
    ]
  });

  const timerIntervalRef = useRef(null);
  const autoSubmitTriggeredRef = useRef(false);
  const selectedAnswersRef = useRef(selectedAnswers);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  const showNotice = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  // 1. Fetch authenticated profile & initial courses/assessments
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      setLoading(true);
      try {
        let currentUser = user;
        try {
          const profileRes = await api.get('/users/profile');
          if (profileRes.data?.data) {
            currentUser = profileRes.data.data;
            if (isMounted) setUser(currentUser);
          }
        } catch (_err) {
          // Keep localStorage fallback if any
        }

        const coursesRes = await api.get('/courses');
        const rawCourses = coursesRes.data?.data;
        const courseList = Array.isArray(rawCourses)
          ? rawCourses
          : Array.isArray(rawCourses?.items)
          ? rawCourses.items
          : Array.isArray(rawCourses?.courses)
          ? rawCourses.courses
          : [];

        if (isMounted) setCourses(courseList);

        // If routeId is provided, check if it is an assessmentId first
        if (routeId) {
          try {
            const detailRes = await api.get(`/assessments/${routeId}`);
            const detail = detailRes.data?.data;
            if (detail && isMounted) {
              setCurrentAssessment(detail);
              setSelectedAssessmentId(detail.id);
              setSelectedCourseId(detail.course_id);
              const listRes = await api.get(`/courses/${detail.course_id}/assessments`);
              if (isMounted) setAssessments(listRes.data?.data || []);
              setLoading(false);
              return;
            }
          } catch (_notAssessmentErr) {
            // Fallback: routeId might be a courseId
            if (isMounted) setSelectedCourseId(routeId);
          }
        }

        const targetCourseId = routeCourseId || routeId || courseList[0]?.id || '';
        if (targetCourseId && isMounted) {
          setSelectedCourseId(targetCourseId);
        }
      } catch (err) {
        if (isMounted) {
          showNotice('error', err.response?.data?.message || 'Failed to load assessment workspace');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialize();
    return () => {
      isMounted = false;
    };
  }, [routeId, routeCourseId, showNotice]);

  // 2. Load course assessments whenever selectedCourseId changes
  const fetchCourseAssessments = useCallback(
    async (courseId) => {
      if (!courseId) return;
      try {
        const res = await api.get(`/courses/${courseId}/assessments`);
        const list = res.data?.data || [];
        setAssessments(list);
        if (list.length > 0 && !list.some((a) => a.id === selectedAssessmentId)) {
          setSelectedAssessmentId(list[0].id);
        } else if (list.length === 0) {
          setSelectedAssessmentId('');
          setCurrentAssessment(null);
        }
      } catch (_err) {
        setAssessments([]);
      }
    },
    [selectedAssessmentId]
  );

  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseAssessments(selectedCourseId);
    }
  }, [selectedCourseId, fetchCourseAssessments]);

  // 3. Load student's submission history
  const fetchMySubmissions = useCallback(async () => {
    try {
      const res = await api.get('/users/me/submissions');
      setMySubmissions(res.data?.data || []);
    } catch (_err) {
      setMySubmissions([]);
    }
  }, []);

  useEffect(() => {
    fetchMySubmissions();
  }, [fetchMySubmissions]);

  // 4. Load detailed assessment when selectedAssessmentId changes
  const loadAssessmentDetail = useCallback(
    async (assessmentId) => {
      if (!assessmentId) return;
      clearTimer();
      setQuizStarted(false);
      setIsQuizLocked(false);
      setRemainingSeconds(null);
      setQuizResult(null);
      setSelectedAnswers({});
      setFileUrlInput('');
      setSelectedFileName('');
      autoSubmitTriggeredRef.current = false;

      try {
        const res = await api.get(`/assessments/${assessmentId}`);
        const detail = res.data?.data;
        setCurrentAssessment(detail);

        if (detail?.type === 'quiz' && detail?.time_limit_minutes) {
          setRemainingSeconds(Number(detail.time_limit_minutes) * 60);
        }
      } catch (err) {
        showNotice('error', err.response?.data?.message || 'Could not load assessment details');
      }
    },
    [clearTimer, showNotice]
  );

  useEffect(() => {
    if (selectedAssessmentId) {
      loadAssessmentDetail(selectedAssessmentId);
    }
  }, [selectedAssessmentId, loadAssessmentDetail]);

  // 5. Load class submissions for Instructor / Admin grading table
  const fetchClassSubmissions = useCallback(async () => {
    if (!selectedAssessmentId) return;
    if (user?.role !== 'instructor' && user?.role !== 'admin') return;
    try {
      const query = gradingFilter !== 'all' ? `?status=${gradingFilter}` : '';
      const res = await api.get(`/assessments/${selectedAssessmentId}/submissions${query}`);
      const list = res.data?.data || [];
      setClassSubmissions(list);

      const initialInputs = {};
      list.forEach((sub) => {
        initialInputs[sub.id] = {
          score: sub.score !== null && sub.score !== undefined ? String(sub.score) : '',
          feedback: sub.feedback || ''
        };
      });
      setGradeInputs(initialInputs);
    } catch (_err) {
      setClassSubmissions([]);
    }
  }, [selectedAssessmentId, gradingFilter, user?.role]);

  useEffect(() => {
    if (user?.role === 'instructor' || user?.role === 'admin') {
      fetchClassSubmissions();
    }
  }, [fetchClassSubmissions, user?.role]);

  // Check if deadline has passed
  const isPastDeadline = useCallback((assessment) => {
    if (!assessment?.due_at) return false;
    return new Date() > new Date(assessment.due_at);
  }, []);

  // 6. Submit Quiz handler (used by manual submit and 00:00 auto-trigger)
  const handleQuizSubmit = useCallback(
    async (isAutoTrigger = false) => {
      if (!currentAssessment || submitting) return;

      clearTimer();
      setIsQuizLocked(true);

      if (!isAutoTrigger && isPastDeadline(currentAssessment)) {
        const msg = 'Submission rejected: Assessment deadline has passed!';
        showNotice('error', msg);
        window.alert(msg);
        return;
      }

      setSubmitting(true);
      try {
        const res = await api.post(`/assessments/${currentAssessment.id}/submit-quiz`, {
          answers: selectedAnswersRef.current
        });
        const resultData = res.data?.data;
        setQuizResult(resultData);
        setQuizStarted(false);
        showNotice(
          'success',
          isAutoTrigger
            ? `Time is up (00:00)! Quiz auto-submitted. Score: ${resultData.score}/100`
            : `Quiz submitted successfully! Score: ${resultData.score}/100`
        );
        fetchMySubmissions();
      } catch (err) {
        const errMsg =
          err.response?.data?.message || 'Submission failed: Deadline or attempt limit exceeded.';
        showNotice('error', errMsg);
        window.alert(errMsg);
      } finally {
        setSubmitting(false);
      }
    },
    [currentAssessment, submitting, clearTimer, isPastDeadline, showNotice, fetchMySubmissions]
  );

  // 7. Quiz Countdown Timer using setInterval with 00:00 auto-lock & auto-submit
  useEffect(() => {
    if (!quizStarted || !currentAssessment || currentAssessment.type !== 'quiz') {
      return undefined;
    }

    clearTimer();
    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          setIsQuizLocked(true);
          if (!autoSubmitTriggeredRef.current) {
            autoSubmitTriggeredRef.current = true;
            handleQuizSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimer();
    };
  }, [quizStarted, currentAssessment, clearTimer, handleQuizSubmit]);

  const handleStartQuiz = () => {
    if (!currentAssessment) return;
    if (isPastDeadline(currentAssessment)) {
      const msg = 'Cannot start quiz: The deadline for this assessment has already passed!';
      showNotice('error', msg);
      window.alert(msg);
      return;
    }
    setQuizResult(null);
    setSelectedAnswers({});
    setIsQuizLocked(false);
    autoSubmitTriggeredRef.current = false;
    const totalSecs = (Number(currentAssessment.time_limit_minutes) || 15) * 60;
    setRemainingSeconds(totalSecs);
    setQuizStarted(true);
  };

  const handleSelectAnswer = (questionId, answerId) => {
    if (isQuizLocked || submitting) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  // 8. File Attachment / Assignment Submission handler
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFileUrlInput(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    if (!currentAssessment || submitting) return;

    if (isPastDeadline(currentAssessment)) {
      const msg = 'Submission rejected: The assignment deadline has passed!';
      showNotice('error', msg);
      window.alert(msg);
      return;
    }

    if (!fileUrlInput.trim()) {
      showNotice('error', 'Please attach a file or provide a valid submission URL.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/assessments/${currentAssessment.id}/submit-file`, {
        file_url: fileUrlInput.trim()
      });
      showNotice('success', 'Assignment file submitted successfully!');
      setFileUrlInput('');
      setSelectedFileName('');
      fetchMySubmissions();
      setActiveTab('history');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to submit assignment.';
      showNotice('error', errMsg);
      window.alert(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // 9. Instructor Grading handler
  const handleGradeChange = (submissionId, field, value) => {
    setGradeInputs((prev) => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || { score: '', feedback: '' }),
        [field]: value
      }
    }));
  };

  const handleSaveGrade = async (submissionId) => {
    const input = gradeInputs[submissionId] || {};
    const numericScore = Number(input.score);

    if (input.score === '' || Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      showNotice('error', 'Please enter a valid score between 0 and 100.');
      return;
    }

    setGradingId(submissionId);
    try {
      await api.put(`/assessments/submissions/${submissionId}/grade`, {
        score: numericScore,
        feedback: input.feedback || ''
      });
      showNotice('success', 'Grade and feedback saved successfully!');
      fetchClassSubmissions();
      fetchMySubmissions();
    } catch (err) {
      showNotice('error', err.response?.data?.message || 'Failed to save grade.');
    } finally {
      setGradingId(null);
    }
  };

  // 10. Instructor Create Assessment handler
  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) {
      showNotice('error', 'Please select a course first.');
      return;
    }
    try {
      const payload = {
        ...newAssessment,
        time_limit_minutes:
          newAssessment.type === 'quiz' ? Number(newAssessment.time_limit_minutes) || 15 : null,
        due_at: newAssessment.due_at ? new Date(newAssessment.due_at).toISOString() : null,
        questions: newAssessment.type === 'quiz' ? newAssessment.questions : []
      };
      const res = await api.post(`/courses/${selectedCourseId}/assessments`, payload);
      const created = res.data?.data;
      showNotice('success', 'New assessment created successfully!');
      setShowCreateModal(false);
      await fetchCourseAssessments(selectedCourseId);
      if (created?.id) setSelectedAssessmentId(created.id);
    } catch (err) {
      showNotice('error', err.response?.data?.message || 'Failed to create assessment.');
    }
  };

  const addQuestionField = () => {
    setNewAssessment((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          content: '',
          points: 10,
          answers: [
            { content: '', is_correct: true },
            { content: '', is_correct: false },
            { content: '', is_correct: false }
          ]
        }
      ]
    }));
  };

  const isInstructorOrAdmin = user?.role === 'instructor' || user?.role === 'admin';
  const currentAssessmentSubmissions = mySubmissions.filter(
    (s) => s.assessment_id === currentAssessment?.id
  );
  const overdue = isPastDeadline(currentAssessment);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md border border-slate-700 transition"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              Assessment & Grading Center
            </h1>
            <p className="text-xs text-slate-400">
              Timed Auto-Graded Quizzes, File Submissions & Instructor Evaluation
            </p>
          </div>
        </div>

        {/* Sticky Countdown Timer in Corner when taking a Quiz */}
        <div className="flex items-center gap-4">
          {currentAssessment?.type === 'quiz' && remainingSeconds !== null && (
            <div
              data-testid="quiz-countdown-timer"
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-mono text-sm font-bold border ${
                remainingSeconds <= 60
                  ? 'bg-red-950/90 border-red-500 text-red-300 animate-pulse'
                  : 'bg-slate-800 border-blue-500/40 text-blue-300'
              }`}
            >
              <span>⏱ Time Remaining:</span>
              <span className="text-base">{formatTimeLeft(remainingSeconds)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/"
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Course Catalog
            </Link>
            {isInstructorOrAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
              >
                + New Assessment
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Toast / Alert Banner */}
      {toast && (
        <div
          role="alert"
          data-testid="assessment-toast-alert"
          className={`mx-6 mt-4 px-4 py-3 rounded-lg border flex items-center justify-between text-sm font-medium shadow-sm ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-800'
              : toast.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-bold underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Course & Assessment Selector */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={quizStarted && !isQuizLocked}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Course Assessments ({assessments.length})
                </span>
              </div>

              {assessments.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                  No assessments found for this course.
                </p>
              ) : (
                <div className="space-y-2">
                  {assessments.map((item) => {
                    const isSelected = item.id === selectedAssessmentId;
                    const itemOverdue = isPastDeadline(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={quizStarted && !isQuizLocked}
                        onClick={() => {
                          setSelectedAssessmentId(item.id);
                          setActiveTab('workspace');
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              item.type === 'quiz'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.type === 'quiz' ? 'Timed Quiz' : 'File Assignment'}
                          </span>
                          {itemOverdue && (
                            <span className="text-[10px] font-semibold text-red-600">
                              Overdue
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-800 line-clamp-1">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Due: {formatDateTime(item.due_at)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Question Navigation when taking Quiz */}
          {currentAssessment?.type === 'quiz' &&
            Array.isArray(currentAssessment.questions) &&
            currentAssessment.questions.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Question Navigator
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {currentAssessment.questions.map((q, idx) => {
                    const answered = Boolean(selectedAnswers[q.id]);
                    return (
                      <a
                        key={q.id}
                        href={`#question-${q.id}`}
                        className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center border transition ${
                          answered
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        Q{idx + 1}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
        </aside>

        {/* Right Main Column: Tabs & Active View */}
        <main className="lg:col-span-8 space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex flex-wrap gap-2 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'workspace'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📝 Take Assessment
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                fetchMySubmissions();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📊 Results & Submission History ({mySubmissions.length})
            </button>
            {isInstructorOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('grading');
                  fetchClassSubmissions();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeTab === 'grading'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                🎓 Instructor Grading Table
              </button>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-500">
              Loading assessment data...
            </div>
          ) : activeTab === 'workspace' ? (
            !currentAssessment ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-500">
                Select an assessment from the left panel to begin.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                {/* Assessment Metadata Header */}
                <div className="border-b border-slate-200 pb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-slate-100 text-slate-800">
                        {currentAssessment.type === 'quiz'
                          ? 'Timed Multiple-Choice Quiz'
                          : 'File Upload Assignment'}
                      </span>
                      {currentAssessment.time_limit_minutes && (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                          Time Limit: {currentAssessment.time_limit_minutes} mins
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded">
                        Pass Score: {currentAssessment.pass_score ?? 50}/100
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">
                      {currentAssessment.title}
                    </h2>
                    {currentAssessment.description && (
                      <p className="text-sm text-slate-600 mt-1">
                        {currentAssessment.description}
                      </p>
                    )}
                  </div>

                  {/* Prominent Deadline Display */}
                  <div
                    className={`px-3.5 py-2 rounded-lg border text-right ${
                      overdue
                        ? 'bg-red-50 border-red-300 text-red-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider">
                      {overdue ? '⚠️ Deadline Passed' : '📅 Submission Deadline'}
                    </span>
                    <span className="text-xs font-semibold">
                      {formatDateTime(currentAssessment.due_at)}
                    </span>
                  </div>
                </div>

                {/* Instant Quiz Score Banner */}
                {quizResult && (
                  <div
                    data-testid="instant-quiz-result"
                    className={`p-5 rounded-xl border ${
                      quizResult.passed
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Instant Auto-Graded Result
                        </span>
                        <h3 className="text-2xl font-extrabold mt-0.5">
                          Score: {quizResult.score} / 100{' '}
                          <span className="text-sm font-bold">
                            ({quizResult.passed ? 'PASSED' : 'NEEDS REVIEW'})
                          </span>
                        </h3>
                        <p className="text-xs mt-1">{quizResult.feedback}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                      >
                        View Full History →
                      </button>
                    </div>
                  </div>
                )}

                {/* CASE A: TIMED QUIZ VIEW */}
                {currentAssessment.type === 'quiz' ? (
                  <div className="space-y-6">
                    {/* Timer & Start Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-xl">
                      <div>
                        <span className="text-xs text-slate-400 block">
                          Attempt Status ({currentAssessmentSubmissions.length} /{' '}
                          {currentAssessment.max_attempts || 1} attempts used)
                        </span>
                        <span className="text-sm font-semibold">
                          {isQuizLocked
                            ? '🔒 Quiz interaction locked (Submitted or Time Expired)'
                            : quizStarted
                            ? '🟢 Quiz in progress — Timer is running'
                            : 'Click "Start Timed Quiz" to begin the countdown'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded bg-slate-800 font-mono text-base font-bold text-blue-400 border border-slate-700">
                          ⏱ {formatTimeLeft(remainingSeconds ?? (currentAssessment.time_limit_minutes || 15) * 60)}
                        </div>
                        {!quizStarted && (
                          <button
                            type="button"
                            onClick={handleStartQuiz}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                          >
                            {quizResult ? 'Retake Quiz' : 'Start Timed Quiz'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-4">
                      {(currentAssessment.questions || []).map((q, qIdx) => (
                        <div
                          id={`question-${q.id}`}
                          key={q.id}
                          className={`p-4 rounded-xl border transition ${
                            isQuizLocked
                              ? 'bg-slate-100 border-slate-200 opacity-75'
                              : 'bg-slate-50/60 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h4 className="text-sm font-bold text-slate-900">
                              Question {qIdx + 1}: {q.content}
                            </h4>
                            <span className="text-xs font-semibold text-slate-500 shrink-0">
                              {q.points || 10} pts
                            </span>
                          </div>

                          <div className="space-y-2">
                            {(q.answers || []).map((ans) => {
                              const checked = String(selectedAnswers[q.id]) === String(ans.id);
                              return (
                                <label
                                  key={ans.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition ${
                                    isQuizLocked
                                      ? 'cursor-not-allowed bg-slate-100 border-slate-200'
                                      : checked
                                      ? 'cursor-pointer bg-blue-50 border-blue-600 text-blue-900 font-medium'
                                      : 'cursor-pointer bg-white hover:bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${q.id}`}
                                    value={ans.id}
                                    checked={checked}
                                    disabled={isQuizLocked || submitting}
                                    onChange={() => {
                                      if (!quizStarted && !isQuizLocked) {
                                        setQuizStarted(true);
                                      }
                                      handleSelectAnswer(q.id, ans.id);
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{ans.content}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Submit Quiz Button */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        data-testid="submit-quiz-btn"
                        disabled={isQuizLocked || submitting}
                        onClick={() => handleQuizSubmit(false)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white transition ${
                          isQuizLocked || submitting
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 shadow-sm'
                        }`}
                      >
                        {submitting ? 'Submitting & Grading...' : 'Submit Quiz Now'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* CASE B: FILE UPLOAD ASSIGNMENT VIEW */
                  <form onSubmit={handleAssignmentSubmit} className="space-y-5">
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <p className="font-bold">
                        📌 Assignment Submission Instructions & Deadline Policy
                      </p>
                      <p>
                        Attach your work file (PDF, ZIP, source code) or paste a direct link to your
                        GitHub repository / Google Drive document before{' '}
                        <strong>{formatDateTime(currentAssessment.due_at)}</strong>. Late
                        submissions after the deadline will be rejected.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        Option 1: Attach Local File
                      </label>
                      <input
                        type="file"
                        onChange={handleFileInputChange}
                        className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {selectedFileName && (
                        <p className="text-xs text-emerald-700 font-medium mt-1.5">
                          ✓ Attached file ready: {selectedFileName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        Option 2: Or Paste Submission File URL (GitHub / Drive / Document Link)
                      </label>
                      <input
                        type="text"
                        value={fileUrlInput}
                        onChange={(e) => setFileUrlInput(e.target.value)}
                        placeholder="https://github.com/your-org/project-repo or file URL..."
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        data-testid="submit-file-btn"
                        disabled={submitting}
                        className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition disabled:bg-slate-400"
                      >
                        {submitting ? 'Uploading Submission...' : 'Submit Assignment'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )
          ) : activeTab === 'history' ? (
            /* STUDENT RESULTS & SUBMISSION HISTORY VIEW */
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    My Submission History & Instructor Feedback
                  </h2>
                  <p className="text-xs text-slate-500">
                    Track all your quiz scores, file submissions, and instructor grading notes.
                  </p>
                </div>
              </div>

              {mySubmissions.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  You have not submitted any assessments yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {mySubmissions.map((sub) => {
                    const isGraded = sub.score !== null && sub.score !== undefined;
                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                              {sub.assessment?.type || 'Assessment'}
                            </span>
                            <span className="text-xs text-slate-500">
                              Attempt #{sub.attempt_no} • Submitted {formatDateTime(sub.submitted_at)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {sub.assessment?.title || 'Assessment Submission'}
                          </h4>
                          {sub.file_url && (
                            <div className="text-xs">
                              <a
                                href={sub.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                              >
                                📎 View Submitted File / Artifact
                              </a>
                            </div>
                          )}
                          {sub.feedback && (
                            <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
                              <strong className="text-slate-900">Instructor Feedback:</strong>{' '}
                              {sub.feedback}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {isGraded ? (
                            <div className="inline-block px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                              <span className="block text-[10px] font-bold uppercase">
                                Final Score
                              </span>
                              <span className="text-lg font-extrabold">{sub.score} / 100</span>
                            </div>
                          ) : (
                            <span className="inline-block px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
                              ⏳ Pending Instructor Grade
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* INSTRUCTOR GRADING TABLE VIEW */
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Instructor Grading Workspace
                  </h2>
                  <p className="text-xs text-slate-500">
                    Assessment: <strong>{currentAssessment?.title || 'Select an assessment'}</strong>
                  </p>
                </div>

                {/* Filter Ungraded / Graded / All */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                  {[
                    { id: 'ungraded', label: '⏳ Ungraded (Chưa chấm)' },
                    { id: 'graded', label: '✓ Graded (Đã chấm)' },
                    { id: 'all', label: 'All Submissions' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setGradingFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                        gradingFilter === tab.id
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {classSubmissions.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No submissions matching filter &ldquo;{gradingFilter}&rdquo;.
                </div>
              ) : (
                <div className="space-y-4">
                  {classSubmissions.map((sub) => {
                    const input = gradeInputs[sub.id] || { score: '', feedback: '' };
                    const isGraded = sub.score !== null && sub.score !== undefined;

                    return (
                      <div
                        key={sub.id}
                        data-testid={`grading-row-${sub.id}`}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-sm font-bold text-slate-900">
                              {sub.student?.fullName || sub.student?.full_name || sub.student?.email || 'Student'}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">
                              ({sub.student?.email || sub.user_id})
                            </span>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Attempt #{sub.attempt_no} • Submitted: {formatDateTime(sub.submitted_at)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded ${
                                isGraded
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isGraded ? `Graded: ${sub.score}/100` : 'Ungraded (Chưa chấm)'}
                            </span>

                            {sub.file_url && (
                              <button
                                type="button"
                                onClick={() => setPreviewSubmission(sub)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition"
                              >
                                🔍 View Submitted File
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-200">
                          <div className="md:col-span-3">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Score (0 - 100)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={input.score}
                              onChange={(e) => handleGradeChange(sub.id, 'score', e.target.value)}
                              placeholder="e.g. 90"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="md:col-span-6">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Instructor Feedback
                            </label>
                            <input
                              type="text"
                              value={input.feedback}
                              onChange={(e) =>
                                handleGradeChange(sub.id, 'feedback', e.target.value)
                              }
                              placeholder="Write constructive feedback for the student..."
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="md:col-span-3 flex items-end">
                            <button
                              type="button"
                              disabled={gradingId === sub.id}
                              onClick={() => handleSaveGrade(sub.id)}
                              className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:bg-slate-400"
                            >
                              {gradingId === sub.id ? 'Saving...' : 'Save Grade'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal: Preview Student Submitted File */}
      {previewSubmission && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Submitted File — {previewSubmission.student?.fullName || 'Student'}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewSubmission(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs break-all space-y-3">
              <p className="font-semibold text-slate-700">File URL / Artifact Reference:</p>
              <a
                href={previewSubmission.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-medium block"
              >
                {previewSubmission.file_url?.slice(0, 180)}
              </a>
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={previewSubmission.file_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold"
              >
                Open in New Tab ↗
              </a>
              <button
                type="button"
                onClick={() => setPreviewSubmission(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Instructor Create New Assessment */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateAssessment}
            className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Create Course Assessment
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <select
                  value={newAssessment.type}
                  onChange={(e) =>
                    setNewAssessment((p) => ({ ...p, type: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="quiz">Timed Multiple-Choice Quiz</option>
                  <option value="assignment">File Upload Assignment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newAssessment.title}
                  onChange={(e) =>
                    setNewAssessment((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Quiz / Assignment Title"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {newAssessment.type === 'quiz' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newAssessment.time_limit_minutes}
                    onChange={(e) =>
                      setNewAssessment((p) => ({
                        ...p,
                        time_limit_minutes: e.target.value
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pass Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newAssessment.pass_score}
                  onChange={(e) =>
                    setNewAssessment((p) => ({ ...p, pass_score: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={newAssessment.due_at}
                  onChange={(e) =>
                    setNewAssessment((p) => ({ ...p, due_at: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {newAssessment.type === 'quiz' && (
              <div className="space-y-3 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-600">
                    Quiz Questions
                  </span>
                  <button
                    type="button"
                    onClick={addQuestionField}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Add Question
                  </button>
                </div>

                {newAssessment.questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <input
                      type="text"
                      required
                      placeholder={`Question ${qIdx + 1} content`}
                      value={q.content}
                      onChange={(e) => {
                        const updated = [...newAssessment.questions];
                        updated[qIdx].content = e.target.value;
                        setNewAssessment((p) => ({ ...p, questions: updated }));
                      }}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
                    />
                    {q.answers.map((a, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-q-${qIdx}`}
                          checked={a.is_correct}
                          onChange={() => {
                            const updated = [...newAssessment.questions];
                            updated[qIdx].answers = updated[qIdx].answers.map(
                              (ans, i) => ({ ...ans, is_correct: i === aIdx })
                            );
                            setNewAssessment((p) => ({ ...p, questions: updated }));
                          }}
                        />
                        <input
                          type="text"
                          required
                          placeholder={`Option ${aIdx + 1}`}
                          value={a.content}
                          onChange={(e) => {
                            const updated = [...newAssessment.questions];
                            updated[qIdx].answers[aIdx].content = e.target.value;
                            setNewAssessment((p) => ({ ...p, questions: updated }));
                          }}
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold"
              >
                Save Assessment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}