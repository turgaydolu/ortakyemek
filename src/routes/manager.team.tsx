import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { UserMinus, UserPlus } from "lucide-react";

export const Route = createFileRoute("/manager/team")({
  head: () => ({ meta: [{ title: "Ekip — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

function Page() {
  const { profile, user } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [phone, setPhone] = useState("");

  const load = () => {
    if (!profile?.store_id) return;
    supabase.from("profiles").select("id,full_name,phone,approved").eq("store_id", profile.store_id).then(({ data }) => setTeam(data ?? []));
  };
  useEffect(load, [profile]);

  const approve = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Personel onaylandı"); load(); }
  };

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !profile?.store_id) return;
    const { data: userToAdd, error: fetchErr } = await supabase.from("profiles").select("id").eq("phone", phone.trim()).maybeSingle();
    if (fetchErr) { toast.error(fetchErr.message); return; }
    if (!userToAdd) { toast.error("Bu telefon numarasına ait kullanıcı bulunamadı."); return; }
    
    const { error } = await supabase.from("profiles").update({ store_id: profile.store_id, approved: true }).eq("id", userToAdd.id);
    if (error) { toast.error(error.message); }
    else { toast.success("Personel başarıyla eklendi"); setPhone(""); load(); }
  };

  const remove = async (id: string) => {
    if (id === user?.id) { toast.error("Kendinizi çıkaramazsınız"); return; }
    if (!confirm("Bu personeli reddetmek/çıkarmak istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("profiles").update({ store_id: null, approved: false }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("İşlem başarılı"); load(); }
  };

  const pending = team.filter((m) => !m.approved);
  const active = team.filter((m) => m.approved);

  return (
    <AppShell title="Mağaza Ekibim">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Yeni Personel Ekle</CardTitle>
          <CardDescription>Sisteme kayıtlı olan personeli telefon numarasıyla mağazanıza ekleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addStaff} className="flex max-w-sm gap-2">
            <Input 
              placeholder="Örn: 5551234567" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />
            <Button type="submit" disabled={!phone.trim()}>
              <UserPlus className="mr-2 h-4 w-4" /> Ekle
            </Button>
          </form>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-lg font-bold text-amber-600">Onay Bekleyenler ({pending.length})</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((m) => (
              <Card key={m.id} className="border-amber-200 bg-amber-500/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">{m.full_name}</p>
                    {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(m.id)}>Reddet</Button>
                    <Button size="sm" className="bg-success text-success-foreground" onClick={() => approve(m.id)}>Onayla</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-lg font-bold">Mevcut Ekip ({active.length})</h3>
        {active.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">Henüz onaylı personel yok.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">{m.full_name}</p>
                    {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
                    {m.id === user?.id && <p className="text-xs text-primary">Siz (müdür)</p>}
                  </div>
                  {m.id !== user?.id && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(m.id)}><UserMinus className="mr-2 h-4 w-4" /> Çıkar</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
