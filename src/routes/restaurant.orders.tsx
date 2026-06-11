import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/orders")({
  head: () => ({ meta: [{ title: "Siparişler — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

const ST: Record<string, string> = { pending: "Onay Bekliyor", approved: "Onaylandı", preparing: "Hazırlanıyor", delivered: "Teslim Edildi", cancelled: "İptal", rejected: "Reddedildi" };

function Page() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [camps, setCamps] = useState<any[]>([]);

  const load = async () => {
    if (!profile?.restaurant_id) return;
    const [{ data: oData }, { data: cData }] = await Promise.all([
      supabase.from("orders").select("*, order_items(*), profiles!orders_user_id_fkey(full_name), stores(name)").eq("restaurant_id", profile.restaurant_id).order("created_at", { ascending: false }),
      supabase.from("campaigns")
        .select("*, campaign_participants(id, quantity, stores(name), selected_delivery_time, profiles!fk_campaign_participants_profiles(full_name))")
        .eq("restaurant_id", profile.restaurant_id)
        .in("status", ["reached", "confirmed"])
        .order("created_at", { ascending: false })
    ]);
    setOrders(oData ?? []);
    setCamps(cData ?? []);
  };
  useEffect(() => { load(); }, [profile]);
  useEffect(() => {
    if (!profile?.restaurant_id) return;
    const ch = supabase.channel("rest-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${profile.restaurant_id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile]);

  const update = async (o: any, status: string) => {
    const upd: any = { status };
    if (status === "approved") { upd.approved_at = new Date().toISOString(); upd.delivery_deadline = new Date(Date.now() + 30 * 60 * 1000).toISOString(); }
    if (status === "delivered") upd.delivered_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(upd).eq("id", o.id);
    if (error) toast.error(error.message);
    else {
      await supabase.from("notifications").insert({ user_id: o.user_id, title: `Sipariş ${ST[status]}`, body: `Toplam ₺${Number(o.total_amount).toFixed(2)}`, type: "order" });
      toast.success("Güncellendi");
    }
  };

  const updateCamp = async (c: any, status: string) => {
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", c.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Kampanya güncellendi");
      load();
    }
  };

  return (
    <AppShell title="Gelen Siparişler">
      <Tabs defaultValue="normal" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="normal">Normal Siparişler</TabsTrigger>
          <TabsTrigger value="campaigns">Kampanyalar (Hazırlanacaklar)</TabsTrigger>
        </TabsList>

        <TabsContent value="normal">
          {orders.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">Sipariş yok.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <Card key={o.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{o.stores?.name ?? "Mağaza Bilgisi Yok"}</p>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{o.profiles?.full_name ?? "Müşteri"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString("tr-TR")} · {o.delivery_method} · {o.payment_method}</p>
                      </div>
                      <Badge>{ST[o.status]}</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      {o.order_items?.map((it: any) => (<div key={it.id}>{it.quantity}× {it.item_name}</div>))}
                    </div>
                    {o.notes && <p className="mt-2 rounded bg-secondary/50 p-2 text-xs">Not: {o.notes}</p>}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                      <span className="font-display text-lg font-bold text-primary">₺{Number(o.total_amount).toFixed(2)}</span>
                      <div className="flex gap-2">
                        {o.status === "pending" && (<>
                          <Button size="sm" variant="outline" onClick={() => update(o, "rejected")}>Reddet</Button>
                          <Button size="sm" onClick={() => update(o, "approved")} className="bg-gradient-primary text-primary-foreground">Onayla</Button>
                        </>)}
                        {o.status === "approved" && <Button size="sm" onClick={() => update(o, "preparing")}>Hazırlamaya Başla</Button>}
                        {o.status === "preparing" && <Button size="sm" onClick={() => update(o, "delivered")} className="bg-success text-success-foreground">Teslim Edildi</Button>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns">
          {camps.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">Hazırlanacak kampanya siparişi yok.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {camps.map((c) => (
                <Card key={c.id} className="border-2 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span>{c.title}</span>
                      <Badge variant={c.status === "confirmed" ? "default" : "secondary"}>
                        {c.status === "confirmed" ? "Hazırlanıyor" : "Onay Bekliyor"}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Teslimat Saati: {c.delivery_time ? new Date(c.delivery_time).toLocaleString("tr-TR") : "Belirtilmedi"} · {c.delivery_method}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-secondary/20 p-3 mb-4">
                      <p className="font-semibold mb-2">Sipariş İçeriği: <span className="text-primary">{c.target_participants} Adet {c.item_name}</span></p>
                      <div className="space-y-1 text-sm">
                        {c.campaign_participants?.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between border-b border-border/50 pb-1 last:border-0">
                            <span>{p.stores?.name || "Mağaza"} - {p.profiles?.full_name || "Kişi"}</span>
                            <span className="font-medium">{p.quantity} Adet {p.selected_delivery_time ? `(${p.selected_delivery_time})` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      {c.status === "reached" && (
                        <Button onClick={() => updateCamp(c, "confirmed")} className="bg-gradient-primary text-primary-foreground">
                          Onayla ve Hazırlamaya Başla
                        </Button>
                      )}
                      {c.status === "confirmed" && (
                        <Button onClick={() => updateCamp(c, "archived_confirmed")} className="bg-success text-success-foreground">
                          Teslim Edildi
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
