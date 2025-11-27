import { createContext, useState, useContext } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [role, setRole] = useState(localStorage.getItem('role') || 'student');
  const [user, setUser] = useState(localStorage.getItem('isAuthenticated') === 'true' ? { username: 'admin' } : null);

  const login = (userRole) => {
    setRole(userRole);
    setUser({ username: 'admin' });
    localStorage.setItem('role', userRole);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setRole('student');
    setUser(null);
    localStorage.removeItem('role');
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <AuthContext.Provider value={{ role, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);