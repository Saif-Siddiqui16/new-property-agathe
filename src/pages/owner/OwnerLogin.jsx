import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Lock, Mail, Building2, ArrowRight } from 'lucide-react';
import api from '../../api/client';

export const OwnerLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('owner@example.com');
    const [password, setPassword] = useState('123456');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/api/auth/login', { email, password });

            // Check if user is actually an owner
            if (res.data.user.role !== 'OWNER' && res.data.user.role !== 'ADMIN') {
                alert('Access denied. Not an owner account.');
                setLoading(false);
                return;
            }

            const { accessToken, refreshToken, user } = res.data;
            localStorage.setItem('accessToken', accessToken);
            // We use 'isOwnerLoggedIn' for existing frontend logic routing
            localStorage.setItem('isOwnerLoggedIn', 'true');
            localStorage.setItem('ownerId', user.id);

            navigate('/owner/dashboard');
        } catch (err) {
            console.error(err);
            alert('Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    const autofillDemo = () => {
        setEmail('owner@example.com');
        setPassword('123456');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-slate-50 to-slate-50">
            <div className="w-full max-w-md">
                {/* Logo & Branding */}
                <div className="text-center mb-8 md:mb-10 space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white shadow-xl shadow-indigo-100/50 border border-slate-100 text-indigo-600 mb-2 group transition-all hover:scale-105 active:scale-95 duration-500">
                        <Building2 size={32} className="md:w-[40px] md:h-[40px] group-hover:rotate-12 transition-transform duration-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight italic uppercase">
                            Owner<span className="text-indigo-600">Portal</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2 px-1 border-x-2 border-indigo-200 inline-block">
                            Portfolio Management
                        </p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden relative group">
                    <div className="p-6 md:p-10 space-y-6 md:space-y-8 relative z-10">
                        <div className="space-y-2 text-center">
                            <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight italic">Welcome Back</h2>
                            <p className="text-xs md:text-sm text-slate-400 font-medium italic">Secure access to your property portfolio</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                    <Mail size={12} className="text-indigo-400" />
                                    Owner Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300"
                                    placeholder="owner@example.com"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                    <Lock size={12} className="text-indigo-400" />
                                    Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300 font-mono"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 group overflow-hidden relative"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {loading ? 'Authenticating...' : 'Enter Portal'}
                                    {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-700 group-hover:scale-105 transition-transform duration-500"></div>
                            </Button>
                        </form>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3 mt-4">
                            <div className="flex items-center justify-between">
                                <strong className="text-xs font-black text-slate-800 uppercase tracking-widest">Demo Credentials</strong>
                                <button onClick={autofillDemo} className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 hover:underline uppercase tracking-wider">Click to autofill</button>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-500 italic">Email: <span className="text-slate-700 not-italic">owner@example.com</span></p>
                                <p className="text-[11px] font-bold text-slate-500 italic">Password: <span className="text-slate-700 not-italic uppercase tracking-widest">123456</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-50 rounded-full -ml-16 -mb-16 blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700"></div>
                </div>

                {/* Footer Links */}
                <div className="mt-8 text-center space-y-4">
                    <p className="text-sm text-slate-500 font-medium">
                        Are you an Admin?{" "}
                        <button
                            onClick={() => navigate('/login')}
                            className="text-indigo-600 font-bold hover:underline cursor-pointer"
                        >
                            Admin Login
                        </button>
                    </p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                        PropManage SaaS • Secured Portfolio Access
                    </p>
                </div>
            </div>
        </div>
    );
};
