import type { TokenResponse } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const API_PREFIX = "/api/v1";

const ACCESS_KEY = "mk.access";
const REFRESH_KEY = "mk.refresh";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const tokens = {
  get access() {
    return read(ACCESS_KEY);
  },
  get refresh() {
    return read(REFRESH_KEY);
  },
  set(t: TokenResponse) {
    try {
      localStorage.setItem(ACCESS_KEY, t.access_token);
      localStorage.setItem(REFRESH_KEY, t.refresh_token);
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {}
  },
};

/** Turns FastAPI error payloads (string or validation list) into one readable line. */
function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => {
          const loc = Array.isArray(d?.loc) ? d.loc.filter((p: unknown) => p !== "body").join(".") : "";
          return loc ? `${loc}: ${d?.msg}` : d?.msg;
        })
        .join(" · ");
    }
  }
  return fallback;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  // Share one in-flight refresh between concurrent 401s: the backend rotates refresh tokens.
  refreshing ??= fetch(`${API_URL}${API_PREFIX}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      tokens.set((await res.json()) as TokenResponse);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true, query } = opts;
  const url = new URL(`${API_URL}${API_PREFIX}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const doFetch = () => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const access = tokens.access;
    if (auth && access) headers.Authorization = `Bearer ${access}`;
    return fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch {
    throw new ApiError(0, `No se pudo conectar con el servidor (${API_URL})`);
  }

  if (res.status === 401 && auth && (await tryRefresh())) {
    res = await doFetch();
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth) {
      tokens.clear();
      window.dispatchEvent(new Event("mk:unauthorized"));
    }
    throw new ApiError(res.status, errorMessage(data, `Error ${res.status}`));
  }
  return data as T;
}

/** Download a report PDF with Bearer auth (blob + temporary object URL). */
export async function downloadReport(reportId: number, filename?: string): Promise<void> {
  const url = `${API_URL}${API_PREFIX}/reports/${reportId}/download`;

  const doFetch = () => {
    const headers: Record<string, string> = {};
    const access = tokens.access;
    if (access) headers.Authorization = `Bearer ${access}`;
    return fetch(url, { method: "GET", headers });
  };

  let res = await doFetch();
  if (res.status === 401 && (await tryRefresh())) {
    res = await doFetch();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401) {
      tokens.clear();
      window.dispatchEvent(new Event("mk:unauthorized"));
    }
    throw new ApiError(res.status, errorMessage(data, `Error ${res.status}`));
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  let name = filename || `report_${reportId}.pdf`;
  if (cd) {
    const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(cd);
    if (m?.[1]) name = decodeURIComponent(m[1].replace(/"/g, "").trim());
  }

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
