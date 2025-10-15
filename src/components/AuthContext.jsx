import { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [role, setRole] = useState(localStorage.getItem('role') || 'student'); // default: student

  const login = (userRole) => {
    setRole(userRole);
    localStorage.setItem('role', userRole);
  };

  const logout = () => {
    setRole('student');
    localStorage.removeItem('role');
  };

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
