import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env da raiz
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const templatePath = path.resolve(__dirname, '../public/firebase-messaging-sw.template.js');
const outputPath = path.resolve(__dirname, '../public/firebase-messaging-sw.js');

try {
    let content = fs.readFileSync(templatePath, 'utf8');

    const replacements = {
        'FIREBASE_API_KEY': process.env.VITE_FCM_API_KEY,
        'FIREBASE_AUTH_DOMAIN': process.env.VITE_FCM_AUTH_DOMAIN,
        'FIREBASE_DATABASE_URL': process.env.VITE_FCM_DATABASE_URL,
        'FIREBASE_PROJECT_ID': process.env.VITE_FCM_PROJECT_ID,
        'FIREBASE_STORAGE_BUCKET': process.env.VITE_FCM_STORAGE_BUCKET,
        'FIREBASE_MESSAGING_SENDER_ID': process.env.VITE_FCM_MESSAGING_SENDER_ID,
        'FIREBASE_APP_ID': process.env.VITE_FCM_APP_ID
    };

    for (const [key, value] of Object.entries(replacements)) {
        if (!value) {
            console.warn(`Aviso: Variável ${key} não encontrada no .env`);
        }
        content = content.replace(key, value || '');
    }

    fs.writeFileSync(outputPath, content);
    console.log('✅ Service Worker gerado com sucesso a partir do template!');
} catch (error) {
    console.error('❌ Erro ao gerar o Service Worker:', error.message);
}
