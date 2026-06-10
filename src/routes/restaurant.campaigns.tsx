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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Plus, Flame, Timer, CalendarClock, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/campaigns")({
  head: () => ({ meta: [{ title: "Kampanyalar — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

function Page() {
  const { profile } = useAuth();
  const [camps, setCamps] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", item_name: "", price: "", target_participants: "10", duration_hours: "24", free_delivery: true, delivery_date: "", delivery_time: "", delivery_time_2: "", image_url: "", delivery_method: "mall_delivery" });
  const [now, setNow] = useState(Date.now());

  const load = () => {
    if (!profile?.restaurant_id) return;
    supabase.from("campaigns")
      .select("*, campaign_participants(quantity, stores(name), selected_delivery_time)")
      .eq("restaurant_id", profile.restaurant_id)
      .in("status", ["active", "reached", "confirmed", "cancelled"])
      .order("created_at", { ascending: false })
      .then(({ data }) => setCamps(data ?? []));
      
    supabase.from("menu_items")
      .select("*")
      .eq("restaurant_id", profile.restaurant_id)
      .eq("available", true)
      .then(({ data }) => setMenuItems(data ?? []));
  };
  useEffect(load, [profile]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const create = async () => {
    if (!profile?.restaurant_id || !form.title || !form.item_name || !form.price) { toast.error("Eksik alan"); return; }
    
    const expires = new Date(Date.now() + Number(form.duration_hours) * 3600000).toISOString();
    let delivery_time = null;
    let delivery_time_2 = null;
    if (form.delivery_date && form.delivery_time) {
      delivery_time = new Date(`${form.delivery_date}T${form.delivery_time}`).toISOString();
    }
    if (form.delivery_date && form.delivery_time_2) {
      delivery_time_2 = new Date(`${form.delivery_date}T${form.delivery_time_2}`).toISOString();
    }

    const { data: c, error } = await supabase.from("campaigns").insert({
      restaurant_id: profile.restaurant_id,
      title: form.title,
      description: form.description,
      item_name: form.item_name,
      price: Number(form.price),
      target_participants: Number(form.target_participants),
      expires_at: expires,
      free_delivery: form.free_delivery,
      delivery_time,
      delivery_time_2,
      delivery_method: form.delivery_method,
      image_url: form.image_url || null
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

  const remove = async (c: any) => {
    if (!window.confirm("Bu kampanyayı silmek istediğinize emin misiniz? (Geçmiş cironuz kaybolmaz)")) return;
    
    const newStatus = c.status === "confirmed" ? "archived_confirmed" : "archived_cancelled";
    
    const { error } = await supabase.from("campaigns").update({ status: newStatus }).eq("id", c.id);
    if (error) {
      toast.error("Hata: " + error.message);
      return;
    }
    load();
    toast.success("Kampanya listeden kaldırıldı.");
  };

  const handleReactivate = (c: any) => {
    setForm({
      title: c.title || "",
      description: c.description || "",
      item_name: c.item_name || "",
      price: String(c.price || ""),
      target_participants: String(c.target_participants || "10"),
      duration_hours: "24",
      free_delivery: c.free_delivery ?? true,
      delivery_date: "",
      delivery_time: "",
      image_url: c.image_url || "",
      delivery_method: c.delivery_method || "mall_delivery"
    });
    setOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => img.onload = r);
      
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > 800 || height > 800) {
        if (width > height) { height = Math.round(height * 800 / width); width = 800; }
        else { width = Math.round(width * 800 / height); height = 800; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      
      const blob: Blob = await new Promise(r => canvas.toBlob(b => r(b!), "image/jpeg", 0.8));
      const ext = "jpeg";
      const path = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { data, error } = await supabase.storage.from("menu_images").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      
      const { data: pubData } = supabase.storage.from("menu_images").getPublicUrl(data.path);
      setForm((prev) => ({ ...prev, image_url: pubData.publicUrl }));
      toast.success("Resim yüklendi");
    } catch (err: any) {
      toast.error("Resim yüklenemedi: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const fmt = (ms: number) => { 
    if (ms <= 0) return "Süre doldu"; 
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
    return `${m}:${s.toString().padStart(2,"0")}`; 
  };

  return (
    <AppShell title="Kampanyalarım">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Yeni Kampanya</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Yeni Grup Kampanyası</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Mevcut Menüden Seç (İsteğe Bağlı)</Label>
                <Select onValueChange={(id) => {
                  const m = menuItems.find(x => x.id === id);
                  if (m) {
                    const basePrice = m.price || m.dine_in_price || m.takeaway_price || m.mall_delivery_price || 0;
                    setForm({ ...form, title: m.name + " Kampanyası", item_name: m.name, price: String(basePrice), description: m.description || "", image_url: m.image_url || "" });
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Menüden bir ürün seçin veya manuel girin" /></SelectTrigger>
                  <SelectContent>
                    {menuItems.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Başlık</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Adana Dürüm Ayran" /></div>
              <div><Label>Ürün</Label><Input value={form.item_name} onChange={(e) => setForm({...form, item_name: e.target.value})} placeholder="Adana Dürüm + Ayran" /></div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} /></div>
              <div>
                <Label>Resim Ekle</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="flex-1" />
                  {isUploading && <span className="text-xs text-muted-foreground">Yükleniyor...</span>}
                  {form.image_url && <img src={form.image_url} alt="Preview" className="h-10 w-10 rounded object-cover" />}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Fiyat ₺</Label><Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} /></div>
                <div><Label>Kişi Hedefi</Label><Input type="number" value={form.target_participants} onChange={(e) => setForm({...form, target_participants: e.target.value})} /></div>
                <div><Label>Süre (Saat)</Label><Input type="number" value={form.duration_hours} onChange={(e) => setForm({...form, duration_hours: e.target.value})} /></div>
              </div>
              <div className="grid gap-4 rounded-lg border bg-secondary/20 p-3 sm:grid-cols-3">
                <div><Label>İleri Tarihli Sipariş (Tarih)</Label><Input type="date" value={form.delivery_date} onChange={(e) => setForm({...form, delivery_date: e.target.value})} /></div>
                <div><Label>1. Teslimat Saati</Label><Input type="time" value={form.delivery_time} onChange={(e) => setForm({...form, delivery_time: e.target.value})} /></div>
                <div><Label>2. Teslimat Saati (İsteğe Bağlı)</Label><Input type="time" value={form.delivery_time_2} onChange={(e) => setForm({...form, delivery_time_2: e.target.value})} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Teslimat Türü</Label>
                  <Select value={form.delivery_method} onValueChange={(v) => setForm({...form, delivery_method: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mall_delivery">🛵 AVM İçi Teslimat</SelectItem>
                      <SelectItem value="takeaway">🛍️ Gel Al</SelectItem>
                      <SelectItem value="dine_in">🍽️ Masaya Servis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3"><Label>Ücretsiz Teslimat</Label><Switch checked={form.free_delivery} onCheckedChange={(v) => setForm({...form, free_delivery: v})} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={create} className="bg-gradient-primary text-primary-foreground"><Flame className="mr-2 h-4 w-4" /> Yayınla</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {camps.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Henüz kampanyanız yok.</CardContent></Card>
      ) : (
        <div className="grid gap-4 grid-cols-1">
          {camps.map((c) => {
            const pct = Math.min(100, (c.current_participants / c.target_participants) * 100);
            const ms = new Date(c.expires_at).getTime() - now;
            return (
              <Card key={c.id} className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between font-display"><span>{c.title}</span><Badge>{c.status}</Badge></CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-md bg-secondary/20">
                      <img src={c.image_url} alt={c.item_name} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{c.item_name} · ₺{Number(c.price).toFixed(2)}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="font-normal">
                      {c.delivery_method === 'takeaway' ? '🛍️ Gel Al' : c.delivery_method === 'dine_in' ? '🍽️ Masaya Servis' : '🛵 AVM İçi Teslimat'}
                    </Badge>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs"><span>{c.current_participants}/{c.target_participants} kişi</span><span className="flex items-center gap-1"><Timer className="h-3 w-3" />{fmt(ms)}</span></div>
                    <Progress value={pct} />
                  </div>
                  
                  {c.delivery_time && (
                    <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-2 text-xs font-medium text-secondary-foreground">
                      <CalendarClock className="h-4 w-4" /> Teslimat: {new Date(c.delivery_time).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  )}

                  {c.campaign_participants && c.campaign_participants.length > 0 && (
                    <div className="mt-2 rounded-md border p-2">
                      <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Store className="h-3 w-3" /> Gelen Siparişler (Mağaza Bazlı)</div>
                      <div className="space-y-3">
                        {Object.entries(
                          c.campaign_participants.reduce((acc: any, p: any) => {
                            const time = p.selected_delivery_time 
                              ? new Date(p.selected_delivery_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) 
                              : "Standart Saat";
                            if (!acc[time]) acc[time] = {};
                            const name = p.stores?.name || "Bilinmeyen Mağaza";
                            acc[time][name] = (acc[time][name] || 0) + p.quantity;
                            return acc;
                          }, {})
                        ).map(([time, stores]: any) => (
                          <div key={time}>
                            <div className="text-xs font-bold text-primary">{time} Teslimatı</div>
                            {Object.entries(stores).map(([name, qty]) => (
                              <div key={name} className="flex justify-between text-xs ml-2 border-l border-border pl-2">
                                <span>{name}</span>
                                <span className="font-bold">{String(qty)} Adet</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {c.status === "reached" && <Button onClick={() => confirm(c)} className="w-full bg-success text-success-foreground">Onayla ve Hazırla</Button>}
                  {(c.status === "active" || c.status === "reached") && <Button onClick={() => cancel(c)} variant="outline" className="w-full">İptal</Button>}
                  {(c.status === "cancelled" || c.status === "confirmed" || (c.status === "active" && ms <= 0)) && (
                    <div className="mt-2 flex gap-2">
                      <Button onClick={() => handleReactivate(c)} variant="secondary" className="flex-1 border-primary text-primary hover:bg-primary/10">
                        Düzenle ve Tekrar Başlat
                      </Button>
                      <Button onClick={() => remove(c)} variant="destructive" size="icon" className="w-10 flex-shrink-0" title="Sil">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
