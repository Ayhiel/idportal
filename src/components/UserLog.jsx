import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showpass, setShowpass] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [msg, setMsg] = useState('');

    const handleLogin = async () => {
        setLoading(true);
        setMsg('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                setMsg('Invalid email or password.');
                return;
            }

            const { data: userData, error: userError } = await supabase
                .from('tbluser')
                .select('id, username, role, email')
                .eq('auth_id', data.user.id)
                .single();

            if (userError || !userData) {
                setMsg('User data not found.');
                return;
            }

            // Pass both role and userData
            login(userData.role, userData);

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
            <div className='flex flex-col justify-center items-center sm:border sm:border-gray-300 sm:shadow-lg px-6 py-8 rounded-lg max-w-md w-full mx-4'>
                <h2 className="text-2xl font-bold mb-8">Login</h2>
                <input
                    className="text-xl border border-gray-300 rounded-md p-2 mb-4 w-full"
                    placeholder="Email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={loading}
                />
                <div className='flex-col mb-6 w-full'>
                    <input
                        className="text-xl mb-1 border p-2 border-gray-300 rounded-md w-full"
                        placeholder="Password"
                        type={showpass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={loading}
                    />
                    <div>
                        <label htmlFor="show-pass" className='cursor-pointer'>
                            <input id='show-pass' type="checkbox" checked={showpass} onChange={() => setShowpass(!showpass)} /> Show Password
                        </label>
                    </div>
                </div>
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
                {/* Login Link */}
                <p className='mt-4 text-sm'>
                    Don't have an account? <span onClick={() => navigate('/userreg')} className='text-blue-500 cursor-pointer hover:underline'>Sign up</span>
                </p>
            </div>
        </div>
    );
}