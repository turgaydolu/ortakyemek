import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Store, Users, ShoppingBag } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

export function ManagerDashboard() {
  const { profile } = useAuth();
  const [storeName, setStoreName] = useState("");
  const [staffCount, setStaffCount] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);

  useEffect(() => {
    if (!profile?.store_id) return;
    (async () => {
      const [s, st, o] = await Promise.all([
        supabase.from("stores").select("name").eq("id", profile.store_id!).single(),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("store_id", profile.store_id!),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", profile.store_id!).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      ]);
      setStoreName(s.data?.name ?? "");
      setStaffCount(st.count ?? 0);
      setTodayOrders(o.count ?? 0);
    })();
  }, [profile]);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-warm shadow-warm">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Mağazanız</p>
          <h2 className="font-display text-3xl font-bold">{storeName || "—"}</h2>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: "Mağaza Personeli", value: staffCount },
          { icon: ShoppingBag, label: "Bugünkü Sipariş", value: todayOrders },
          { icon: Store, label: "Aktif Mağaza", value: 1 },
        ].map((s) => (
          <Card key={s.label} className="shadow-soft">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary"><s.icon className="h-6 w-6 text-primary" /></div>
              <div><p className="text-2xl font-display font-bold">{s.value}</p><p className="text-sm text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-display">Ekibinizi yönetin</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Personel ekleyin, ayrılan kişileri sistemden çıkarın.</p>
            <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground hover:opacity-95"><Link to="/manager/team">Ekibi Gör</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display">Toplu sipariş açın</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Mağaza adına lokantadan toplu sipariş verin.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/restaurants">Lokantalara Git</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
