const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.dev.vars' });

// 1. Initialize Firebase
let privateKey = process.env.FCM_PRIVATE_KEY;
if (privateKey) {
  privateKey = privateKey.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");
  privateKey = privateKey.replace(/\\/g, "\n");
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FCM_PROJECT_ID || 'batepapobase',
    clientEmail: process.env.FCM_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log("Fetching the most recent web token...");
  const { data: tokens, error } = await supabase
    .from('user_fcm_tokens')
    .select('user_id, token, last_seen')
    .eq('device_type', 'web')
    .order('last_seen', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching tokens:", error);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.log("No web tokens found in database.");
    return;
  }

  console.log("Candidate Web Tokens:", tokens);

  const targetToken = tokens[0].token;
  console.log(`\nSending test notification to web token: ${targetToken}`);

  const message = {
    notification: {
      title: "Teste Direct Web Push 🚀",
      body: "Se você recebeu isso, o envio direto de web push funcionou!",
    },
    data: {
      url: "https://bolaodacopa2026.app/table"
    },
    webpush: {
      headers: { Urgency: "high" },
      notification: {
        title: "Teste Direct Web Push 🚀",
        body: "Se você recebeu isso, o envio direto de web push funcionou!",
        icon: "https://bolaodacopa2026.app/favicon.png",
        click_action: "https://bolaodacopa2026.app/table"
      }
    },
    token: targetToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
  } catch (err) {
    console.error("Error sending message:", err);
  }
}

test();
