import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Login Admin — ArtikelPro" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.from("activity_log").insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: "login", entity: "auth",
        });
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin`, data: { full_name: fullName } },
        });
        if (error) throw error;
        setInfo("Akun dibuat. Silakan masuk.");
        setMode("signin");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center text-lg font-bold text-secondary">
          ArtikelPro<span className="text-primary">.</span>
        </Link>
        <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" /> Panel Admin
          </div>
          <h1 className="text-2xl font-semibold text-secondary">
            {mode === "signin" ? "Masuk ke CMS" : "Buat akun admin pertama"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Gunakan email dan password admin Anda."
              : "Pengguna pertama otomatis menjadi Super Admin."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field label="Nama Lengkap">
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
              </Field>
            )}
            <Field label="Email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Password">
              <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </Field>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {info && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>}

            <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Masuk" : "Daftar"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>Belum ada akun admin?{" "}
                <button onClick={() => setMode("signup")} className="font-medium text-primary hover:underline">Daftar</button>
              </>
            ) : (
              <>Sudah punya akun?{" "}
                <button onClick={() => setMode("signin")} className="font-medium text-primary hover:underline">Masuk</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-secondary outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-secondary">{label}</span>
      {children}
    </label>
  );
}
