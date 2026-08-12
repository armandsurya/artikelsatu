/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Client API untuk backend PHP + MySQL.
 *
 * Bentuk API-nya sengaja dibuat identik dengan supabase-js
 * (`from().select().eq()`, `auth`, `storage`, `rpc`) supaya seluruh komponen
 * frontend yang sudah ada tidak perlu diubah sama sekali.
 */
import { AUTH_STORAGE_KEY, apiBaseUrl, serviceToken } from "./config";

export type ApiError = { message: string; code?: string; hint?: string; details?: string };
export type ApiResult<T> = { data: T; error: ApiError | null; count: number | null };

export type ApiUser = {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  created_at: string | null;
  last_sign_in_at: string | null;
  role: string;
};

export type ApiSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: ApiUser;
};

type Filter = { column: string; op: string; value?: unknown };
type OrderSpec = { column: string; ascending: boolean; nullsFirst?: boolean };

type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "INITIAL_SESSION";

/* --------------------------------- utils --------------------------------- */

function toError(value: unknown): ApiError {
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;
    return {
      message: String(raw.message ?? "Terjadi kesalahan"),
      code: raw.code ? String(raw.code) : undefined,
      hint: raw.hint ? String(raw.hint) : undefined,
    };
  }
  return { message: String(value ?? "Terjadi kesalahan") };
}

/* --------------------------------- client -------------------------------- */

export type ApiClientOptions = {
  /** Token bearer statis (dipakai di server function). */
  accessToken?: string | null;
  /** Simpan/baca sesi di localStorage (hanya di browser). */
  persistSession?: boolean;
  /** Header khusus, mis. service token untuk operasi privileged. */
  headers?: Record<string, string>;
};

