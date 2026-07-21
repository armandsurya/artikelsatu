import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Globe,
  FileText,
  Image as ImageIcon,
  Search,
  Menu,
  ArrowRightLeft,
  Users,
  Shield,
  Settings,
  Activity,
  LogOut,
  ChevronDown,
  X,
  Menu as MenuIcon,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, type PermissionKey } from "@/lib/admin/usePermissions";

type Item = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  perm?: PermissionKey;
  children?: { label: string; to: string }[];
};

const NAV: Item[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  {
    label: "Website",
    to: "/admin/website/homepage",
    icon: Globe,
    perm: "homepage",
    children: [
      { label: "Homepage", to: "/admin/website/homepage" },
      { label: "Header", to: "/admin/website/header" },
      { label: "Footer", to: "/admin/website/footer" },
    ],
  },
  {
    label: "Blog",
    to: "/admin/blog",
    icon: FileText,
    perm: "blog",
    children: [
      { label: "Semua Artikel", to: "/admin/blog" },
      { label: "Tambah Artikel", to: "/admin/blog/new" },
      { label: "Kategori", to: "/admin/blog/kategori" },
      { label: "Hero Blog", to: "/admin/blog/hero" },
    ],
  },
  { label: "Media", to: "/admin/media", icon: ImageIcon, perm: "media" },
  { label: "SEO", to: "/admin/seo", icon: Search, perm: "seo" },
  { label: "Redirect URL", to: "/admin/redirect", icon: ArrowRightLeft, perm: "redirect" },
  { label: "Pengguna", to: "/admin/pengguna", icon: Users, perm: "users" },
  { label: "Role & Permission", to: "/admin/roles", icon: KeyRound, perm: "roles" },
  { label: "Pengaturan", to: "/admin/pengaturan", icon: Settings, perm: "settings" },
  { label: "Keamanan", to: "/admin/keamanan", icon: Shield, perm: "security" },
  { label: "Log Aktivitas", to: "/admin/log", icon: Activity, perm: "log" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: perms } = usePermissions();
  const visibleNav = NAV.filter((item) => !item.perm || perms?.[item.perm]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await supabase.from("activity_log").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: "logout",
      entity: "auth",
    });
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-secondary">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-background transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link to="/admin" className="text-lg font-bold text-secondary">
            ArtikelPro<span className="text-primary">.</span>
          </Link>
          <button onClick={() => setOpen(false)} className="rounded-md p-1 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 overflow-y-auto p-3">
          {visibleNav.map((item) => (
            <NavGroup key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>
      </aside>
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background px-5">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 lg:hidden">
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="text-sm text-muted-foreground">Panel Admin</div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden text-sm text-muted-foreground hover:text-secondary md:inline"
            >
              Lihat situs →
            </Link>
            <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
              <div className="h-6 w-6 rounded-full bg-primary/10 text-center text-xs font-semibold leading-6 text-primary">
                {email.charAt(0).toUpperCase() || "A"}
              </div>
              <span className="hidden max-w-[140px] truncate text-sm md:inline">{email}</span>
              <button
                onClick={signOut}
                className="rounded p-1 text-muted-foreground hover:text-secondary"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavGroup({ item, pathname }: { item: Item; pathname: string }) {
  const Icon = item.icon;
  const isActive =
    pathname === item.to ||
    pathname.startsWith(item.to + "/") ||
    item.children?.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"));
  const [open, setOpen] = useState(!!isActive);
  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  if (!item.children) {
    const active = pathname === item.to;
    return (
      <Link
        to={item.to}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-secondary"}`}
      >
        <Icon className="h-4 w-4" /> {item.label}
      </Link>
    );
  }
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "text-secondary" : "text-muted-foreground"} hover:bg-accent hover:text-secondary`}
      >
        <Icon className="h-4 w-4" /> <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
          {item.children.map((c) => {
            const active = pathname === c.to;
            return (
              <Link
                key={c.to}
                to={c.to}
                className={`rounded-md px-3 py-1.5 text-sm ${active ? "text-primary font-medium" : "text-muted-foreground hover:text-secondary"}`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
