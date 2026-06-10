import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Flame, Users, Timer } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";

export const Route = createFileRoute("/campaigns")({
  head: () => ({ meta: [{ title: "Kampanyalar — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

interface Campaign { id: string; restaurant_id: string; title: string; description: string | null; item_name: string; price: number; target_participants: number; current_participants: number; expires_at: string; status: string; free_delivery: boolean; image_url: string | null; delivery_time?: string; delivery_time_2?: string; }
interface RestMap { [id: string]: string }

function Page() {
  const { user, profile } = useAuth();
  const [camps, setCamps] = useState<Campaign[]>([]);
  const [rests, setRests] = useState<RestMap>({});
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const load = async () => {
    const { data: c } = await supabase.from("campaigns").select("*").in("status", ["active", "reached", "confirmed"]).order("expires_at");
    setCamps((c ?? []) as Campaign[]);
    const ids = Array.from(new Set((c ?? []).map((x: any) => x.restaurant_id)));
    if (ids.length) {
      const { data: r } = await supabase.from("restaurants").select("id,name").in("id", ids);
      const m: RestMap = {}; (r ?? []).forEach((x: any) => m[x.id] = x.name); setRests(m);
    }
    if (user) {
      const { data: p } = await supabase.from("campaign_participants").select("campaign_id").eq("user_id", user.id);
      setJoined(new Set((p ?? []).map((x: any) => x.campaign_id)));
    }
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const ch = supabase.channel("campaigns-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_participants" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const join = async (c: Campaign, time?: string | null) => {
    if (!user) return;
    const { error } = await supabase.from("campaign_participants").insert({ 
      campaign_id: c.id, 
      user_id: user.id, 
      store_id: profile?.store_id, 
      quantity: 1,
      selected_delivery_time: time || null
    });
    if (error) toast.error(error.message); else { toast.success("Kampanyaya katıldın!"); load(); setSelectedCampaign(null); }
  };
  
  const handleJoinClick = (c: Campaign) => {
    if (c.delivery_time_2) {
      setSelectedCampaign(c);
      setSelectedTime(c.delivery_time || null);
    } else {
      join(c, c.delivery_time);
    }
  };
  const leave = async (c: Campaign) => {
    if (!user) return;
    await supabase.from("campaign_participants").delete().eq("campaign_id", c.id).eq("user_id", user.id);
    toast.success("Kampanyadan ayrıldın"); load();
  };

  const fmt = (ms: number) => {
    if (ms <= 0) return "Süre doldu";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h} saat ${m} dk`;
    return `${m} dakika`;
  };

  return (
    <AppShell title="Canlı Kampanyalar">
      {camps.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Şu anda aktif kampanya yok.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {camps.map((c) => {
            const pct = Math.min(100, (c.current_participants / c.target_participants) * 100);
            const ms = new Date(c.expires_at).getTime() - now;
            const isJoined = joined.has(c.id);
            const full = c.current_participants >= c.target_participants;
            
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
                    <Badge className="bg-white/20 text-primary-foreground">{rests[c.restaurant_id] ?? "Lokanta"}</Badge>
                    <span className="flex items-center gap-1 text-sm font-mono font-bold"><Timer className="h-4 w-4" /> {fmt(ms)}</span>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-bold">{c.title}</h3>
                  <p className="text-sm opacity-90">{c.item_name}</p>
                  
                  {deliveryText && (
                    <div className="mt-3 text-sm font-bold bg-white/20 inline-block px-3 py-1.5 rounded-md animate-pulse">
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
                      <span className="flex items-center gap-1 font-medium"><Users className="h-3 w-3" /> {c.current_participants} / {c.target_participants} kişi</span>
                      <span className="font-bold text-primary">{Math.round(pct)}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                  {c.status === "confirmed" ? (
                    <Badge className="bg-success text-success-foreground">Onaylandı, hazırlanıyor</Badge>
                  ) : ms <= 0 ? (
                    <Button disabled className="w-full">Süre doldu</Button>
                  ) : isJoined ? (
                    <Button onClick={() => leave(c)} variant="outline" className="w-full">Vazgeç</Button>
                  ) : (
                    <Button onClick={() => handleJoinClick(c)} disabled={full} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-95">
                      <Flame className="mr-2 h-4 w-4" /> {full ? "Doldu" : "Kampanyaya Katıl"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedCampaign && (
        <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Teslimat Saatini Seçin</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="mb-4 text-sm text-muted-foreground">Lütfen kampanyaya katılmak için size uygun teslimat saatini seçin:</p>
              <RadioGroup value={selectedTime || ""} onValueChange={setSelectedTime}>
                {selectedCampaign.delivery_time && (
                  <div className="flex items-center space-x-2 border p-3 rounded-md">
                    <RadioGroupItem value={selectedCampaign.delivery_time} id="t1" />
                    <Label htmlFor="t1" className="flex-1 cursor-pointer font-medium text-base">
                      {new Date(selectedCampaign.delivery_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} Teslimatı
                    </Label>
                  </div>
                )}
                {selectedCampaign.delivery_time_2 && (
                  <div className="flex items-center space-x-2 border p-3 rounded-md">
                    <RadioGroupItem value={selectedCampaign.delivery_time_2} id="t2" />
                    <Label htmlFor="t2" className="flex-1 cursor-pointer font-medium text-base">
                      {new Date(selectedCampaign.delivery_time_2).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} Teslimatı
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCampaign(null)}>İptal</Button>
              <Button onClick={() => join(selectedCampaign, selectedTime)}>Onayla ve Katıl</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
