import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/interaction/NotificationBell';

const formatTimestamp = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function AdminDashboardPage() {
  const { user: authUser } = useAuth() || {};

  const [currentUser, setCurrentUser] = useState(authUser || null);
  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'users' | 'courses' | 'reports' | 'logs'
  const [loading, setLoading] = useState(true);
  const [forbiddenError, setForbiddenError] = useState('');
  const [notice, setNotice] = useState(null);

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [courses, setCourses] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);

  const showNotice = (type, message) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setForbiddenError('');
    try {
      const profileRes = await api.get('/users/profile');
      const profile = profileRes.data?.data;
      setCurrentUser(profile);

      if (profile?.role !== 'admin') {
        setForbiddenError('403 Forbidden: Strictly restricted to System Administrators.');
        setLoading(false);
        return;
      }

      const [statsRes, usersRes, coursesRes, reportsRes, logsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/courses').catch(() => ({ data: { data: [] } })),
        api.get('/admin/reports').catch(() => ({ data: { data: [] } })),
        api.get('/admin/logs')
      ]);

      setStats(statsRes.data?.data || {});
      setUsers(Array.isArray(usersRes.data?.data) ? usersRes.data.data : []);
      setCourses(Array.isArray(coursesRes.data?.data) ? coursesRes.data.data : []);
      setReports(Array.isArray(reportsRes.data?.data) ? reportsRes.data.data : []);
      setLogs(Array.isArray(logsRes.data?.data) ? logsRes.data.data : []);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        setForbiddenError(
          err.response?.data?.message || '403 Forbidden: Administrator access required.'
        );
      } else {
        showNotice('error', err.response?.data?.message || 'Failed to load admin data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleToggleUserStatus = async (u) => {
    const nextStatus = u.status === 'active' ? 'banned' : 'active';
    try {
      await api.put(`/admin/users/${u.id}/status`, { status: nextStatus });
      showNotice(
        'success',
        `Account ${u.email} status updated to ${nextStatus.toUpperCase()}. Audit log recorded.`
      );
      const [usersRes, statsRes, logsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats'),
        api.get('/admin/logs')
      ]);
      setUsers(usersRes.data?.data || []);
      setStats(statsRes.data?.data || {});
      setLogs(logsRes.data?.data || []);
    } catch (err) {
      showNotice('error', err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleDeleteCourse = async (courseId, title) => {
    try {
      await api.delete(`/admin/courses/${courseId}`);
      showNotice('success', `Course "${title}" soft-deleted and logged in admin_logs.`);
      const [coursesRes, statsRes, logsRes] = await Promise.all([
        api.get('/admin/courses'),
        api.get('/admin/stats'),
        api.get('/admin/logs')
      ]);
      setCourses(coursesRes.data?.data || []);
      setStats(statsRes.data?.data || {});
      setLogs(logsRes.data?.data || []);
    } catch (err) {
      showNotice('error', err.response?.data?.message || 'Failed to delete course.');
    }
  };

  const handleResolveReport = async (reportId, status) => {
    try {
      await api.put(`/admin/reports/${reportId}`, { status });
      showNotice('success', `Report marked as ${status}.`);
      const [reportsRes, statsRes, logsRes] = await Promise.all([
        api.get('/admin/reports'),
        api.get('/admin/stats'),
        api.get('/admin/logs')
      ]);
      setReports(reportsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
      setLogs(logsRes.data?.data || []);
    } catch (err) {
      showNotice('error', err.response?.data?.message || 'Failed to update report.');
    }
  };

  if (forbiddenError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div
          role="alert"
          data-testid="admin-forbidden-alert"
          className="max-w-md w-full bg-slate-900 border border-red-700 rounded-2xl p-8 text-center space-y-4 shadow-2xl"
        >
          <div className="text-3xl">🛡️</div>
          <h1 className="text-lg font-extrabold text-red-400">Access Denied (403 Forbidden)</h1>
          <p className="text-xs text-slate-300 leading-relaxed">{forbiddenError}</p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/"
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold"
            >
              Return to Course Catalog
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold"
            >
              Sign in as Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesRole = !userRoleFilter || u.role === userRoleFilter;
    const q = userSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.fullName || u.full_name || '').toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Dedicated Admin Governance Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-purple-600 text-white text-xs font-extrabold uppercase tracking-wider">
            Admin Console
          </span>
          <div>
            <h1 className="text-base font-bold text-white">
              System Governance, Analytics & Audit Logs
            </h1>
            <p className="text-xs text-slate-400">
              Logged in as: {currentUser?.email || 'admin@demo.edu.vn'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell dark />
          <Link
            to="/"
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
          >
            Exit to Public Catalog ↗
          </Link>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className={`mx-6 mt-4 px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
            notice.type === 'error'
              ? 'bg-red-950/90 border-red-700 text-red-200'
              : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
          }`}
        >
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Admin Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-2">
          {[
            { id: 'overview', label: '📊 Overview & Charts' },
            { id: 'users', label: `👥 User Management (${users.length})` },
            { id: 'courses', label: `📚 Course Governance (${courses.length})` },
            { id: 'reports', label: `🚩 Violation Reports (${reports.length})` },
            { id: 'logs', label: `📜 System Audit Logs (${logs.length})` }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`admin-nav-${item.id}`}
              onClick={() => setActiveSection(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeSection === item.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span>{item.label}</span>
              <span>→</span>
            </button>
          ))}
        </aside>

        {/* Right Content Area */}
        <main className="lg:col-span-9 space-y-6">
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-sm text-slate-400">
              Loading administration metrics...
            </div>
          ) : activeSection === 'overview' ? (
            <div className="space-y-6" data-testid="admin-overview-section">
              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Total Users
                  </span>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {stats?.totalUsers ?? 0}
                  </div>
                  <span className="text-[11px] text-emerald-400">
                    {stats?.activeUsers ?? 0} active • {stats?.bannedUsers ?? 0} banned
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Total Enrollments
                  </span>
                  <div className="text-2xl font-extrabold text-blue-400 mt-1">
                    {stats?.totalEnrollments ?? 0}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Across {stats?.publishedCourses ?? 0} published courses
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Completion Rate
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                    {stats?.completionRate ?? 0}%
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Avg Progress: {stats?.averageProgress ?? 0}%
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Assessment Avg Score
                  </span>
                  <div className="text-2xl font-extrabold text-amber-400 mt-1">
                    {stats?.averageScore ?? 0} / 100
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {stats?.gradedSubmissions ?? 0} / {stats?.totalSubmissions ?? 0} graded
                  </span>
                </div>
              </div>

              {/* Visual Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Enrollment Status Breakdown Bar Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white">
                    Enrollment & Learning Status Distribution
                  </h3>
                  <div className="space-y-3">
                    {(
                      stats?.enrollmentsByStatus || [
                        { name: 'Enrolled', value: stats?.activeEnrollments || 0 },
                        { name: 'Completed', value: stats?.completedEnrollments || 0 },
                        { name: 'Left', value: stats?.droppedEnrollments || 0 }
                      ]
                    ).map((bar) => {
                      const total = Math.max(1, stats?.totalEnrollments || 1);
                      const pct = Math.min(100, Math.round((bar.value / total) * 100));
                      return (
                        <div key={bar.name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-300">{bar.name}</span>
                            <span className="text-slate-400">
                              {bar.value} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                bar.name === 'Completed'
                                  ? 'bg-emerald-500'
                                  : bar.name === 'Enrolled'
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 2: Per-Course Completion Rate Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white">
                    Course Enrollment & Completion Metrics
                  </h3>
                  <div className="space-y-3">
                    {(stats?.courseStats || []).length === 0 ? (
                      <p className="text-xs text-slate-500">No course metrics available.</p>
                    ) : (
                      (stats?.courseStats || []).map((cs) => (
                        <div key={cs.courseId} className="space-y-1">
                          <div className="flex justify-between text-xs gap-2">
                            <span className="font-semibold text-slate-200 truncate">
                              {cs.title}
                            </span>
                            <span className="text-emerald-400 shrink-0 font-bold">
                              {cs.enrollmentsCount} enrolled • {cs.completionRate}% done
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min(100, cs.completionRate || 0)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeSection === 'users' ? (
            /* USER MANAGEMENT TABLE */
            <div
              data-testid="admin-users-section"
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white">User Account Management</h2>
                  <p className="text-xs text-slate-400">
                    Toggle account status (Active / Banned). Every change is recorded in admin_logs.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name or email..."
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="">All Roles</option>
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase">
                      <th className="py-3 px-3">Full Name</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredUsers.map((u) => {
                      const isSelf = currentUser?.id === u.id;
                      const isActive = u.status === 'active';
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold text-white">
                            {u.fullName || u.full_name}
                          </td>
                          <td className="py-3 px-3 text-slate-300">{u.email}</td>
                          <td className="py-3 px-3 uppercase font-bold text-blue-400">
                            {u.role}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                isActive
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                  : 'bg-red-950 text-red-300 border border-red-700'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              data-testid={`toggle-user-status-${u.id}`}
                              disabled={isSelf}
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                                isSelf
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                  : isActive
                                  ? 'bg-red-600 hover:bg-red-500 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              {isActive ? 'Ban Account' : 'Activate Account'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeSection === 'courses' ? (
            /* COURSE GOVERNANCE TABLE */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                Course Governance & Soft-Delete Moderation
              </h2>
              <div className="space-y-3">
                {courses.length === 0 ? (
                  <p className="text-xs text-slate-400">No courses found.</p>
                ) : (
                  courses.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-white">{c.title}</h4>
                        <p className="text-xs text-slate-400">
                          Instructor: {c.instructor?.fullName || c.instructor?.email || 'Instructor'} •{' '}
                          {c.is_published ? 'Published' : 'Draft'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(c.id, c.title)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                      >
                        Soft-Delete Course
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeSection === 'reports' ? (
            /* VIOLATION REPORTS TABLE */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                Community Violation Reports
              </h2>
              {reports.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No violation reports submitted.
                </p>
              ) : (
                <div className="space-y-3">
                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            rep.status === 'pending'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          }`}
                        >
                          {rep.status}
                        </span>
                        <p className="text-xs font-bold text-white mt-1">
                          Reason: {rep.reason}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Reported by: {rep.reporter?.email || rep.reporter_id} •{' '}
                          {formatTimestamp(rep.createdAt)}
                        </p>
                      </div>
                      {rep.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResolveReport(rep.id, 'resolved')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                          >
                            Resolve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveReport(rep.id, 'dismissed')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* SYSTEM AUDIT LOGS TABLE */
            <div
              data-testid="admin-logs-section"
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white">
                  System Audit Logs (admin_logs)
                </h2>
                <p className="text-xs text-slate-400">
                  Immutable history of administrative actions recorded via database transactions.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase">
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Admin</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Target</th>
                      <th className="py-3 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {formatTimestamp(log.createdAt)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {log.admin?.email || log.admin_id}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono text-[11px] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {log.target_type}: {String(log.target_id || '').slice(0, 8)}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {JSON.stringify(log.details || log.detail || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}