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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Pencil, Trash2, Store } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/menu")({
  head: () => ({ meta: [{ title: "Menü Yönetimi — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

interface MI { id: string; name: string; description: string | null; category: string | null; price: number; combo_price: number | null; takeaway_price: number | null; mall_delivery_price: number | null; available: boolean; image_url?: string | null; }

function Page() {
  const { profile } = useAuth();
  const [items, setItems] = useState<MI[]>([]);
  const [restStatus, setRestStatus] = useState<"open" | "closed" | "not_accepting">("open");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MI | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "", price: "", combo_price: "", takeaway_price: "", mall_delivery_price: "", available: true, image_url: "" });
  const [isUploading, setIsUploading] = useState(false);

  const load = () => {
    if (!profile?.restaurant_id) return;
    supabase.from("restaurants").select("status").eq("id", profile.restaurant_id).single().then(({ data }) => setRestStatus((data?.status as any) || "open"));
    supabase.from("menu_items").select("*").eq("restaurant_id", profile.restaurant_id).order("category").then(({ data }) => setItems((data ?? []) as MI[]));
  };
  useEffect(load, [profile]);

  const updateStatus = async (newStatus: "open" | "closed" | "not_accepting") => {
    if (!profile?.restaurant_id) return;
    const { error } = await supabase.from("restaurants").update({ status: newStatus }).eq("id", profile.restaurant_id);
    if (!error) {
      setRestStatus(newStatus);
      toast.success("Restoran durumu güncellendi");
    } else toast.error(error.message);
  };

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", category: "", price: "", combo_price: "", takeaway_price: "", mall_delivery_price: "", available: true, image_url: "" }); setOpen(true); };
  const openEdit = (m: MI) => {
    setEditing(m);
    setForm({ name: m.name, description: m.description ?? "", category: m.category ?? "", price: String(m.price), combo_price: m.combo_price ? String(m.combo_price) : "", takeaway_price: m.takeaway_price ? String(m.takeaway_price) : "", mall_delivery_price: m.mall_delivery_price ? String(m.mall_delivery_price) : "", available: m.available, image_url: m.image_url ?? "" });
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
      
      const { data: pubData } = supabase.storage.from("menu_images").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: pubData.publicUrl }));
    } catch (err: any) {
      toast.error("Resim yüklenemedi: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const save = async () => {
    if (!profile?.restaurant_id || !form.name || !form.price) { toast.error("İsim ve fiyat zorunlu"); return; }
    const payload: any = {
      restaurant_id: profile.restaurant_id,
      name: form.name, description: form.description || null, category: form.category || null,
      price: Number(form.price),
      combo_price: form.combo_price ? Number(form.combo_price) : null,
      takeaway_price: form.takeaway_price ? Number(form.takeaway_price) : null,
      mall_delivery_price: form.mall_delivery_price ? Number(form.mall_delivery_price) : null,
      available: form.available,
      image_url: form.image_url || null,
    };
    const { error } = editing
      ? await supabase.from("menu_items").update(payload).eq("id", editing.id)
      : await supabase.from("menu_items").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Kaydedildi"); setOpen(false); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    load();
  };

  return (
    <AppShell title="Menü Yönetimi">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-muted-foreground" />
          <Select value={restStatus} onValueChange={(val: any) => updateStatus(val)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Durum seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Açık (Sipariş Alıyor)</SelectItem>
              <SelectItem value="not_accepting">Yoğun (Geçici Kapalı)</SelectItem>
              <SelectItem value="closed">Kapalı</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" /> Yeni Ürün</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Ürünü Düzenle" : "Yeni Ürün"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Ad</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div>
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ana Yemek">Ana Yemek</SelectItem>
                    <SelectItem value="İçecek">İçecek</SelectItem>
                    <SelectItem value="Salata">Salata</SelectItem>
                    <SelectItem value="Ekmek">Ekmek</SelectItem>
                    <SelectItem value="Garnitür">Garnitür</SelectItem>
                    <SelectItem value="Tatlı">Tatlı</SelectItem>
                    <SelectItem value="Diğer">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ürün Resmi (JPEG olarak sıkıştırılır)</Label>
                <div className="flex items-center gap-4 mt-1">
                  {form.image_url && <img src={form.image_url} alt="Önizleme" className="h-12 w-12 rounded object-cover border" />}
                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="flex-1" />
                </div>
                {isUploading && <p className="text-xs text-muted-foreground mt-1">Resim sıkıştırılıyor ve yükleniyor...</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Adrese Teslim ₺</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>AVM İçi ₺</Label><Input type="number" step="0.01" value={form.mall_delivery_price} onChange={(e) => setForm({ ...form, mall_delivery_price: e.target.value })} /></div>
                <div><Label>Gel-Al ₺</Label><Input type="number" step="0.01" value={form.takeaway_price} onChange={(e) => setForm({ ...form, takeaway_price: e.target.value })} /></div>
                <div><Label>Lokantada Ye ₺</Label><Input type="number" step="0.01" value={form.combo_price} onChange={(e) => setForm({ ...form, combo_price: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Satışta</Label>
                <Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} />
              </div>
            </div>
            <DialogFooter><Button onClick={save} className="bg-gradient-primary text-primary-foreground">Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Henüz menü öğesi yok.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-start gap-3 p-4">
                {m.image_url && (
                  <img src={m.image_url} alt={m.name} className="h-16 w-16 min-w-16 rounded-md object-cover border" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{m.name}</p>
                    {!m.available && <span className="rounded bg-muted px-2 py-0.5 text-xs">Pasif</span>}
                  </div>
                  {m.category && <p className="text-xs text-muted-foreground">{m.category}</p>}
                  <p className="mt-1 font-display text-lg font-bold text-primary">₺{Number(m.price).toFixed(2)}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(m.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
