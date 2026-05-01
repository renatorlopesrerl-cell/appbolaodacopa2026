import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenta carregar dotenv apenas se existir (ambiente local)
// No Cloudflare Pages, as variáveis já estão no process.env do sistema
try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
} catch {
    console.log('dotenv não disponível ou .env não encontrado — usando process.env do sistema (Cloudflare).');
}

const templatePath = path.resolve(__dirname, '../public/firebase-messaging-sw.template.js');
const outputPath = path.resolve(__dirname, '../public/firebase-messaging-sw.js');

// Mapeamento de placeholders para variáveis de ambiente
// Suporta tanto o prefixo VITE_FCM_ (local) quanto FIREBASE_ sem prefixo (Cloudflare)
const replacements = {
    'FIREBASE_API_KEY':            process.env.VITE_FCM_API_KEY            || process.env.FIREBASE_API_KEY,
    'FIREBASE_AUTH_DOMAIN':        process.env.VITE_FCM_AUTH_DOMAIN        || process.env.FIREBASE_AUTH_DOMAIN,
    'FIREBASE_DATABASE_URL':       process.env.VITE_FCM_DATABASE_URL       || process.env.FIREBASE_DATABASE_URL,
    'FIREBASE_PROJECT_ID':         process.env.VITE_FCM_PROJECT_ID         || process.env.FIREBASE_PROJECT_ID,
    'FIREBASE_STORAGE_BUCKET':     process.env.VITE_FCM_STORAGE_BUCKET     || process.env.FIREBASE_STORAGE_BUCKET,
    'FIREBASE_MESSAGING_SENDER_ID':process.env.VITE_FCM_MESSAGING_SENDER_ID|| process.env.FIREBASE_MESSAGING_SENDER_ID,
    'FIREBASE_APP_ID':             process.env.VITE_FCM_APP_ID             || process.env.FIREBASE_APP_ID,
};

try {
    let content = fs.readFileSync(templatePath, 'utf8');

    let allFound = true;
    for (const [key, value] of Object.entries(replacements)) {
        if (!value) {
            console.warn(`⚠️  Aviso: Variável ${key} não encontrada em nenhuma fonte de env.`);
            allFound = false;
        }
        content = content.replace(key, value || '');
    }

    fs.writeFileSync(outputPath, content);

    if (allFound) {
        console.log('✅ Service Worker gerado com sucesso — todas as variáveis encontradas!');
    } else {
        console.warn('⚠️  Service Worker gerado, mas com variáveis faltando. Verifique o painel do Cloudflare.');
    }
} catch (error) {
    console.error('❌ Erro ao gerar o Service Worker:', error.message);
    process.exit(1);
}
