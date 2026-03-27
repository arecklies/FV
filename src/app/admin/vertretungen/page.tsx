"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StellvertreterVerwaltung } from "@/components/vertretungen/stellvertreter-verwaltung";

/**
 * Vertretungsverwaltung (PROJ-35)
 *
 * - Tab "Meine Stellvertreter": Referatsleiter verwaltet eigene (US-1)
 * - Tab "Alle Vertretungen": Tenant-Admin sieht alle (US-3)
 * - Zugriffssteuerung: >= referatsleiter für "Meine", >= tenant_admin für "Alle"
 */

const ADMIN_ROLLEN = new Set(["tenant_admin", "platform_admin"]);
const MIN_ROLLEN = new Set(["referatsleiter", "amtsleiter", "tenant_admin", "platform_admin"]);

export default function VertretungenPage() {
  const { user } = useAuth();

  if (!user) return null;

  const istAdmin = ADMIN_ROLLEN.has(user.role);
  const hatMinRolle = MIN_ROLLEN.has(user.role);

  if (!hatMinRolle) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            Sie haben keine Berechtigung für die Vertretungsverwaltung.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Freigabe-Vertretungen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verwalten Sie Stellvertreter für die Vier-Augen-Freigabe.
        </p>
      </div>

      {istAdmin ? (
        <Tabs defaultValue="eigene" className="space-y-4">
          <TabsList>
            <TabsTrigger value="eigene">Meine Stellvertreter</TabsTrigger>
            <TabsTrigger value="alle">Alle Vertretungen</TabsTrigger>
          </TabsList>
          <TabsContent value="eigene">
            <StellvertreterVerwaltung modus="eigene" />
          </TabsContent>
          <TabsContent value="alle">
            <StellvertreterVerwaltung modus="admin" />
          </TabsContent>
        </Tabs>
      ) : (
        <StellvertreterVerwaltung modus="eigene" />
      )}
    </div>
  );
}
