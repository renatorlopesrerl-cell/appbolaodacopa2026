import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import {
    ArrowLeft,
    Lock,
    Trophy,
    BarChart2,
    Calendar,
    Zap,
    CheckCircle2,
    Star,
    TrendingUp,
    Shield,
    Crown,
    RefreshCw
} from 'lucide-react';
import { useStore } from '../App';
import { supabase } from '../services/supabase';

const FEATURES = [
    {
        icon: Trophy,
        title: 'Placar Mais Apostado',
        description: 'Veja qual placar a maioria dos participantes da liga apostou para cada jogo — antes mesmo de fechar seu palpite.',
        color: 'from-yellow-400 to-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
        icon: BarChart2,
        title: 'Distribuição de Palpites',
        description: 'Saiba o percentual de apostas para vitória do time da casa, empate ou vitória do visitante. Estratégia na ponta dos dedos.',
        color: 'from-emerald-400 to-green-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        icon: Calendar,
        title: 'Histórico dos Times',
        description: 'Acesse os últimos jogos de cada seleção antes de cada partida. Análise o momento de cada time e faça palpites mais inteligentes.',
        color: 'from-blue-400 to-indigo-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
        icon: TrendingUp,
        title: 'Análise em Tempo Real',
        description: 'As estatísticas são atualizadas em tempo real conforme os participantes fazem seus palpites — nunca perca uma tendência.',
        color: 'from-purple-400 to-violet-500',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        iconColor: 'text-purple-600 dark:text-purple-400',
    },
];

