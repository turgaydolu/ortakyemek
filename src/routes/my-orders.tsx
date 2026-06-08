import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/my-orders")({
  head: () => ({ meta: [{ title: "Siparişlerim — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

const ST: Record<string, { label: string; cls: string }> = {
  pending: { label: "Onay Bekliyor", cls: "bg-warning text-warning-foreground" },
  approved: { label: "Onaylandı", cls: "bg-primary text-primary-foreground" },
  preparing: { label: "Hazırlanıyor", cls: "bg-accent text-accent-foreground" },
  delivered: { label: "Teslim Edildi", cls: "bg-success text-success-foreground" },
  cancelled: { label: "İptal", cls: "bg-muted text-muted-foreground" },
  rejected: { label: "Reddedildi", cls: "bg-destructive text-destructive-foreground" },
};

function Page() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("orders").select("*, restaurants(name), order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false });
      setOrders(data ?? []);
    };
    load();
    const ch = supabase.channel("my-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <AppShell title="Siparişlerim">
      {orders.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Henüz siparişiniz yok.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = ST[o.status] ?? ST.pending;
            return (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{o.restaurants?.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("tr-TR")}</p>
                    </div>
                    <Badge className={st.cls}>{st.label}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {o.order_items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.quantity}× {it.item_name}</span>
                        <span>₺{(Number(it.unit_price) * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">{o.delivery_method} · {o.payment_method}</span>
                    <span className="font-display text-lg font-bold text-primary">₺{Number(o.total_amount).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
