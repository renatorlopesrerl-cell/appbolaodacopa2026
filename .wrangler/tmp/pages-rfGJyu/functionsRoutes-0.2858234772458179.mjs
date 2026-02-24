import { onRequest as __api_admin_leagues_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\admin\\leagues.ts"
import { onRequest as __api_admin_matches_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\admin\\matches.ts"
import { onRequest as __api_leagues_invites_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\leagues\\invites.ts"
import { onRequest as __api_leagues_join_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\leagues\\join.ts"
import { onRequest as __api_leagues_members_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\leagues\\members.ts"
import { onRequest as __api_storage_delete_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\storage\\delete.ts"
import { onRequestGet as __api_health_ts_onRequestGet } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\health.ts"
import { onRequest as __api_leagues_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\leagues.ts"
import { onRequest as __api_matches_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\matches.ts"
import { onRequest as __api_predictions_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\predictions.ts"
import { onRequest as __api_profiles_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\profiles.ts"
import { onRequest as __api_storage_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\storage.ts"
import { onRequest as __api__middleware_ts_onRequest } from "C:\\Users\\renat\\OneDrive\\Desktop\\appbolaodacopa2026\\appbolaodacopa2026\\functions\\api\\_middleware.ts"

export const routes = [
    {
      routePath: "/api/admin/leagues",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_leagues_ts_onRequest],
    },
  {
      routePath: "/api/admin/matches",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_matches_ts_onRequest],
    },
  {
      routePath: "/api/leagues/invites",
      mountPath: "/api/leagues",
      method: "",
      middlewares: [],
      modules: [__api_leagues_invites_ts_onRequest],
    },
  {
      routePath: "/api/leagues/join",
      mountPath: "/api/leagues",
      method: "",
      middlewares: [],
      modules: [__api_leagues_join_ts_onRequest],
    },
  {
      routePath: "/api/leagues/members",
      mountPath: "/api/leagues",
      method: "",
      middlewares: [],
      modules: [__api_leagues_members_ts_onRequest],
    },
  {
      routePath: "/api/storage/delete",
      mountPath: "/api/storage",
      method: "",
      middlewares: [],
      modules: [__api_storage_delete_ts_onRequest],
    },
  {
      routePath: "/api/health",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_health_ts_onRequestGet],
    },
  {
      routePath: "/api/leagues",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_leagues_ts_onRequest],
    },
  {
      routePath: "/api/matches",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_matches_ts_onRequest],
    },
  {
      routePath: "/api/predictions",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_predictions_ts_onRequest],
    },
  {
      routePath: "/api/profiles",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_profiles_ts_onRequest],
    },
  {
      routePath: "/api/storage",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_storage_ts_onRequest],
    },
  {
      routePath: "/api",
      mountPath: "/api",
      method: "",
      middlewares: [__api__middleware_ts_onRequest],
      modules: [],
    },
  ]