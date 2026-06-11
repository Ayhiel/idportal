import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import PassCodeModal from './PassCodeModal';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showpass, setShowpass] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [msg, setMsg] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [forgotModalOpen, setForgotModalOpen] = useState(false);
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMsg, setForgotMsg] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMsg, setResetMsg] = useState('');

    const validatePassword = (value) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return passwordRegex.test(value);
    };

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
                .select('id, username, firstname, lastname, middlename, role, email')
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

    const openForgotPassword = () => {
        setResetEmail(email);
        setForgotMsg('');
        setForgotModalOpen(true);
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMsg('');

        try {
            const recoveryEmail = resetEmail.trim();

            if (!recoveryEmail) {
                setForgotMsg('Please enter your email address.');
                return;
            }

            const redirectTo = `${window.location.origin}/login?reset=1`;
            const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
                redirectTo,
            });

            if (error) throw error;

            setForgotMsg('If that email exists, a password reset link has been sent.');
        } catch (err) {
            console.error('Password reset request error:', err);
            setForgotMsg(err.message || 'Failed to send password reset email.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetLoading(true);
        setResetMsg('');

        try {
            if (!newPassword || !confirmPassword) {
                setResetMsg('Please complete both password fields.');
                return;
            }

            if (!validatePassword(newPassword)) {
                setResetMsg('Password must be at least 8 characters with uppercase, lowercase, and number.');
                return;
            }

            if (newPassword !== confirmPassword) {
                setResetMsg('New password and confirm password do not match.');
                return;
            }

            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            setResetMsg('Password changed successfully. You can now log in.');
            setNewPassword('');
            setConfirmPassword('');
            await supabase.auth.signOut();
            setTimeout(() => {
                setResetModalOpen(false);
                navigate('/login', { replace: true });
            }, 1200);
        } catch (err) {
            console.error('Password reset error:', err);
            setResetMsg(err.message || 'Failed to update password. Please request a new reset link.');
        } finally {
            setResetLoading(false);
        }
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

    useEffect(() => {
        const clearPasscode = () => {
            sessionStorage.removeItem('passcodeVerified');
        };

        window.addEventListener('beforeunload', clearPasscode);

        return () => {
            window.removeEventListener('beforeunload', clearPasscode);
        };
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const hasRecoveryQuery = params.get('reset') === '1';
        const hasRecoveryHash = window.location.hash.includes('type=recovery');

        if (hasRecoveryQuery || hasRecoveryHash) {
            setResetModalOpen(true);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setResetModalOpen(true);
                setResetMsg('');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    return (
        <div className="h-dvh overflow-hidden flex flex-col justify-center items-center">
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
                    <button
                        type="button"
                        onClick={openForgotPassword}
                        className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                        Forgot your password?
                    </button>
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
                    Don't have an account? <span onClick={() => setShowModal(true)} className='text-blue-500 cursor-pointer hover:underline'>Sign up</span>
                </p>
            </div>
            <PassCodeModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={handlePasscodeConfirm}
                title="Enter Passcode"
                message="Please enter the passcode to access signup"
                showConfirm={true}
            />

            {forgotModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
                    <form onSubmit={handleForgotPassword} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-2 text-xl font-bold text-sky-900">Reset Password</h2>
                        <p className="mb-4 text-sm text-gray-600">
                            Enter your account email and Supabase will send a password reset link.
                        </p>
                        <input
                            className="mb-3 w-full rounded border border-gray-300 p-2"
                            type="email"
                            placeholder="Email address"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            disabled={forgotLoading}
                            required
                        />
                        {forgotMsg && (
                            <p className={`mb-3 text-sm ${forgotMsg.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
                                {forgotMsg}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={forgotLoading}
                                className="flex-1 rounded bg-sky-700 px-4 py-2 text-white disabled:opacity-50"
                            >
                                {forgotLoading ? 'Sending...' : 'Send Link'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setForgotModalOpen(false)}
                                disabled={forgotLoading}
                                className="flex-1 rounded bg-gray-300 px-4 py-2 disabled:opacity-50"
                            >
                                Close
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {resetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
                    <form onSubmit={handleResetPassword} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-2 text-xl font-bold text-sky-900">Create New Password</h2>
                        <p className="mb-4 text-sm text-gray-600">
                            Enter a new password for your account.
                        </p>
                        <input
                            className="mb-3 w-full rounded border border-gray-300 p-2"
                            type={showResetPassword ? 'text' : 'password'}
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={resetLoading}
                            required
                        />
                        <input
                            className="mb-3 w-full rounded border border-gray-300 p-2"
                            type={showResetPassword ? 'text' : 'password'}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={resetLoading}
                            required
                        />
                        <label htmlFor="show-reset-password" className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                            <input
                                id="show-reset-password"
                                type="checkbox"
                                checked={showResetPassword}
                                onChange={() => setShowResetPassword(prev => !prev)}
                                disabled={resetLoading}
                            />
                            Show Password
                        </label>
                        {resetMsg && (
                            <p className={`mb-3 text-sm ${resetMsg.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                                {resetMsg}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={resetLoading}
                                className="flex-1 rounded bg-sky-700 px-4 py-2 text-white disabled:opacity-50"
                            >
                                {resetLoading ? 'Saving...' : 'Save Password'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setResetModalOpen(false);
                                    navigate('/login', { replace: true });
                                }}
                                disabled={resetLoading}
                                className="flex-1 rounded bg-gray-300 px-4 py-2 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
