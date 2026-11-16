import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DiwaliThemeProvider, useDiwaliTheme } from './contexts/DiwaliThemeContext';
import { checkAndTriggerMidnightClosing } from './utils/closingEngine';
import { useDataIntegrityGuard } from './hooks/useDataIntegrityGuard';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileNav from './components/layout/MobileNav';
import DiwaliToran from './components/diwali/DiwaliToran';
import FestiveSparkles from './components/diwali/FestiveSparkles';
import PostersShowcase from './components/media/PostersShowcase';

// Pages - Direct static imports (NO React.lazy to eliminate Error #130)
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Wallet from './pages/Wallet';
import IDCardPage from './pages/IDCardPage';
import CertificatePage from './pages/CertificatePage';
import Gallery from './pages/Gallery';
import AdminPanel from './pages/AdminPanel';

// Loading Fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/logo.svg"
            alt="Uttam Charitable Welfare Foundation"
            className="w-10 h-10 rounded-full object-contain shadow-sm bg-white p-0.5"
            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
          />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
          उत्तम चैरिटेबल वेलफेयर फाउंडेशन
        </h2>
        <p className="text-xs font-medium text-emerald-700 mt-1">
          Uttam Charitable Welfare Foundation
        </p>
        <p className="text-[11px] text-gray-400 mt-3">पोर्टल लोड हो रहा है, कृपया प्रतीक्षा करें...</p>
      </div>
    </div>
  );
}

// Protected Route for Members
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Admin Route for Super Admins
function AdminRoute({ children }) {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!isAdmin && !currentUser?.isAdmin) {
    return <AdminLogin />;
  }

  return children;
}

function AppContent() {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const inputRef = useRef(null);
  const { isDiwaliActive } = useDiwaliTheme();

  return (
    <div className="flex flex-col min-h-screen bg-ambient-light text-slate-900 relative selection:bg-emerald-500 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* 1. Festive Marigold & Mango Leaf Toran (when Diwali Theme is active) */}
      {isDiwaliActive && <DiwaliToran />}

      {/* 2. Non-Intrusive Golden Sparkles & Gentle Fireworks Aura */}
      {isDiwaliActive && <FestiveSparkles />}

      {/* 3. Slot 4: Special Festive Dismissible Popup Poster */}
      <PostersShowcase slot="popup" />

      {/* Ambient Atmospheric Glow for Glassmorphic Depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] bg-amber-500/12 rounded-full blur-3xl" />
        <div className="absolute top-2/3 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-emerald-400/12 rounded-full blur-3xl" />
      </div>
      <Navbar />
      <main className="flex-grow pb-28 md:pb-0 w-full max-w-full">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/gallery" element={<Gallery />} />

          {/* Member Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <Team />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/id-card"
            element={
              <ProtectedRoute>
                <IDCardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <CertificatePage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes - Supports /admin, /admin-panel, /adminpanel, /admin_panel, /admin-dashboard */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route
            path="/admin-panel"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route
            path="/adminpanel"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route
            path="/admin_panel"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}

export default function App() {
  useDataIntegrityGuard();

  useEffect(() => {
    // Check and auto-generate daily midnight closing if missing
    checkAndTriggerMidnightClosing();
  }, []);

  return (
    <AuthProvider>
      <DiwaliThemeProvider>
        <AppContent />
      </DiwaliThemeProvider>
    </AuthProvider>
  );
}
