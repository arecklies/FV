# ADR-002: Authentifizierung und SSO-Strategie

## Status
Proposed

## Kontext

SSO ist K.O.-Kriterium aller vier Stakeholder. Kommunen betreiben Active Directory (on-premise oder Entra ID). Supabase Auth unterstuetzt OIDC nativ (alle Plaene) und SAML 2.0 (Team/Enterprise-Plan).

## Entscheidung

**Dreistufige Authentifizierungsstrategie:**

1. **Primaer: OIDC** ueber Entra ID / generischen OIDC-Provider. OIDC-Konfiguration pro Tenant. `tenant_id` als JWT Custom Claim fuer RLS.
2. **Sekundaer: SAML 2.0** fuer ADFS-Bestandskunden. Erfordert Supabase Team/Enterprise-Plan. Ab Phase 2.
3. **Fallback: Lokale Accounts** mit E-Mail/Passwort + 2FA (TOTP). Fuer Kommunen ohne zentrales IdP.

### 2FA-Strategie
- TOTP ueber Supabase Auth MFA
- Erzwingbar pro Rolle (Admin immer, Sachbearbeiter konfigurierbar)

### Session-Management
- JWT-basiert mit konfigurierbarer Lebensdauer
- Inaktivitaets-Timeout: Standard 15 Min, konfigurierbar pro Tenant
- Cookie `sb-access-token` fuer SSR

## Begruendung

1. OIDC ist moderner und einfacher als SAML
2. SAML als Enterprise-Feature vermeidet Kosten im MVP
3. Lokale Accounts als Sicherheitsnetz fuer Kommunen ohne IdP
4. Supabase Auth als Broker vermeidet eigenen Keycloak-Stack

## Konsequenzen

- (+) Kein separater Identity-Provider-Stack noetig
- (+) OIDC-Konfiguration pro Tenant ermoeglicht Multi-IdP
- (-) SAML erst ab Supabase Team-Plan
- (-) Lokale Accounts erfordern eigene Passwort-Reset-UI

## Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmassnahme |
|---|---|---|---|
| Kommune hat kein Entra ID/ADFS | Mittel | Niedrig | Lokale Accounts als Fallback |
| ADFS-Proxy blockiert SAML | Mittel | Mittel | OIDC als Alternative; Integrationshandbuch |
| Session-Timeout stoert bei langen Bearbeitungen | Mittel | Niedrig | Konfigurierbar; Activity-Ping |

## Referenzen
- K.O.-Kriterium SSO: `Input/AnFo/bauaufsicht_anforderungen.md`, Abschnitt 3.4
- ADR-007: Multi-Tenancy (JWT Custom Claims)
