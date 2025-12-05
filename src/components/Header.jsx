import { ArrowLeftEndOnRectangleIcon, IdentificationIcon, PowerIcon, Bars3Icon, XMarkIcon, UserPlusIcon } from '@heroicons/react/24/solid'; // or any icon you're using
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import CustomModal from "./CustomModal";
import PassCodeModal from './PassCodeModal';

export default function Header() {
//   const location = useLocation();
//   const isHome = location.pathname === '/';

    // Opening Custom Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalMessage, setModalMessage] = useState("");
    const [modalAction, setModalAction] = useState(() => () => {});
    const [showConfirm, setShowConfirm] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const { logout, role, user } = useAuth();
    const isAdmin = role === 'admin';
    const isTeacher = role === 'teacher';
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleCloseModal = () => setModalOpen(false);

    const handleLogoutClick = () => {
      setModalTitle("Confirm Logout");
      setModalMessage("Are you sure you want to log out?");
      setModalAction(() => async () => {
        await logout();
        navigate("/signup");
      });
      setShowConfirm(true);
      setModalOpen(true);
    };

    const CORRECT_PASSCODE = '301304'; // Set your passcode here

  const handlePasscodeConfirm = (passcode) => {
    if (passcode === CORRECT_PASSCODE) {
      setShowModal(false);
      sessionStorage.setItem('passcodeVerified', 'true');
      navigate('/userreg'); // Redirect to signup page
      return true; // Important: return true for success
    }
    return false; // Important: return false for error
  };

  window.addEventListener('beforeunload', () => {
  sessionStorage.removeItem('passcodeVerified');
});

    return (
  <>
    <header className="fixed top-0 left-0 w-full z-50 bg-sky-800 text-white p-4 px-0 lg:px-8 shadow-md flex justify-between items-center">
      <div 
        onClick={() => navigate('/')} 
        className="cursor-pointer text-white flex flex-row items-center gap-2 mx-4"
      >
        <IdentificationIcon className='h-8 w-8'/>
        <p className='lg:text-2xl font-bold'>Student ID Portal</p>
      </div>

      {/* Desktop Menu */}
      <div className='hidden lg:flex items-center gap-6'>
        <h1 className='text-lg font-semibold'>
          Welcome {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1)  : ""}!
        </h1>
        <button 
          onClick={(isAdmin || isTeacher) ? handleLogoutClick : () => navigate('/login')} 
          className='flex items-center gap-2 text-lg text-white hover:text-sky-300 rounded-lg transition-colors'
        >
          {isAdmin || isTeacher ? (
            <>
              <PowerIcon className='w-5'/>
              <span className='text-sm'>Logout</span>
            </>
          ) : (
            <>
              <ArrowLeftEndOnRectangleIcon className='w-5'/>
              <span className='text-sm'>Login</span>
            </>
          )}
        </button>
        {(!isAdmin && !isTeacher) && (
          <button 
            onClick={() => { setShowModal(true); setIsMenuOpen(false)}}
            className='flex items-center gap-2 text-lg text-white hover:text-sky-300 rounded-lg transition-colors'>
            <UserPlusIcon className='w-5'/>
            <span className='text-sm'>Sign up</span>
        </button>
        )}
      </div>

      {/* Mobile Hamburger Icon */}
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className='lg:hidden mr-4 z-50'
      >
        {isMenuOpen ? (
          <XMarkIcon className='w-6 h-6' />
        ) : (
          <Bars3Icon className='w-6 h-6' />
        )}
      </button>
    </header>

    {/* Mobile Menu Overlay */}
    {isMenuOpen && (
      <div 
        className='fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden'
        onClick={() => setIsMenuOpen(false)}
      />
    )}

    {/* Mobile Menu Sidebar */}
    <div 
      className={`fixed top-0 right-0 h-full w-64 bg-sky-950 shadow-lg z-40 lg:hidden transform transition-transform duration-300 ease-in-out ${
        isMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className='flex flex-col pt-16'>
        <h1 className='text-lg font-bold text-white p-8 bg-sky-800'>
          Welcome {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1)  : ""}!
        </h1>
        <div className='flex flex-col gap-8 text-white p-8'>
            {(isAdmin || isTeacher) && (
                <>
                <button 
                    onClick={() => { navigate('/signup'); setIsMenuOpen(false)}}
                    className='flex items-center gap-2 text-lg w-full text-white hover:text-sky-600 rounded-lg transition-colors'>
                    <UserPlusIcon className='w-5'/>
                    <span className='text-sm'>Add Student</span>
                </button>
                <button 
                    onClick={() => { navigate('/students'); setIsMenuOpen(false)}}
                    className='flex items-center gap-2 text-lg w-full text-white hover:text-sky-600 rounded-lg transition-colors'>
                    <IdentificationIcon className='w-5'/>
                    <span className='text-sm'>View Students</span>
                </button>
                </>
            )}
            <button 
                onClick={(isAdmin || isTeacher) ? handleLogoutClick : () => {navigate('/login'); setIsMenuOpen(false)}}
                className='flex items-center gap-2 text-lg w-full text-white hover:text-sky-600 rounded-lg transition-colors'
            >
            {isAdmin || isTeacher ? (
                <>
                <PowerIcon className='w-5'/>
                <span className='text-sm'>Logout</span>
                </>
            ) : (
                <>
                <ArrowLeftEndOnRectangleIcon className='w-5'/>
                <span className='text-sm'>Login</span>
                </>
            )}
            </button>
 
            {(!isAdmin && !isTeacher) && (
              <button 
                onClick={() => { setShowModal(true); setIsMenuOpen(false)}}
                className='flex items-center gap-2 text-lg w-full text-white hover:text-sky-600 rounded-lg transition-colors'>
                <UserPlusIcon className='w-5'/>
                <span className='text-sm'>Sign up</span>
              </button>
            )}
    
        </div>
      </div>
        <CustomModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          title={modalTitle}
          message={modalMessage}
          onConfirm={async () => { // Add async here
            await modalAction(); // Add await here
            handleCloseModal();
            setIsMenuOpen(false);
          }}
          showConfirm={showConfirm}
        />
        <PassCodeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handlePasscodeConfirm}
          title="Enter Passcode"
          message="Please enter the passcode to access signup"
          showConfirm={true}
        />
    </div>
  </>
);
}
