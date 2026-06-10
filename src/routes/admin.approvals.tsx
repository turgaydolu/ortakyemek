import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { AppShell } from "../components/AppShell";
import { RequireAuth } from "../lib/auth-guard";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Check, X, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({ meta: [{ title: "Yönetici Onayları — Ortak Yemek" }] }),
  component: () => <RequireAuth><AdminApprovals /></RequireAuth>,
});

function AdminApprovals() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id, full_name, phone, created_at, store_id, restaurant_id,
        stores ( name, manager_id ),
        restaurants ( name )
      `)
      .eq("onboarded", true)
      .eq("approved", false);
    
    if (profilesError) {
      toast.error("Profiller alınamadı: " + profilesError.message);
      console.error(profilesError);
      setLoading(false);
      return;
    }

    const userIds = profilesData?.map(p => p.id) || [];
    if (userIds.length === 0) {
      setPending([]);
      setLoading(false);
      return;
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    if (rolesError) {
      toast.error("Roller alınamadı: " + rolesError.message);
      console.error(rolesError);
    }

    const mergedData = profilesData?.map(p => {
      const userRoles = rolesData?.filter(r => r.user_id === p.id) || [];
      return { ...p, user_roles: userRoles };
    }) || [];

    const filtered = mergedData.filter(p => {
      // Eğer rol çekilemediyse (RLS hatası vs), adminin kör olmaması için yine de gösterelim
      if (!p.user_roles || p.user_roles.length === 0) return true;

      const hasRestaurant = p.user_roles.some((r: any) => r.role === 'restaurant');

      return hasRestaurant;
    });
    
    setPending(filtered);
    setLoading(false);
  };

  const approve = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", id);
    if (error) toast.error("Onaylanamadı");
    else {
      toast.success("Hesap onaylandı");
      setPending(p => p.filter(x => x.id !== id));
    }
  };

  const reject = async (id: string) => {
    if (!confirm("Bu başvuruyu reddetmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) toast.error("Reddedilemedi");
    else {
      toast.success("Hesap reddedildi");
      setPending(p => p.filter(x => x.id !== id));
    }
  };

  return (
    <AppShell title="Yönetici Onayları">
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-xl font-bold">Bekleyen Başvurular</h2>
        {loading ? (
          <p className="text-muted-foreground">Yükleniyor...</p>
        ) : pending.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <ShieldCheck className="mx-auto mb-2 h-12 w-12 text-primary/50" />
            <p>Bekleyen başvuru bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pending.map(p => {
              const role = p.user_roles[0]?.role;
              const placeName = role === "restaurant" ? p.restaurants?.name : p.stores?.name;
              const roleText = role === "restaurant" ? "Lokanta" : "Bilinmeyen Rol";

              return (
                <div key={p.id} className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.full_name}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                        {roleText}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {placeName} • {p.phone || "Telefon belirtilmemiş"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Başvuru: {new Date(p.created_at).toLocaleString("tr-TR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => reject(p.id)} className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => approve(p.id)} className="bg-success text-success-foreground hover:bg-success/90">
                      <Check className="mr-1 h-4 w-4" /> Onayla
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
