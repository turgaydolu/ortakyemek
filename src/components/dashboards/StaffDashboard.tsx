import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { UtensilsCrossed, Flame, Clock, Users } from "lucide-react";
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
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");

  const loadDashboard = async () => {
    if (!user) return;
    const [r, c, o, camps] = await Promise.all([
      supabase.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("campaigns").select("*, restaurants(name), campaign_participants(quantity)").in("status", ["active", "reached", "confirmed"]).order("expires_at").limit(6),
    ]);
    setOpenRests(r.count ?? 0);
    setActiveCampaigns(c.count ?? 0);
    setMyOrders(o.count ?? 0);
    setLiveCamps(camps.data ?? []);
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
        // Find all participant IDs to notify them
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
      }
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {liveCamps.map(c => {
              const currentParticipants = c.campaign_participants?.reduce((sum: number, p: any) => sum + (p.quantity || 1), 0) || 0;
              const isFull = currentParticipants >= c.target_participants;
              
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
                <Card key={c.id} className="shadow-soft overflow-hidden flex flex-col">
                  {c.image_url && (
                    <div className="h-32 w-full overflow-hidden bg-secondary/20">
                      <img src={c.image_url} alt={c.item_name} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="text-xs font-semibold text-primary mb-1">{c.restaurants?.name}</div>
                    <h3 className="font-display font-bold text-lg mb-1">{c.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{c.description || c.item_name}</p>
                    
                    {deliveryText && (
                      <div className={`mt-2 font-bold inline-block px-3 py-1.5 rounded-md animate-pulse self-start ${
                        deliveryText.includes("Yarın") 
                          ? "bg-destructive text-destructive-foreground text-sm scale-105 transform origin-left shadow-sm" 
                          : "bg-primary/10 text-primary text-xs"
                      }`}>
                        {deliveryText}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="font-bold text-lg text-primary">₺{Number(c.price).toFixed(2)}</span>
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> {currentParticipants} / {c.target_participants} Kişi
                      </span>
                    </div>
                    <Button onClick={() => handleJoinClick(c)} disabled={isFull} size="sm" className="w-full mt-3 bg-gradient-primary text-primary-foreground hover:opacity-95">
                      {isFull ? "Tükendi" : "Katıl"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
