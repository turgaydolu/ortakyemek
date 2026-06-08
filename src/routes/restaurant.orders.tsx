import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/orders")({
  head: () => ({ meta: [{ title: "Siparişler — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

const ST: Record<string, string> = { pending: "Onay Bekliyor", approved: "Onaylandı", preparing: "Hazırlanıyor", delivered: "Teslim Edildi", cancelled: "İptal", rejected: "Reddedildi" };

function Page() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  const load = async () => {
    if (!profile?.restaurant_id) return;
    const { data } = await supabase.from("orders").select("*, order_items(*), profiles!orders_user_id_fkey(full_name)").eq("restaurant_id", profile.restaurant_id).order("created_at", { ascending: false });
    setOrders(data ?? []);
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

  return (
    <AppShell title="Gelen Siparişler">
      {orders.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Sipariş yok.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.profiles?.full_name ?? "Müşteri"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("tr-TR")} · {o.delivery_method} · {o.payment_method}</p>
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
    </AppShell>
  );
}
