import fs from 'fs';
let content = fs.readFileSync('c:/Users/renat/OneDrive/Desktop/appbolaodacopa2026/appbolaodacopa2026/pages/LeagueDetailsBrasileirao.tsx', 'utf8');

content = content.replace(/<option value="brasileirao"[^>]*>Apenas Brasileir[^<]*<\/option>/g, '<option value="brasileirao" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Apenas Brasileirão</option>');
content = content.replace(/<option value="total"[^>]*>Brasileir[^<]* - Total<\/option>/g, '<option value="total" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Brasileirão - Total</option>');

content = content.replace(/\{round\} Rodada/g, '{round}ª Rodada');
content = content.replace(/\{round\}. Rodada/g, '{round}ª Rodada');
content = content.replace(/Todas as Competi[^<]*<\/option>/g, 'Todas as Competições</option>');

fs.writeFileSync('c:/Users/renat/OneDrive/Desktop/appbolaodacopa2026/appbolaodacopa2026/pages/LeagueDetailsBrasileirao.tsx', content, 'utf8');
