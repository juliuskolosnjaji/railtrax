#!/bin/bash
# Railtrax systemd Service Setup Script
# Dieses Skript richtet den Railtrax Service auf Ubuntu/Debian Servern ein

set -e

echo "🚂 Railtrax systemd Service Einrichtung"
echo "======================================"

# Benutzer- und Verzeichnis-Variablen
RAILTRAX_USER="railtrax"
RAILTRAX_DIR="/opt/railtrax"
SERVICE_NAME="railtrax"

# Prüfen, ob als root ausgeführt
if [[ $EUID -ne 0 ]]; then
   echo "❌ Dieses Skript muss als root ausgeführt werden"
   exit 1
fi

# System aktualisieren
echo "📦 System wird aktualisiert..."
apt update && apt upgrade -y

# Benutzer erstellen, falls nicht vorhanden
if ! id "$RAILTRAX_USER" &>/dev/null; then
    echo "👤 Erstelle Benutzer $RAILTRAX_USER..."
    useradd -r -s /bin/false -d $RAILTRAX_DIR $RAILTRAX_USER
fi

# Verzeichnisstruktur sicherstellen
echo "📁 Erstelle Verzeichnisse..."
mkdir -p $RAILTRAX_DIR
mkdir -p /var/log/railtrax
mkdir -p /opt/backups/railtrax

# Berechtigungen setzen
echo "🔒 Setze Berechtigungen..."
chown -R $RAILTRAX_USER:$RAILTRAX_USER $RAILTRAX_DIR
chmod 755 $RAILTRAX_DIR

# systemd Service-Datei erstellen
echo "⚙️ Erstelle systemd Service..."
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Railtrax - Europäische Zugreise Planungs-App
Documentation=https://github.com/euer-repository/railtrax
After=network.target postgresql.service
Wants=network.target

[Service]
Type=simple
User=$RAILTRAX_USER
Group=$RAILTRAX_USER
WorkingDirectory=$RAILTRAX_DIR
ExecStart=/usr/bin/node $RAILTRAX_DIR/node_modules/.bin/next start -p 3000
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=railtrax

# Umgebungsvariablen
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=NEXT_TELEMETRY_DISABLED=1

# Sicherheit
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$RAILTRAX_DIR /tmp /var/log/railtrax

# Ressourcenlimits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Service aktivieren
echo "🔨 Aktiviere Service..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME.service

echo ""
echo "✅ systemd Service erfolgreich eingerichtet!"
echo ""
echo "Nächste Schritte:"
echo "1. Stelle sicher, dass Railtrax in $RAILTRAX_DIR installiert ist"
echo "2. Erstelle die .env.production Datei mit deinen Einstellungen"
echo "3. Führe 'npm install && npm run build' im Railtrax-Verzeichnis aus"
echo "4. Starte den Service: systemctl start $SERVICE_NAME"
echo "5. Prüfe den Status: systemctl status $SERVICE_NAME"
echo ""
echo "Logs anzeigen: journalctl -u $SERVICE_NAME -f"
echo "Service neustarten: systemctl restart $SERVICE_NAME"
echo "Service stoppen: systemctl stop $SERVICE_NAME"