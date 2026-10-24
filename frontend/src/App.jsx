import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/auth/AuthPage';
import CourseCatalogPage from './pages/courses/CourseCatalogPage';
import InstructorDashboardPage from './pages/courses/InstructorDashboardPage';
import LearningWorkspacePage from './pages/workspace/LearningWorkspacePage';
import AssessmentPage from './pages/assessments/AssessmentPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CourseCatalogPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/instructor" element={<InstructorDashboardPage />} />
        <Route path="/workspace/:courseId" element={<LearningWorkspacePage />} />
        <Route path="/assessments/:assessmentId" element={<AssessmentPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}