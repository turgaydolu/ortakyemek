import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { UtensilsCrossed, Clock } from "lucide-react";

export const Route = createFileRoute("/restaurants")({
  head: () => ({ meta: [{ title: "Lokantalar — Ortak Yemek" }] }),
  component: () => (<RequireAuth><Page /></RequireAuth>),
});

interface Rest { id: string; name: string; cuisine: string | null; description: string | null; status: string; min_order_amount: number; delivery_note: string | null }

const S: Record<string, { label: string; cls: string }> = {
  open: { label: "Açık", cls: "bg-success text-success-foreground" },
  closed: { label: "Kapalı", cls: "bg-muted text-muted-foreground" },
  not_accepting: { label: "Sipariş Almıyor", cls: "bg-warning text-warning-foreground" },
};

function Page() {
  const [rests, setRests] = useState<Rest[]>([]);
  useEffect(() => {
    supabase.from("restaurants").select("id,name,cuisine,description,status,min_order_amount,delivery_note").order("status").then(({ data }) => setRests((data ?? []) as Rest[]));
  }, []);

  return (
    <AppShell title="Lokantalar">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rests.map((r) => {
          const st = S[r.status] ?? S.closed;
          const disabled = r.status !== "open";
          return (
            <Link key={r.id} to="/restaurants/$id" params={{ id: r.id }} className={disabled ? "pointer-events-none opacity-60" : ""}>
              <Card className="h-full transition hover:shadow-warm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground"><UtensilsCrossed className="h-5 w-5" /></div>
                    <Badge className={st.cls}>{st.label}</Badge>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold">{r.name}</h3>
                  {r.cuisine && <p className="text-xs text-muted-foreground">{r.cuisine}</p>}
                  {r.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~30 dk</span>
                    {Number(r.min_order_amount) > 0 && <span>Min ₺{r.min_order_amount}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {rests.length === 0 && (
          <p className="col-span-full py-12 text-center text-muted-foreground">Henüz kayıtlı lokanta yok.</p>
        )}
      </div>
    </AppShell>
  );
}
