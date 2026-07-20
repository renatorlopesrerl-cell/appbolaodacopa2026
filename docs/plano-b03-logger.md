# B-03: Helper `log()` Condicional em Dev-Mode

## Objetivo

Centralizar todos os `console.log/warn/error` do app em um helper que é
**silenciado automaticamente em produção** (APK Play Store), eliminando
vazamento de informações internas via `adb logcat`.

---

## O Que Será Criado

### `utils/logger.ts`

```ts
const isDev = import.meta.env.DEV;

export const log = {
  info:  (...args: any[]) => isDev && console.log(...args),
  warn:  (...args: any[]) => isDev && console.warn(...args),
  error: (...args: any[]) => isDev && console.error(...args),
  debug: (...args: any[]) => isDev && console.debug(...args),
};
```

- Em `npm run dev` → funciona normalmente
- Em `npm run build` (produção) → Vite faz tree-shaking e **elimina todos os logs do bundle**

---

## Arquivos Críticos (Estratégia Gradual — Recomendada)

| Arquivo | Logs sensíveis |
|---|---|
| `services/firebaseWeb.ts` | VAPID Key, Sender ID |
| `services/pushService.ts` | Dados de notificação, URLs |
| `services/api.ts` | Erros de API |
| `App.tsx` | RevenueCat, estado do usuário |
| `pages/LeagueDetails.tsx` | AdMob, palpites |
| `pages/BrazilLeagueDetails.tsx` | AdMob, palpites |
| `pages/LeagueDetailsBrasileirao.tsx` | AdMob, palpites |

---

## Antes vs Depois

```diff
- console.log('Push action performed:', notification.actionId);
- console.error('AdMob show error:', e);

+ import { log } from '../utils/logger';
+ log.info('Push action performed:', notification.actionId);
+ log.error('AdMob show error:', e);
```

---

## Decisões Pendentes (Responder na Hora de Implantar)

1. **Gradual (7 arquivos)** ou **Completo (~25 arquivos)**?
2. **Manter `log.error` visível em prod?** (útil para diagnóstico de crashes)

---

## Verificação Pós-Implementação

```bash
grep -r "console\.log" src/ pages/ services/ hooks/ --include="*.ts" --include="*.tsx"
```
