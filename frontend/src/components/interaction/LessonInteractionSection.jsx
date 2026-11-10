import React, { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import api from '../../services/api';

const sanitizeContent = (raw = '') =>
  DOMPurify.sanitize(String(raw), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function LessonInteractionSection({ lessonId, courseId, currentUser }) {
  const [activeTab, setActiveTab] = useState('qa'); // 'qa' | 'reviews'
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [posting, setPosting] = useState(false);

  // Course reviews state
  const [reviews, setReviews] = useState([]);
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Report violation modal state
  const [reportTarget, setReportTarget] = useState(null); // { type: 'comment' | 'course', id, label }
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [feedbackBanner, setFeedbackBanner] = useState(null);

  const showBanner = (type, text) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const fetchComments = useCallback(async () => {
    if (!lessonId) return;
    setLoadingComments(true);
    try {
      const res = await api.get(`/lessons/${lessonId}/comments`);
      setComments(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (_err) {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [lessonId]);

  const fetchReviews = useCallback(async () => {
    if (!courseId) return;
    try {
      const res = await api.get(`/courses/${courseId}/reviews`);
      setReviews(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (_err) {
      setReviews([]);
    }
  }, [courseId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab, fetchReviews]);

  const handleCreateComment = async (e) => {
    e.preventDefault();
    const clean = sanitizeContent(newComment).trim();
    if (!clean || !lessonId || posting) return;

    setPosting(true);
    try {
      await api.post(`/lessons/${lessonId}/comments`, { content: clean });
      setNewComment('');
      showBanner('success', 'Comment posted to lesson Q&A.');
      await fetchComments();
    } catch (err) {
      showBanner('error', err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setPosting(false);
    }
  };

  const handleCreateReply = async (parentId) => {
    const clean = sanitizeContent(replyText).trim();
    if (!clean || !lessonId || posting) return;

    setPosting(true);
    try {
      await api.post(`/lessons/${lessonId}/comments`, {
        content: clean,
        parent_id: parentId
      });
      setReplyingTo(null);
      setReplyText('');
      showBanner('success', 'Reply posted.');
      await fetchComments();
    } catch (err) {
      showBanner('error', err.response?.data?.message || 'Failed to post reply.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      showBanner('success', 'Comment removed.');
      await fetchComments();
    } catch (err) {
      showBanner('error', err.response?.data?.message || 'Could not delete comment.');
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    const cleanReason = sanitizeContent(reportReason).trim();
    if (!cleanReason || !reportTarget || submittingReport) return;

    setSubmittingReport(true);
    try {
      const payload =
        reportTarget.type === 'comment'
          ? { comment_id: reportTarget.id, course_id: courseId, reason: cleanReason }
          : { course_id: reportTarget.id, reason: cleanReason };

      await api.post('/reports', payload);
      setReportTarget(null);
      setReportReason('');
      showBanner('success', 'Violation report submitted to administrators.');
    } catch (err) {
      showBanner('error', err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!courseId || savingReview) return;

    setSavingReview(true);
    try {
      await api.post(`/courses/${courseId}/reviews`, {
        rating: Number(ratingInput),
        comment: sanitizeContent(reviewComment).trim()
      });
      setReviewComment('');
      showBanner('success', 'Course review saved.');
      await fetchReviews();
    } catch (err) {
      showBanner('error', err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSavingReview(false);
    }
  };

  const canModifyComment = (commentUserId) => {
    if (!currentUser) return false;
    return (
      currentUser.id === commentUserId ||
      currentUser.role === 'admin' ||
      currentUser.role === 'instructor'
    );
  };

  return (
    <section
      data-testid="lesson-interaction-section"
      className="mt-8 bg-[#151c2c] border border-slate-800 rounded-xl p-6 text-slate-100 shadow-lg"
    >
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'qa'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            💬 Lesson Q&A Discussion ({comments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'reviews'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⭐ Course Reviews ({reviews.length})
          </button>
        </div>

        {/* Report Course Violation Button */}
        {courseId && (
          <button
            type="button"
            data-testid="report-course-btn"
            onClick={() =>
              setReportTarget({
                type: 'course',
                id: courseId,
                label: 'Current Course Content'
              })
            }
            className="text-xs px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-800/60 font-semibold transition"
          >
            🚩 Report Course Violation
          </button>
        )}
      </div>

      {feedbackBanner && (
        <div
          role="status"
          className={`mb-4 px-4 py-2.5 rounded-lg text-xs font-semibold border ${
            feedbackBanner.type === 'error'
              ? 'bg-red-950/80 border-red-700 text-red-200'
              : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
          }`}
        >
          {feedbackBanner.text}
        </div>
      )}

      {activeTab === 'qa' ? (
        <div className="space-y-6">
          {/* Post New Comment Form */}
          <form onSubmit={handleCreateComment} className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Ask a Question or Share Insights on This Lesson
            </label>
            <textarea
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your question or comment here..."
              className="w-full rounded-lg bg-[#0f1523] border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                data-testid="post-comment-btn"
                disabled={posting || !newComment.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold transition"
              >
                {posting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>

          {/* Comments Thread List */}
          {loadingComments ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading lesson discussions...</p>
          ) : comments.length === 0 ? (
            <div className="p-6 rounded-lg bg-[#0f1523] border border-dashed border-slate-800 text-center text-xs text-slate-400">
              No questions posted for this lesson yet. Start the discussion above!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const authorName =
                  comment.user?.fullName ||
                  comment.user?.full_name ||
                  comment.user?.email ||
                  'Learner';
                const authorRole = comment.user?.role || 'student';

                return (
                  <div
                    key={comment.id}
                    data-testid={`comment-item-${comment.id}`}
                    className="p-4 rounded-xl bg-[#0f1523] border border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                          {authorName.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{authorName}</span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                authorRole === 'instructor'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                  : authorRole === 'admin'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-700'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {authorRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Corner Action Buttons: Reply, Delete, Report Violation */}
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setReplyingTo(replyingTo === comment.id ? null : comment.id)
                          }
                          className="text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          Reply
                        </button>
                        {canModifyComment(comment.user_id) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-slate-400 hover:text-red-400 font-semibold"
                          >
                            Delete
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid={`report-comment-btn-${comment.id}`}
                          onClick={() =>
                            setReportTarget({
                              type: 'comment',
                              id: comment.id,
                              label: `Comment by ${authorName}`
                            })
                          }
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300 text-[11px] font-semibold transition"
                          title="Report inappropriate content"
                        >
                          🚩 Report
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-200 whitespace-pre-line pl-10">
                      {sanitizeContent(comment.content)}
                    </p>

                    {/* Reply Input Box */}
                    {replyingTo === comment.id && (
                      <div className="pl-10 pt-2 space-y-2">
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to ${authorName}...`}
                          className="w-full rounded-lg bg-[#151c2c] border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateReply(comment.id)}
                            className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-bold"
                          >
                            Send Reply
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Nested Replies */}
                    {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                      <div className="pl-10 pt-2 space-y-2.5 border-l border-slate-800 ml-4">
                        {comment.replies.map((reply) => {
                          const replyAuthor =
                            reply.user?.fullName ||
                            reply.user?.full_name ||
                            reply.user?.email ||
                            'User';
                          return (
                            <div
                              key={reply.id}
                              className="p-3 rounded-lg bg-[#151c2c]/90 border border-slate-800/80 space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-200">
                                    {replyAuthor}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {formatDate(reply.createdAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {canModifyComment(reply.user_id) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-[11px] text-slate-400 hover:text-red-400"
                                    >
                                      Delete
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReportTarget({
                                        type: 'comment',
                                        id: reply.id,
                                        label: `Reply by ${replyAuthor}`
                                      })
                                    }
                                    className="text-[11px] text-slate-400 hover:text-red-300"
                                  >
                                    🚩 Report
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-slate-300 whitespace-pre-line">
                                {sanitizeContent(reply.content)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Course Reviews Tab */
        <div className="space-y-6">
          <form onSubmit={handleSaveReview} className="p-4 rounded-xl bg-[#0f1523] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Rate & Review This Course
              </span>
              <select
                value={ratingInput}
                onChange={(e) => setRatingInput(Number(e.target.value))}
                className="bg-[#151c2c] border border-slate-700 rounded-lg px-3 py-1 text-xs text-amber-400 font-bold"
              >
                <option value={5}>★★★★★ (5 - Excellent)</option>
                <option value={4}>★★★★☆ (4 - Good)</option>
                <option value={3}>★★★☆☆ (3 - Average)</option>
                <option value={2}>★★☆☆☆ (2 - Fair)</option>
                <option value={1}>★☆☆☆☆ (1 - Poor)</option>
              </select>
            </div>
            <textarea
              rows={2}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your learning experience with this course..."
              className="w-full rounded-lg bg-[#151c2c] border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingReview}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                {savingReview ? 'Saving...' : 'Submit Review'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No reviews yet.</p>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-xl bg-[#0f1523] border border-slate-800 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {rev.user?.fullName || rev.user?.full_name || 'Student'}
                      </span>
                      <span className="text-xs text-amber-400 font-bold">
                        {'★'.repeat(Number(rev.rating) || 5)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {sanitizeContent(rev.comment)}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {formatDate(rev.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Report Inappropriate Content */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReport}
            className="bg-[#151c2c] border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-red-400">
                🚩 Report Inappropriate Content
              </h3>
              <button
                type="button"
                onClick={() => {
                  setReportTarget(null);
                  setReportReason('');
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Reporting: <strong>{reportTarget.label}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Reason for Report
              </label>
              <textarea
                required
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe why this content violates community guidelines (spam, harassment, inappropriate material)..."
                className="w-full rounded-lg bg-[#0f1523] border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReportTarget(null);
                  setReportReason('');
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReport || !reportReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                {submittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}