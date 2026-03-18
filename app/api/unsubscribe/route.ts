import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/unsubscribe?token=<unsubscribeToken>
// Sets marketing_emails = false for the matching user.
// Linked from every non-transactional email footer.
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')

  if (!token) {
    return new NextResponse(renderPage('Ungültiger Link', 'Kein Abmeldetoken gefunden.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  try {
    const db = prisma()
    const updated = await db.user.updateMany({
      where: { unsubscribeToken: token, marketingEmails: true },
      data: { marketingEmails: false },
    })

    if (updated.count === 0) {
      // Token not found or already unsubscribed — still show success to avoid enumeration
    }

    return new NextResponse(
      renderPage(
        'Erfolgreich abgemeldet',
        'Du erhältst keine Marketing-E-Mails von Railtrax mehr.<br>Transaktionsmails (z.&nbsp;B. Passwort-Reset) werden weiterhin zugestellt.',
      ),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  } catch {
    return new NextResponse(
      renderPage('Fehler', 'Bitte versuche es später erneut oder kontaktiere uns unter legal@railtrax.eu.'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}

function renderPage(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Railtrax</title>
  <style>
    body { margin: 0; background: #080d1a; color: #c5d4e8; font-family: system-ui, sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #0a1628; border: 1px solid #1e2d4a; border-radius: 12px;
            padding: 40px 32px; max-width: 420px; text-align: center; }
    h1 { color: #fff; font-size: 22px; margin-bottom: 12px; }
    p  { font-size: 14px; line-height: 1.7; color: #8ba3c7; margin-bottom: 24px; }
    a  { color: #4f8ef7; text-decoration: none; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
    <a href="https://railtrax.eu">Zurück zu Railtrax</a>
  </div>
</body>
</html>`
}
