const TOKEN_KEY = "bridgex_token";

function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
export function hasSession() { return Boolean(getToken()); }

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(opts.headers || {}) }
  });
  const json = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
}

export async function apiLogin(email, password) {
  const d = await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  setToken(d.token);
  return d.user;
}

export async function apiRegister(payload) {
  const d = await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
  setToken(d.token);
  return d.user;
}

export async function apiLogout() {
  await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  setToken(null);
}

export async function apiGetState() {
  try { return await apiFetch("/api/state"); } catch { return null; }
}

export async function apiSaveState(state) {
  try { await apiFetch("/api/state", { method: "PUT", body: JSON.stringify(state) }); } catch { /* localStorage fallback */ }
}

export async function apiUploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body: fd });
  if (!res.ok) throw new Error("Upload failed");
  return res.json(); // { url, name, size, type }
}
