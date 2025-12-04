import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [role, setRole] = useState(localStorage.getItem('role') || 'student');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Fetch user data from tbluser
        const { data: userData } = await supabase
          .from('tbluser')
          .select('username, email, role')
          .eq('auth_id', authUser.id)
          .single();
        
        if (userData) {
          setUser(userData);
          setRole(userData.role);
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('role', userData.role);
        }
      }
    };

    checkUser();
  }, []);

  const login = (userRole, userData) => {
    setRole(userRole);
    setUser(userData);
    localStorage.setItem('role', userRole);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setRole('student');
    setUser(null);
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <AuthContext.Provider value={{ role, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);