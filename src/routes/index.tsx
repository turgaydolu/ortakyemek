import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { UtensilsCrossed, Users, Store, Flame, BellRing, Timer, ShieldCheck, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ortak Yemek — AVM Personeli Yemek Sipariş Platformu" },
      { name: "description", content: "AVM mağaza personeli için bireysel ve toplu yemek siparişi, anlık indirim kampanyaları, hızlı teslimat." },
      { property: "og:title", content: "Ortak Yemek" },
      { property: "og:description", content: "AVM içi yemek siparişi, toplu sipariş ve kampanya platformu." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [camps, setCamps] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: profile?.onboarded ? "/app" : "/onboarding" });
    }
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    supabase.from("campaigns")
      .select("*, restaurants(name)")
      .in("status", ["active", "reached", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!data) return;
        const filtered = data.filter(c => {
          if (c.status === "confirmed") {
            if (c.delivery_time) {
              return new Date(c.delivery_time).getTime() > Date.now();
            } else {
              // Teslimat saati belirtilmediyse süresi dolduktan sonra 2 saat daha ekranda kalır
              return new Date(c.expires_at).getTime() + 2 * 3600 * 1000 > Date.now();
            }
          }
          return true;
        });
        setCamps(filtered.slice(0, 6));
      });
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (ms: number) => { if (ms <= 0) return "Süre doldu"; const m = Math.floor(ms/60000); const s = Math.floor((ms%60000)/1000); return `${m}:${s.toString().padStart(2,"0")}`; };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Ortak Yemek" className="h-10 w-10 rounded-xl object-cover shadow-warm" />
          <span className="text-xl font-display font-bold tracking-tight">Ortak Yemek</span>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost"><Link to="/auth">Giriş Yap</Link></Button>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-warm hover:opacity-95">
            <Link to="/auth">Hemen Başla</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Timer className="h-3 w-3" /> 30 dakikada masanızda
            </span>
            <h1 className="mt-4 text-balance text-5xl font-display font-bold leading-[1.05] lg:text-6xl">
              AVM'deki tüm lezzetler, <span className="text-primary">tek dokunuşta.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Bireysel siparişten mağaza toplu siparişine, anlık indirim kampanyalarından grup açık artırmalarına — AVM personelinin yemek molasını kolaylaştırır.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-warm hover:opacity-95">
                <Link to="/auth">Ücretsiz Başla</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Lokanta Olarak Katıl</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Güvenli ödeme</span>
              <span className="flex items-center gap-2"><BellRing className="h-4 w-4 text-primary" /> Anlık kampanyalar</span>
              <span className="flex items-center gap-2"><Timer className="h-4 w-4 text-primary" /> 30 dk garantisi</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-primary opacity-20 blur-3xl" />
            <div className="grid gap-4 rounded-3xl bg-card p-6 shadow-warm">

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: UtensilsCrossed, label: "120+ Menü" },
                  { icon: Store, label: "45 Lokanta" },
                  { icon: Users, label: "2.1k Personel" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-xl bg-secondary/60 p-3">
                    <Icon className="mx-auto h-5 w-5 text-primary" />
                    <p className="mt-1 text-xs font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-display font-bold">Yayındaki Canlı Kampanyalar</h2>
            <p className="mt-2 text-muted-foreground">Fiyatları görmek ve kampanyalara katılmak için hemen giriş yapın.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {camps.map(c => {
              const ms = new Date(c.expires_at).getTime() - now;
              const pct = Math.min(100, (c.current_participants / c.target_participants) * 100);
              return (
                <Card key={c.id} className="overflow-hidden shadow-soft transition hover:shadow-warm group">
                  {c.image_url ? (
                    <div className="aspect-video w-full overflow-hidden bg-secondary">
                      <img src={c.image_url} alt={c.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="aspect-video w-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
                      <Flame className="h-8 w-8 opacity-20" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-primary">{c.restaurants?.name}</p>
                    <h3 className="mt-1 font-display text-lg font-bold">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description || c.item_name}</p>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground">
                        {c.delivery_method === 'takeaway' ? '🛍️ Gel Al' : c.delivery_method === 'dine_in' ? '🍽️ Masaya Servis' : '🛵 AVM İçi Teslimat'}
                      </span>
                      {c.free_delivery && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          <ShieldCheck className="h-3 w-3" /> Ücretsiz Teslimat
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs font-medium">
                        <span>{c.current_participants}/{c.target_participants} kişi katıldı</span>
                        <span className="flex items-center gap-1 text-warning"><Timer className="h-3 w-3" /> {fmt(ms)}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                    {c.delivery_time && (
                      <div className="mt-3 flex items-center gap-1.5 rounded-md bg-secondary/50 p-1.5 text-xs font-medium text-secondary-foreground">
                        <CalendarClock className="h-3.5 w-3.5 text-primary" /> Teslimat: {new Date(c.delivery_time).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}
                    <div className="mt-5 flex items-center justify-between border-t pt-4">
                      <div className="text-sm font-medium text-muted-foreground blur-[5px] select-none">₺999.99</div>
                      <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
                        <Link to="/auth">Fiyatı Gör & Katıl</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {camps.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground border rounded-xl border-dashed">
                Şu an aktif kampanya bulunmuyor. Yeni kampanyalar için takipte kalın!
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 py-12 md:grid-cols-3">
          {[
            { icon: Users, title: "Personel", desc: "Bireysel sipariş ver, mağaza arkadaşlarınla toplu sipariş yap, kampanyalara katıl." },
            { icon: Store, title: "Mağaza Müdürü", desc: "Mağaza personelini yönet, toplu sipariş aç, ayrılan personeli sistemden çıkar." },
            { icon: UtensilsCrossed, title: "Lokanta", desc: "Menünü ve fiyatlarını yönet, kampanya başlat, gelen siparişleri onayla." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft transition hover:shadow-warm">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mt-12 border-t bg-card/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Ortak Yemek. Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
