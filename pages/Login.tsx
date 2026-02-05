import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../App';
import { Loader2, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, Eye, EyeOff, Phone, ArrowLeft, KeyRound } from 'lucide-react';
import { supabase } from '../services/supabase';

export const Login: React.FC = () => {
    const { signInWithEmail, signUpWithEmail, currentUser } = useStore();
    const navigate = useNavigate();

    const [isRegistering, setIsRegistering] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Password Visibility State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (currentUser) {
            navigate('/');
        }
    }, [currentUser, navigate]);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Validation
        if (!email.trim()) {
            setError('O campo de e-mail é obrigatório.');
            return;
        }
        if (!password.trim()) {
            setError('O campo de senha é obrigatório.');
            return;
        }

        if (isRegistering) {
            if (!name.trim()) {
                setError('Por favor, informe seu Apelido para criar a conta.');
                return;
            }
            // Validação de 8 caracteres
            if (password.length < 8) {
                setError('A senha deve ter no mínimo 8 caracteres.');
                return;
            }
            // Validação de confirmação de senha
            if (password !== confirmPassword) {
                setError('As senhas não coincidem. Digite novamente.');
                return;
            }
        }

        setLoading(true);
        try {
            if (isRegistering) {
                // Passar o número do WhatsApp (opcional) para a função de cadastro
                const success = await signUpWithEmail(email, password, name, whatsapp);
                if (success && mountedRef.current) {
                    setIsRegistering(false);
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setName('');
                    setWhatsapp('');
                    setSuccessMessage('Cadastro realizado com sucesso! Verifique seu e-mail (inclusive a caixa de SPAM) para confirmar sua conta antes de entrar.');
                }
                if (mountedRef.current) setLoading(false);
            } else {
                const success = await signInWithEmail(email, password);
                if (!success) {
                    if (mountedRef.current) {
                        setError('Falha ao entrar. Verifique suas credenciais.');
                        setLoading(false);
                    }
                } else {
                    // SUCESSO NO LOGIN: 
                    // NÃO paramos o loading aqui. Mantemos o estado 'loading' como true
                    // até que o redirecionamento (via useEffect do currentUser) aconteça.
                    // Isso evita que o botão volte ao estado normal antes da página mudar.

                    // Timeout de segurança: caso o redirect não aconteça em 8 segundos, liberamos o botão
                    setTimeout(() => {
                        if (mountedRef.current) setLoading(false);
                    }, 8000);
                }
            }
        } catch (err) {
            console.error(err);
            if (mountedRef.current) {
                setError('Ocorreu um erro inesperado. Tente novamente.');
                setLoading(false);
            }
        }
    };

    const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!email.trim()) {
            setError('Por favor, informe seu e-mail para recuperar a senha.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://bolaodacopa2026.app/reset-password'
            });

            if (error) throw error;

            setSuccessMessage('Enviamos um e-mail com instruções para redefinir sua senha.');
        } catch (err: any) {
            console.error(err);
            setError('Erro ao enviar e-mail. Verifique o endereço informado.');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setWhatsapp('');
        setError('');
        setSuccessMessage('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] px-4 relative">
            {/* Botão Voltar */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-0 left-4 md:left-8 flex items-center gap-2 text-brasil-blue dark:text-blue-300 font-bold hover:text-blue-900 dark:hover:text-blue-100 transition-colors bg-blue-50 dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm"
            >
                <ArrowLeft size={20} />
                Voltar
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md border-t-4 border-brasil-green overflow-hidden mt-12 md:mt-0 transition-colors duration-300">
                <div className="p-8 pb-6 text-center">
                    <h1 className="text-3xl font-bold mb-2 text-brasil-blue dark:text-blue-400">Bolão da Copa 2026</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isForgotPassword
                            ? 'Informe seu e-mail para redefinir a senha'
                            : isRegistering
                                ? 'Crie sua conta para participar'
                                : 'Faça login para continuar'}
                    </p>
                </div>

                <div className="px-8 pb-8 space-y-6">
                    {/* Success Message */}
                    {successMessage && (
                        <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-lg text-sm flex items-start gap-2 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm flex items-start gap-2 animate-pulse border border-red-100 dark:border-red-800">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* FORMS */}
                    {isForgotPassword ? (
                        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-brasil-green focus:border-brasil-green outline-none transition-all placeholder-gray-400 text-white"
                                    placeholder="seu@email.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brasil-blue hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transform"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <KeyRound size={20} />}
                                {loading ? 'Enviando...' : 'Enviar Instruções'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotPassword(false);
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className="w-full text-center text-sm text-gray-500 hover:text-white mt-2"
                            >
                                Voltar para o Login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleEmailSubmit} className="space-y-4">

                            {isRegistering && (
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <UserIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-brasil-green focus:border-brasil-green outline-none transition-all placeholder-gray-400 text-white"
                                        placeholder="Apelido (Nome Exibido nas Classificações)"
                                    />
                                </div>
                            )}

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-brasil-green focus:border-brasil-green outline-none transition-all placeholder-gray-400 text-white"
                                    placeholder="seu@email.com"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-brasil-green focus:border-brasil-green outline-none transition-all placeholder-gray-400 text-white"
                                    placeholder="Sua senha secreta (min. 8 caracteres)"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {isRegistering && (
                                <>
                                    <div className="relative animate-in fade-in slide-in-from-top-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`block w-full pl-10 pr-10 py-3 border bg-gray-700 rounded-lg focus:ring-2 outline-none transition-all placeholder-gray-400 text-white ${confirmPassword && password !== confirmPassword
                                                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-600 focus:ring-brasil-green focus:border-brasil-green'
                                                }`}
                                            placeholder="Confirme sua senha"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors focus:outline-none"
                                        >
                                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>

                                    {/* Novo campo de Whatsapp */}
                                    <div className="relative animate-in fade-in slide-in-from-top-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={whatsapp}
                                            onChange={(e) => setWhatsapp(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-brasil-green focus:border-brasil-green outline-none transition-all placeholder-gray-400 text-white"
                                            placeholder="WhatsApp (Opcional)"
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brasil-blue hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transform"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                                {isRegistering ? 'Criar Conta' : loading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </form>
                    )}

                    {!isRegistering && !isForgotPassword && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotPassword(true);
                                    setError('');
                                    setSuccessMessage('');
                                }}
                                className="text-sm text-gray-500 hover:text-brasil-blue dark:hover:text-blue-400 transition-colors"
                            >
                                Esqueci minha senha
                            </button>
                        </div>
                    )}


                    {isRegistering && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4 px-4">
                            Ao criar sua conta, você concorda com nossos <Link to="/termos" className="underline hover:text-brasil-blue dark:hover:text-blue-400">Termos de Uso</Link> e <Link to="/privacidade" className="underline hover:text-brasil-blue dark:hover:text-blue-400">Política de Privacidade</Link>.
                        </p>
                    )}

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-sm text-gray-600 hover:text-brasil-blue dark:text-gray-400 dark:hover:text-blue-300 font-medium transition-colors"
                        >
                            {isForgotPassword ? null : (isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se agora')}
                        </button>
                    </div>
                </div>

                {/* Footer Decoration */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 border-t border-gray-100 dark:border-gray-600 flex flex-col items-center gap-3">
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-brasil-green"></div>
                        <div className="w-2 h-2 rounded-full bg-brasil-yellow"></div>
                        <div className="w-2 h-2 rounded-full bg-brasil-blue"></div>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <Link to="/termos" className="hover:text-brasil-blue dark:hover:text-blue-400 transition-colors">Termos de Uso</Link>
                        <Link to="/privacidade" className="hover:text-brasil-blue dark:hover:text-blue-400 transition-colors">Política de Privacidade</Link>
                    </div>
                </div>
            </div>
        </div >
    );
};