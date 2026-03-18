# Railtrax Selbst-Hosting Anleitung (Deutsch)

Diese Anleitung erklärt, wie ihr Railtrax auf eurem eigenen Server hostet.

## 🚀 Voraussetzungen

- Ubuntu/Debian Server (empfohlen: Ubuntu 22.04 LTS)
- Node.js 20+ und npm
- PostgreSQL 14+ oder Supabase-Instanz
- Nginx (für Reverse Proxy)
- Domain (railtrax.eu) mit DNS-Einträgen
- SSH-Zugang zum Server

## 📦 Installation

### 1. System aktualisieren

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx
```

### 2. Node.js 20 installieren

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Projekt klonen und einrichten

```bash
cd /opt
sudo git clone https://github.com/euer-repository/railtrax.git
sudo chown -R $USER:$USER /opt/railtrax
cd /opt/railtrax
```

### 4. Umgebungsvariablen konfigurieren

Erstellt die `.env.production` Datei:

```bash
cp .env.example .env.production
nano .env.production
```

Wichtige Variablen für Produktion:
- `NEXT_PUBLIC_URL=https://railtrax.eu`
- `DATABASE_URL=postgresql://user:password@localhost:5432/railtrax`
- Alle API-Schlüssel für externe Dienste

### 5. Abhängigkeiten installieren

```bash
npm install
npm run build
```

### 6. Datenbank einrichten

```bash
# PostgreSQL installieren (falls nicht vorhanden)
sudo apt install postgresql postgresql-contrib

# Datenbank und Benutzer erstellen
sudo -u postgres psql
CREATE DATABASE railtrax;
CREATE USER railtrax WITH PASSWORD 'euer-passwort';
GRANT ALL PRIVILEGES ON DATABASE railtrax TO railtrax;
\q

# Prisma Schema anwenden
npx prisma db push
npx prisma db seed
```

## 🔧 Systemd Service einrichten

Erstellt die Service-Datei:

```bash
sudo nano /etc/systemd/system/railtrax.service
```

Inhalt:

```ini
[Unit]
Description=Railtrax Next.js Application
After=network.target

[Service]
Type=simple
User=railtrax
WorkingDirectory=/opt/railtrax
ExecStart=/usr/bin/node /opt/railtrax/node_modules/.bin/next start -p 3000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Service aktivieren:

```bash
# Benutzer erstellen
sudo useradd -r -s /bin/false railtrax
sudo chown -R railtrax:railtrax /opt/railtrax

# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable railtrax
sudo systemctl start railtrax

# Status prüfen
sudo systemctl status railtrax
```

## 🌐 Nginx Reverse Proxy

Erstellt die Nginx-Konfiguration:

```bash
sudo nano /etc/nginx/sites-available/railtrax
```

Inhalt:

```nginx
server {
    listen 80;
    server_name railtrax.eu www.railtrax.eu;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Logging
    access_log /var/log/nginx/railtrax.access.log;
    error_log /var/log/nginx/railtrax.error.log;
    
    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Aktivieren:

```bash
sudo ln -s /etc/nginx/sites-available/railtrax /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 SSL-Zertifikat mit Let's Encrypt

```bash
# Zertifikat anfordern
sudo certbot --nginx -d railtrax.eu -d www.railtrax.eu

# Automatische Verlängerung testen
sudo certbot renew --dry-run
```

Die Nginx-Konfiguration wird automatisch auf HTTPS umgestellt.

## 📊 Monitoring und Health Checks

Erstellt ein Monitoring-Skript:

```bash
sudo nano /usr/local/bin/railtrax-monitor.sh
```

Inhalt:

```bash
#!/bin/bash
# Railtrax Health Check Script

WEBSITE_URL="https://railtrax.eu"
LOG_FILE="/var/log/railtrax-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Health Check
response=$(curl -s -o /dev/null -w "%{http_code}" $WEBSITE_URL/api/health)

if [ $response -eq 200 ]; then
    echo "[$DATE] ✅ Railtrax läuft normal (HTTP $response)" >> $LOG_FILE
else
    echo "[$DATE] ❌ Railtrax Problem erkannt (HTTP $response)" >> $LOG_FILE
    # Optional: E-Mail-Benachrichtigung senden
    # mail -s "Railtrax Server Problem" admin@railtrax.eu < $LOG_FILE
fi

# Disk Space Check
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -gt 80 ]; then
    echo "[$DATE] ⚠️ Festplattenspeicher kritisch: ${disk_usage}%" >> $LOG_FILE
fi

