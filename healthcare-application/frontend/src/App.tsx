import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { DemoProvider } from './components/demo/DemoContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';
import { PrivacyPage } from './pages/public/PrivacyPage';
import { TermsPage } from './pages/public/TermsPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { AshaDashboard } from './pages/asha/AshaDashboard';
import { MedicalOfficerDashboard } from './pages/mo/MedicalOfficerDashboard';
import { DistrictOfficerDashboard } from './pages/dho/DistrictOfficerDashboard';
import { ReferralFacilityDashboard } from './pages/referral/ReferralFacilityDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ChestXRayWorkstation } from './pages/mo/ChestXRayWorkstation';
import { FederatedLearningView } from './pages/admin/FederatedLearningView';
import './styles/tokens.css';
import './styles/global.css';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DemoProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/* Authenticated Application Shell */}
            <Route element={<AppLayout />}>
              {/* Citizen / Patient Portal */}
              <Route
                path="/patient/*"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'system_admin']}>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ASHA / ANM Frontline Outreach */}
              <Route
                path="/asha/*"
                element={
                  <ProtectedRoute allowedRoles={['asha', 'anm', 'system_admin']}>
                    <AshaDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Medical Officer OPD & Clinical Workstation */}
              <Route
                path="/mo/chest-xray"
                element={
                  <ProtectedRoute allowedRoles={['medical_officer', 'system_admin', 'referral_facility']}>
                    <ChestXRayWorkstation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/chest-xray"
                element={
                  <ProtectedRoute allowedRoles={['medical_officer', 'system_admin', 'referral_facility']}>
                    <ChestXRayWorkstation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mo/*"
                element={
                  <ProtectedRoute allowedRoles={['medical_officer', 'system_admin']}>
                    <MedicalOfficerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/*"
                element={
                  <ProtectedRoute allowedRoles={['medical_officer', 'system_admin']}>
                    <MedicalOfficerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* District Health Officer & State Intelligence */}
              <Route
                path="/dho/*"
                element={
                  <ProtectedRoute allowedRoles={['district_officer', 'state_admin', 'system_admin']}>
                    <DistrictOfficerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/state/*"
                element={
                  <ProtectedRoute allowedRoles={['district_officer', 'state_admin', 'system_admin']}>
                    <DistrictOfficerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Referral Specialist Facility */}
              <Route
                path="/referral/*"
                element={
                  <ProtectedRoute allowedRoles={['referral_facility', 'medical_officer', 'system_admin']}>
                    <ReferralFacilityDashboard />
                  </ProtectedRoute>
                }
              />

              {/* System Administration & Federated Learning */}
              <Route
                path="/admin/federated-learning"
                element={
                  <ProtectedRoute allowedRoles={['system_admin']}>
                    <FederatedLearningView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['system_admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </DemoProvider>
    </AuthProvider>
  );
};

export default App;
