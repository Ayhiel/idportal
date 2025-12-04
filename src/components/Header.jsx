import { ArrowLeftEndOnRectangleIcon, IdentificationIcon, PowerIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/solid'; // or any icon you're using
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Header() {
//   const location = useLocation();
//   const isHome = location.pathname === '/';

    const { logout, role, user } = useAuth();
    const isAdmin = role === 'admin';
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      <div className='hidden lg:flex items-center gap-4'>
        <h1 className='text-lg font-semibold'>
          {user?.username ? `Welcome ${user.username}!` : ""}
        </h1>
        <button 
          onClick={isAdmin ? logout : () => navigate('/login')} 
          className='flex items-center pr-2 gap-1 text-lg'
        >
          {isAdmin ? (
            <>
              <PowerIcon className='w-5'/>
              <span className='text-sm'>Logout</span>
            </>
          ) : (
            <>
              <ArrowLeftEndOnRectangleIcon className='w-5'/>
              <span>Login as Teacher</span>
            </>
          )}
        </button>
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
          Welcome {user?.username ? user.username : ""}!
        </h1>
        <div className='flex flex-col gap-8 text-white p-8'>
            <button 
                onClick={() => {
                setIsMenuOpen(false);
                isAdmin ? logout() : navigate('/login');
                }} 
                className='flex items-center gap-2 text-lg w-full text-white hover:text-sky-600 rounded-lg transition-colors'
            >
            {isAdmin ? (
                <>
                <PowerIcon className='w-5'/>
                <span className='text-sm'>Logout</span>
                </>
            ) : (
                <>
                <ArrowLeftEndOnRectangleIcon className='w-5'/>
                <span className='text-sm'>Login as Teacher</span>
                </>
            )}
            </button>
            <div className='flex items-center gap-2 text-lg w-full text-white hover:text-sky-600 rounded-lg transition-colors'>
                <ArrowLeftEndOnRectangleIcon className='w-5'/>
                <span className='text-sm'>Link 1</span>
            </div>
            <div className='flex items-center gap-2 text-lg w-full text-white hover:text-sky-600 rounded-lg transition-colors'>
                <ArrowLeftEndOnRectangleIcon className='w-5'/>
                <span className='text-sm'>Link 2</span>
            </div>
        </div>
      </div>
    </div>
  </>
);
}
