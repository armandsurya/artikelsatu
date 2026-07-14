import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageHeader,
  Card,
  Field,
  inputCls,
  btnPrimary,
  btnDanger,
  btnGhost,
} from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { Shield, Trash2, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/keamanan")({
  head: () => ({ meta: [{ title: "Keamanan — Admin" }] }),
  component: Keamanan,
});

function Keamanan() {
  const qc = useQueryClient();
  const [ip, setIp] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<"block" | "allow">("block");

  const { data: ips = [] } = useQuery({
    queryKey: ["ip-lists"],
    queryFn: async () =>
      (await supabase.from("ip_lists").select("*").order("created_at", { ascending: false }))
        .data ?? [],
  });

  async function addIp() {
    if (!ip) return;
    const { error } = await supabase
      .from("ip_lists")
      .insert({ ip, list_type: type, note: note || null });
    if (error) {
      alert(error.message);
      return;
    }
    await logActivity("add_ip", "ip_lists", ip, { type });
    setIp("");
    setNote("");
    qc.invalidateQueries({ queryKey: ["ip-lists"] });
  }
  async function removeIp(id: string) {
    await supabase.from("ip_lists").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ip-lists"] });
  }
  async function signOutAll() {
    if (!confirm("Keluar dari semua perangkat (sesi saat ini)?")) return;
    await supabase.auth.signOut({ scope: "global" });
    await logActivity("global_signout", "auth");
    location.href = "/auth";
  }

  return (
    <div>
      <PageHeader title="Keamanan" description="Rate limiting, IP list, session, dan 2FA." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-secondary">
            <Shield className="h-4 w-4 text-primary" /> Kebijakan Login
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              • Password hash:{" "}
              <span className="font-medium text-secondary">Argon2 (dikelola Cloud)</span>
            </li>
            <li>
              • Percobaan login gagal maksimal:{" "}
              <span className="font-medium text-secondary">5 kali</span> sebelum lock 15 menit
            </li>
            <li>
              • Session timeout: <span className="font-medium text-secondary">7 hari</span> tanpa
              aktivitas
            </li>
            <li>• CSRF, input validation, dan content sanitization aktif</li>
            <li>
              • Two-Factor Authentication:{" "}
              <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                Segera hadir
              </span>
            </li>
          </ul>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Sesi</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Keluarkan seluruh sesi aktif dari semua perangkat.
          </p>
          <button onClick={signOutAll} className={btnGhost}>
            <LogOut className="h-4 w-4" /> Logout Semua Perangkat
          </button>
        </Card>

        <Card className="md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-secondary">IP Block / Allow List</h3>
          <div className="mb-4 grid gap-2 md:grid-cols-[1fr_1fr_140px_auto]">
            <Field label="IP Address">
              <input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className={inputCls}
                placeholder="192.168.1.1"
              />
            </Field>
            <Field label="Catatan">
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Tipe">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "block" | "allow")}
                className={inputCls}
              >
                <option value="block">Block</option>
                <option value="allow">Allow</option>
              </select>
            </Field>
            <div className="flex items-end">
              <button onClick={addIp} className={btnPrimary}>
                Tambah
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">IP</th>
                <th className="py-2">Tipe</th>
                <th className="py-2">Catatan</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ips.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    Belum ada entri.
                  </td>
                </tr>
              )}
              {ips.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 font-mono text-xs">{r.ip}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.list_type === "block" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
                    >
                      {r.list_type}
                    </span>
                  </td>
                  <td className="py-2 text-muted-foreground">{r.note ?? "—"}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => removeIp(r.id)}
                      className={btnDanger + " !py-1 !px-2 text-xs"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
