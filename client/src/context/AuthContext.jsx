import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [student, setStudent]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('sc_student')); } catch { return null; }
  });
  const [isAdmin, setIsAdmin]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const refreshStudent = useCallback(async () => {
    const token = localStorage.getItem('sc_token');
    if (!token) {
      setStudent(null);
      return null;
    }

    const { data } = await api.get('/students/me');
    const fresh = data?.student || null;
    if (!fresh) throw new Error('Unable to refresh student');

    setStudent(fresh);
    localStorage.setItem('sc_student', JSON.stringify(fresh));
    sessionStorage.removeItem('sc_terminated');
    return fresh;
  }, []);

  const login = useCallback(async ({ rollNo, password }) => {
    const { data } = await api.post('/auth/login', { rollNo, password });
    localStorage.setItem('sc_token', data.token);
    localStorage.removeItem('terminated');
    localStorage.removeItem('terminatedReason');
    localStorage.setItem('sc_student', JSON.stringify(data.student));
    sessionStorage.removeItem('sc_terminated');
    setStudent(data.student);
    return data.student;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('sc_token', data.token);
    localStorage.removeItem('terminated');
    localStorage.removeItem('terminatedReason');
    localStorage.setItem('sc_student', JSON.stringify(data.student));
    sessionStorage.removeItem('sc_terminated');
    setStudent(data.student);
    return data.student;
  }, []);

  const adminLogin = useCallback(async (password) => {
    const { data } = await api.post('/auth/admin', { password });
    localStorage.setItem('sc_admin_token', data.token);
    setIsAdmin(true);
    return true;
  }, []);

  const adminLogout = useCallback(() => {
    api.post('/auth/admin/logout').catch(() => {});
    localStorage.removeItem('sc_admin_token');
    setIsAdmin(false);
  }, []);

  const reinstate = useCallback(async (rollNo, code) => {
    const { data } = await api.post('/auth/reinstate', { rollNo, code });
    localStorage.setItem('sc_token', data.token);
    localStorage.removeItem('terminated');
    localStorage.removeItem('terminatedReason');
    localStorage.setItem('sc_student', JSON.stringify(data.student));
    sessionStorage.removeItem('sc_terminated');
    setStudent(data.student);
    return data.student;
  }, []);

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_student');
    localStorage.removeItem('terminated');
    localStorage.removeItem('terminatedReason');
    sessionStorage.removeItem('sc_terminated');
    setStudent(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('sc_token');
    if (!token) return;

    let active = true;
    setLoading(true);

    refreshStudent()
      .catch(() => {
        localStorage.removeItem('sc_token');
        localStorage.removeItem('sc_student');
        localStorage.removeItem('terminated');
        localStorage.removeItem('terminatedReason');
        sessionStorage.removeItem('sc_terminated');
        if (active) setStudent(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshStudent]);

  // Heartbeat every 30s
  useEffect(() => {
    if (!student) return;
    const id = setInterval(() => {
      api.patch('/students/me/heartbeat').catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [student]);

  return (
    <AuthContext.Provider value={{ student, setStudent, isAdmin, setIsAdmin, login, register, adminLogin, adminLogout, reinstate, refreshStudent, logout, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
