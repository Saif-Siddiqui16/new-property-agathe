import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../api/client';

export const TenantLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await api.post('/api/auth/login', { email, password });

            if (res.data.user.role !== 'TENANT' && res.data.user.role !== 'ADMIN') {
                setError('Access denied. Not a tenant account.');
                setIsLoading(false);
                return;
            }

            const { accessToken, refreshToken, user } = res.data;
            localStorage.setItem('accessToken', accessToken);
            // Use 'tenantLoggedIn' for existing frontend logic
            localStorage.setItem('tenantLoggedIn', 'true');
            localStorage.setItem('currentTenantId', user.id);

            navigate('/tenant/dashboard');
        } catch (err) {
            console.error(err);
            setError('Invalid email or password.');
        } finally {
            setIsLoading(false);
        }
    };

    const autofillDemo = () => {
        setEmail('tenant@example.com');
        setPassword('123456');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg shadow-primary-200">
                        T
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Tenant Portal</h1>
                    <p className="text-slate-500 font-medium">Please sign in to your dashboard</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle size={18} />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all font-medium text-slate-700"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all font-medium text-slate-700"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                            <span className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors font-medium">Remember me</span>
                        </label>
                        <button type="button" className="text-sm text-primary-600 hover:text-primary-700 font-bold">Forgot password?</button>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary-100"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-slate-500 font-medium">
                        Are you an admin?{" "}
                        <button
                            onClick={() => navigate('/login')}
                            className="text-primary-600 font-bold hover:underline cursor-pointer"
                        >
                            Admin Login
                        </button>
                    </p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <strong className="text-sm text-slate-800">Demo Credentials</strong>
                        <button onClick={autofillDemo} className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline">Click to autofill</button>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500">Email: <span className="text-slate-700 font-bold">tenant@example.com</span></p>
                        <p className="text-xs font-medium text-slate-500">Password: <span className="text-slate-700 font-bold">123456</span></p>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-50 text-center">
                    <p className="text-sm text-slate-400 font-medium">
                        Don't have an account? <span className="text-slate-600 font-bold">Contact your property manager</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
