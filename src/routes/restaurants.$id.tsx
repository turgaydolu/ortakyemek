import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "../components/ui/sheet";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurants/$id")({
  head: () => ({ meta: [{ title: "Menü — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

interface MenuItem { id: string; name: string; description: string | null; price: number; combo_price: number | null; takeaway_price: number | null; mall_delivery_price: number | null; category: string | null; image_url: string | null; available: boolean; extras: { name: string; price: number }[] }
interface Rest { id: string; name: string; status: string; min_order_amount: number; min_order_count: number; delivery_note: string | null }

interface CartItem { id: string; name: string; unit_price: number; quantity: number; extras: { name: string; price: number }[]; notes?: string }

function Page() {
  const { id } = Route.useParams();
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const [rest, setRest] = useState<Rest | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"individual" | "group">("individual");
  const [delivery, setDelivery] = useState<"delivery" | "takeaway" | "dine_in">("delivery");
  const [payment, setPayment] = useState<string>("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("restaurants").select("id,name,status,min_order_amount,min_order_count,delivery_note").eq("id", id).single().then(({ data }) => setRest(data as Rest));
    supabase.from("menu_items").select("*").eq("restaurant_id", id).eq("available", true).order("category").then(({ data }) => setItems((data ?? []) as any));
  }, [id]);

  const priceFor = (m: MenuItem) => {
    if (delivery === "takeaway" && m.takeaway_price) return Number(m.takeaway_price);
    if (delivery === "dine_in" && m.mall_delivery_price) return Number(m.mall_delivery_price);
    return Number(m.price);
  };

  useEffect(() => {
    setCart((p) => p.map(c => {
      const m = items.find(x => x.id === c.id);
      if (!m) return c;
      return { ...c, unit_price: priceFor(m) };
    }));
  }, [delivery, items]);

  const addItem = (m: MenuItem) => {
    setCart((p) => {
      const existing = p.find((c) => c.id === m.id);
      if (existing) return p.map((c) => c.id === m.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...p, { id: m.id, name: m.name, unit_price: priceFor(m), quantity: 1, extras: [] }];
    });
  };
  const dec = (cid: string) => setCart((p) => p.flatMap((c) => c.id === cid ? (c.quantity > 1 ? [{ ...c, quantity: c.quantity - 1 }] : []) : [c]));
  const remove = (cid: string) => setCart((p) => p.filter((c) => c.id !== cid));

  const total = cart.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const count = cart.reduce((s, c) => s + c.quantity, 0);

  const canOrder = rest?.status === "open" && count > 0 &&
    count >= (rest?.min_order_count ?? 1) &&
    total >= Number(rest?.min_order_amount ?? 0);

  const submitOrder = async () => {
    if (!user || !canOrder || !rest) return;
    setBusy(true);
    try {
      const isGroup = orderType === "group" && (roles.includes("manager") || roles.includes("staff"));
      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user.id,
        restaurant_id: rest.id,
        store_id: profile?.store_id,
        order_type: isGroup ? "group" : "individual",
        delivery_method: delivery,
        payment_method: payment as any,
        total_amount: total,
        notes,
        status: "pending",
      }).select().single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("order_items").insert(
        cart.map((c) => ({ order_id: order.id, menu_item_id: c.id, item_name: c.name, quantity: c.quantity, unit_price: c.unit_price, extras: c.extras }))
      );
      if (e2) throw e2;

      await supabase.from("notifications").insert({
        user_id: null, broadcast: false, title: "Yeni sipariş", body: `${rest.name} - ₺${total.toFixed(2)}`, type: "order",
      });

      toast.success("Sipariş gönderildi! Lokanta onayı bekleniyor.");
      navigate({ to: "/my-orders" });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const categories = Array.from(new Set(items.map((i) => i.category || "Diğer")));

  return (
    <AppShell title={rest?.name}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {rest?.delivery_note && (
            <Card className="border-warning/40 bg-warning/10"><CardContent className="p-4 text-sm">{rest.delivery_note}</CardContent></Card>
          )}
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="mb-3 font-display text-xl font-semibold">{cat}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.filter((i) => (i.category || "Diğer") === cat).map((m) => (
                  <Card key={m.id} className="transition hover:shadow-warm">
                    <CardContent className="flex items-start gap-3 p-4">
                      {m.image_url && (
                        <img src={m.image_url} alt={m.name} className="h-20 w-20 min-w-20 rounded-md object-cover border" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{m.name}</p>
                        {m.description && <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>}
                        <p className="mt-2 font-display text-lg font-bold text-primary">₺{priceFor(m).toFixed(2)}</p>
                        {m.combo_price && <p className="text-xs text-muted-foreground">Menü: ₺{Number(m.combo_price).toFixed(2)}</p>}
                      </div>
                      <Button size="sm" onClick={() => addItem(m)} className="bg-gradient-primary text-primary-foreground mt-auto"><Plus className="h-4 w-4" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="py-12 text-center text-muted-foreground">Bu lokantanın henüz menüsü yok.</p>}
        </div>

        <div className="hidden lg:block">
          <Cart cart={cart} dec={dec} addItem={(id: string) => { const m = items.find(x => x.id === id); if (m) addItem(m); }} remove={remove} total={total} count={count} rest={rest}
            orderType={orderType} setOrderType={setOrderType} delivery={delivery} setDelivery={setDelivery}
            payment={payment} setPayment={setPayment} notes={notes} setNotes={setNotes}
            canOrder={canOrder} busy={busy} submit={submitOrder} canGroup={roles.includes("manager") || roles.includes("staff")} />
        </div>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground shadow-warm lg:hidden" disabled={count === 0}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Sepet ({count}) · ₺{total.toFixed(2)}
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Sepetim</SheetTitle></SheetHeader>
          <div className="mt-4">
            <Cart cart={cart} dec={dec} addItem={(id: string) => { const m = items.find(x => x.id === id); if (m) addItem(m); }} remove={remove} total={total} count={count} rest={rest}
              orderType={orderType} setOrderType={setOrderType} delivery={delivery} setDelivery={setDelivery}
              payment={payment} setPayment={setPayment} notes={notes} setNotes={setNotes}
              canOrder={canOrder} busy={busy} submit={submitOrder} canGroup={roles.includes("manager") || roles.includes("staff")} embedded />
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function Cart(props: any) {
  const { cart, dec, addItem, remove, total, count, rest, orderType, setOrderType, delivery, setDelivery, payment, setPayment, notes, setNotes, canOrder, busy, submit, canGroup, embedded } = props;
  return (
    <Card className={embedded ? "border-0 shadow-none" : "sticky top-24 shadow-warm"}>
      {!embedded && <CardHeader><CardTitle className="font-display">Sepetim</CardTitle></CardHeader>}
      <CardContent className="space-y-4">
        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sepetiniz boş</p>
        ) : (
          <>
            <div className="space-y-2">
              {cart.map((c: CartItem) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">₺{c.unit_price.toFixed(2)} × {c.quantity}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => dec(c.id)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center text-sm font-semibold">{c.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addItem(c.id)}><Plus className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>

            {canGroup && (
              <div>
                <Label className="text-xs">Sipariş türü</Label>
                <RadioGroup value={orderType} onValueChange={setOrderType} className="mt-1 grid grid-cols-2 gap-2">
                  <Label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2"><RadioGroupItem value="individual" /> Bireysel</Label>
                  <Label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2"><RadioGroupItem value="group" /> Mağaza Toplu</Label>
                </RadioGroup>
              </div>
            )}

            <div>
              <Label className="text-xs">Teslim şekli</Label>
              <RadioGroup value={delivery} onValueChange={setDelivery as any} className="mt-1 grid grid-cols-3 gap-2">
                {[["delivery", "Adrese Teslim"], ["takeaway", "Gel-Al"], ["dine_in", "AVM İçi Teslimat"]].map(([v, l]) => (
                  <Label key={v} className="flex flex-col cursor-pointer items-center gap-1 rounded-lg border p-2 text-center text-xs">
                    <RadioGroupItem value={v} className="mb-1" /> {l}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-xs">Ödeme</Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Nakit (teslimde)</SelectItem>
                  <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                  <SelectItem value="meal_card_metropol">Metropol</SelectItem>
                  <SelectItem value="meal_card_sodexo">Sodexo</SelectItem>
                  <SelectItem value="meal_card_multinet">Multinet</SelectItem>
                  <SelectItem value="meal_card_setcard">Setcard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Not (opsiyonel)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Acılı olmasın..." rows={2} />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">Toplam</span>
              <span className="font-display text-2xl font-bold text-primary">₺{total.toFixed(2)}</span>
            </div>

            {rest && Number(rest.min_order_amount) > 0 && total < Number(rest.min_order_amount) && (
              <p className="text-xs text-warning">Min sipariş tutarı: ₺{rest.min_order_amount}</p>
            )}
            {rest && rest.min_order_count > 1 && count < rest.min_order_count && (
              <p className="text-xs text-warning">Min adet: {rest.min_order_count}</p>
            )}

            <Button disabled={!canOrder || busy} onClick={submit} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-95">
              {busy ? "Gönderiliyor..." : "Siparişi Gönder"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
