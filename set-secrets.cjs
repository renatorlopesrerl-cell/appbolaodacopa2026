const fs = require('fs');
const { execSync } = require('child_process');

try {
  const content = fs.readFileSync('.dev.vars', 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1');
    }
  });

  const email = env['FCM_CLIENT_EMAIL'];
  const key = env['FCM_PRIVATE_KEY'];
  const project = env['FCM_PROJECT_ID'];

  if (email && key && project) {
    console.log('Setting secrets for project...');
    
    // Create a temporary .env file for secrets to pass to supabase CLI securely without command line escaping issues
    const envFileContent = `FCM_CLIENT_EMAIL=${email}\nFCM_PRIVATE_KEY="${key.replace(/\n/g, '\\n')}"\nFCM_PROJECT_ID=${project}\n`;
    fs.writeFileSync('.env.push_secrets', envFileContent);
    
    // Set secrets using env-file
    execSync(`npx supabase secrets set --env-file .env.push_secrets --project-ref sjianpqzozufnobftksp`, { stdio: 'inherit' });
    console.log('Secrets set successfully.');
    
    // Clean up
    fs.unlinkSync('.env.push_secrets');
  } else {
    console.log('FCM keys not found in .dev.vars');
  }
} catch (err) {
  console.error(err);
}
