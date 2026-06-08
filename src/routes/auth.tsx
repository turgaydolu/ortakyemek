import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { lovable } from "../integrations/lovable/index";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { toast } from "sonner";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Giriş Yap — Ortak Yemek" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: profile?.onboarded ? "/app" : "/onboarding" });
  }, [loading, user, profile, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Hesabınız oluşturuldu!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Hoş geldiniz!");
      }
    } catch (e: any) {
      toast.error(e.message || "Bir hata oluştu");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (r.error) toast.error("Google girişi başarısız");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Ortak Yemek" className="h-10 w-10 rounded-xl object-cover shadow-warm" />
            <span className="text-xl font-display font-bold">Ortak Yemek</span>
          </Link>
          <Card className="shadow-warm">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Hesabınıza giriş yapın</CardTitle>
              <CardDescription>Personel, mağaza müdürü veya lokanta olarak devam edin</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Giriş</TabsTrigger>
                  <TabsTrigger value="signup">Kayıt Ol</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="mt-4">
                  <form onSubmit={submit} className="space-y-4">
                    <div><Label>E-posta</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                    <div><Label>Şifre</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                    <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-95">
                      {busy ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="mt-4">
                  <form onSubmit={submit} className="space-y-4">
                    <div><Label>Ad Soyad</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div><Label>E-posta</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                    <div><Label>Şifre</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                    <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-95">
                      {busy ? "Kayıt yapılıyor..." : "Kayıt Ol"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> VEYA <div className="h-px flex-1 bg-border" />
              </div>
              <Button onClick={google} disabled={busy} variant="outline" className="w-full">
                Google ile devam et
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
