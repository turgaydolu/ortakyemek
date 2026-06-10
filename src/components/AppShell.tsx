import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../integrations/supabase/client";
import { Button } from "./ui/button";
import { Bell, Flame, LogOut } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";

interface Notif { id: string; title: string; body: string | null; created_at: string; read: boolean; link: string | null }

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { user, profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("notifications")
        .select("id,title,body,created_at,read,link")
        .or(`user_id.eq.${user.id},broadcast.eq.true`)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifs((data ?? []) as Notif[]);
    };
    load();
    const ch = supabase.channel("notif-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const n = payload.new as Notif & { user_id?: string; broadcast?: boolean };
        if (n.broadcast || (n as any).user_id === user.id) {
          setNotifs((p) => [n, ...p].slice(0, 20));
          toast(n.title, { description: n.body ?? undefined });
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(n.title, { body: n.body || "", icon: "/logo.png" });
          }
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    // Sadece admin ise kontrol edip sunucu yükünü azaltabiliriz, ama herkes için de zararı yok RPC hızlıdır.
    if (user) {
      supabase.rpc("process_expired_campaigns" as any).then(({error}) => { if (error) console.error(error); });
      const interval = setInterval(() => {
        supabase.rpc("process_expired_campaigns" as any).then(({error}) => { if (error) console.error(error); });
      }, 5 * 60 * 1000); // Her 5 dakikada bir kontrol
      return () => clearInterval(interval);
    }
  }, [user]);

  const unread = notifs.filter((n) => !n.read).length;
  const markRead = async () => {
    const ids = notifs.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const isAdmin = roles.includes("admin");
  const primaryRole = isAdmin ? "admin" : roles[0];
  const navItems = (!profile?.approved && primaryRole !== "admin")
    ? []
    : primaryRole === "restaurant"
    ? [{ to: "/app", label: "Panel" }, { to: "/restaurant/menu", label: "Menü" }, { to: "/restaurant/orders", label: "Siparişler" }, { to: "/restaurant/campaigns", label: "Kampanyalar" }, { to: "/restaurant/accounting", label: "Ciro ve Raporlar" }]
    : primaryRole === "manager"
    ? [{ to: "/app", label: "Panel" }, { to: "/restaurants", label: "Lokantalar" }, { to: "/campaigns", label: "Kampanyalar" }, { to: "/manager/team", label: "Ekip" }]
    : primaryRole === "admin"
    ? [{ to: "/admin/approvals", label: "Onaylar" }, { to: "/admin/users", label: "Kullanıcı Yönetimi" }, { to: "/admin/reports", label: "Ciro & Raporlar" }, { to: "/admin/notifications", label: "Bildirim Ayarları" }]
    : [{ to: "/app", label: "Panel" }, { to: "/restaurants", label: "Lokantalar" }, { to: "/campaigns", label: "Kampanyalar" }, { to: "/my-orders", label: "Siparişlerim" }];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/app" className="flex items-center gap-2">
            <img src="/logo.png" alt="Ortak Yemek" className="h-9 w-9 rounded-lg object-cover shadow-warm" />
            <span className="font-display text-lg font-bold">Ortak Yemek</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {navItems.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "rounded-lg px-3 py-2 text-sm font-medium bg-secondary text-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" onClick={markRead}>
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (<span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b p-3"><p className="font-semibold">Bildirimler</p></div>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">Henüz bildirim yok</p>
                  ) : notifs.map((n) => (
                    <div key={n.id} className="border-b p-3 last:border-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("tr-TR")}</p>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <span className="hidden text-sm text-muted-foreground sm:inline">{profile?.full_name}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {title && <h1 className="mb-6 font-display text-3xl font-bold">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
