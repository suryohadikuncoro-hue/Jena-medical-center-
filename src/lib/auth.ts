const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const STORAGE_KEY = "jena.auth.session";

type AuthSession = { access_token: string; refresh_token?: string; user?: { email?: string } };

function config() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Konfigurasi Supabase Auth belum tersedia");
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return getSession()?.access_token ?? null;
}

export async function signIn(email: string, password: string) {
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = (await response.json()) as AuthSession & { error_description?: string; msg?: string };
  if (!response.ok) throw new Error(payload.error_description ?? payload.msg ?? "Login gagal");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function signOut() {
  const session = getSession();
  if (session?.access_token && SUPABASE_URL && SUPABASE_KEY) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => undefined);
  }
  localStorage.removeItem(STORAGE_KEY);
}