# Memory Check
memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ $memory_usage -gt 80 ]; then
    echo "[$DATE] ⚠️ Speicherauslastung hoch: ${memory_usage}%" >> $LOG_FILE
fi
```

Automatisierung mit Cron:

```bash
sudo chmod +x /usr/local/bin/railtrax-monitor.sh
sudo crontab -e
# Füge hinzu:
*/5 * * * * /usr/local/bin/railtrax-monitor.sh
```

## 💾 Backup-Skripte

Datenbank-Backup:

```bash
sudo nano /usr/local/bin/railtrax-backup.sh
```

Inhalt:

```bash
#!/bin/bash
# Railtrax Datenbank Backup

BACKUP_DIR="/opt/backups/railtrax"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="railtrax"
DB_USER="railtrax"

# Backup-Verzeichnis erstellen
mkdir -p $BACKUP_DIR

# Datenbank dump
pg_dump -U $DB_USER -d $DB_NAME -f "$BACKUP_DIR/railtrax_db_$DATE.sql"

# Alte Backups löschen (älter als 30 Tage)
find $BACKUP_DIR -name "railtrax_db_*.sql" -mtime +30 -delete

# Dateigröße prüfen
if [ -f "$BACKUP_DIR/railtrax_db_$DATE.sql" ]; then
    echo "✅ Backup erfolgreich: railtrax_db_$DATE.sql"
else
    echo "❌ Backup fehlgeschlagen!"
    exit 1
fi
```

Automatisierung:

```bash
sudo chmod +x /usr/local/bin/railtrax-backup.sh
sudo crontab -e
# Füge hinzu (täglich um 2 Uhr):
0 2 * * * /usr/local/bin/railtrax-backup.sh
```

## 🔄 Update-Prozess

Erstellt ein Update-Skript:

```bash
sudo nano /usr/local/bin/railtrax-update.sh
```

Inhalt:

```bash
#!/bin/bash
# Railtrax Update Script

echo "🔄 Starte Railtrax Update..."

# Service stoppen
sudo systemctl stop railtrax

# Backup vor Update
/usr/local/bin/railtrax-backup.sh

# Repository aktualisieren
cd /opt/railtrax
git pull origin main

# Abhängigkeiten aktualisieren
npm install

# Build
npm run build

# Service starten
sudo systemctl start railtrax

# Health Check
sleep 10
response=$(curl -s -o /dev/null -w "%{http_code}" https://railtrax.eu/api/health)

if [ $response -eq 200 ]; then
    echo "✅ Update erfolgreich abgeschlossen!"
else
    echo "❌ Update fehlgeschlagen - prüfe die Logs"
    exit 1
fi
```

## 🐛 Debugging

Log-Dateien prüfen:

```bash
# Anwendungs-Logs
sudo journalctl -u railtrax -f

# Nginx-Logs
sudo tail -f /var/log/nginx/railtrax.error.log

# Monitor-Logs
sudo tail -f /var/log/railtrax-monitor.log
```

Service neustarten:

```bash
sudo systemctl restart railtrax
```

## 📋 Wartungscheckliste

**Täglich:**
- [ ] Website erreichbar (railtrax.eu)
- [ ] Monitor-Logs prüfen
- [ ] SSL-Zertifikat gültig (certbot certificates)

**Wöchentlich:**
- [ ] System-Updates prüfen
- [ ] Log-Dateien rotieren/alte Logs löschen
- [ ] Speicherplatz prüfen (df -h)

**Monatlich:**
- [ ] Backups testen (Restore durchführen)
- [ ] Performance-Analyse
- [ ] Sicherheits-Updates einspielen

## 🚨 Fehlerbehebung

### Website nicht erreichbar
1. `sudo systemctl status railtrax` prüfen
2. `sudo journalctl -u railtrax -n 50` für Fehlermeldungen
3. `sudo nginx -t` für Nginx-Konfiguration
4. Port 3000 freigegeben? `sudo ufw status`

### Datenbank-Verbindung fehlgeschlagen
1. PostgreSQL läuft? `sudo systemctl status postgresql`
2. Verbindungs-String in .env.production prüfen
3. Firewall-Ports prüfen

### SSL-Zertifikat abgelaufen
```bash
sudo certbot renew
sudo systemctl reload nginx
```

## 📞 Support

Bei Problemen:
1. Logs prüfen (siehe Debugging-Abschnitt)
2. GitHub-Issues erstellen
3. Community-Forum nutzen

**Wichtig**: Regelmäßige Backups und Updates durchführen!