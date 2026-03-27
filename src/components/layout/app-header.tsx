"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, FileText, Users, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/components/auth/auth-provider";
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from "@/lib/utils/auth-constants";

/**
 * App-Header mit Navigation (PROJ-1 US-4).
 *
 * - Logo/Titel links
 * - Navigation: Vorgaenge, Benutzerverwaltung (nur Admin)
 * - Rechts: Benutzername + Rolle Badge + Logout-Button
 * - Responsiv: Hamburger-Menu auf Mobile (Sheet)
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiresAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/vorgaenge",
    label: "Vorgänge",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    href: "/admin/benutzer",
    label: "Benutzerverwaltung",
    icon: <Users className="h-4 w-4" />,
    requiresAdmin: true,
  },
];

function isAdminRole(role: string): boolean {
  return role === "tenant_admin" || role === "platform_admin";
}

export function AppHeader() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      // Loading-State wird nicht zurueckgesetzt, da window.location.href
      // die Seite neu laedt (frontend.md Auth Best Practices)
    }
  };

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.requiresAdmin || (user && isAdminRole(user.role))
  );

  const roleLabel = user ? ROLE_LABELS[user.role] ?? user.role : "";
  const roleBadgeVariant = user
    ? ROLE_BADGE_VARIANT[user.role] ?? "secondary"
    : "secondary";

  // Nicht rendern wenn loading oder kein User
  if (loading || !user) {
    return null;
  }

  return (
    <header
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-sm"
      role="banner"
    >
      <div className="flex h-14 items-center px-4 md:px-6">
        {/* Logo / Titel */}
        <Link
          href="/vorgaenge"
          className="mr-6 flex items-center space-x-2 font-semibold text-primary-foreground"
          aria-label="Zur Startseite"
        >
          <span className="text-lg tracking-wide">Fachverfahren</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1" aria-label="Hauptnavigation">
          {visibleNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/15",
                  pathname.startsWith(item.href) && "bg-white/20 text-primary-foreground"
                )}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              >
                {item.icon}
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop: User Info + Logout */}
        <div className="hidden md:flex items-center space-x-3">
          <span className="text-sm text-primary-foreground/70" aria-label="Angemeldeter Benutzer">
            {user.email}
          </span>
          <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground" aria-label={`Rolle: ${roleLabel}`}>
            {roleLabel}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Abmelden"
            className="gap-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/15"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Abmelden
          </Button>
        </div>

        {/* Mobile: Hamburger Menu */}
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu oeffnen">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex flex-col space-y-4 mt-6">
                {/* User Info */}
                <div className="flex flex-col space-y-1 px-2">
                  <span className="text-sm font-medium">{user.email}</span>
                  <Badge variant={roleBadgeVariant} className="w-fit">
                    {roleLabel}
                  </Badge>
                </div>

                {/* Separator */}
                <div className="h-px bg-border" />

                {/* Nav Items */}
                <nav className="flex flex-col space-y-1" aria-label="Hauptnavigation">
                  {visibleNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2"
                        aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                      >
                        {item.icon}
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </nav>

                {/* Separator */}
                <div className="h-px bg-border" />

                {/* Logout */}
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full justify-start gap-2"
                  aria-label="Abmelden"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Abmelden
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
