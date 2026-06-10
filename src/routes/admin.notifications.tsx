import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { Bell, Info, Save } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Bildirim Ayarları — Ortak Yemek" }] }),
  component: () => <RequireAuth><AdminNotifications /></RequireAuth>,
});

interface NotificationSetting {
  event_type: string;
  is_enabled: boolean;
  title_template: string;
  body_template: string;
}

const EVENTS = [
  { id: "campaign_joined", label: "Kampanyaya Katılma (Personel)" },
  { id: "campaign_completed", label: "Hedef Kişiye Ulaşma (Tamamlandı)" },
  { id: "campaign_failed", label: "Süre Dolumu / İptal (Hedef Sağlanamadı)" }
];

function AdminNotifications() {
  const [settings, setSettings] = useState<Record<string, NotificationSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("notification_settings").select("*");
    if (error) {
      toast.error("Ayarlar yüklenemedi: " + error.message);
    } else {
      const mapped = (data || []).reduce((acc: any, curr) => {
        acc[curr.event_type] = curr;
        return acc;
      }, {});
      
      // Varsayılanları koy eğer eksikse
      EVENTS.forEach(e => {
        if (!mapped[e.id]) {
          mapped[e.id] = {
            event_type: e.id,
            is_enabled: true,
            title_template: "",
            body_template: ""
          };
        }
      });
      setSettings(mapped);
    }
    setLoading(false);
  };

  const handleSave = async (eventType: string) => {
    setSaving(true);
    const s = settings[eventType];
    const { error } = await supabase.from("notification_settings").upsert({
      event_type: s.event_type,
      is_enabled: s.is_enabled,
      title_template: s.title_template,
      body_template: s.body_template
    });
    
    if (error) {
      toast.error("Kaydedilemedi: " + error.message);
    } else {
      toast.success("Ayarlar başarıyla kaydedildi");
    }
    setSaving(false);
  };

  const updateSetting = (eventType: string, key: keyof NotificationSetting, value: any) => {
    setSettings(prev => ({
      ...prev,
      [eventType]: { ...prev[eventType], [key]: value }
    }));
  };

  return (
    <AppShell title="Bildirim Ayarları">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-xl border bg-primary/5 p-4 text-sm text-primary flex gap-3 items-start">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Değişken Kullanımı</p>
            <p>Bildirim başlığı ve metni içerisinde şu özel değişkenleri kullanabilirsiniz:</p>
            <ul className="list-disc ml-5 mt-1 opacity-90">
              <li><b>{'{kampanya_adi}'}</b> : Kampanyanın adını otomatik çeker.</li>
              <li><b>{'{lokanta_adi}'}</b> : Lokantanın adını otomatik çeker.</li>
              <li><b>{'{kullanici_adi}'}</b> : Bildirimi alan personelin adını otomatik çeker.</li>
            </ul>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Yükleniyor...</p>
        ) : (
          <div className="space-y-6">
            {EVENTS.map(event => {
              const s = settings[event.id];
              if (!s) return null;
              
              return (
                <div key={event.id} className="rounded-xl border bg-card p-5 shadow-soft">
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      <h3 className="font-display font-semibold text-lg">{event.label}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`enable-${event.id}`} className="text-sm cursor-pointer">
                        {s.is_enabled ? "Açık" : "Kapalı"}
                      </Label>
                      <Switch 
                        id={`enable-${event.id}`} 
                        checked={s.is_enabled} 
                        onCheckedChange={(c) => updateSetting(event.id, "is_enabled", c)} 
                      />
                    </div>
                  </div>

                  <div className={`space-y-4 ${!s.is_enabled ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="space-y-2">
                      <Label>Bildirim Başlığı (Title)</Label>
                      <Input 
                        value={s.title_template} 
                        onChange={(e) => updateSetting(event.id, "title_template", e.target.value)} 
                        placeholder="Örn: Kampanya İptal Edildi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bildirim Metni (Body)</Label>
                      <Textarea 
                        rows={3}
                        value={s.body_template} 
                        onChange={(e) => updateSetting(event.id, "body_template", e.target.value)} 
                        placeholder="Örn: Yeterli kişi sayısı sağlanamayıp {kampanya_adi} kampanyalı fiyat için siparişiniz iptal edilmiştir."
                      />
                    </div>
                    
                    <div className="pt-2 flex justify-end">
                      <Button onClick={() => handleSave(event.id)} disabled={saving} className="bg-gradient-primary">
                        <Save className="h-4 w-4 mr-2" /> Kaydet
                      </Button>
                    </div>
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
