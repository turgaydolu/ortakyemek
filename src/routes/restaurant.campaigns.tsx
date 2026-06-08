import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Plus, Flame, Timer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/campaigns")({
  head: () => ({ meta: [{ title: "Kampanyalar — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

function Page() {
  const { profile } = useAuth();
  const [camps, setCamps] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", item_name: "", price: "", target_participants: "10", duration_min: "10", free_delivery: true });
  const [now, setNow] = useState(Date.now());

  const load = () => {
    if (!profile?.restaurant_id) return;
    supabase.from("campaigns").select("*").eq("restaurant_id", profile.restaurant_id).order("created_at", { ascending: false }).then(({ data }) => setCamps(data ?? []));
  };
  useEffect(load, [profile]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const create = async () => {
    if (!profile?.restaurant_id || !form.title || !form.item_name || !form.price) { toast.error("Eksik alan"); return; }
    const expires = new Date(Date.now() + Number(form.duration_min) * 60000).toISOString();
    const { data: c, error } = await supabase.from("campaigns").insert({
      restaurant_id: profile.restaurant_id,
      title: form.title, description: form.description, item_name: form.item_name,
      price: Number(form.price), target_participants: Number(form.target_participants),
      expires_at: expires, free_delivery: form.free_delivery, status: "active",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("notifications").insert({ broadcast: true, title: "🔥 Yeni Kampanya: " + form.title, body: `${form.item_name} — ₺${form.price} · ${form.target_participants} kişide tetiklenir`, type: "campaign", link: "/campaigns" });
    toast.success("Kampanya açıldı, tüm personele bildirildi!");
    setOpen(false); load();
  };

  const confirm = async (c: any) => {
    await supabase.from("campaigns").update({ status: "confirmed" }).eq("id", c.id);
    await supabase.from("notifications").insert({ broadcast: true, title: "Kampanya onaylandı", body: `${c.title} hazırlanıyor`, type: "campaign" });
    toast.success("Onaylandı"); load();
  };
  const cancel = async (c: any) => {
    await supabase.from("campaigns").update({ status: "cancelled" }).eq("id", c.id);
    load();
  };

  const fmt = (ms: number) => { if (ms <= 0) return "Süre doldu"; const m = Math.floor(ms/60000); const s = Math.floor((ms%60000)/1000); return `${m}:${s.toString().padStart(2,"0")}`; };

  return (
    <AppShell title="Kampanyalarım">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Yeni Kampanya</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Yeni Grup Kampanyası</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Başlık</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Adana Dürüm Ayran" /></div>
              <div><Label>Ürün</Label><Input value={form.item_name} onChange={(e) => setForm({...form, item_name: e.target.value})} placeholder="Adana Dürüm + Ayran" /></div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Fiyat ₺</Label><Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} /></div>
                <div><Label>Hedef Kişi</Label><Input type="number" value={form.target_participants} onChange={(e) => setForm({...form, target_participants: e.target.value})} /></div>
                <div><Label>Süre (dk)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm({...form, duration_min: e.target.value})} /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3"><Label>Ücretsiz Teslimat</Label><Switch checked={form.free_delivery} onCheckedChange={(v) => setForm({...form, free_delivery: v})} /></div>
            </div>
            <DialogFooter><Button onClick={create} className="bg-gradient-primary text-primary-foreground"><Flame className="mr-2 h-4 w-4" /> Yayınla</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {camps.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Henüz kampanyanız yok.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {camps.map((c) => {
            const pct = Math.min(100, (c.current_participants / c.target_participants) * 100);
            const ms = new Date(c.expires_at).getTime() - now;
            return (
              <Card key={c.id} className="shadow-soft">
                <CardHeader><CardTitle className="flex items-center justify-between font-display"><span>{c.title}</span><Badge>{c.status}</Badge></CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{c.item_name} · ₺{Number(c.price).toFixed(2)}</p>
                  <div>
                    <div className="mb-1 flex justify-between text-xs"><span>{c.current_participants}/{c.target_participants} kişi</span><span className="flex items-center gap-1"><Timer className="h-3 w-3" />{fmt(ms)}</span></div>
                    <Progress value={pct} />
                  </div>
                  {c.status === "reached" && <Button onClick={() => confirm(c)} className="w-full bg-success text-success-foreground">Onayla ve Hazırla</Button>}
                  {(c.status === "active" || c.status === "reached") && <Button onClick={() => cancel(c)} variant="outline" className="w-full">İptal</Button>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
