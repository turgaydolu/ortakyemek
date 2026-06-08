import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "./auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Yükleniyor...</div>;
  if (!user) return <Navigate to="/auth" />;
  if (!profile?.onboarded) return <Navigate to="/onboarding" />;
  return <>{children}</>;
}
