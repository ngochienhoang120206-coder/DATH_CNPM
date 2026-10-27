import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/auth/AuthPage';
import CourseCatalogPage from './pages/courses/CourseCatalogPage';
import InstructorDashboardPage from './pages/courses/InstructorDashboardPage';
import CourseDetailPage from './pages/courses/CourseDetailPage';
const LearningWorkspacePage = lazy(() => import('./pages/workspace/LearningWorkspacePage'));
import AuthScreens from './pages/auth/AuthScreens';
import AssessmentPage from './pages/assessments/AssessmentPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p>Đang tải…</p>}><Routes>
        <Route path="/" element={<CourseCatalogPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthScreens key="register" mode="register" />} />
        <Route path="/forgot-password" element={<AuthScreens key="forgot" mode="forgot" />} />
        <Route path="/reset-password" element={<AuthScreens key="reset" mode="reset" />} />
        <Route path="/profile" element={<AuthScreens key="profile" mode="profile" />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/instructor" element={<InstructorDashboardPage />} />
        <Route path="/workspace/:courseId" element={<LearningWorkspacePage />} />
        <Route path="/assessments/:assessmentId" element={<AssessmentPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
}