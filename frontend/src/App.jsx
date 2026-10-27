import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { MainLayout } from './layouts/MainLayout';
import { AuthLayout } from './layouts/AuthLayout';

import { Landing } from './pages/public/Landing';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { AccessDenied } from './pages/auth/AccessDenied';
import { NotFound } from './pages/auth/NotFound';
import { ServerError } from './pages/auth/ServerError';
import { Profile } from './pages/common/Profile';

import { CitizenDashboard } from './pages/citizen/CitizenDashboard';
import { ReportEmergency } from './pages/citizen/ReportEmergency';
import { MyReports } from './pages/citizen/MyReports';
import { ReportDetails } from './pages/citizen/ReportDetails';
import { WorkerDashboard } from './pages/worker/WorkerDashboard';
import { ClinicalAssessment } from './pages/worker/ClinicalAssessment';
import { AssessmentResult } from './pages/worker/AssessmentResult';
import { DispatcherDashboard } from './pages/dispatcher/DispatcherDashboard';
import { IncomingReports } from './pages/dispatcher/IncomingReports';
import { ReportVerification } from './pages/dispatcher/ReportVerification';
import { AmbulanceFleet } from './pages/dispatcher/AmbulanceFleet';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { AssignmentDetails } from './pages/driver/AssignmentDetails';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminHospitals } from './pages/admin/AdminHospitals';
import { AdminAmbulances } from './pages/admin/AdminAmbulances';
import { AdminCases } from './pages/admin/AdminCases';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminModels } from './pages/admin/AdminModels';
import { AdminActivity } from './pages/admin/AdminActivity';
import { AdminSettings } from './pages/admin/AdminSettings';

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, role, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Authenticating Session...</p>
      </div>
    );
  }

  if (!token && !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <AccessDenied />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<Landing />} />

            {/* Auth Layout Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Error Routes */}
            <Route path="/403" element={<AccessDenied />} />
            <Route path="/500" element={<ServerError />} />

            {/* Main Application Layout for Authenticated Role Dashboards */}
            <Route element={<MainLayout />}>
              {/* Citizen Routes */}
              <Route
                path="/citizen/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <CitizenDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/report-emergency"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <ReportEmergency />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/report"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <ReportEmergency />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/reports"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <MyReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/reports/:uuid"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <ReportDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/my-reports"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <MyReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/profile"
                element={
                  <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Emergency Worker Routes */}
              <Route
                path="/emergency-worker/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['EMERGENCY_WORKER', 'HOSPITAL_STAFF', 'ADMIN']}>
                    <WorkerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency-worker/assessment/:caseUuid"
                element={
                  <ProtectedRoute allowedRoles={['EMERGENCY_WORKER', 'HOSPITAL_STAFF', 'ADMIN']}>
                    <ClinicalAssessment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency-worker/assessment/:caseUuid/result"
                element={
                  <ProtectedRoute allowedRoles={['EMERGENCY_WORKER', 'HOSPITAL_STAFF', 'ADMIN']}>
                    <AssessmentResult />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency-worker/profile"
                element={
                  <ProtectedRoute allowedRoles={['EMERGENCY_WORKER', 'HOSPITAL_STAFF', 'ADMIN']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Hospital Staff Routes */}
              <Route
                path="/hospital/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['HOSPITAL_STAFF', 'ADMIN']}>
                    <DispatcherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/reports"
                element={
                  <ProtectedRoute allowedRoles={['HOSPITAL_STAFF', 'ADMIN']}>
                    <IncomingReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/reports/:uuid"
                element={
                  <ProtectedRoute allowedRoles={['HOSPITAL_STAFF', 'ADMIN']}>
                    <ReportVerification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/ambulances"
                element={
                  <ProtectedRoute allowedRoles={['HOSPITAL_STAFF', 'ADMIN']}>
                    <AmbulanceFleet />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/fleet"
                element={
                  <ProtectedRoute allowedRoles={['HOSPITAL_STAFF', 'ADMIN']}>
                    <AmbulanceFleet />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/cases"
                element={
                  <ProtectedRoute allowedRoles={['HOSPITAL_STAFF', 'ADMIN']}>
                    <IncomingReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/profile"
                element={
                  <ProtectedRoute allowedRoles={['HOSPITAL_STAFF', 'ADMIN']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Driver Paramedic Routes */}
              <Route
                path="/driver/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER_PARAMEDIC', 'ADMIN']}>
                    <DriverDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver/assignment/:uuid"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER_PARAMEDIC', 'ADMIN']}>
                    <AssignmentDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver/profile"
                element={
                  <ProtectedRoute allowedRoles={['DRIVER_PARAMEDIC', 'ADMIN']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/hospitals"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminHospitals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ambulances"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminAmbulances />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cases"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminCases />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/models"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminModels />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/activity"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminActivity />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/profile"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 404 Catch All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </Router>
  );
}
