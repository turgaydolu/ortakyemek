import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ui/button";
import { UtensilsCrossed, Users, Store, Flame, BellRing, Timer, ShieldCheck } from "lucide-react";

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

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: profile?.onboarded ? "/app" : "/onboarding" });
    }
  }, [loading, user, profile, navigate]);

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
              <div className="flex items-center justify-between rounded-2xl bg-gradient-warm p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">CANLI KAMPANYA</p>
                  <p className="mt-1 font-display text-lg font-semibold">Adana Dürüm + Ayran</p>
                  <p className="text-sm text-muted-foreground">30 kişide ücretsiz teslimat</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-display font-bold text-primary">₺175</p>
                  <p className="text-xs text-success">22/30 katıldı</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-[73%] bg-gradient-primary" />
              </div>
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
