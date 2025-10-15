import { ArrowLeftEndOnRectangleIcon, ArrowLeftStartOnRectangleIcon, IdentificationIcon } from '@heroicons/react/24/solid'; // or any icon you're using
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header() {
//   const location = useLocation();
//   const isHome = location.pathname === '/';

    const { logout, role } = useAuth();
    const isAdmin = role === 'admin';
    const navigate = useNavigate();

    return (
        <>
            {/* {!isHome ? (
                <header className="fixed top-0 left-0 w-full bg-sky-800 text-white p-4 shadow z-50 flex justify-between items-center">
                    <nav>
                        <Link to="/" className="text-white flex flex-row items-center gap-2 mx-4 hover:underline">
                            <HomeIcon className='h-8 w-8'/>
                            <p>Home</p>
                        </Link>
                    </nav>
                </header>
            ) : ( */}
                <header className="fixed top-0 left-0 w-full z-50 bg-sky-800 text-white p-4 px-0 lg:px-8 shadow-md flex justify-between items-center">
                    <div onClick={() => navigate('/')} className="cursor-pointer text-white flex flex-row items-center gap-2 mx-4">
                        <IdentificationIcon className='h-8 w-8'/>
                        <p className='lg:text-2xl font-bold'>Student ID Portal</p>
                    </div>
                    <button onClick={isAdmin ? logout : () => navigate('/login')} 
                        className='flex items-center pr-2 lg:gap-2 text-xs lg:text-lg'
                    >
                        {isAdmin ? (
                            <>
                                <ArrowLeftStartOnRectangleIcon className='w-8'/>
                                Logout
                            </>
                         ) : (
                            <>
                                <ArrowLeftEndOnRectangleIcon className='w-8'/>
                                Login as Admin
                            </>
                        )}
                    </button>
                </header>
            {/* )} */}
        </>
    );
}
