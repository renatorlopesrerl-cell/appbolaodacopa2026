import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, KeyRound, Mail, ArrowLeft } from 'lucide-react';
import { useStore } from '../App';

export const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useStore();

    // Get email from URL params if present
    const queryParams = new URLSearchParams(location.search);
    const initialEmail = queryParams.get('email') || '';

    const [step, setStep] = useState<1 | 2 | 3>(initialEmail ? 1 : 2); // 1: OTP, 2: New Password, 3: Success
    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSessionReady, setIsSessionReady] = useState(false);

    const otpInputRef = useRef<HTMLInputElement>(null);

    // Initial check for session (standard link flow)
    useEffect(() => {
        let mounted = true;

        const initializeSession = async () => {
            try {
                // If we don't have an email in the URL, we might be coming from a recovery link
                if (!initialEmail) {
                    const hash = window.location.hash;
                    const query = window.location.search;

                    if (hash.includes('error=') || query.includes('error=')) {
                        const params = new URLSearchParams(hash.substring(1) || query);
                        const errorDescription = params.get('error_description') || 'Link inválido ou expirado.';
                        if (mounted) setError(errorDescription.replace(/\+/g, ' '));
                        return;
                    }

                    const { data: { session } } = await supabase.auth.getSession();
                    if (session && mounted) {
                        setIsSessionReady(true);
                        setStep(2);
                        return;
                    }
                }
            } catch (err: any) {
                console.error("Session check error:", err);
            }
        };

        initializeSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
                if (mounted) {
                    setIsSessionReady(true);
                    setStep(2);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [initialEmail]);

    // Handle OTP verification
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError('O código deve ter 6 dígitos.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const { error: otpError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'recovery'
            });

            if (otpError) throw otpError;

            // Success! The user is now logged in with a recovery session
            setIsSessionReady(true);
            setStep(2);
        } catch (err: any) {
            console.error("OTP Error:", err);
            setError(err.message || 'Código inválido ou expirado.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Password Update
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 8) {
            setError('A senha deve ter no mínimo 8 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setStep(3);

            // Logout after delay and redirect to login
            setTimeout(async () => {
                await logout();
                navigate('/login');
            }, 3000);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao redefinir senha.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Success View
    if (step === 3) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4 border border-green-100 dark:border-green-900 animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Senha Alterada!</h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Sua senha foi redefinida com sucesso. Você será redirecionado para o login em instantes...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 transition-colors duration-300">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 dark:border-gray-700 relative overflow-hidden">

                {/* Visual indicator (Progress Bar) */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-700">
                    <div
                        className="h-full bg-brasil-blue transition-all duration-500"
                        style={{ width: `${(step / 2) * 100}%` }}
                    />
                </div>

                <div className="text-center mb-8 mt-2">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        {step === 1 ? 'Verificar Código' : 'Nova Senha'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {step === 1
                            ? `Digite o código enviado para ${email}`
                            : 'Crie uma senha forte para sua conta.'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm flex items-start gap-2 mb-6 border border-red-100 dark:border-red-800 animate-in slide-in-from-top-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {step === 1 ? (
                    /* STEP 1: OTP FORM */
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                                Código de 6 dígitos
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <KeyRound className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    ref={otpInputRef}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="block w-full pl-10 pr-3 py-4 text-center text-2xl tracking-[0.5em] font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue outline-none transition-all text-gray-900 dark:text-white"
                                    placeholder="000000"
                                    required
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                Se não recebeu, verifique sua caixa de SPAM.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            className={`w-full bg-brasil-blue hover:bg-blue-900 text-white font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${loading || otp.length !== 6 ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl'}`}
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                            {loading ? 'Verificando...' : 'Verificar Código'}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="w-full text-center text-sm text-gray-500 hover:text-brasil-blue dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1"
                        >
                            <ArrowLeft size={14} /> Voltar
                        </button>
                    </form>
                ) : (
                    /* STEP 2: PASSWORD FORM */
                    <form onSubmit={handleUpdatePassword} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue outline-none transition-all placeholder-gray-400 text-gray-900 dark:text-white"
                                    placeholder="Nova senha (mín. 8 caracteres)"
                                    required
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue outline-none transition-all placeholder-gray-400 text-gray-900 dark:text-white"
                                    placeholder="Confirme a nova senha"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !isSessionReady}
                            className={`w-full bg-brasil-blue hover:bg-blue-900 text-white font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${(!isSessionReady || loading) ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl'}`}
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                            {loading ? 'Salvando...' : (error ? 'Não disponível' : (!isSessionReady ? 'Sessão Expirada' : 'Salvar Nova Senha'))}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
