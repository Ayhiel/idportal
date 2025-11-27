import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [msg, setMsg] = useState('');

    const handleLogin = async () => {
        setLoading(true);
        setMsg('');

        try {
            const { data: userData } = await supabase
            .from('tbluser')
            .select('username, password, role, email')
            .eq('username', username)
            .maybeSingle();

            if (!userData || userData.password !== password) {
            setMsg('Invalid username or password.');
            return;
            }

            // Sign in with Supabase Auth
            const { error } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: password,
            });

            if (error) {
            setMsg('Invalid username or password.');
            return;
            }

            // Login successful
            login(userData.role);
            navigate('/students');

        } catch (err) {
            console.error(err);
            setMsg('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
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
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={loading}
                />
                <input
                    className="text-xl border p-2 mb-8 border-gray-300 rounded-md"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={loading}
                />
                <div className='w-full flex flex-row gap-2'>
                    <button 
                        className="flex-1 bg-blue-500 text-white px-8 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                
                            </>
                        ) : (
                            'Login'
                        )}
                    </button>
                    <button 
                        className="flex-1 bg-gray-400 text-white px-8 py-2 rounded disabled:opacity-50" 
                        onClick={() => navigate('/')}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}