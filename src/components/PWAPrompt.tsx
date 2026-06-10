import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Download, Bell } from "lucide-react";
import { toast } from "sonner";

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem("pwa_prompt_dismissed")) {
        setShowPrompt(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    if ("Notification" in window && Notification.permission === "default" && !localStorage.getItem("notif_prompt_dismissed")) {
      setTimeout(() => setShowNotifPrompt(true), 3000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleNotif = async () => {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      toast.success("Bildirimler açıldı!");
      setShowNotifPrompt(false);
    } else {
      toast.error("Bildirim izni reddedildi.");
      dismissNotif();
    }
  };

  const dismissPwa = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  const dismissNotif = () => {
    setShowNotifPrompt(false);
    localStorage.setItem("notif_prompt_dismissed", "true");
  };

  if (!showPrompt && !showNotifPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-80">
      {showPrompt && (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xl">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border shadow-sm">
            <img src="/logo.png" alt="Ortak Yemek Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Ana Ekrana Ekle</h3>
            <p className="text-xs text-muted-foreground">Uygulamamızı telefonunuza yükleyin.</p>
          </div>
          <div className="flex flex-col gap-1">
            <Button size="sm" onClick={handleInstall} className="h-7 text-xs">Yükle</Button>
            <Button size="sm" variant="ghost" onClick={dismissPwa} className="h-7 text-xs text-muted-foreground">Kapat</Button>
          </div>
        </div>
      )}

      {showNotifPrompt && (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xl">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border shadow-sm">
            <img src="/logo.png" alt="Ortak Yemek Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Bildirimleri Aç</h3>
            <p className="text-xs text-muted-foreground">Sipariş durumları için bildirimleri açın.</p>
          </div>
          <div className="flex flex-col gap-1">
            <Button size="sm" onClick={handleNotif} className="h-7 text-xs">Aç</Button>
            <Button size="sm" variant="ghost" onClick={dismissNotif} className="h-7 text-xs text-muted-foreground">Kapat</Button>
          </div>
        </div>
      )}
    </div>
  );
}
