# ADR-002: Authentifizierung, SSO-Strategie und RBAC

**Status:** Accepted
**Datum:** 2026-03-25 (RBAC ergaenzt 2026-03-25)
**Autor:** Senior Software Architect, Senior Security Engineer

## Kontext

SSO ist K.O.-Kriterium aller vier Stakeholder. Kommunen betreiben Active Directory (on-premise oder Entra ID). Supabase Auth unterstuetzt OIDC nativ (alle Plaene) und SAML 2.0 (Team/Enterprise-Plan).

Zusaetzlich benoetigt das System ein feingranulares Rollenmodell (RBAC), das Berechtigungen auf Funktions- und ggf. Feldebene steuert. PROJ-1 definiert vier Rollen (Admin, Sachbearbeiter, Referatsleiter, Amtsleiter). Supabase Auth hat keine native RBAC-Loesung -- das Rollenmodell muss applikationsseitig implementiert werden.

## Entscheidung

### Teil 1: Authentifizierung (dreistufig)

1. **Primaer: OIDC** ueber Entra ID / generischen OIDC-Provider. OIDC-Konfiguration pro Tenant. `tenant_id` als JWT Custom Claim fuer RLS.
2. **Sekundaer: SAML 2.0** fuer ADFS-Bestandskunden. Erfordert Supabase Team/Enterprise-Plan. Ab Phase 2.
3. **Fallback: Lokale Accounts** mit E-Mail/Passwort + 2FA (TOTP). Fuer Kommunen ohne zentrales IdP oder fuer die Entwicklungsphase.

### Teil 2: 2FA-Strategie

- TOTP ueber Supabase Auth MFA
- Erzwingbar pro Rolle (Admin immer, Sachbearbeiter konfigurierbar pro Tenant)
- Recovery Codes bei Ersteinrichtung (8 Codes, einmalig anzeigen)

### Teil 3: Session-Management

- JWT-basiert mit konfigurierbarer Lebensdauer (Standard: 1 Stunde, Refresh-Token: 7 Tage)
- Inaktivitaets-Timeout: Standard 15 Min, konfigurierbar pro Tenant
- Cookie `sb-access-token` fuer SSR (bestehender Mechanismus in `src/lib/supabase-server.ts`)
- Activity-Ping bei aktiver Nutzung verlaengert die Session (kein harter Timeout waehrend der Arbeit)
- Bei Rollenaenderung: Token wird beim naechsten Refresh mit neuen Claims ausgestellt (kein sofortiger Logout, aber neue Berechtigungen innerhalb von max. 1 Stunde)

### Teil 4: RBAC-Modell (NEU)

#### Rollen-Hierarchie

```
Plattform-Admin (system-weit, kein tenant_id)
  |
  Tenant-Admin (pro Mandant)
    |
    Amtsleiter (pro Mandant)
      |
      Referatsleiter (pro Mandant)
        |
        Sachbearbeiter (pro Mandant)
```

#### Datenmodell

```sql
-- Rollen als Enum (nicht als separate Tabelle -- die Rollen sind fest definiert)
CREATE TYPE user_role AS ENUM (
  'sachbearbeiter',
  'referatsleiter',
  'amtsleiter',
  'tenant_admin',
  'platform_admin'
);

-- Rollenzuweisung in tenant_members (aus ADR-007)
ALTER TABLE tenant_members
  ALTER COLUMN role TYPE user_role USING role::user_role;
```

#### Berechtigungsmatrix

| Berechtigung | Sachbearbeiter | Referatsleiter | Amtsleiter | Tenant-Admin | Plattform-Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Eigene Vorgaenge bearbeiten | Ja | Ja | - | Ja | Ja |
| Alle Vorgaenge im Mandant sehen | - | Ja | Ja | Ja | Ja |
| Vorgaenge zuweisen | - | Ja | Ja | Ja | Ja |
| Bescheide freizeichnen (Vier-Augen) | - | Ja | Ja | - | - |
| Dashboard: Eigene Vorgaenge | Ja | Ja | - | - | - |
| Dashboard: Referat-Uebersicht | - | Ja | Ja | - | - |
| Textbausteine pflegen | - | - | - | Ja | Ja |
| Benutzer verwalten (Rollen zuweisen) | - | - | - | Ja | Ja |
| Tenant-Konfiguration aendern | - | - | - | Ja | Ja |
| Datenexport starten | - | - | Ja | Ja | Ja |
| Tenants anlegen/loeschen | - | - | - | - | Ja |

#### Implementierungsstrategie

**JWT Custom Claims:**
```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "role": "referatsleiter",
  "aud": "authenticated"
}
```

**Middleware-Pattern:**
```typescript
// src/lib/api/auth.ts

// Basis: Ist der Nutzer authentifiziert?
export async function requireAuth(request: NextRequest) { ... }

// Rollen-Check: Hat der Nutzer mindestens die geforderte Rolle?
export async function requireRole(request: NextRequest, minRole: UserRole) { ... }

// Convenience-Funktionen:
export async function requireAdmin(req: NextRequest) { return requireRole(req, 'tenant_admin'); }
export async function requireReferatsleiter(req: NextRequest) { return requireRole(req, 'referatsleiter'); }
```

**Rollen-Hierarchie als Ordered Enum:**
```typescript
const ROLE_HIERARCHY: Record<UserRole, number> = {
  sachbearbeiter: 1,
  referatsleiter: 2,
  amtsleiter: 3,
  tenant_admin: 4,
  platform_admin: 5,
};

function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
```

