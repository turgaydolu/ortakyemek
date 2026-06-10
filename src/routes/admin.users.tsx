import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { AppShell } from "../components/AppShell";
import { RequireAuth } from "../lib/auth-guard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "../components/ui/switch";
import { Pencil, Trash2, Ban, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Kullanıcı Yönetimi — Ortak Yemek" }] }),
  component: () => <RequireAuth><AdminUsers /></RequireAuth>,
});

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ 
    full_name: "", phone: "", store_id: "", restaurant_id: "",
    allow_takeaway: true, allow_dine_in: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id, full_name, phone, created_at, store_id, restaurant_id, approved,
        stores ( name ),
        restaurants ( name, allow_takeaway, allow_dine_in )
      `)
      .eq("onboarded", true);
      
    if (profilesError) {
      toast.error("Kullanıcılar alınamadı");
      setLoading(false);
      return;
    }

    const userIds = profilesData?.map(p => p.id) || [];
    if (userIds.length > 0) {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
        
      const mergedData = profilesData?.map(p => {
        const userRoles = rolesData?.filter(r => r.user_id === p.id) || [];
        return { ...p, role: userRoles[0]?.role || "staff" };
      }) || [];
      setUsers(mergedData);
    } else {
      setUsers([]);
    }

    // Fetch lists for edit dropdowns
    const { data: resData } = await supabase.from("restaurants").select("id, name");
    if (resData) setRestaurants(resData);
    const { data: storeData } = await supabase.from("stores").select("id, name");
    if (storeData) setStores(storeData);

    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}' isimli kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      toast.error("Kullanıcı silinemedi: " + error.message);
    } else {
      toast.success("Kullanıcı silindi");
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleToggleBlock = async (u: any) => {
    const newStatus = !u.approved;
    const { error } = await supabase.from("profiles").update({ approved: newStatus }).eq("id", u.id);
    if (error) {
      toast.error("İşlem başarısız: " + error.message);
    } else {
      toast.success(newStatus ? "Kullanıcı engeli kaldırıldı" : "Kullanıcı engellendi");
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, approved: newStatus } : x));
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      store_id: user.store_id || "none",
      restaurant_id: user.restaurant_id || "none",
      allow_takeaway: user.restaurants?.allow_takeaway ?? true,
      allow_dine_in: user.restaurants?.allow_dine_in ?? true,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    
    const updates = {
      full_name: editForm.full_name,
      phone: editForm.phone,
      store_id: editForm.store_id === "none" ? null : editForm.store_id,
      restaurant_id: editForm.restaurant_id === "none" ? null : editForm.restaurant_id,
    };

    const { error } = await supabase.from("profiles").update(updates).eq("id", editingUser.id);
    
    if (editingUser.role === "restaurant" && updates.restaurant_id) {
      await supabase.from("restaurants").update({
        allow_takeaway: editForm.allow_takeaway,
        allow_dine_in: editForm.allow_dine_in
      }).eq("id", updates.restaurant_id);
    }

    if (error) {
      toast.error("Güncellenemedi: " + error.message);
    } else {
      toast.success("Kullanıcı güncellendi");
      setEditingUser(null);
      loadData(); // Reload to get updated store/restaurant names
    }
    setIsSaving(false);
  };

  const restaurantUsers = users.filter(u => u.role === "restaurant");
  const managerUsers = users.filter(u => u.role === "manager");
  const staffUsers = users.filter(u => u.role === "staff");

  const renderUserList = (list: any[], roleName: string) => {
    if (list.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">{roleName} bulunamadı.</p>;
    
    return (
      <div className="grid gap-3">
        {list.map(u => (
          <div key={u.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between bg-card">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{u.full_name}</p>
                {!u.approved && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">Engellendi</span>}
              </div>
              <p className="text-sm text-muted-foreground">{u.phone || "Telefon yok"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {u.role === "restaurant" ? (u.restaurants?.name || "Lokanta seçilmemiş") : (u.stores?.name || "Mağaza seçilmemiş")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleToggleBlock(u)} className={u.approved ? "text-warning hover:bg-warning hover:text-warning-foreground" : "text-success hover:bg-success hover:text-success-foreground"}>
                {u.approved ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleEdit(u)}>
                <Pencil className="h-4 w-4 mr-1" /> Düzenle
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(u.id, u.full_name)} className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppShell title="Kullanıcı Yönetimi">
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        {loading ? (
          <p className="text-muted-foreground">Yükleniyor...</p>
        ) : (
          <Tabs defaultValue="restaurants">
            <TabsList className="mb-4 w-full justify-start overflow-x-auto">
              <TabsTrigger value="restaurants">Lokantalar ({restaurantUsers.length})</TabsTrigger>
              <TabsTrigger value="staff">Personeller ({staffUsers.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="restaurants">
              {renderUserList(restaurantUsers, "Lokanta yetkilisi")}
            </TabsContent>
            <TabsContent value="staff">
              {renderUserList(staffUsers, "Personel")}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input required value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              
              {editingUser.role === "restaurant" && (
                <>
                  <div className="space-y-2">
                    <Label>Lokanta</Label>
                    <Select value={editForm.restaurant_id} onValueChange={v => setEditForm({ ...editForm, restaurant_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Lokanta seçin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Bağlantıyı Kaldır</SelectItem>
                        {restaurants.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editForm.restaurant_id !== "none" && (
                    <div className="space-y-4 pt-2 border-t mt-4">
                      <Label className="text-muted-foreground font-semibold">Lokanta Seçenekleri</Label>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="takeaway" className="cursor-pointer">Yarın Gel Al</Label>
                        <Switch id="takeaway" checked={editForm.allow_takeaway} onCheckedChange={c => setEditForm({ ...editForm, allow_takeaway: c })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="dine_in" className="cursor-pointer">Masaya Servis</Label>
                        <Switch id="dine_in" checked={editForm.allow_dine_in} onCheckedChange={c => setEditForm({ ...editForm, allow_dine_in: c })} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {(editingUser.role === "manager" || editingUser.role === "staff") && (
                <div className="space-y-2">
                  <Label>Mağaza</Label>
                  <Select value={editForm.store_id} onValueChange={v => setEditForm({ ...editForm, store_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Mağaza seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bağlantıyı Kaldır</SelectItem>
                      {stores.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>İptal</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
