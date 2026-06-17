export const onRequest = async ({ env }: any) => {
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://lttnjfcvswxrmqigqxyb.supabase.co';
  const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_match_detailed_stats`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_league_id: 'l-1771540729874',
      p_match_id: 'm-B1',
      p_is_brazil: false
    })
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};
