import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calculator, Store, Users, TrendingUp, CalendarDays, UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/restaurant/accounting")({
  head: () => ({ meta: [{ title: "Ciro & Hesaplar — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

function Page() {
  const { profile } = useAuth();
  const [data, setData] = useState<{ campaigns: any[], orders: any[] }>({ campaigns: [], orders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.restaurant_id) return;
    
    Promise.all([
      supabase.from("campaigns")
        .select(`
          id, created_at, price, item_name,
          campaign_participants ( quantity, user_id, profiles ( full_name ), stores ( name ) )
        `)
        .eq("restaurant_id", profile.restaurant_id)
        .in("status", ["active", "reached", "confirmed", "archived_confirmed"]),
      supabase.from("orders")
        .select(`
          id, created_at, total_amount, user_id,
          profiles ( full_name ),
          stores ( name ),
          order_items ( quantity, item_name, unit_price )
        `)
        .eq("restaurant_id", profile.restaurant_id)
        .eq("status", "delivered")
    ]).then(([{ data: cData }, { data: oData }]) => {
      setData({ campaigns: cData ?? [], orders: oData ?? [] });
      setLoading(false);
    });
  }, [profile]);

  if (loading) return <AppShell title="Ciro & Hesaplar"><div className="flex justify-center py-10">Yükleniyor...</div></AppShell>;

  // Process data
  let totalRevenue = 0;
  let totalOrders = 0;
  
  const now = new Date();
  let dailyRevenue = 0;
  let weeklyRevenue = 0;
  let monthlyRevenue = 0;

  const storeStats: Record<string, { qty: number, rev: number }> = {};
  const personStats: Record<string, { name: string, qty: number, rev: number }> = {};
  const itemStats: Record<string, { qty: number, rev: number }> = {};

  const processRevenue = (rev: number, qty: number, dateStr: string, sName: string, uId: string, uName: string, itemName: string) => {
    totalRevenue += rev;
    totalOrders += qty;

    const daysDiff = (now.getTime() - new Date(dateStr).getTime()) / (1000 * 3600 * 24);
    if (daysDiff <= 1) dailyRevenue += rev;
    if (daysDiff <= 7) weeklyRevenue += rev;
    if (daysDiff <= 30) monthlyRevenue += rev;

    if (!storeStats[sName]) storeStats[sName] = { qty: 0, rev: 0 };
    storeStats[sName].qty += qty;
    storeStats[sName].rev += rev;

    if (!personStats[uId]) personStats[uId] = { name: uName, qty: 0, rev: 0 };
    personStats[uId].qty += qty;
    personStats[uId].rev += rev;
    
    if (!itemStats[itemName]) itemStats[itemName] = { qty: 0, rev: 0 };
    itemStats[itemName].qty += qty;
    itemStats[itemName].rev += rev;
  };

  data.campaigns?.forEach(camp => {
    const price = Number(camp.price || 0);
    const itemName = camp.item_name || "Kampanya Ürünü";
    camp.campaign_participants?.forEach((p: any) => {
      const qty = p.quantity;
      const rev = qty * price;
      const sName = p.stores?.name || "Bilinmeyen Mağaza";
      const uId = p.user_id;
      const uName = p.profiles?.full_name || "Bilinmeyen Kişi";
      processRevenue(rev, qty, camp.created_at, sName, uId, uName, itemName);
    });
  });

  data.orders?.forEach(order => {
    const sName = order.stores?.name || "Bilinmeyen Mağaza";
    const uId = order.user_id;
    const uName = order.profiles?.full_name || "Bilinmeyen Kişi";
    
    order.order_items?.forEach((item: any) => {
      const qty = item.quantity;
      const rev = qty * Number(item.unit_price);
      const itemName = item.item_name || "Bilinmeyen Ürün";
      processRevenue(rev, qty, order.created_at, sName, uId, uName, itemName);
    });
  });

  const storesList = Object.entries(storeStats).sort((a, b) => b[1].rev - a[1].rev);
  const personsList = Object.values(personStats).sort((a, b) => b.rev - a.rev);
  const itemsList = Object.entries(itemStats).sort((a, b) => b[1].qty - a[1].qty);

  return (
    <AppShell title="Ciro & Hesap Raporları">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-primary text-primary-foreground">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium opacity-90">Toplam Ciro</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">₺{totalRevenue.toLocaleString("tr-TR")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium text-muted-foreground">Günlük Ciro</CardTitle><CalendarDays className="h-4 w-4 text-muted-foreground"/></CardHeader>
          <CardContent><div className="text-2xl font-bold">₺{dailyRevenue.toLocaleString("tr-TR")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium text-muted-foreground">Haftalık Ciro</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground"/></CardHeader>
          <CardContent><div className="text-2xl font-bold">₺{weeklyRevenue.toLocaleString("tr-TR")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium text-muted-foreground">Aylık Ciro</CardTitle><Calculator className="h-4 w-4 text-muted-foreground"/></CardHeader>
          <CardContent><div className="text-2xl font-bold">₺{monthlyRevenue.toLocaleString("tr-TR")}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stores" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="stores"><Store className="mr-2 h-4 w-4" /> Mağazalar</TabsTrigger>
          <TabsTrigger value="persons"><Users className="mr-2 h-4 w-4" /> Kişiler</TabsTrigger>
          <TabsTrigger value="items"><UtensilsCrossed className="mr-2 h-4 w-4" /> Ürünler</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stores">
          <Card>
            <CardHeader><CardTitle>Mağaza Sipariş Geçmişi</CardTitle><CardDescription>Hangi mağazadan toplam ne kadarlık sipariş gelmiş</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storesList.map(([name, stat]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-muted-foreground">{stat.qty} Adet Yemek</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">₺{stat.rev.toLocaleString("tr-TR")}</p>
                    </div>
                  </div>
                ))}
                {storesList.length === 0 && <p className="text-sm text-muted-foreground">Henüz sipariş kaydı yok.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persons">
          <Card>
            <CardHeader><CardTitle>Müşteri Sipariş Geçmişi</CardTitle><CardDescription>Bireysel olarak hangi personel ne kadarlık sipariş vermiş</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {personsList.map((stat, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-semibold">{stat.name}</p>
                      <p className="text-sm text-muted-foreground">{stat.qty} Adet Yemek</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">₺{stat.rev.toLocaleString("tr-TR")}</p>
                    </div>
                  </div>
                ))}
                {personsList.length === 0 && <p className="text-sm text-muted-foreground">Henüz sipariş kaydı yok.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader><CardTitle>En Çok Satan Ürünler</CardTitle><CardDescription>Sipariş adedine göre ürün bazlı analiz</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {itemsList.map(([name, stat], i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">{i + 1}</div>
                      <div>
                        <p className="font-semibold">{name}</p>
                        <p className="text-sm text-muted-foreground">{stat.qty} Adet Satıldı</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">₺{stat.rev.toLocaleString("tr-TR")}</p>
                    </div>
                  </div>
                ))}
                {itemsList.length === 0 && <p className="text-sm text-muted-foreground">Henüz sipariş kaydı yok.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
