import { useNavigate } from 'react-router-dom';
import { UserIcon } from '@heroicons/react/24/solid';

export default function HomePage() {

const navigate = useNavigate();

  return (
    
    <div className="h-screen bg-blue-300 flex items-center justify-center">
      {/* Content area (with left margin equal to sidebar width) */}
      <div className="space-y-4 min-w-72">
        {/* You can place the main content here */}
        <div onClick={() => navigate('/signup')} className='flex items-center px-12 p-4 cursor-pointer text-blue-900 hover:shadow-lg hover:bg-blue-400 hover:text-white border rounded-xl'>
          <UserIcon className='w-16' />
          <h1 className="text-2xl font-bold">Student</h1>
        </div>
         <div onClick={() => navigate('/login')} className='flex items-center px-12 p-4 cursor-pointer text-green-900 hover:shadow-lg hover:bg-green-400 hover:text-white border rounded-xl'>
          <UserIcon className='w-16' />
          <h1 className="text-2xl font-bold">Teacher</h1>
        </div>
      </div>
    </div>
  );
}