export function createApiClient(options: ApiClientOptions = {}) {
  const persist = options.persistSession !== false && typeof window !== "undefined";
  const listeners = new Set<(event: AuthChangeEvent, session: ApiSession | null) => void>();

  let session: ApiSession | null = null;
  let staticToken = options.accessToken ?? null;

  if (persist) {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      session = raw ? (JSON.parse(raw) as ApiSession) : null;
    } catch {
      session = null;
    }
  }

  function emit(event: AuthChangeEvent) {
    for (const listener of listeners) listener(event, session);
  }

  function storeSession(next: ApiSession | null, event: AuthChangeEvent) {
    session = next;
    if (persist) {
      try {
        if (next) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
        else window.localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        /* storage penuh / diblokir — sesi tetap hidup di memori */
      }
    }
    emit(event);
  }

  async function refreshSession(): Promise<ApiSession | null> {
    if (!session?.refresh_token) return null;
    const response = await rawRequest("/auth/refresh", {
      refresh_token: session.refresh_token,
    });
    if (response.error || !response.data) {
      storeSession(null, "SIGNED_OUT");
      return null;
    }
    storeSession(response.data as ApiSession, "TOKEN_REFRESHED");
    return session;
  }

  /** Sesi valid (auto-refresh bila access token sudah/hampir kedaluwarsa). */
  async function activeSession(): Promise<ApiSession | null> {
    if (!session) return null;
    const expiresAt = (session.expires_at ?? 0) * 1000;
    if (expiresAt && expiresAt - Date.now() < 60_000) return refreshSession();
    return session;
  }

  function currentToken(): string | null {
    return staticToken ?? session?.access_token ?? null;
  }

  async function rawRequest(path: string, body?: unknown, init?: RequestInit): Promise<ApiResult<any>> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const token = currentToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl()}${path}`, {
        method: body === undefined && !init?.method ? "GET" : (init?.method ?? "POST"),
        headers,
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      });
    } catch (cause) {
      return { data: null, error: toError(cause), count: null };
    }

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || payload?.error) {
      return {
        data: null,
        error: toError(payload?.error ?? { message: `HTTP ${response.status}` }),
        count: null,
      };
    }
    return { data: payload?.data ?? null, error: null, count: payload?.count ?? null };
  }

  /** Request dengan satu kali retry setelah refresh token bila 401. */
  async function request(path: string, body?: unknown, init?: RequestInit): Promise<ApiResult<any>> {
    const first = await rawRequest(path, body, init);
    if (first.error?.code === "401" && !staticToken && session?.refresh_token) {
      const refreshed = await refreshSession();
      if (refreshed) return rawRequest(path, body, init);
    }
    return first;
  }

  /* ------------------------------ query builder ---------------------------- */

  class QueryBuilder implements PromiseLike<ApiResult<any>> {
    private filters: Filter[] = [];
    private orders: OrderSpec[] = [];
    private selectStr = "*";
    private mode: "select" | "insert" | "update" | "delete" = "select";
    private rows: unknown = null;
    private upsertFlag = false;
    private returning = false;
    private limitValue?: number;
    private rangeValue?: [number, number];
    private singleFlag = false;
    private maybeSingleFlag = false;
    private headFlag = false;
    private countFlag = false;

    constructor(private table: string) {}

    select(select = "*", opts?: { count?: string; head?: boolean }) {
      this.selectStr = select || "*";
      if (this.mode === "select") {
        this.countFlag = !!opts?.count;
        this.headFlag = !!opts?.head;
      } else {
        this.returning = true;
      }
      return this;
    }

    insert(rows: unknown) {
      this.mode = "insert";
      this.rows = rows;
      return this;
    }

    upsert(rows: unknown, _opts?: unknown) {
      this.mode = "insert";
      this.rows = rows;
      this.upsertFlag = true;
      return this;
    }

    update(values: unknown) {
      this.mode = "update";
      this.rows = values;
      return this;
    }

    delete() {
      this.mode = "delete";
      return this;
    }

    /* filters */
    eq(column: string, value: unknown) { return this.filter(column, "eq", value); }
    neq(column: string, value: unknown) { return this.filter(column, "neq", value); }
    gt(column: string, value: unknown) { return this.filter(column, "gt", value); }
    gte(column: string, value: unknown) { return this.filter(column, "gte", value); }
    lt(column: string, value: unknown) { return this.filter(column, "lt", value); }
    lte(column: string, value: unknown) { return this.filter(column, "lte", value); }
    like(column: string, value: unknown) { return this.filter(column, "like", value); }
    ilike(column: string, value: unknown) { return this.filter(column, "ilike", value); }
    in(column: string, value: unknown[]) { return this.filter(column, "in", value); }
    is(column: string, value: unknown) { return this.filter(column, "is", value); }

    not(column: string, op: string, value: unknown) {
      if (op === "is" && value === null) return this.filter(column, "not_is", null);
      return this.filter(column, `not_${op}`, value);
    }

    match(criteria: Record<string, unknown>) {
      for (const [column, value] of Object.entries(criteria)) this.filter(column, "eq", value);
      return this;
    }

    filter(column: string, op: string, value: unknown) {
      this.filters.push({ column, op, value });
      return this;
    }

    order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
      this.orders.push({
        column,
        ascending: opts?.ascending !== false,
        nullsFirst: opts?.nullsFirst,
      });
      return this;
    }

    limit(value: number) {
      this.limitValue = value;
      return this;
    }

    range(from: number, to: number) {
      this.rangeValue = [from, to];
      return this;
    }

    single() {
      this.singleFlag = true;
      return this;
    }

    maybeSingle() {
      this.maybeSingleFlag = true;
      return this;
    }

    private payload() {
      return {
        table: this.table,
        select: this.selectStr,
        filters: this.filters,
        order: this.orders,
        limit: this.limitValue,
        range: this.rangeValue,
        single: this.singleFlag,
        maybeSingle: this.maybeSingleFlag,
        head: this.headFlag,
        count: this.countFlag,
        rows: this.rows,
        upsert: this.upsertFlag,
        returning: this.returning,
      };
    }

    private async run(): Promise<ApiResult<any>> {
      const endpoint =
        this.mode === "select"
          ? "/rest/select"
          : this.mode === "insert"
            ? "/rest/insert"
            : this.mode === "update"
              ? "/rest/update"
              : "/rest/delete";
      return request(endpoint, this.payload());
    }

    then<TResult1 = ApiResult<any>, TResult2 = never>(
      onfulfilled?: ((value: ApiResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      return this.run().then(onfulfilled, onrejected);
    }
  }

  /* --------------------------------- storage -------------------------------- */

  function storageBucket(bucket: string) {
    return {
      async upload(
        path: string,
        file: Blob | File,
        opts?: { contentType?: string; upsert?: boolean; cacheControl?: string },
      ) {
        const form = new FormData();
        form.append("bucket", bucket);
        form.append("path", path);
        form.append("upsert", opts?.upsert ? "1" : "0");
        form.append("file", file, path.split("/").pop() ?? "file");
        const { data, error } = await request("/storage/upload", form);
        return { data, error };
      },
      async remove(paths: string[]) {
        const { data, error } = await request("/storage/remove", { bucket, paths });
        return { data, error };
      },
      async createSignedUrl(path: string, expiresIn: number) {
        const { data, error } = await request("/storage/sign", { bucket, path, expiresIn });
        return { data: data as { signedUrl: string } | null, error };
      },
      getPublicUrl(path: string) {
        return { data: { publicUrl: `${apiBaseUrl()}/../uploads/${bucket}/${path}` } };
      },
    };
  }

  /* ----------------------------------- auth --------------------------------- */

  const auth = {
    async getSession() {
      const current = await activeSession();
      return { data: { session: current }, error: null as ApiError | null };
    },

    async getUser(token?: string) {
      const current = token ? null : await activeSession();
      if (!token && !current && !staticToken) {
        return { data: { user: null as ApiUser | null }, error: { message: "Auth session missing" } };
      }
      const { data, error } = await request("/auth/user", undefined, { method: "GET" });
      return { data: { user: (data?.user ?? null) as ApiUser | null }, error };
    },

    /** Padanan supabase.auth.getClaims(token) untuk verifikasi sisi server. */
    async getClaims(token?: string) {
      const previous = staticToken;
      if (token) staticToken = token;
      const { data, error } = await rawRequest("/auth/user", undefined, { method: "GET" });
      staticToken = previous;
      if (error || !data?.user) return { data: null, error: error ?? { message: "Invalid token" } };
      const user = data.user as ApiUser;
      return { data: { claims: { sub: user.id, email: user.email, role: user.role } }, error: null };
    },

    async signInWithPassword(credentials: { email: string; password: string }) {
      const { data, error } = await rawRequest("/auth/login", credentials);
      if (error || !data) return { data: { session: null, user: null }, error };
      storeSession(data as ApiSession, "SIGNED_IN");
      return { data: { session: data as ApiSession, user: (data as ApiSession).user }, error: null };
    },

    async signUp(credentials: {
      email: string;
      password: string;
      options?: { data?: { full_name?: string }; emailRedirectTo?: string };
    }) {
      const { data, error } = await rawRequest("/auth/register", {
        email: credentials.email,
        password: credentials.password,
        full_name: credentials.options?.data?.full_name ?? "",
      });
      if (error || !data) return { data: { session: null, user: null }, error };
      storeSession(data as ApiSession, "SIGNED_IN");
      return { data: { session: data as ApiSession, user: (data as ApiSession).user }, error: null };
    },

    async signOut(_opts?: { scope?: "global" | "local" }) {
      await rawRequest("/auth/logout", { refresh_token: session?.refresh_token ?? "" });
      storeSession(null, "SIGNED_OUT");
      return { error: null as ApiError | null };
    },

    onAuthStateChange(callback: (event: AuthChangeEvent, session: ApiSession | null) => void) {
      listeners.add(callback);
      // Meniru perilaku supabase-js: callback langsung dipanggil sekali.
      queueMicrotask(() => callback("INITIAL_SESSION", session));
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },
  };

  return {
    from(table: string) {
      return new QueryBuilder(table) as any;
    },
    async rpc(name: string, args?: Record<string, unknown>) {
      return request(`/rpc/${name}`, { args: args ?? {} });
    },
    storage: { from: storageBucket },
    auth,
    /** Setel token bearer manual (dipakai middleware server). */
    setAuth(token: string | null) {
      staticToken = token;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Client privileged untuk pemakaian server-side (bypass kebijakan baca). */
export function createServiceApiClient(): ApiClient {
  const token = serviceToken();
  return createApiClient({
    persistSession: false,
    headers: token ? { "X-Service-Token": token } : {},
  });
}
