# Auftragsverarbeitungsverträge (AVV / DPA)

Diese Datei dokumentiert die abgeschlossenen Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO.

> **WICHTIG:** Vor dem Go-Live müssen alle AVVs tatsächlich abgeschlossen sein.
> Die meisten sind als Click-Through in den jeweiligen Dashboards verfügbar.

---

## Status der AVVs

| Dienstleister | Zweck | DPA-Link | Status |
|---|---|---|---|
| Supabase | Datenbankhosting, Auth | https://supabase.com/dpa | ☐ Ausstehend |
| Upstash | Redis-Cache | https://upstash.com/dpa | ☐ Ausstehend |
| Resend | Transaktionsmails | https://resend.com/dpa | ☐ Ausstehend |
| Lemon Squeezy | Zahlungsabwicklung | https://www.lemonsqueezy.com/dpa | ☐ Ausstehend |

---

## Supabase

- **Anbieter:** Supabase Inc., 970 Trestle Glen Rd, Oakland, CA 94610, USA
- **Verarbeitete Daten:** Nutzerdaten, Reisedaten, alle Datenbankdaten
- **Datenspeicherort:** AWS eu-central-1 (Frankfurt, Deutschland)
- **Rechtsgrundlage Drittlandtransfer:** EU-Standardvertragsklauseln (Art. 46 DSGVO)
- **DPA abschließen:** Supabase Dashboard → Organization Settings → Legal → Data Processing Agreement
- **Datenschutz:** https://supabase.com/privacy

## Upstash

- **Anbieter:** Upstash Inc.
- **Verarbeitete Daten:** Anonymisierte Suchanfragen (Bahnhof-IDs), temporär (TTL 5 min)
- **Datenspeicherort:** EU
- **DPA abschließen:** Upstash Console → Account → Legal → DPA
- **Datenschutz:** https://upstash.com/privacy

## Resend

- **Anbieter:** Resend Inc.
- **Verarbeitete Daten:** E-Mail-Adressen für Transaktionsmails (Anmeldebestätigung, Passwort-Reset)
- **DPA abschließen:** Resend Dashboard → Settings → Compliance → Data Processing Agreement
- **Datenschutz:** https://resend.com/privacy

## Lemon Squeezy

- **Anbieter:** Lemon Squeezy LLC
- **Verarbeitete Daten:** E-Mail-Adressen, Zahlungsdaten (Lemon Squeezy als Merchant of Record)
- **Besonderheit:** Lemon Squeezy ist Merchant of Record — übernimmt EU-VAT-Abführung,
  daher entfällt eigene USt-Registrierung in EU-Ländern
- **DPA abschließen:** Lemon Squeezy Dashboard → Settings → Legal
- **Datenschutz:** https://www.lemonsqueezy.com/privacy

---

## Checkliste vor Go-Live

- [ ] Supabase DPA abgeschlossen (Click-Through im Dashboard)
- [ ] Upstash DPA abgeschlossen
- [ ] Resend DPA abgeschlossen
- [ ] Lemon Squeezy DPA abgeschlossen
- [ ] Impressum mit echtem Namen + Adresse befüllt (env vars setzen)
- [ ] `NEXT_PUBLIC_OPERATOR_NAME` gesetzt
- [ ] `NEXT_PUBLIC_OPERATOR_STREET` gesetzt
- [ ] `NEXT_PUBLIC_OPERATOR_CITY` gesetzt
- [ ] `NEXT_PUBLIC_OPERATOR_EMAIL` gesetzt
- [ ] Unsubscribe-Migration durchgeführt (`npx prisma migrate deploy`)
- [ ] Unsubscribe-Link in alle Marketing-E-Mails eingefügt
  - Format: `https://railtrax.eu/api/unsubscribe?token={user.unsubscribeToken}`
- [ ] Mindestalter-Checkbox (16 Jahre) im Signup-Formular ergänzt
- [ ] Push-Benachrichtigungen sind optional und nicht vorausgewählt

---

*Erstellt: 2026-03-18*
