/** Compile-time only. This is a client accident-prevention guard, never backend authorization. */
declare const process: {env: Record<string, string | undefined>};
export const READ_BETA = process.env.EXPO_PUBLIC_REAL_READ_BETA === 'true';
const readRpcs = new Set([
  'app_get_self_profile', 'student_get_context', 'teacher_get_context',
  'teacher_list_classes_for_mobile',
  'notification_get_center', 'teacher_get_notification_center', 'library_list_editions',
]);
const readFunctions = new Set(['library-edition-read-access', 'library-edition-search']);
/** Fail closed, including unknown GETs, generic RPCs and institutional POSTs. */
export function assertReadBetaRequest(input: string, init: RequestInit = {}, expectedOrigin?: string) {
  if (!READ_BETA) return;
  const denied = () => { throw Error('read_beta_operation_unavailable'); };
  let url: URL;
  try { url = new URL(input); } catch { return denied(); }
  if (!expectedOrigin || url.origin !== expectedOrigin || url.username || url.password || url.hash) return denied();
  const method = (init.method || 'GET').toUpperCase();
  if (url.pathname === '/auth/v1/user' && !url.search && method === 'GET') return;
  // Authentication is the only state-changing exception: the exact existing
  // password grant, institutional student login and explicit local logout.
  // This never enables signup, recovery, refresh, profile edits or school writes.
  if (url.pathname === '/auth/v1/token' && url.search === '?grant_type=password' && method === 'POST') return;
  if (url.pathname === '/functions/v1/student-institutional-login' && !url.search && method === 'POST') return;
  if (url.pathname === '/auth/v1/logout' && url.search === '?scope=local' && method === 'POST') return;
  if (method !== 'POST' || url.search) return denied();
  const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
  const fn = url.pathname.match(/^\/functions\/v1\/([a-z-]+)$/)?.[1];
  if ((rpc && readRpcs.has(rpc)) || (fn && readFunctions.has(fn))) return;
  return denied();
}
export function isReadBetaRoute(role: string, route: string) {
  return ['home', 'profile', 'library'].includes(route) ||
    (role === 'professor' ? ['classes', 'notifications'].includes(route) : ['notifications'].includes(route));
}
