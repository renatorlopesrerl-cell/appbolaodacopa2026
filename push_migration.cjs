const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const tempDir = path.join(__dirname, 'temp_migrations_backup');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const files = fs.readdirSync(migrationsDir);
files.forEach(file => {
  if (file.endsWith('.sql') && file !== '20260618_01_fix_timeout_bulk_update.sql') {
    fs.renameSync(path.join(migrationsDir, file), path.join(tempDir, file));
  }
});

try {
  console.log('Running npx supabase db push...');
  execSync('npx supabase db push', { stdio: 'inherit', input: 'y\n' });
} catch (e) {
  console.error('Push failed');
} finally {
  const tempFiles = fs.readdirSync(tempDir);
  tempFiles.forEach(file => {
    fs.renameSync(path.join(tempDir, file), path.join(migrationsDir, file));
  });
  console.log('Restored migrations');
}
