import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/auth/AuthPage';
import CourseCatalogPage from './pages/courses/CourseCatalogPage';
import InstructorDashboardPage from './pages/courses/InstructorDashboardPage';
import LearningWorkspacePage from './pages/workspace/LearningWorkspacePage';
import AuthScreens from './pages/auth/AuthScreens';
import AssessmentPage from './pages/assessments/AssessmentPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import RoomLayout from './components/classroom/RoomLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CourseCatalogPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthScreens key="register" mode="register" />} />
        <Route path="/forgot-password" element={<AuthScreens key="forgot" mode="forgot" />} />
        <Route path="/reset-password" element={<AuthScreens key="reset" mode="reset" />} />
        <Route path="/profile" element={<AuthScreens key="profile" mode="profile" />} />
        <Route path="/instructor" element={<InstructorDashboardPage />} />
        <Route path="/workspace/:courseId" element={<LearningWorkspacePage />} />
        <Route path="/assessments/:assessmentId" element={<AssessmentPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/room" element={<RoomLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
