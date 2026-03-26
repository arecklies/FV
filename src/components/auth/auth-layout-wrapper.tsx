"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppHeader } from "@/components/layout/app-header";

/**
 * Auth-Layout-Wrapper (PROJ-1).
 *
 * - Umschliesst die gesamte Anwendung mit AuthProvider
 * - Zeigt AppHeader auf allen Seiten ausser /login
 * - Client Component, da usePathname benoetigt wird
 */

interface AuthLayoutWrapperProps {
  children: React.ReactNode;
}

/** Pfade ohne Header (Login-Seiten) */
const NO_HEADER_PATHS = ["/login"];

function isNoHeaderPath(pathname: string): boolean {
  return NO_HEADER_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function AuthLayoutWrapper({ children }: AuthLayoutWrapperProps) {
  const pathname = usePathname();
  const showHeader = !isNoHeaderPath(pathname);

  return (
    <AuthProvider>
      {showHeader && <AppHeader />}
      <main>{children}</main>
    </AuthProvider>
  );
}
