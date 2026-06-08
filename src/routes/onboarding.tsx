import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type AppRole } from "../lib/auth-context";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Users, Store, UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Hoş Geldiniz — Ortak Yemek" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user, profile, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<AppRole | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [floor, setFloor] = useState("");
  const [storeId, setStoreId] = useState<string>("");
  const [restName, setRestName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string; floor: string | null }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (profile?.full_name) setName(profile.full_name);
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    if (role === "staff") {
      supabase.from("stores").select("id,name,floor").order("name").then(({ data }) => setStores(data ?? []));
    }
  }, [role]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (profile?.onboarded) return <Navigate to="/app" />;

  const submit = async () => {
    if (!role || !name) { toast.error("Lütfen ad ve rol seçin"); return; }
    setBusy(true);
    try {
      let updates: any = { full_name: name, phone, onboarded: true };

      if (role === "manager") {
        if (!storeName) throw new Error("Mağaza adı gerekli");
        const { data: s, error: e1 } = await supabase.from("stores")
          .insert({ name: storeName, floor, manager_id: user.id }).select().single();
        if (e1) throw e1;
        updates.store_id = s.id;
      } else if (role === "staff") {
        if (storeId === "other") {
          if (!storeName) throw new Error("Mağaza adı gerekli");
          const { data: s, error: e1 } = await supabase.from("stores")
            .insert({ name: storeName, floor }).select().single();
          if (e1) throw e1;
          updates.store_id = s.id;
        } else {
          if (!storeId) throw new Error("Mağaza seçin");
          updates.store_id = storeId;
        }
      } else if (role === "restaurant") {
        if (!restName) throw new Error("Lokanta adı gerekli");
        const { data: r, error: e2 } = await supabase.from("restaurants")
          .insert({ name: restName, cuisine, owner_id: user.id, status: "closed" }).select().single();
        if (e2) throw e2;
        updates.restaurant_id = r.id;
      }

      const { error: e3 } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (e3) throw e3;
      const { error: e4 } = await supabase.from("user_roles").insert({ user_id: user.id, role });
      if (e4 && !e4.message.includes("duplicate")) throw e4;

      await refresh();
      toast.success("Hesabınız hazır!");
      navigate({ to: "/app" });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Hoş geldiniz!</CardTitle>
            <CardDescription>Ortak Yemek'i sizin için kişiselleştirelim</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Ad Soyad</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Telefon (opsiyonel)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>

            <div>
              <Label className="mb-2 block">Rol seçin</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { v: "staff", icon: Users, t: "Personel", d: "Mağazada çalışıyorum" },
                  { v: "manager", icon: Store, t: "Müdür", d: "Mağaza müdürüyüm" },
                  { v: "restaurant", icon: UtensilsCrossed, t: "Lokanta", d: "Yemek satıyorum" },
                ].map((r) => (
                  <button key={r.v} type="button" onClick={() => setRole(r.v as AppRole)}
                    className={`rounded-xl border-2 p-4 text-left transition ${role === r.v ? "border-primary bg-primary/5 shadow-warm" : "border-border hover:border-primary/50"}`}>
                    <r.icon className="h-6 w-6 text-primary" />
                    <p className="mt-2 font-semibold">{r.t}</p>
                    <p className="text-xs text-muted-foreground">{r.d}</p>
                  </button>
                ))}
              </div>
            </div>

            {role === "manager" && (
              <div className="grid gap-4 rounded-xl bg-secondary/50 p-4 sm:grid-cols-2">
                <div><Label>Mağaza Adı</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Örn: Boyner" /></div>
                <div><Label>Kat (opsiyonel)</Label><Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Örn: 1. Kat" /></div>
              </div>
            )}

            {role === "staff" && (
              <div className="rounded-xl bg-secondary/50 p-4">
                <Label>Mağazanızı seçin</Label>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={stores.length ? "Mağaza seç" : "Henüz mağaza kayıtlı değil"} /></SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} {s.floor ? `· ${s.floor}` : ""}</SelectItem>))}
                    <SelectItem value="other">Mağazam listede yok (Yeni Ekle)</SelectItem>
                  </SelectContent>
                </Select>
                {storeId === "other" && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><Label>Mağaza Adı</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Örn: Boyner" /></div>
                    <div><Label>Kat (opsiyonel)</Label><Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Örn: 1. Kat" /></div>
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">Mağazanız listede yoksa kendiniz ekleyebilirsiniz, ancak yöneticinin onaylaması gerekir.</p>
              </div>
            )}

            {role === "restaurant" && (
              <div className="grid gap-4 rounded-xl bg-secondary/50 p-4 sm:grid-cols-2">
                <div><Label>Lokanta Adı</Label><Input value={restName} onChange={(e) => setRestName(e.target.value)} /></div>
                <div><Label>Mutfak Türü</Label><Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Örn: Türk, Fast Food" /></div>
              </div>
            )}

            <Button onClick={submit} disabled={busy || !role} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-95">
              {busy ? "Kaydediliyor..." : "Devam Et"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
