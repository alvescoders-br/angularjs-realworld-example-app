// Fase 2 (Refs #2) - contrato do esquema de autenticacao RealWorld consumido pelo app.
// O frontend AngularJS envia "Authorization: Token <jwt>" (auth.interceptor.js),
// NAO "Bearer". Este helper codifica essa regra como gate determinístico (GUIA §3.2/§16).

const CONDUIT_AUTH_RE = /^Token \S+$/;

/** true somente para o header literal "Token <jwt>" (prefixo `Token`, nao `Bearer`). */
export function isConduitAuthHeader(header) {
  return typeof header === 'string' && CONDUIT_AUTH_RE.test(header);
}

/** Monta o header de autorizacao exatamente como o interceptor do app. */
export function buildConduitAuthHeader(jwt) {
  return `Token ${jwt}`;
}
