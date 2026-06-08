import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../lib/auth-context";
import { RequireAuth } from "../lib/auth-guard";
import { AppShell } from "../components/AppShell";
import { StaffDashboard } from "../components/dashboards/StaffDashboard";
import { ManagerDashboard } from "../components/dashboards/ManagerDashboard";
import { RestaurantDashboard } from "../components/dashboards/RestaurantDashboard";

import { ShieldAlert } from "lucide-react";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Panel — Ortak Yemek" }] }),
  component: () => (<RequireAuth><AppPage /></RequireAuth>),
});

function AppPage() {
  const { roles, profile } = useAuth();
  const isAdmin = roles.includes("admin");
  const r = isAdmin ? "admin" : roles[0];

  if (!profile?.approved && r !== "admin") {
    return (
      <AppShell title="Onay Bekleniyor">
        <div className="flex h-[50vh] flex-col items-center justify-center text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-500">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl font-bold">Hesabınız Onay Bekliyor</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            {r === "manager" ? "Mağaza müdürü başvurunuz sistem yöneticisi tarafından inceleniyor." : r === "restaurant" ? "Lokanta başvurunuz sistem yöneticisi tarafından inceleniyor." : "Mağazaya katılım isteğiniz mağaza müdürünüz tarafından inceleniyor."}
          </p>
        </div>
      </AppShell>
    );
  }

  if (r === "admin") {
    return <Navigate to="/admin/approvals" />;
  }

  return (
    <AppShell title={`Merhaba, ${profile?.full_name ?? ""}`}>
      {r === "restaurant" ? <RestaurantDashboard /> : r === "manager" ? <ManagerDashboard /> : <StaffDashboard />}
    </AppShell>
  );
}