export const ProPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, refreshAllData } = useStore();

    const [isPurchasing, setIsPurchasing] = useState(false);
    const [cpfInput, setCpfInput] = useState('');

    const isNative = Capacitor.isNativePlatform();
    const displayPrice = isNative ? '5,99' : '6,99';
    const buttonText = isPurchasing ? 'PROCESSANDO...' : (currentUser?.isPro ? 'VOCÊ É PRO' : (isNative ? 'SEJA PRO AGORA' : 'PAGAR COM PIX/CARTÃO'));

    // --- NOVA FUNÇÃO: RESTAURAR COMPRAS ---
    const handleRestore = async () => {
        setIsPurchasing(true);
        try {
            const { customerInfo } = await Purchases.restorePurchases();
            
            if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
                if (currentUser && !currentUser.isPro) {
                    const { error } = await supabase
                        .from('profiles')
                        .update({ is_pro: true })
                        .eq('id', currentUser.id);

                    if (error) {
                        console.error("Erro ao atualizar Supabase:", error);
                        alert('Compra encontrada, mas erro ao sincronizar com o banco. Avise o suporte.');
                    } else {
                        alert('🎉 Compras restauradas com sucesso! Você agora é PRO!');
                        if (refreshAllData) await refreshAllData();
                        navigate('/', { replace: true });
                    }
                } else {
                    alert('Sua conta já está com o acesso PRO ativo!');
                }
            } else {
                alert('Nenhuma compra anterior foi encontrada para a conta Google logada neste celular.');
            }
        } catch (e: any) {
            console.error("Erro ao restaurar compras:", e);
            const erroMensagem = e.message || JSON.stringify(e);
            alert(`Erro do RevenueCat: ${erroMensagem} \n(Código: ${e.code || 'N/A'})`);
        } finally {
            setIsPurchasing(false);
        }
    };

    const handlePurchase = async () => {
        if (!isNative) {
            if (!currentUser) {
                alert('Você precisa estar logado para assinar.');
                return;
            }

            const cleanCpf = cpfInput.replace(/\D/g, '');
            if (cleanCpf.length !== 11) {
                alert('Por favor, digite um CPF válido com 11 números.');
                return;
            }

            setIsPurchasing(true);
            try {
                const { data, error } = await supabase.functions.invoke('create-asaas-checkout', {
                    body: {
                        userId: currentUser.id,
                        email: currentUser.email,
                        name: currentUser.name || 'Usuário do App',
                        cpfCnpj: cleanCpf
                    }
                });

                if (error) {
                    console.error("Erro ao chamar Edge Function Asaas:", error);
                    alert(`Erro do sistema: ${error.message} - Detalhes: ${JSON.stringify(error)}. Por favor, me mande essa mensagem!`);
                    setIsPurchasing(false);
                    return;
                }

                if (data && data.isError) {
                    alert(`O Asaas recusou. Motivo: ${data.error}. Me avise o que apareceu!`);
                    setIsPurchasing(false);
                    return;
                }

                if (data && data.invoiceUrl) {
                    window.open(data.invoiceUrl, '_blank');
                    setIsPurchasing(false);
                } else {
                    alert(`Erro inesperado: Nenhuma URL. Retorno: ${JSON.stringify(data)}`);
                    setIsPurchasing(false);
                }
            } catch (err: any) {
                console.error("Erro na requisição de pagamento web:", err);
                alert('Erro ao processar o pagamento web. Verifique sua conexão.');
                setIsPurchasing(false);
            }
            return;
        }

        // Lógica Nativa (Google Play)
        setIsPurchasing(true);
        try {
            const offerings = await Purchases.getOfferings();

            if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
                const pacote = offerings.current.availablePackages[0];
                const { customerInfo } = await Purchases.purchasePackage({ aPackage: pacote });

                if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
                    if (currentUser) {
                        const { error } = await supabase
                            .from('profiles')
                            .update({ is_pro: true })
                            .eq('id', currentUser.id);

                        if (error) {
                            console.error("Erro ao atualizar Supabase:", error);
                            alert('Compra aprovada, mas houve um atraso ao liberar seu acesso. Entre em contato com o suporte.');
                        } else {
                            alert('🎉 Parabéns! Compra aprovada. Você agora é PRO!');
                            if (refreshAllData) await refreshAllData();
                            navigate('/', { replace: true });
                        }
                    } else {
                        alert('🎉 Parabéns! Compra aprovada. Você agora é PRO!');
                        if (refreshAllData) await refreshAllData();
                        navigate('/', { replace: true });
                    }
                }
            } else {
                alert('Nenhum pacote de compra disponível no momento. Tente novamente mais tarde.');
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error("Erro na compra nativa:", e);
                alert('Ocorreu um erro ao processar a compra no Google Play. Tente novamente.');
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    // Temporarily hide PRO features on Web
    if (!isNative) {
        return (
            <div className="max-w-2xl mx-auto pb-16">
                <div className="mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                    >
                        <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-gray-200 dark:group-hover:bg-gray-700">
                            <ArrowLeft size={16} />
                        </div>
                        Voltar
                    </button>
                </div>
                
                <div className="flex flex-col items-center justify-center py-24 text-center px-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <Crown size={64} className="text-yellow-500 mb-6 drop-shadow-md" />
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                        Plano <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">Pro</span> em Breve!
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-lg leading-relaxed">
                        As estatísticas avançadas e os recursos exclusivos estão sendo preparados para a versão Web. Aguarde as novidades!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-16">
            <div className="mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                >
                    <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-gray-200 dark:group-hover:bg-gray-700">
                        <ArrowLeft size={16} />
                    </div>
                    Voltar
                </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden mb-8 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-orange-500/10" />

                <div className="absolute -top-12 -right-12 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl" />

                <div className="relative z-10 p-8 text-center">
                    <div className="flex justify-center mb-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full blur-lg opacity-50 animate-pulse" />
                            <div className="relative bg-gradient-to-br from-yellow-400 to-amber-600 p-4 rounded-full shadow-lg">
                                <Crown size={36} className="text-white" fill="currentColor" />
                            </div>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3 shadow-lg">
                        <Star size={10} fill="currentColor" />
                        Plano PRO
                        <Star size={10} fill="currentColor" />
                    </div>

                    <h1 className="text-3xl font-black text-white mb-3 leading-tight">
                        Domine a{' '}
                        <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                            Competição
                        </span>
                    </h1>

                    <p className="text-gray-300 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                        Tenha acesso às estatísticas exclusivas de cada jogo e faça palpites mais inteligentes que os outros participantes.
                    </p>

                    {currentUser?.isPro && (
                        <div className="mt-5 inline-flex items-center gap-2 bg-green-500/20 border border-green-500/40 text-green-400 text-sm font-bold px-4 py-2 rounded-full">
                            <CheckCircle2 size={16} />
                            Você já é PRO!
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-black text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                    <Shield size={20} className="text-amber-500" />
                    O que você desbloqueia
                </h2>

                <div className="space-y-4">
                    {FEATURES.map((feature, i) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={i}
                                className={`flex items-start gap-4 p-4 rounded-xl border ${feature.bg} ${feature.border} shadow-sm transition-all hover:shadow-md`}
                            >
                                <div className={`bg-gradient-to-br ${feature.color} p-2.5 rounded-xl shrink-0 shadow-sm`}>
                                    <Icon size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className={`font-black text-sm mb-1 ${feature.iconColor}`}>{feature.title}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-black text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <BarChart2 size={20} className="text-amber-500" />
                    Prévia das Estatísticas
                </h2>
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
                    <div className="bg-white dark:bg-gray-800 p-5 space-y-4 filter blur-[3px] select-none pointer-events-none">
                        <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-4 border border-gray-100 dark:border-gray-600 flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1">
                                <Trophy size={10} className="text-yellow-500" /> Placar mais apostado
                            </span>
                            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
                                <span className="text-3xl font-black text-gray-800 dark:text-gray-200">2</span>
                                <span className="text-sm font-bold text-gray-400">x</span>
                                <span className="text-3xl font-black text-gray-800 dark:text-gray-200">0</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-3.5 border border-gray-100 dark:border-gray-600">
                            <p className="text-[10px] font-bold uppercase text-gray-400 mb-3 flex items-center gap-1">
                                <BarChart2 size={10} /> Distribuição dos palpites
                            </p>
                            <div className="flex gap-2">
                                <div className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                                    <div className="w-8 h-5 bg-gray-300 rounded" />
                                    <span className="text-[9px] font-bold">Brasil</span>
                                    <span className="text-lg font-black">68%</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600 text-gray-500">
                                    <div className="w-8 h-5 flex items-center justify-center text-base">🤝</div>
                                    <span className="text-[9px] font-bold">Empate</span>
                                    <span className="text-lg font-black">18%</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/50 text-yellow-700">
                                    <div className="w-8 h-5 bg-gray-300 rounded" />
                                    <span className="text-[9px] font-bold">Argentina</span>
                                    <span className="text-lg font-black">14%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/70 backdrop-blur-[1px]">
                        <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-3 rounded-full shadow-lg mb-3">
                            <Lock size={24} className="text-white" />
                        </div>
                        <p className="text-white font-black text-sm mb-1">Recurso Exclusivo PRO</p>
                        <p className="text-gray-300 text-xs">Assine para desbloquear</p>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/5" />
                <div className="relative z-10">
                    <div className="flex justify-center mb-3">
                        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
                            <Zap size={10} fill="currentColor" />
                            Oferta de Lançamento
                        </div>
                    </div>

                    <div className="mb-1">
                        <span className="text-gray-400 text-sm line-through">R$ 9,99</span>
                    </div>
                    <div className="text-5xl font-black text-white mb-1">
                        R${' '}
                        <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                            {displayPrice}
                        </span>
                    </div>
                    <p className="text-gray-300 text-base font-bold mb-6 tracking-wide">Acesso PRO: Pagamento Único</p>

                    {!isNative && !currentUser?.isPro && (
                        <div className="mb-4 text-left">
                            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider ml-1">
                                CPF (Obrigatório para Pagamento)
                            </label>
                            <input
                                type="text"
                                value={cpfInput}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                    let formatted = val;
                                    if (val.length > 9) formatted = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                                    else if (val.length > 6) formatted = val.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
                                    else if (val.length > 3) formatted = val.replace(/(\d{3})(\d{1,3})/, "$1.$2");
                                    setCpfInput(formatted);
                                }}
                                placeholder="000.000.000-00"
                                className="w-full bg-gray-900/50 border border-gray-700 text-white rounded-xl px-4 py-3 text-center text-lg font-bold placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            id="pro-cta-btn"
                            disabled={isPurchasing || currentUser?.isPro}
                            onClick={handlePurchase}
                            className={`w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 font-black py-4 px-8 rounded-xl text-base uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all 
                            ${(isPurchasing || currentUser?.isPro) ? 'opacity-70 cursor-not-allowed' : 'hover:from-yellow-300 hover:to-amber-400 hover:shadow-amber-500/30 active:scale-95'}`}
                        >
                            <Crown size={20} fill="currentColor" />
                            {buttonText}
                        </button>

                        {/* NOVO BOTÃO DE RESTAURAR APARECE APENAS NO NATIVO SE NÃO FOR PRO */}
                        {isNative && !currentUser?.isPro && (
                            <button
                                onClick={handleRestore}
                                disabled={isPurchasing}
                                className="mt-2 bg-transparent text-gray-400 hover:text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-1.5 mx-auto transition-colors underline underline-offset-2"
                            >
                                <RefreshCw size={14} />
                                Já sou PRO / Restaurar Compra
                            </button>
                        )}
                    </div>

                    <p className="text-gray-500 text-xs mt-4">
                        Pagamento seguro · Sem mensalidades
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-6 text-xs text-gray-500">
                        <Link to="/termos" className="hover:text-amber-500 transition-colors underline underline-offset-2">
                            Termos de Uso
                        </Link>
                        <span className="hidden sm:inline">•</span>
                        <Link to="/privacidade" className="hover:text-amber-500 transition-colors underline underline-offset-2">
                            Política de Privacidade
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
