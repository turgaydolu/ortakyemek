import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ShoppingBag, UtensilsCrossed, Flame } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Açık", color: "bg-success text-success-foreground" },
  closed: { label: "Kapalı", color: "bg-muted text-muted-foreground" },
  not_accepting: { label: "Sipariş Alınmıyor", color: "bg-warning text-warning-foreground" },
};

export function RestaurantDashboard() {
  const { profile } = useAuth();
  const [restName, setRestName] = useState("");
  const [status, setStatus] = useState<string>("closed");
  const [pendingOrders, setPendingOrders] = useState(0);
  const [menuCount, setMenuCount] = useState(0);
  const [campaignCount, setCampaignCount] = useState(0);

  const load = async () => {
    if (!profile?.restaurant_id) return;
    const [r, o, m, c] = await Promise.all([
      supabase.from("restaurants").select("name,status").eq("id", profile.restaurant_id!).single(),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", profile.restaurant_id!).eq("status", "pending"),
      supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", profile.restaurant_id!),
      supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("restaurant_id", profile.restaurant_id!).in("status", ["active", "reached"]),
    ]);
    setRestName(r.data?.name ?? "");
    setStatus(r.data?.status ?? "closed");
    setPendingOrders(o.count ?? 0);
    setMenuCount(m.count ?? 0);
    setCampaignCount(c.count ?? 0);
  };

  useEffect(() => { load(); }, [profile]);

  const updateStatus = async (s: string) => {
    if (!profile?.restaurant_id) return;
    const { error } = await supabase.from("restaurants").update({ status: s as any }).eq("id", profile.restaurant_id);
    if (error) toast.error(error.message);
    else { setStatus(s); toast.success("Durum güncellendi"); }
  };

  const cur = STATUS_LABELS[status];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-warm shadow-warm">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-sm text-muted-foreground">Lokantanız</p>
            <h2 className="font-display text-3xl font-bold">{restName}</h2>
            <Badge className={`mt-2 ${cur.color}`}>{cur.label}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={status === "open" ? "default" : "outline"} onClick={() => updateStatus("open")} className={status === "open" ? "bg-success text-success-foreground" : ""}>Açık</Button>
            <Button size="sm" variant={status === "not_accepting" ? "default" : "outline"} onClick={() => updateStatus("not_accepting")} className={status === "not_accepting" ? "bg-warning text-warning-foreground" : ""}>Sipariş Almıyor</Button>
            <Button size="sm" variant={status === "closed" ? "default" : "outline"} onClick={() => updateStatus("closed")}>Kapalı</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: ShoppingBag, label: "Bekleyen Sipariş", value: pendingOrders, link: "/restaurant/orders" },
          { icon: UtensilsCrossed, label: "Menü Öğeleri", value: menuCount, link: "/restaurant/menu" },
          { icon: Flame, label: "Aktif Kampanya", value: campaignCount, link: "/restaurant/campaigns" },
        ].map((s) => (
          <Link key={s.label} to={s.link}>
            <Card className="shadow-soft transition hover:shadow-warm">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary"><s.icon className="h-6 w-6 text-primary" /></div>
                <div><p className="text-2xl font-display font-bold">{s.value}</p><p className="text-sm text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Menü Yönetimi</CardTitle></CardHeader><CardContent>
          <p className="text-sm text-muted-foreground">Menü öğelerinizi, paket ve gel-al fiyatlarınızı yönetin.</p>
          <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground"><Link to="/restaurant/menu">Menüyü Düzenle</Link></Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Yeni Kampanya</CardTitle></CardHeader><CardContent>
          <p className="text-sm text-muted-foreground">Grup kampanyası başlatın — anında tüm personele bildirilir.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/restaurant/campaigns">Kampanyaları Yönet</Link></Button>
        </CardContent></Card>
      </div>
    </div>
  );
}
