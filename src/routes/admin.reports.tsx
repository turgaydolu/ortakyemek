import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { AppShell } from "../components/AppShell";
import { RequireAuth } from "../lib/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Store, Flame, Banknote, CalendarClock, Target, Users, Download } from "lucide-react";

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
    const { data: campsData, error: campsError } = await supabase
      .from("campaigns")
      .select(`
        *,
        restaurants ( name ),
        campaign_participants ( quantity, user_id, selected_delivery_time, profiles ( full_name ), stores ( name ) )
      `)
      .order("created_at", { ascending: false });

    if (campsError) {
      console.error("Camps error:", campsError);
      alert("Kampanyalar çekilemedi: " + campsError.message);
    }
      
    // Tüm Siparişler
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*, restaurants ( name )")
      .in("status", ["delivered", "preparing"]);

    if (ordersError) {
      console.error("Orders error:", ordersError);
      alert("Siparişler çekilemedi: " + ordersError.message);
    }

    // Lokantalar
    const { data: restsData, error: restsError } = await supabase
      .from("restaurants")
      .select("id, name");

    if (restsError) {
      console.error("Rests error:", restsError);
      alert("Lokantalar çekilemedi: " + restsError.message);
    }

    const camps = campsData || [];
    setCampaigns(camps.filter(c => ["active", "reached", "confirmed"].includes(c.status)));

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

  const exportToExcel = () => {
    let csv = "ID,Baslik,Lokanta,Urun,Fiyat,Mevcut_Katilim,Hedef_Katilim,Durum,Son_Kullanma,Hedef_Teslimat\n";
    campaigns.forEach(c => {
      const row = [
        c.id,
        `"${(c.title || "").replace(/"/g, '""')}"`,
        `"${(c.restaurants?.name || "").replace(/"/g, '""')}"`,
        `"${(c.item_name || "").replace(/"/g, '""')}"`,
        c.price,
        c.current_participants,
        c.target_participants,
        c.status,
        new Date(c.expires_at).toLocaleString('tr-TR'),
        c.delivery_time ? new Date(c.delivery_time).toLocaleString('tr-TR') : "Belirtilmedi"
      ].join(",");
      csv += row + "\n";
    });
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Aktif_Kampanyalar_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={exportToExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
              <Download className="h-4 w-4" /> Excel Olarak İndir
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {campaigns.map(c => {
              const parts = c.campaign_participants || [];

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
                      <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Katılımcılar</div>
                      {parts.length === 0 ? (
                        <div className="text-xs text-muted-foreground">Henüz katılım yok.</div>
                      ) : (
                        <div className="space-y-1">
                          {parts.map((p: any, i: number) => (
                            <div key={p.id || i} className="flex justify-between text-sm border-b border-border/50 last:border-0 pb-1 last:pb-0">
                              <div>
                                <span className="font-medium text-primary">{p.profiles?.full_name ?? "Bilinmeyen Personel"}</span>
                                <span className="text-xs text-muted-foreground ml-1">({p.stores?.name ?? "Mağaza Yok"})</span>
                              </div>
                              <span className="font-bold">{p.quantity || 1} Adet</span>
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
