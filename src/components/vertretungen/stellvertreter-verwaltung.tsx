"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { ROLE_LABELS } from "@/lib/utils/auth-constants";

/**
 * StellvertreterVerwaltung (PROJ-35 US-1, US-3)
 *
 * Zwei Modi:
 * - modus="eigene": Referatsleiter verwaltet eigene Stellvertreter (/api/vertretungen/meine)
 * - modus="admin": Tenant-Admin sieht alle Vertretungen (/api/admin/vertretungen)
 */

interface Vertretung {
  id: string;
  tenant_id: string;
  vertretener_id: string;
  stellvertreter_id: string;
  created_at: string;
}

interface TenantMember {
  user_id: string;
  email: string;
  role: string;
}

interface StellvertreterVerwaltungProps {
  /** "eigene" für Referatsleiter, "admin" für Tenant-Admin */
  modus: "eigene" | "admin";
}

/** Stellvertreter-berechtigte Rollen (AC-1.2) */
const STELLVERTRETER_ROLLEN = new Set(["referatsleiter", "amtsleiter", "tenant_admin", "platform_admin"]);

export function StellvertreterVerwaltung({ modus }: StellvertreterVerwaltungProps) {
  const { user } = useAuth();
  const [vertretungen, setVertretungen] = React.useState<Vertretung[]>([]);
  const [members, setMembers] = React.useState<TenantMember[]>([]);
  const [emailMap, setEmailMap] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog State
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [adding, setAdding] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const apiBase = modus === "eigene" ? "/api/vertretungen/meine" : "/api/admin/vertretungen";

  // Daten laden
  const loadData = React.useCallback(async () => {
    setError(null);
    try {
      // Vertretungen und Mitglieder parallel laden
      const [vertretungenRes, membersRes] = await Promise.all([
        fetch(apiBase, { credentials: "include" }),
        fetch("/api/admin/users", { credentials: "include" }),
      ]);

      if (!vertretungenRes.ok) {
        const data = await vertretungenRes.json();
        setError(data.error ?? "Vertretungen konnten nicht geladen werden.");
        return;
      }

      const vertretungenData = await vertretungenRes.json();
      setVertretungen(vertretungenData.vertretungen ?? []);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        const users: TenantMember[] = (membersData.users ?? []).map(
          (u: { user_id: string; email: string; role: string }) => ({
            user_id: u.user_id,
            email: u.email,
            role: u.role,
          })
        );
        setMembers(users);

        // E-Mail-Map aufbauen
        const map: Record<string, string> = {};
        users.forEach((u) => {
          map[u.user_id] = u.email || u.user_id.substring(0, 8);
        });
        setEmailMap(map);
      }
    } catch {
      setError("Verbindungsfehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Stellvertreter hinzufügen (AC-1.4: sofort wirksam)
  const handleAdd = async () => {
    if (!selectedUserId) return;
    setAddError(null);
    setAdding(true);

    try {
      const response = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stellvertreter_id: selectedUserId }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setAddError(data.error ?? data.fields?.stellvertreter_id ?? "Fehler beim Hinzufügen.");
        setAdding(false);
        return;
      }

      setAddDialogOpen(false);
      setSelectedUserId("");
      await loadData();
    } catch {
      setAddError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setAdding(false);
    }
  };

  // Vertretung entfernen
  const handleDelete = async (vertretungId: string) => {
    setDeleting(vertretungId);
    setError(null);

    try {
      const deleteUrl = modus === "eigene"
        ? `/api/vertretungen/meine/${vertretungId}`
        : `/api/admin/vertretungen/${vertretungId}`;

      const response = await fetch(deleteUrl, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Vertretung konnte nicht entfernt werden.");
        return;
      }

      setVertretungen((prev) => prev.filter((v) => v.id !== vertretungId));
    } catch {
      setError("Verbindungsfehler beim Entfernen.");
    } finally {
      setDeleting(null);
    }
  };

  // Kandidaten für Multi-Select: Nur Rolle >= referatsleiter, nicht sich selbst, nicht bereits zugeordnet
  const kandidaten = members.filter((m) => {
    if (!STELLVERTRETER_ROLLEN.has(m.role)) return false;
    if (modus === "eigene" && m.user_id === user?.id) return false;
    // Bereits zugeordnete ausschließen
    const bereitsZugeordnet = vertretungen.some((v) => v.stellvertreter_id === m.user_id);
    return !bereitsZugeordnet;
  });

  const resolveEmail = (userId: string) => emailMap[userId] ?? userId.substring(0, 8);

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Vertretungen werden geladen">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" aria-hidden="true" />
            {modus === "eigene" ? "Meine Stellvertreter" : "Alle Vertretungen"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {modus === "eigene"
              ? "Benennen Sie Stellvertreter, die in Ihrer Abwesenheit Bescheide freigeben dürfen."
              : "Übersicht aller Freigabe-Vertretungen im Mandanten."}
          </p>
        </div>

        {/* Hinzufügen — nur im eigenen Modus */}
        {modus === "eigene" && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 min-h-[44px]" aria-label="Stellvertreter hinzufügen">
                <Plus className="h-4 w-4" />
                Stellvertreter hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Stellvertreter hinzufügen</DialogTitle>
                <DialogDescription>
                  Wählen Sie einen Referatsleiter oder höher, der in Ihrer Abwesenheit Bescheide freigeben darf.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {addError && (
                  <Alert variant="destructive" role="alert" aria-live="assertive">
                    <AlertDescription>{addError}</AlertDescription>
                  </Alert>
                )}

                {kandidaten.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Keine weiteren Benutzer mit ausreichender Rolle verfügbar.
                  </p>
                ) : (
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    disabled={adding}
                  >
                    <SelectTrigger aria-label="Stellvertreter auswählen">
                      <SelectValue placeholder="Person auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {kandidaten.map((k) => (
                        <SelectItem key={k.user_id} value={k.user_id}>
                          {k.email || k.user_id.substring(0, 8)} — {ROLE_LABELS[k.role] ?? k.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setAddDialogOpen(false); setAddError(null); }}
                  disabled={adding}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={adding || !selectedUserId || kandidaten.length === 0}
                  className="gap-2 min-h-[44px]"
                  aria-label="Stellvertreter bestätigen"
                >
                  {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                  Hinzufügen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Fehlermeldung */}
      {error && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {vertretungen.length === 0 && !error && (
        <div className="text-center py-12 border rounded-md">
          <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">
            {modus === "eigene"
              ? "Sie haben noch keine Stellvertreter benannt."
              : "Keine Vertretungen im Mandanten vorhanden."}
          </p>
        </div>
      )}

      {/* Tabelle */}
      {vertretungen.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {modus === "admin" && <TableHead>Vertretener</TableHead>}
                <TableHead>Stellvertreter</TableHead>
                <TableHead className="hidden sm:table-cell">Erstellt am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vertretungen.map((v) => {
                const isDeletingThis = deleting === v.id;
                return (
                  <TableRow key={v.id}>
                    {modus === "admin" && (
                      <TableCell>
                        <span className="text-sm">{resolveEmail(v.vertretener_id)}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {ROLE_LABELS[members.find((m) => m.user_id === v.vertretener_id)?.role ?? ""] ?? ""}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-sm">{resolveEmail(v.stellvertreter_id)}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {ROLE_LABELS[members.find((m) => m.user_id === v.stellvertreter_id)?.role ?? ""] ?? ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDeletingThis}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[36px] min-w-[36px]"
                            aria-label={`Vertretung für ${resolveEmail(v.stellvertreter_id)} entfernen`}
                          >
                            {isDeletingThis ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Vertretung entfernen</AlertDialogTitle>
                            <AlertDialogDescription>
                              Möchten Sie diese Vertretungszuordnung wirklich entfernen?
                              {resolveEmail(v.stellvertreter_id)} kann dann keine Bescheide
                              {modus === "admin" ? ` für ${resolveEmail(v.vertretener_id)}` : ""} mehr freigeben.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(v.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Entfernen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
