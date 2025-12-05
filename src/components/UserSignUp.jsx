import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function SignUpPage() {
    const navigate = useNavigate();
    const [showpass, setShowpass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    // Generate random numbers for CAPTCHA
    const [captchaNum1] = useState(Math.floor(Math.random() * 10) + 1);
    const [captchaNum2] = useState(Math.floor(Math.random() * 10) + 1);

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return passwordRegex.test(password);
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg('');

        const formData = new FormData(e.target);
        const data = {
            firstname: formData.get('firstname'),
            lastname: formData.get('lastname'),
            middlename: formData.get('middlename'),
            email: formData.get('email'),
            username: formData.get('username'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            resultSum: formData.get('resultSum'),
        };

        // Validation checks
        if (!data.firstname || !data.lastname || !data.email || !data.password || !data.confirmPassword) {
            setMsg('Please fill in all required fields.');
            setLoading(false);
            return;
        }

        if (!validateEmail(data.email)) {
            setMsg('Please enter a valid email address.');
            setLoading(false);
            return;
        }

        if (!validatePassword(data.password)) {
            setMsg('Password must be at least 8 characters with uppercase, lowercase, and number.');
            setLoading(false);
            return;
        }

        if (data.password !== data.confirmPassword) {
            setMsg('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (parseInt(data.resultSum) !== (captchaNum1 + captchaNum2)) {
            setMsg('Incorrect captcha answer. Please try again.');
            setLoading(false);
            return;
        }

        try {
            // Sign up with Supabase Auth
            const { data: authData, error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        firstname: data.firstname,
                        lastname: data.lastname,
                        middlename: data.middlename,
                    }
                }
            });

            if (error) {
                setMsg(error.message);
                return;
            }

            // Insert into tbluser
            const { error: insertError } = await supabase
                .from('tbluser')
                .insert([{
                    auth_id: authData.user.id,
                    email: data.email,
                    firstname: data.firstname.trim().toUpperCase(),
                    lastname: data.lastname.trim().toUpperCase(),
                    middlename: data.middlename.trim().toUpperCase(),
                    username: data.username,
                    role: 'teacher' // default role
                }]);

            if (insertError) {
                setMsg('Failed to create user profile.');
                return;
            }

            setMsg('Sign up successful! Please check your email to verify your account.');
            // Optionally redirect after a delay
            setTimeout(() => navigate('/login'), 3000);

        } catch (err) {
            console.error(err);
            setMsg('Sign up failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-h-screen flex flex-col justify-center items-center py-8">
            <p className={`${!msg && 'visible'} text-lg ${msg.includes('successful') ? 'text-green-500' : 'text-red-500'} mt-12 text-center px-4`}>
                {msg}
            </p>
            <form 
                onSubmit={handleSignUp}
                className='flex flex-col justify-start items-center sm:border sm:border-gray-300 sm:shadow-lg px-6 py-8 rounded-lg max-w-md w-full h-full mt-6 mx-4 overflow-y-auto'
            >
                <h2 className="text-2xl font-bold mb-6">Sign Up</h2>
                
                {/* Name Fields */}
                <input
                    className="text-xl border border-gray-300 rounded-md p-2 mb-4 w-full"
                    placeholder="First Name *"
                    type="text"
                    name="firstname"
                    disabled={loading}
                    
                />
                
                <input
                    className="text-xl border border-gray-300 rounded-md p-2 mb-4 w-full"
                    placeholder="Last Name *"
                    type="text"
                    name="lastname"
                    disabled={loading}
                    
                />
                
                <input
                    className="text-xl border border-gray-300 rounded-md p-2 mb-4 w-full"
                    placeholder="Middle Name (Optional)"
                    type="text"
                    name="middlename"
                    disabled={loading}
                />

                {/* Email */}
                <input
                    className="text-xl border border-gray-300 rounded-md p-2 mb-4 w-full"
                    placeholder="Email *"
                    type="email"
                    name="email"
                    disabled={loading}
                    
                />

                {/* Username */}
                <input
                    className="text-xl border border-gray-300 rounded-md p-2 mb-4 w-full"
                    placeholder="Username *"
                    type="text"
                    name="username"
                    disabled={loading}
                    
                />

                {/* Password */}
                <div className='flex-col mb-4 w-full'>
                    <input
                        className="text-xl mb-1 border p-2 border-gray-300 rounded-md w-full"
                        placeholder="Password *"
                        type={showpass ? 'text' : 'password'}
                        name="password"
                        disabled={loading}
                        
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Min 8 characters, 1 uppercase, 1 lowercase, 1 number
                    </p>
                </div>

                {/* Confirm Password */}
                <input
                    className="text-xl border border-gray-300 rounded-md p-2 mb-4 w-full"
                    placeholder="Confirm Password *"
                    type={showpass ? 'text' : 'password'}
                    name="confirmPassword"
                    disabled={loading}
                    
                />

                {/* Show Password Checkbox */}
                <div className='mb-4 w-full'>
                    <label htmlFor="show-pass" className='cursor-pointer'>
                        <input 
                            id='show-pass' 
                            type="checkbox" 
                            checked={showpass} 
                            onChange={() => setShowpass(!showpass)} 
                        /> Show Password
                    </label>
                </div>

                {/* CAPTCHA */}
                <div className='w-full mb-4'>
                    <p className='text-lg mb-2'>What is {captchaNum1} + {captchaNum2}?</p>
                    <input
                        className="text-xl border border-gray-300 rounded-md p-2 w-full"
                        placeholder="Answer *"
                        type="number"
                        name="resultSum"
                        disabled={loading}
                        
                    />
                </div>

                {/* Buttons */}
                <div className='w-full flex flex-row gap-2'>
                    <button 
                        type="submit"
                        className="flex-1 bg-blue-500 text-white px-8 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors" 
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            </>
                        ) : (
                            'Sign Up'
                        )}
                    </button>
                    <button 
                        type="button"
                        className="flex-1 bg-gray-400 text-white px-8 py-2 rounded disabled:opacity-50 hover:bg-gray-500 transition-colors" 
                        onClick={() => navigate('/')}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                </div>

                {/* Login Link */}
                <p className='mt-4 text-sm'>
                    Already have an account? <span onClick={() => navigate('/login')} className='text-blue-500 cursor-pointer hover:underline'>Login</span>
                </p>
            </form>
        </div>
    );
}