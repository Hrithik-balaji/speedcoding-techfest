import { Suspense, lazy, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import { useAuth } from './hooks/useAuth';
import WakeUpScreen from './components/WakeUpScreen';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ExamPage = lazy(() => import('./pages/ExamPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));

function ProtectedExam({ children }) {
  const { student } = useAuth();
  if (!student) return <Navigate to="/" replace />;
  return <ExamProvider>{children}</ExamProvider>;
}

function ProtectedAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

function AppRoutes() {
  const { student } = useAuth();
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-bg flex items-center justify-center text-muted">Loading...</div>}>
      <Routes>
        <Route path="/"          element={student ? <Navigate to="/exam" replace /> : <LoginPage />} />
        <Route path="/exam"      element={<ProtectedExam><ExamPage /></ProtectedExam>} />
        <Route path="/admin"     element={<AdminPage />} />
        <Route path="/leaderboard" element={<ProtectedAdmin><LeaderboardPage /></ProtectedAdmin>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const [showApp, setShowApp] = useState(false);

  // Stable reference — never recreated, so WakeUpScreen's effect never re-runs.
  const handleReady = useCallback(() => {
    setShowApp(true);
  }, []);

  if (!showApp) {
    return <WakeUpScreen onReady={handleReady} />;
  }

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
