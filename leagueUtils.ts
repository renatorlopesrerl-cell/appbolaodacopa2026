export const getLeagueLimit = (league: any, isBrasileirao: boolean = false): number => {
  if (league.settings?.isUnlimited) return Infinity;
  const plan = (league.settings as any)?.plan || 'FREE';
  switch (plan) {
    case 'VIP_UNLIMITED': return Infinity;
    case 'VIP_MASTER': return 200;
    case 'VIP': return 100;
    case 'VIP_BASIC': return 50;
    case 'FREE':
    default: return isBrasileirao ? 15 : 10;
  }
};
