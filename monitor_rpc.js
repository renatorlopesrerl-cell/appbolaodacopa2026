// Teste de race condition: verificar se matchDetailedStats chega após selectedMatchForDetails ser setado
// Cole este código no console do browser F12 depois de navegar para uma liga do brasil
// Clique em um jogo finalizado e monitore o log

// Interceptar a chamada da RPC
const origFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('get_match_detailed_stats')) {
        console.log('RPC CALL:', url);
        console.log('Body:', args[1]?.body);
    }
    return origFetch.apply(this, args);
};
console.log('Monitoring RPC calls...');
