"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  TENANT_ROLES,
  ROLE_LABELS,
  ROLE_BADGE_VARIANT,
} from "@/lib/utils/auth-constants";

/**
 * Admin Benutzerverwaltung (PROJ-1 US-3, US-6).
 *
 * - Tabelle: User-ID, Rolle (Badge), Erstellt am
 * - "Neuer Benutzer"-Button mit Dialog (E-Mail, Passwort, Rolle)
 * - Rolle aendern: Inline-Select in Tabellenzeile
 * - Benutzer entfernen: Button mit Bestaetigungsdialog (AlertDialog)
 * - Nur sichtbar fuer Rolle >= tenant_admin
 * - Loading, Error, Empty States
 */

interface TenantMember {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function BenutzerVerwaltungPage() {
  const { user } = useAuth();
  const [members, setMembers] = React.useState<TenantMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Neuer-Benutzer-Dialog State
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newRole, setNewRole] = React.useState<string>("sachbearbeiter");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  // Rollen-Aenderung State
  const [updatingRoleFor, setUpdatingRoleFor] = React.useState<string | null>(null);

  // Loeschung State
  const [deletingUser, setDeletingUser] = React.useState<string | null>(null);

  // Benutzerliste laden
  const loadUsers = React.useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Benutzer konnten nicht geladen werden.");
        return;
      }

      const data = await response.json();
      setMembers(data.users ?? []);
    } catch {
      setError("Verbindungsfehler beim Laden der Benutzer.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Benutzer anlegen
  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateError(data.error ?? "Benutzer konnte nicht angelegt werden.");
        setCreating(false);
        return;
      }

      // Dialog schliessen und Liste neu laden
      setCreateDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("sachbearbeiter");
      await loadUsers();
    } catch {
      setCreateError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setCreating(false);
    }
  };

  // Rolle aendern
  const handleRoleChange = async (userId: string, newRoleValue: string) => {
    setUpdatingRoleFor(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRoleValue }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Rolle konnte nicht geaendert werden.");
        return;
      }

      // Lokal aktualisieren
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId ? { ...m, role: newRoleValue } : m
        )
      );
    } catch {
      setError("Verbindungsfehler bei der Rollenaenderung.");
    } finally {
      setUpdatingRoleFor(null);
    }
  };

  // Benutzer entfernen
  const handleDeleteUser = async (userId: string) => {
    setDeletingUser(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Benutzer konnte nicht entfernt werden.");
        return;
      }

      // Aus der Liste entfernen
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch {
      setError("Verbindungsfehler beim Entfernen des Benutzers.");
    } finally {
      setDeletingUser(null);
    }
  };

  // F-12/13: Nicht-authentifiziert-Zustand abfangen (Netzwerkfehler, abgelaufene Session)
  if (!loading && !user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            Sitzung abgelaufen oder Verbindungsfehler. Bitte melden Sie sich erneut an.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Zugriffskontrolle: Nur tenant_admin / platform_admin
  if (user && user.role !== "tenant_admin" && user.role !== "platform_admin") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            Sie haben keine Berechtigung fuer die Benutzerverwaltung.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verwalten Sie die Benutzer Ihres Mandanten.
          </p>
        </div>

        {/* Neuer Benutzer Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 min-h-[44px]" aria-label="Neuen Benutzer anlegen">
              <Plus className="h-4 w-4" />
              Neuer Benutzer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Benutzer anlegen</DialogTitle>
              <DialogDescription>
                Erstellen Sie ein neues Benutzerkonto und weisen Sie eine Rolle zu.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4 py-4">
                {createError && (
                  <Alert variant="destructive" role="alert" aria-live="assertive">
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-email">E-Mail-Adresse</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="name@behoerde.de"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    disabled={creating}
                    aria-label="E-Mail-Adresse des neuen Benutzers"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Passwort</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    aria-describedby="password-hint"
                    disabled={creating}
                    aria-label="Passwort des neuen Benutzers"
                  />
                  <p id="password-hint" className="text-xs text-muted-foreground">
                    Mindestens 8 Zeichen
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-role">Rolle</Label>
                  <Select
                    value={newRole}
                    onValueChange={setNewRole}
                    disabled={creating}
                  >
                    <SelectTrigger id="new-role" aria-label="Rolle fuer den neuen Benutzer">
                      <SelectValue placeholder="Rolle waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      {TENANT_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={creating || !newEmail.trim() || newPassword.length < 8}
                  className="gap-2 min-h-[44px]"
                  aria-label="Benutzer anlegen"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <UserPlus className="h-4 w-4" />
                  Anlegen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Fehlermeldung */}
      {error && (
        <Alert variant="destructive" className="mb-4" role="alert" aria-live="assertive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3" aria-label="Benutzerliste wird geladen">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && members.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Noch keine Benutzer vorhanden. Legen Sie den ersten Benutzer an.
          </p>
        </div>
      )}

      {/* Benutzertabelle */}
      {!loading && members.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benutzer-ID</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead className="hidden sm:table-cell">Erstellt am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const isUpdatingRole = updatingRoleFor === member.user_id;
                const isDeleting = deletingUser === member.user_id;

                return (
                  <TableRow key={member.id}>
                    {/* E-Mail (B-001: aus auth.users via Backend geladen) */}
                    <TableCell className="max-w-[200px] truncate">
                      {member.email || <span className="font-mono text-xs text-muted-foreground">{member.user_id}</span>}
                      {isCurrentUser && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Sie
                        </Badge>
                      )}
                    </TableCell>

                    {/* Rolle mit Inline-Select */}
                    <TableCell>
                      {isUpdatingRole ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Wird geaendert...
                          </span>
                        </div>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleRoleChange(member.user_id, value)
                          }
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger
                            className="w-[180px]"
                            aria-label={`Rolle für Benutzer ${member.email || member.user_id} ändern`}
                          >
                            <Badge
                              variant={
                                ROLE_BADGE_VARIANT[member.role] ?? "secondary"
                              }
                            >
                              {ROLE_LABELS[member.role] ?? member.role}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {TENANT_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    {/* Erstellt am */}
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>

                    {/* Aktionen */}
                    <TableCell className="text-right">
                      {isCurrentUser ? (
                        <span className="text-xs text-muted-foreground">
                          Eigenes Konto
                        </span>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isDeleting}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[36px] min-w-[36px]"
                              aria-label={`Benutzer ${member.email || member.user_id} entfernen`}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Benutzer entfernen
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Moechten Sie diesen Benutzer wirklich aus Ihrem
                                Mandanten entfernen? Der Benutzer verliert
                                sofort den Zugriff auf alle Mandantendaten.
                                Diese Aktion kann nicht rueckgaengig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteUser(member.user_id)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Entfernen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
