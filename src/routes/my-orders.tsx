import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/my-orders")({
  head: () => ({ meta: [{ title: "Siparişlerim — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

const ST: Record<string, { label: string; cls: string }> = {
  pending: { label: "Onay Bekliyor", cls: "bg-warning text-warning-foreground" },
  approved: { label: "Onaylandı", cls: "bg-primary text-primary-foreground" },
  preparing: { label: "Hazırlanıyor", cls: "bg-accent text-accent-foreground" },
  delivered: { label: "Teslim Edildi", cls: "bg-success text-success-foreground" },
  cancelled: { label: "İptal", cls: "bg-muted text-muted-foreground" },
  rejected: { label: "Reddedildi", cls: "bg-destructive text-destructive-foreground" },
  active: { label: "Kampanya Sayısı Bekleniyor", cls: "bg-secondary text-secondary-foreground" },
  reached: { label: "Kampanya Sayısı Doldu", cls: "bg-warning text-warning-foreground" },
  confirmed: { label: "Kampanya Onaylandı (Hazırlanıyor)", cls: "bg-accent text-accent-foreground" },
  archived_confirmed: { label: "Teslim Edildi", cls: "bg-success text-success-foreground" },
  failed: { label: "İptal (Sayı Dolmadı)", cls: "bg-muted text-muted-foreground" },
  archived_cancelled: { label: "İptal Edildi", cls: "bg-muted text-muted-foreground" },
};

function Page() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [messageOrder, setMessageOrder] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

  const submitReview = async () => {
    if (!reviewOrder || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("restaurant_reviews").insert({
      restaurant_id: reviewOrder.restaurant_id,
      user_id: user.id,
      order_id: reviewOrder.id,
      rating,
      comment
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Değerlendirmeniz alındı, teşekkürler!");
      setReviewOrder(null);
    }
  };

  const sendMessage = async () => {
    if (!messageOrder || !messageText.trim() || !user) return;
    setSubmitting(true);
    const { data: owners } = await supabase.from("profiles").select("id").eq("restaurant_id", messageOrder.restaurant_id);
    
    if (owners && owners.length > 0) {
      const notifs = owners.map(o => ({
        user_id: o.id,
        title: `Sipariş Mesajı (${user.email || 'Müşteri'})`,
        body: messageText,
        type: "message",
        link: "/restaurant/orders"
      }));
      await supabase.from("notifications").insert(notifs);
      toast.success("Mesajınız lokantaya iletildi.");
    } else {
      toast.error("Lokanta yetkilisi bulunamadı.");
    }
    
    setSubmitting(false);
    setMessageOrder(null);
    setMessageText("");
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: oData }, { data: cData }] = await Promise.all([
        supabase.from("orders").select("*, restaurants(name), order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("campaign_participants").select("*, campaigns(*, restaurants(name))").eq("user_id", user.id).order("created_at", { ascending: false })
      ]);
      
      let all = [...(oData ?? [])];
      
      if (cData) {
        const mappedCamps = cData.map(p => ({
          id: p.id,
          type: "campaign",
          restaurant_id: p.campaigns?.restaurant_id,
          restaurants: p.campaigns?.restaurants,
          created_at: p.created_at,
          status: p.campaigns?.status,
          delivery_method: p.campaigns?.delivery_method,
          payment_method: "Maaştan Kesinti",
          total_amount: Number(p.campaigns?.price) * p.quantity,
          order_items: [{ id: p.id, item_name: p.campaigns?.item_name, quantity: p.quantity, unit_price: p.campaigns?.price }]
        }));
        all = [...all, ...mappedCamps];
      }
      
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(all);
    };
    load();
    const ch = supabase.channel("my-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <AppShell title="Siparişlerim">
      {orders.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Henüz siparişiniz yok.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = ST[o.status] ?? ST.pending;
            return (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{o.restaurants?.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("tr-TR")}</p>
                    </div>
                    <Badge className={st.cls}>{st.label}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {o.order_items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.quantity}× {it.item_name}</span>
                        <span>₺{(Number(it.unit_price) * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">{o.delivery_method} · {o.payment_method}</span>
                    <span className="font-display text-lg font-bold text-primary">₺{Number(o.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {["pending", "approved", "preparing", "active", "reached", "confirmed"].includes(o.status) && (
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMessageOrder(o); setMessageText(""); }}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Sorun Bildir / Mesaj At
                      </Button>
                    )}
                    {["delivered", "archived_confirmed"].includes(o.status) && (
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setReviewOrder(o); setRating(5); setComment(""); }}>
                        <Star className="mr-2 h-4 w-4 text-warning fill-warning" /> Değerlendir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Dialog open={!!reviewOrder} onOpenChange={(v) => !v && setReviewOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{reviewOrder?.restaurants?.name} Değerlendir</DialogTitle></DialogHeader>
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map(r => (
              <Star key={r} className={`h-8 w-8 cursor-pointer ${rating >= r ? "text-warning fill-warning" : "text-muted-foreground"}`} onClick={() => setRating(r)} />
            ))}
          </div>
          <Textarea placeholder="Yorumunuz (İsteğe bağlı)" value={comment} onChange={e => setComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button disabled={submitting} onClick={submitReview} className="w-full bg-gradient-primary text-primary-foreground">Gönder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!messageOrder} onOpenChange={(v) => !v && setMessageOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messageOrder?.restaurants?.name} Lokantasına Mesaj</DialogTitle>
            <DialogDescription>Siparişiniz gelmediyse veya gecikiyorsa buradan lokanta yetkilisine doğrudan mesaj atabilirsiniz.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Lütfen sorunu veya notunuzu buraya yazın..." value={messageText} onChange={e => setMessageText(e.target.value)} rows={4} />
          <DialogFooter>
            <Button disabled={submitting || !messageText.trim()} onClick={sendMessage} className="w-full bg-gradient-primary text-primary-foreground">Mesajı Gönder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
