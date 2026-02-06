import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../App';

export const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useStore();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSessionReady, setIsSessionReady] = useState(false);

    // Check for session on mount
    useEffect(() => {
        let mounted = true;

        const initializeSession = async () => {
            try {
                // Check for errors in URL first
                const hash = window.location.hash;
                const query = window.location.search;

                if (hash.includes('error=') || query.includes('error=')) {
                    const params = new URLSearchParams(hash.substring(1) || query);
                    const errorDescription = params.get('error_description') || 'Link inválido ou expirado.';
                    if (mounted) {
                        setError(errorDescription.replace(/\+/g, ' '));
                        setLoading(false); // Stop "loading" style
                    }
                    return;
                }

                // Check current session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    throw sessionError;
                }

                if (session && mounted) {
                    setIsSessionReady(true);
                    return;
                }
            } catch (err: any) {
                console.error("Session check error:", err);
                if (mounted) setError(err.message || 'Erro ao verificar sessão.');
            }
        };

        initializeSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("ResetPage Auth Event:", event);
            if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
                if (mounted) setIsSessionReady(true);
            }
        });

        // Safety timeout - if no session after 4 seconds and no error, show generic error
        const timeout = setTimeout(() => {
            if (mounted && !isSessionReady) { // Note: isSessionReady closure value might be stale, but we check logic relying on re-render or ref if strictly needed. 
                // Actually, inside timeout, state 'isSessionReady' is from closure. 
                // However, we can't easily check current state without ref.
                // But simplified: If we are still here, we can set a flag.
                // Better approach: check actual session again?
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (!session && mounted) {
                        setError('Sessão não detectada. Se você abriu o link em outro navegador/celular, copie o link e cole no mesmo local onde pediu a senha.');
                    }
                });
            }
        }, 4000);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []); // Dependency array empty is correct, but timeout closure issue exists. 
    // We use the inner getSession check in timeout which matches the reality.

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);

            // Logout after delay and redirect to login
            setTimeout(async () => {
                await logout(); // Ensure clean state
                navigate('/login');
            }, 3000);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao redefinir senha.');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4 border border-green-100 dark:border-green-900">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Senha Redefinida!</h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Redefinir Senha</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Digite sua nova senha abaixo.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm flex items-center gap-2 mb-6 border border-red-100 dark:border-red-800">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-6">
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
                                placeholder="Nova senha"
                                required
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
                        className={`w-full bg-brasil-blue hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 ${(!isSessionReady || loading) ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                        {loading ? 'Salvando...' : (error ? 'Não disponível' : (!isSessionReady ? 'Verificando Sessão...' : 'Salvar Nova Senha'))}
                    </button>
                </form>
            </div>
        </div>
    );
};
