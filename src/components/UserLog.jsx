import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LoginPage() {
    const API_URL = process.env.REACT_APP_API_URL;
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [msg, setMsg] = useState('');

    const handleLogin = async () => {
    try {
        const res = await axios.post(`${API_URL}/api/login`, {
            username,
            password,
        });

        if (res.data.success) {
            login(res.data.role); // admin or student
            navigate('/students');
        }
        } catch (err) {
            setMsg('Invalid username or password. Please try again!');
        }
    };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center">
        <p className={`${!msg && 'hidden'} text-lg text-red-500 mb-4`}>{msg}</p>
        <div className='flex flex-col justify-center items-center border border-gray-300 shadow-lg px-4 py-8 rounded-lg'>
            <h2 className="text-2xl font-bold mb-12">Admin Login</h2>
            <input
                className="text-xl border border-gray-300 rounded-md p-2 mb-4"
                placeholder="Username"
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                className="text-xl border p-2 mb-8 border-gray-300 rounded-md"
                placeholder="Password"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
            />
            <div className='w-full flex flex-row gap-2'>
                <button className="flex-1 bg-blue-500 text-white px-8 py-2 rounded" onClick={handleLogin}>
                    Login
                </button>
                <button className="flex-1 bg-gray-400 text-white px-8 py-2 rounded" onClick={() => navigate('/')}>
                    Cancel
                </button>
            </div>
        </div>
    </div>
  );
}
