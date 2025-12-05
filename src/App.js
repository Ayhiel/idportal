import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate} from 'react-router-dom';
import { UserPlusIcon, IdentificationIcon} from '@heroicons/react/24/solid';
import Modal from 'react-modal';
import AddStudent from './components/AddStudent';
import StudentList from './components/StudentList';
import PrintId from './components/PrintId';
import SetPrint from './components/SetPrint';
import Settings from './components/Settings';
import Header from './components/Header';
import { AuthProvider, useAuth } from './components/AuthContext';
import LoginPage from './components/UserLog';
import SignUpPage from './components/UserSignUp';
import NotFound from './components/NotFound';

Modal.setAppElement('#root');

// ✅ Reusable sidebar button component
function SidebarButton({ icon, label, path, currentPath, navigate, isActive }) {
  const active = isActive ?? (currentPath === path);
  
  return (
    <div
      onClick={() => navigate(path)}
      className={`cursor-pointer hover:bg-blue-300 hover:text-sky-800 p-4 flex flex-col items-center justify-center rounded-s-3xl transition ${
        active
          ? 'bg-white text-sky-900'
          : 'bg-sky-800 text-blue-300'
      }`}
    >
      {icon}
      <p className="font-semibold xl:text-md text-sm text-center">{label}</p>
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  return (
    <div className="min-h-screen">
      {/* Header and Sidebar only when not on HomePage */}
      <Header />

      <div className="flex h-screen z-0">
        {(isAdmin || isTeacher) && (
          <div className="hidden lg:flex flex-col pt-20 h-screen bg-sky-800">
            
            <div className="space-y-4 pl-4">
                  <SidebarButton
                    icon={<UserPlusIcon className="xl:w-10 w-8 mb-2" />}
                    label="Add Student"
                    path='/signup'
                    currentPath={currentPath}
                    navigate={navigate}
                    isActive={currentPath === '/' || currentPath === '/signup'}
                  />
              
                  <SidebarButton
                    icon={<IdentificationIcon className="xl:w-10 w-8 mb-2" />}
                    label="View Students"
                    path="/students"
                    currentPath={currentPath}
                    isActive={
                      currentPath === '/students' ||
                      currentPath.startsWith('/students/printid')
                    }
                    navigate={navigate}
                  />
                  {/* <SidebarButton
                    icon={<Cog6ToothIcon className="xl:w-10 w-8 mb-2" />}
                    label="Settings"
                    path="/settings"
                    currentPath={currentPath}
                    navigate={navigate}
                  /> */}
                
            </div>
              
            <div className="flex-grow"></div>

            <div className="text-center pb-4 lg:text-xs text-white">
              <p>Version 1.0</p>
              <p>&copy; 2025</p>
              <p><i><code>AAGerona</code></i></p>
            </div>
          </div>
      )}

        <div className='h-screen flex-1 overflow-hidden'>
          <main>
            <Routes>
              <Route path='*' element={<NotFound />} />
              <Route path="/" element={role === 'admin' ? <AddStudent /> : <Navigate to='/signup' />} />
              <Route path="/login" element={role !== 'admin' ? <LoginPage /> : <Navigate to='/signup' />} /> 
              <Route path="/userreg" element={role !== 'admin' ? <SignUpPage /> : <Navigate to='/signup' />} />   
              <Route path="/signup" element={<AddStudent />} />
              <Route path="/students" element={role === 'admin' || role === 'teacher' ? <StudentList /> : <Navigate to='/login' />} />
              <Route path="/setprint" element={role === 'admin' ? <SetPrint /> : <Navigate to="/login" />} />
              <Route path="/students/printid" element={role === 'admin' ? <PrintId /> : <Navigate to="/login" />} />
              <Route path="/settings" element={role === 'admin' ? <Settings /> : <Navigate to='/login' />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}