#### Plattform-Admin vs. Tenant-Rollen

- **Plattform-Admin** existiert ausserhalb des Tenant-Kontexts. Er hat keinen `tenant_id` Claim, sondern einen `platform_role: 'admin'` Claim.
- RLS-Policies greifen nicht fuer Plattform-Admins -- sie nutzen den Service-Role-Key fuer Cross-Tenant-Operationen (Tenant-Provisionierung, Monitoring).
- Plattform-Admin-Zugang ist streng limitiert: Nur ein dediziertes Konto, 2FA erzwungen, alle Aktionen im Audit-Log.

#### Warum kein ABAC (Attribute-Based Access Control)?

- Feldebene-Berechtigungen (z.B. "Sachbearbeiter darf Gebuehren nicht sehen") sind in der Research-Synthese als SHOULD HAVE, nicht MUST HAVE identifiziert.
- RBAC mit Rollen-Hierarchie deckt die Phase-0/1-Anforderungen vollstaendig ab.
- ABAC kann spaeter auf RBAC aufgesetzt werden (z.B. `permissions`-JSONB auf `tenant_members`), ohne die Grundarchitektur zu aendern.

## Alternativen verworfen

### 1. Keycloak als Identity Provider
- **Pro:** Volle Kontrolle ueber SSO, RBAC, MFA. Open Source.
- **Contra:** Eigener Service-Stack (Java), eigenes Ops, hohe Komplexitaet fuer Lean-Startup. Supabase Auth deckt die Anforderungen ab.
- **Fazit:** Fuer Phase 0/1 Overkill. Evaluieren wenn Supabase Auth an Grenzen stoesst.

### 2. Rollen als separate Tabelle (user_roles)
- **Pro:** Flexibler, erlaubt mehrere Rollen pro User/Tenant.
- **Contra:** Komplexere Queries, JWT muesste Array enthalten, RLS-Policies werden komplexer.
- **Fazit:** Enum auf `tenant_members.role` ist einfacher und deckt die Anforderung (1 Rolle pro User/Tenant) ab. Erweiterung auf Array ist spaeter moeglich.

### 3. Berechtigungen in der Datenbank (permissions-Tabelle)
- **Pro:** Maximale Flexibilitaet, konfigurierbar zur Laufzeit.
- **Contra:** Overengineering fuer 5 feste Rollen. Performance-Overhead bei jedem Request. Kein Gewinn im MVP.
- **Fazit:** RBAC ueber Enum + Middleware ist fuer Phase 0/1 ausreichend.

## Konsequenzen

### Positiv
- Kein separater Identity-Provider-Stack noetig
- OIDC-Konfiguration pro Tenant ermoeglicht Multi-IdP
- RBAC mit Rollen-Hierarchie ist einfach zu verstehen, zu testen und zu auditieren
- `requireRole()` als Einzeiler in jeder API-Route
- Plattform-Admin ist sauber von Tenant-Rollen getrennt

### Negativ / Risiken
- SAML erst ab Supabase Team-Plan -- Kostensteigerung bei SAML-Bedarf
- Lokale Accounts erfordern eigene Passwort-Reset-UI
- Rollenaenderungen werden erst beim naechsten Token-Refresh wirksam (max. 1h Verzoegerung)
- Kein Feld-Level-RBAC im MVP -- Sachbearbeiter sehen alle Felder die ihre Rolle sehen darf

### Offene Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Kommune hat kein Entra ID/ADFS | Mittel | Niedrig | Lokale Accounts als Fallback |
| ADFS-Proxy blockiert SAML | Mittel | Mittel | OIDC als Alternative; Integrationshandbuch |
| Session-Timeout stoert bei langen Bearbeitungen | Mittel | Niedrig | Activity-Ping, konfigurierbar |
| Account-Linking (lokal -> SSO) | Mittel | Mittel | Nur ueber E-Mail-Verifizierung, nie automatisch |
| Rollenaenderung erst nach Token-Refresh wirksam | Niedrig | Niedrig | Kurze Token-Lebensdauer (1h), Hinweis in Admin-UI |
| Plattform-Admin-Konto kompromittiert | Niedrig | Kritisch | 2FA Pflicht, Audit-Log, IP-Einschraenkung |

## Beteiligte Rollen

| Rolle | Verantwortung |
|---|---|
| Senior Software Architect | RBAC-Modell, Middleware-Pattern |
| Senior Security Engineer | Auth-Flow-Review, 2FA-Konzept, Plattform-Admin-Absicherung |
| Database Architect | `user_role` Enum, `tenant_members`-Schema-Erweiterung |
| Senior Backend Developer | `requireAuth()`, `requireRole()`, Login-Flow-Implementierung |
| Senior Frontend Developer | Login-UI, Admin-Benutzerverwaltung, Rollen-Anzeige |

## Referenzen
- K.O.-Kriterium SSO: `Input/AnFo/bauaufsicht_anforderungen.md`, Abschnitt 3.4
- PROJ-1: Auth und Benutzerverwaltung (Feature-Spec)
- ADR-007: Multi-Tenancy (JWT Custom Claims fuer `tenant_id`)
- ADR-008: Background Jobs (Plattform-Admin-Operationen laufen ueber Service-Role)
- Kick-off Security Engineer: "Kein Auth-Bypass fuer Convenience"
