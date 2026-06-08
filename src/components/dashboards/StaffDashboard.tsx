import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { UtensilsCrossed, Flame, Clock } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

export function StaffDashboard() {
  const { user } = useAuth();
  const [openRests, setOpenRests] = useState(0);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [myOrders, setMyOrders] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [r, c, o] = await Promise.all([
        supabase.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setOpenRests(r.count ?? 0);
      setActiveCampaigns(c.count ?? 0);
      setMyOrders(o.count ?? 0);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: UtensilsCrossed, label: "Açık Lokanta", value: openRests, color: "text-primary" },
          { icon: Flame, label: "Aktif Kampanya", value: activeCampaigns, color: "text-accent" },
          { icon: Clock, label: "Toplam Siparişim", value: myOrders, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="shadow-soft">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary"><s.icon className={`h-6 w-6 ${s.color}`} /></div>
              <div><p className="text-2xl font-display font-bold">{s.value}</p><p className="text-sm text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-warm shadow-warm">
          <CardHeader><CardTitle className="font-display">Sipariş ver</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">AVM'deki tüm lokantaları gezin, menülere göz atın ve hemen sipariş verin.</p>
            <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground hover:opacity-95">
              <Link to="/restaurants">Lokantalara Göz At</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" /> Kampanyalar
              <Badge className="ml-auto bg-primary text-primary-foreground">CANLI</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Grup kampanyalara katıl, ekibinle birlikte indirim kazan.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/campaigns">Kampanyaları Gör</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
