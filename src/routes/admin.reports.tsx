import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { AppShell } from "../components/AppShell";
import { RequireAuth } from "../lib/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Store, Flame, Banknote, CalendarClock, Target, Users } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Ciro & Raporlar — Ortak Yemek Admin" }] }),
  component: () => <RequireAuth><AdminReports /></RequireAuth>,
});

function AdminReports() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [accounting, setAccounting] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Tüm Kampanyalar
    const { data: campsData } = await supabase
      .from("campaigns")
      .select(`
        *,
        restaurants ( name ),
        campaign_participants ( quantity, user_id, profiles ( full_name ), stores ( name ) )
      `)
      .order("created_at", { ascending: false });
      
    // Tüm Siparişler
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, restaurants ( name )")
      .in("status", ["delivered", "preparing"]);

    // Lokantalar
    const { data: restsData } = await supabase
      .from("restaurants")
      .select("id, name");

    const camps = campsData || [];
    setCampaigns(camps);

    // Muhasebe Hesaplama (Lokanta Bazlı)
    const accMap: Record<string, any> = {};
    (restsData || []).forEach(r => {
      accMap[r.id] = { id: r.id, name: r.name, total_revenue: 0, campaign_revenue: 0, normal_revenue: 0, order_count: 0, campaign_sales: 0 };
    });

    // Kampanya ciroları ekle (sadece başarılı / arşivli olanlar hesaplansın veya hepsi?)
    // Aktif olmayan ama ulaşılan/onaylananlar
    camps.forEach(c => {
      if (["reached", "confirmed", "archived_confirmed"].includes(c.status) && accMap[c.restaurant_id]) {
        const cqty = c.campaign_participants?.reduce((sum: number, p: any) => sum + (p.quantity || 1), 0) || 0;
        const rev = cqty * Number(c.price);
        accMap[c.restaurant_id].campaign_revenue += rev;
        accMap[c.restaurant_id].total_revenue += rev;
        accMap[c.restaurant_id].campaign_sales += cqty;
      }
    });

    // Normal sipariş ciroları ekle
    (ordersData || []).forEach(o => {
      if (accMap[o.restaurant_id]) {
        const rev = Number(o.total_amount);
        accMap[o.restaurant_id].normal_revenue += rev;
        accMap[o.restaurant_id].total_revenue += rev;
        accMap[o.restaurant_id].order_count += 1;
      }
    });

    setAccounting(Object.values(accMap).sort((a, b) => b.total_revenue - a.total_revenue));
    setLoading(false);
  };

  const fmtCurrency = (val: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(val);

  return (
    <AppShell title="Ciro & Raporlar">
      <Tabs defaultValue="accounting" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="accounting">Ciro Takibi</TabsTrigger>
          <TabsTrigger value="campaigns">Tüm Kampanyalar</TabsTrigger>
        </TabsList>

        <TabsContent value="accounting" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-primary text-primary-foreground">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Platform Toplam Ciro</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-display font-bold">{fmtCurrency(accounting.reduce((s, a) => s + a.total_revenue, 0))}</div></CardContent>
            </Card>
            <Card className="bg-success text-success-foreground">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Toplam Kampanya Satışı</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-display font-bold">{accounting.reduce((s, a) => s + a.campaign_sales, 0)} Porsiyon</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Normal Sipariş Sayısı</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-display font-bold text-foreground">{accounting.reduce((s, a) => s + a.order_count, 0)} Adet</div></CardContent>
            </Card>
          </div>

          <h3 className="mt-8 mb-4 font-display text-xl font-bold">Lokanta Bazlı Ciro Dağılımı</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounting.map(a => (
              <Card key={a.id} className="shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> {a.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  <div className="flex justify-between items-center rounded-md bg-secondary/50 p-2">
                    <span className="text-xs text-muted-foreground">Toplam Ciro</span>
                    <span className="font-bold text-primary">{fmtCurrency(a.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kampanyalardan</span>
                    <span className="font-medium">{fmtCurrency(a.campaign_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Normal Siparişten</span>
                    <span className="font-medium">{fmtCurrency(a.normal_revenue)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {campaigns.map(c => {
              const parts = c.campaign_participants || [];
              const stores = parts.reduce((acc: any, p: any) => {
                const name = p.stores?.name || "Bilinmeyen Mağaza";
                acc[name] = (acc[name] || 0) + (p.quantity || 1);
                return acc;
              }, {});

              return (
                <Card key={c.id} className="shadow-soft flex flex-col">
                  <CardHeader className="pb-3 border-b bg-secondary/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-primary mb-1">{c.restaurants?.name}</div>
                        <CardTitle className="text-lg">{c.title}</CardTitle>
                        <CardDescription>{c.item_name} — {fmtCurrency(c.price)}</CardDescription>
                      </div>
                      <Badge variant="outline" className="capitalize">{c.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1">
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1 mb-1"><Target className="h-3.5 w-3.5" /> Hedef / Katılan</div>
                        <div className="font-medium">{c.target_participants} / {c.current_participants} Kişi</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1 mb-1"><CalendarClock className="h-3.5 w-3.5" /> Teslimat</div>
                        <div className="font-medium">{c.delivery_time ? new Date(c.delivery_time).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : 'Belirtilmedi'}</div>
                      </div>
                    </div>

                    <div className="rounded-md border p-3 bg-secondary/20">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Katılımcı Mağazalar</div>
                      {Object.keys(stores).length === 0 ? (
                        <div className="text-xs text-muted-foreground">Henüz katılım yok.</div>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(stores).map(([name, qty]) => (
                            <div key={name} className="flex justify-between text-sm">
                              <span>{name}</span>
                              <span className="font-medium">{String(qty)} Adet</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
