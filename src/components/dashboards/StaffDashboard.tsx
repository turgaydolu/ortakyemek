import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { UtensilsCrossed, Flame, Clock, Users, Timer } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { toast } from "sonner";

import { sendNotificationFromTemplate } from "../../lib/notifications";

export function StaffDashboard() {
  const { user, profile } = useAuth();
  const [openRests, setOpenRests] = useState(0);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [myOrders, setMyOrders] = useState(0);

  const [liveCamps, setLiveCamps] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const loadDashboard = async () => {
    if (!user) return;
    const [r, c, o, camps, rests] = await Promise.all([
      supabase.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("campaigns").select("*, restaurants(name, owner_id), campaign_participants(quantity)").in("status", ["active", "reached", "confirmed"]).order("expires_at").limit(6),
      supabase.from("restaurants").select("id, name, menu_items(id, name, description, price)").eq("status", "open"),
    ]);
    setOpenRests(r.count ?? 0);
    setActiveCampaigns(c.count ?? 0);
    setMyOrders(o.count ?? 0);
    setLiveCamps(camps.data ?? []);
    setRestaurants(rests.data ?? []);

    if (user) {
      const { data: p } = await supabase.from("campaign_participants").select("campaign_id").eq("user_id", user.id);
      setJoined(new Set((p ?? []).map((x: any) => x.campaign_id)));
    }
  };

  useEffect(() => {
    loadDashboard();
    if (!user) return;
    const ch = supabase.channel("dashboard-camps-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => loadDashboard())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_participants" }, () => loadDashboard())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const joinCampaign = async (c: any, time: string | null) => {
    if (!c || !profile) return;
    if (!profile.store_id && profile.role !== "manager") return toast.error("Mağazanız yok");
    
    const { error } = await supabase.from("campaign_participants").insert({
      campaign_id: c.id,
      user_id: profile.id,
      store_id: profile.store_id,
      quantity: 1,
      selected_delivery_time: time
    });
    
    if (error) {
      if (error.code === '23505') toast.error("Bu kampanyaya zaten katıldınız!");
      else toast.error("Katılılamadı: " + error.message);
    } else {
      toast.success("Kampanyaya katıldınız!");
      // Send join notification
      sendNotificationFromTemplate(
        "campaign_joined",
        [profile.id],
        {
          campaignName: c.title,
          restaurantName: c.restaurants?.name || "Lokanta",
          userName: profile.full_name || "Personel",
        },
        "/campaigns"
      );
      
      // Check if target is reached
      const currentParticipants = c.campaign_participants?.reduce((sum: number, p: any) => sum + (p.quantity || 1), 0) || 0;
      if (currentParticipants + 1 >= c.target_participants && c.status === "active") {
        const allUserIds = Array.from(new Set([...(c.campaign_participants?.map((p:any) => p.user_id) || []), profile.id]));
        sendNotificationFromTemplate(
          "campaign_completed",
          allUserIds as string[],
          {
            campaignName: c.title,
            restaurantName: c.restaurants?.name || "Lokanta"
          },
          "/campaigns"
        );
        if (c.restaurants?.owner_id) {
          sendNotificationFromTemplate(
            "rest_campaign_completed",
            [c.restaurants.owner_id],
            {
              campaignName: c.title,
              restaurantName: c.restaurants.name || "Lokanta"
            },
            "/restaurant/campaigns"
          );
        }
      }
      loadDashboard();
    }
    
    setSelectedCampaign(null);
  };

  const handleJoinClick = (c: any) => {
    if (!profile) return toast.error("Giriş yapın");
    if (!profile.store_id && profile.role !== "manager") return toast.error("Mağazanız yok");
    
    if (!c.delivery_time && !c.delivery_time_2) {
      joinCampaign(c, null);
    } else {
      setSelectedCampaign(c);
      setSelectedTime(c.delivery_time || "");
    }
  };

  const leaveCampaign = async (c: any) => {
    if (!user) return;
    await supabase.from("campaign_participants").delete().eq("campaign_id", c.id).eq("user_id", user.id);
    toast.success("Kampanyadan ayrıldın"); 
    loadDashboard();
  };

  const fmt = (ms: number) => {
    if (ms <= 0) return "Süre doldu";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h} saat ${m} dk`;
    return `${m} dakika`;
  };

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

      <div className="mt-8">
        <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
          <Flame className="text-primary h-5 w-5" /> 
          Anlık Kampanyalar
        </h2>
        {liveCamps.length === 0 ? (
          <Card className="border-dashed shadow-none bg-transparent">
            <CardContent className="py-8 text-center text-muted-foreground">
              Şu an aktif kampanya bulunmuyor. Yeni fırsatlar eklendiğinde burada görebilirsiniz!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {liveCamps.map(c => {
              const currentParticipants = c.campaign_participants?.reduce((sum: number, p: any) => sum + (p.quantity || 1), 0) || 0;
              const pct = Math.min(100, (currentParticipants / c.target_participants) * 100);
              const ms = new Date(c.expires_at).getTime() - now;
              const isJoined = joined.has(c.id);
              const full = currentParticipants >= c.target_participants;
              
              let deliveryText = null;
              if (c.delivery_time) {
                const dDate = new Date(c.delivery_time);
                const today = new Date();
                const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
                
                let timeStr = dDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                if (c.delivery_time_2) {
                  const dDate2 = new Date(c.delivery_time_2);
                  timeStr += ` veya ${dDate2.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
                }
                
                if (dDate.getDate() === today.getDate() && dDate.getMonth() === today.getMonth()) {
                  deliveryText = `Bugün Gel Al (${timeStr})`;
                } else if (dDate.getDate() === tomorrow.getDate() && dDate.getMonth() === tomorrow.getMonth()) {
                  deliveryText = `Yarın Gel Al (${timeStr})`;
                } else {
                  deliveryText = `${dDate.toLocaleDateString('tr-TR')} ${timeStr} için Gel Al`;
                }
              }

              return (
                <Card key={c.id} className="overflow-hidden shadow-warm">
                  <div className="bg-gradient-primary px-5 py-4 text-primary-foreground">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-white/20 text-primary-foreground">{c.restaurants?.name || "Lokanta"}</Badge>
                      <span className="flex items-center gap-1 text-sm font-mono font-bold"><Timer className="h-4 w-4" /> {fmt(ms)}</span>
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-bold">{c.title}</h3>
                    <p className="text-sm opacity-90">{c.item_name}</p>
                    
                    {deliveryText && (
                      <div className={`mt-3 font-bold inline-block px-3 py-1.5 rounded-md animate-pulse ${
                        deliveryText.includes("Yarın")
                          ? "bg-white text-destructive text-base shadow-md scale-105 transform origin-left"
                          : "bg-white/20 text-primary-foreground text-sm"
                      }`}>
                        {deliveryText}
                      </div>
                    )}
                  </div>
                  {c.image_url && (
                    <div className="aspect-video w-full overflow-hidden bg-secondary/20">
                      <img src={c.image_url} alt={c.item_name} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">Kişi başı</span>
                      <span className="font-display text-3xl font-bold text-primary">₺{Number(c.price).toFixed(2)}</span>
                    </div>
                    {c.free_delivery && <Badge className="bg-success text-success-foreground">Ücretsiz teslimat</Badge>}
                    {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 font-medium"><Users className="h-3 w-3" /> {currentParticipants} / {c.target_participants} kişi</span>
                        <span className="font-bold text-primary">{Math.round(pct)}%</span>
                      </div>
                      <Progress value={pct} />
                    </div>
                    {c.status === "confirmed" ? (
                      <Badge className="bg-success text-success-foreground flex w-full justify-center">Onaylandı, hazırlanıyor</Badge>
                    ) : ms <= 0 ? (
                      <Badge variant="secondary" className="flex w-full justify-center">Süre doldu</Badge>
                    ) : isJoined ? (
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1 border-destructive text-destructive" onClick={() => leaveCampaign(c)}>Ayrıl</Button>
                        <Button className="flex-1 bg-success text-success-foreground" disabled>Katıldın</Button>
                      </div>
                    ) : (
                      <Button className="w-full bg-gradient-primary pt-2" onClick={() => handleJoinClick(c)} disabled={full}>{full ? "Tükendi" : "Katıl"}</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
          <UtensilsCrossed className="text-primary h-5 w-5" /> 
          Lokantalarımız ve Menüleri
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map(r => (
            <Card key={r.id} className="shadow-soft flex flex-col overflow-hidden transition hover:shadow-warm">
              <div className="bg-gradient-to-r from-secondary/40 to-secondary/10 px-5 py-4 border-b">
                <h3 className="flex items-center gap-2 text-lg font-display font-bold">
                  {r.name}
                </h3>
              </div>
              <CardContent className="p-0 flex-1">
                <div className="divide-y divide-border/50">
                  {r.menu_items?.slice(0, 5).map((m: any) => (
                    <div key={m.id} className="flex justify-between items-center p-4 hover:bg-secondary/5 transition">
                      <div>
                        <p className="font-medium text-sm">{m.name}</p>
                        {m.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{m.description}</p>}
                      </div>
                      <div className="text-sm font-bold text-primary ml-4">₺{Number(m.price).toFixed(2)}</div>
                    </div>
                  ))}
                  {r.menu_items && r.menu_items.length > 5 && (
                    <div className="p-3 text-center text-xs font-medium text-primary bg-primary/5">
                      +{r.menu_items.length - 5} ürün daha
                    </div>
                  )}
                  {(!r.menu_items || r.menu_items.length === 0) && (
                    <div className="p-6 text-sm text-muted-foreground text-center italic">Menü yakında eklenecek...</div>
                  )}
                </div>
              </CardContent>
              <div className="p-4 border-t bg-card/50">
                 <Button asChild size="sm" className="w-full">
                   <Link to="/restaurants/$id" params={{ id: r.id }}>Lokantaya Git & Sipariş Ver</Link>
                 </Button>
              </div>
            </Card>
          ))}
          {restaurants.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border rounded-xl border-dashed">
              Şu an açık lokanta bulunmuyor.
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teslimat Saatini Seçin</DialogTitle>
            <DialogDescription>
              Lütfen kampanyaya katılmak için size uygun teslimat saatini seçin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={selectedTime} onValueChange={setSelectedTime}>
              {selectedCampaign?.delivery_time && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={selectedCampaign.delivery_time} id="t1" />
                  <Label htmlFor="t1">{new Date(selectedCampaign.delivery_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} Teslimatı</Label>
                </div>
              )}
              {selectedCampaign?.delivery_time_2 && (
                <div className="flex items-center space-x-2 mt-2">
                  <RadioGroupItem value={selectedCampaign.delivery_time_2} id="t2" />
                  <Label htmlFor="t2">{new Date(selectedCampaign.delivery_time_2).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} Teslimatı</Label>
                </div>
              )}
            </RadioGroup>
            
            {selectedTime && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm font-bold text-red-600 text-center animate-pulse">
                  {(() => {
                    const dDate = new Date(selectedTime);
                    const today = new Date();
                    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
                    let dateText = dDate.toLocaleDateString('tr-TR');
                    if (dDate.getDate() === today.getDate() && dDate.getMonth() === today.getMonth()) dateText += " (Bugün)";
                    else if (dDate.getDate() === tomorrow.getDate() && dDate.getMonth() === tomorrow.getMonth()) dateText += " (Yarın)";
                    return `Siparişiniz ${dateText} teslim edilecektir.`;
                  })()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCampaign(null)}>İptal</Button>
            <Button onClick={() => joinCampaign(selectedCampaign, selectedTime)}>Katıl</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
