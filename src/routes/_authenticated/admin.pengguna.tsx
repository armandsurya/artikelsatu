import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  PageHeader,
  Card,
  Field,
  inputCls,
  btnPrimary,
  btnGhost,
  btnDanger,
} from "@/components/admin/ui";
import {
  listUsers,
  inviteUser,
  updateUser,
  deleteUser,
  sendPasswordReset,
  toggleBan,
} from "@/lib/admin/users.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, KeyRound, UserPlus, Ban, CheckCircle2, Pencil, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pengguna")({
  head: () => ({ meta: [{ title: "Pengguna — Admin" }] }),
  component: Pengguna,
});

type Role = "super_admin" | "editor" | "author";
const ROLES: Role[] = ["super_admin", "editor", "author"];

function Pengguna() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const update = useServerFn(updateUser);
  const del = useServerFn(deleteUser);
  const reset = useServerFn(sendPasswordReset);
  const ban = useServerFn(toggleBan);

  const [meId, setMeId] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? ""));
  }, []);

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
  });

  const [q, setQ] = useState("");
  const filtered = users.filter(
    (u) =>
      !q ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const inviteMut = useMutation({
    mutationFn: (payload: { email: string; full_name: string; password: string; roles: Role[] }) =>
      invite({ data: payload }),
    onSuccess: () => {
      toast.success("Pengguna dibuat");
      setShowInvite(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (payload: { id: string; full_name: string | null; roles: Role[] }) =>
      update({ data: payload }),
    onSuccess: () => {
      toast.success("Perubahan disimpan");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Pengguna dihapus");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: (email: string) => reset({ data: { email } }),
    onSuccess: () => toast.success("Link reset password telah dikirim"),
    onError: (e: Error) => toast.error(e.message),
  });

  const banMut = useMutation({
    mutationFn: (payload: { id: string; ban: boolean }) => ban({ data: payload }),
    onSuccess: (_, v) => {
      toast.success(v.ban ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Pengguna"
        description="Kelola akun pengguna admin, role, dan status."
        actions={
          <button onClick={() => setShowInvite(true)} className={btnPrimary}>
            <UserPlus className="h-4 w-4" /> Tambah Pengguna
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama atau email…"
          className={inputCls + " max-w-sm"}
        />
        <span className="text-xs text-muted-foreground">{filtered.length} pengguna</span>
      </div>

      <Card className="!p-0 overflow-hidden">
        {isLoading && <div className="p-8 text-center text-muted-foreground">Memuat…</div>}
        {error && <div className="p-8 text-center text-red-600">{(error as Error).message}</div>}
        {!isLoading && !error && (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Login Terakhir</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Tidak ada pengguna.
                  </td>
                </tr>
              )}
              {filtered.map((u) => {
                const isMe = u.id === meId;
                const isBanned = !!u.banned_until && new Date(u.banned_until) > new Date();
                return editing === u.id ? (
                  <EditRow
                    key={u.id}
                    user={u}
                    onCancel={() => setEditing(null)}
                    onSave={(v) => updateMut.mutate({ id: u.id, ...v })}
                    saving={updateMut.isPending}
                  />
                ) : (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-secondary">
                        {u.full_name ?? "—"}{" "}
                        {isMe && <span className="ml-1 text-xs text-primary">(Anda)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          u.roles.map((r) => (
                            <span
                              key={r}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                          <Ban className="h-3 w-3" /> Nonaktif
                        </span>
                      ) : u.email_confirmed_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Aktif
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          Menunggu verifikasi
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("id-ID")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          title="Edit"
                          onClick={() => setEditing(u.id)}
                          className={btnGhost + " !py-1 !px-2 text-xs"}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Kirim reset password"
                          onClick={() => resetMut.mutate(u.email)}
                          className={btnGhost + " !py-1 !px-2 text-xs"}
                          disabled={resetMut.isPending}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        {!isMe && (
                          <button
                            title={isBanned ? "Aktifkan" : "Nonaktifkan"}
                            onClick={() => banMut.mutate({ id: u.id, ban: !isBanned })}
                            className={btnGhost + " !py-1 !px-2 text-xs"}
                            disabled={banMut.isPending}
                          >
                            {isBanned ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        {!isMe && (
                          <button
                            title="Hapus"
                            onClick={() => {
                              if (confirm(`Hapus ${u.email}?`)) deleteMut.mutate(u.id);
                            }}
                            className={btnDanger + " !py-1 !px-2 text-xs"}
                            disabled={deleteMut.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {showInvite && (
        <InviteDialog
          onCancel={() => setShowInvite(false)}
          onSubmit={(v) => inviteMut.mutate(v)}
          saving={inviteMut.isPending}
        />
      )}
    </div>
  );
}

function EditRow({
  user,
  onCancel,
  onSave,
  saving,
}: {
  user: { id: string; full_name: string | null; roles: Role[] };
  onCancel: () => void;
  onSave: (v: { full_name: string | null; roles: Role[] }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(user.full_name ?? "");
  const [roles, setRoles] = useState<Role[]>(user.roles);
  const toggle = (r: Role) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  return (
    <tr className="bg-muted/30">
      <td className="px-4 py-3" colSpan={5}>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Nama lengkap">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-secondary">Role</span>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs"
                >
                  <input type="checkbox" checked={roles.includes(r)} onChange={() => toggle(r)} />{" "}
                  {r}
                </label>
              ))}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={onCancel} className={btnGhost}>
              <X className="h-4 w-4" /> Batal
            </button>
            <button
              onClick={() => onSave({ full_name: name.trim() || null, roles })}
              className={btnPrimary}
              disabled={saving}
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function InviteDialog({
  onCancel,
  onSubmit,
  saving,
}: {
  onCancel: () => void;
  onSubmit: (v: { email: string; full_name: string; password: string; roles: Role[] }) => void;
  saving: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<Role[]>(["author"]);
  const toggle = (r: Role) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-secondary">Tambah Pengguna</h3>
        <div className="space-y-3">
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Nama lengkap">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field
            label="Password (opsional)"
            hint="Kosongkan untuk mengirim email undangan. Isi untuk membuat akun langsung (min 8 karakter)."
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-secondary">Role</span>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs"
                >
                  <input type="checkbox" checked={roles.includes(r)} onChange={() => toggle(r)} />{" "}
                  {r}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className={btnGhost}>
            Batal
          </button>
          <button
            onClick={() =>
              onSubmit({ email: email.trim(), full_name: name.trim(), password, roles })
            }
            className={btnPrimary}
            disabled={saving || !email}
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
