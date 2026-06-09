const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.readFile('C:/Users/renat/OneDrive/Desktop/Jogos.xlsx', { cellDates: true });
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

let currentTeam = null;
let order = 1;
const inserts = [];

for (const row of data) {
    if (row.length === 0) {
        currentTeam = null;
        continue;
    }

    if (row.length === 1 && typeof row[0] === 'string') {
        currentTeam = row[0].trim();
        // fix "Coréia do Sul" to "Coreia do Sul" if needed, but let's stick to the sheet
        if (currentTeam === 'Coréia do Sul') currentTeam = 'Coreia do Sul';
        order = 6; // Because the sheet lists them newest first? Let's check dates.
        // Wait, 46177 is newer than 46172. So the first row is the newest match.
        // Let's use order = 1 for the newest match, or just rely on the date.
        // Let's use order = 1 for newest, 6 for oldest.
        order = 1;
        continue;
    }

    if (row[0] === 'Data') {
        continue; // skip header
    }

    if (currentTeam) {
        let dateVal = row[0];
        let dateStr = 'NULL';
        if (dateVal instanceof Date) {
            dateStr = `'${dateVal.toISOString().split('T')[0]}'`;
        } else if (typeof dateVal === 'number') {
            const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
            dateStr = `'${d.toISOString().split('T')[0]}'`;
        }

        const comp = row[1] ? `'${row[1].replace(/'/g, "''")}'` : 'NULL';
        const matchStr = row[2] ? `'${row[2].replace(/'/g, "''")}'` : 'NULL';
        const result = row[3] ? `'${row[3].replace(/'/g, "''")}'` : 'NULL';

        inserts.push(`('${currentTeam}', ${dateStr}, ${comp}, ${matchStr}, ${result}, ${order})`);
        order++;
    }
}

const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.team_matches_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id TEXT NOT NULL,
    date DATE,
    competition TEXT,
    match_str TEXT,
    result TEXT,
    match_order INT
);

-- Habilitar leitura pública
ALTER TABLE public.team_matches_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.team_matches_history;
CREATE POLICY "Enable read access for all users" ON public.team_matches_history FOR SELECT USING (true);

-- Limpar dados antigos caso o script rode mais de uma vez
TRUNCATE TABLE public.team_matches_history;

INSERT INTO public.team_matches_history (team_id, date, competition, match_str, result, match_order)
VALUES
${inserts.join(',\n')};
`;

fs.writeFileSync('C:/Users/renat/OneDrive/Desktop/appbolaodacopa2026/appbolaodacopa2026/seed_team_history.sql', sql);
console.log('SQL gerado com sucesso em seed_team_history.sql');
