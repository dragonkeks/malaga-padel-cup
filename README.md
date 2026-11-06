# Málaga Padel Cup – Version 3 🎾

Web-App für GitHub Pages mit Firebase Cloud Firestore und Firebase Authentication. Vier Turnierformate, manuelle Teams, Live-Spielplan, 2/1/0-Matchwertung, einstellbare Turnierboni, freie Doppelspiele, personalisierte Spielerbereiche und jetzt **eigene Spiel-Erstellung für bestätigte Spieler** sowie **variable Spielsysteme für Vorrunde und Endrunde**.

**Für das Update einer bestehenden App unbedingt zuerst [UPDATE_V3.md](UPDATE_V3.md) lesen.**

**Deine bestehende `firebase-config.js` behalten!** Sie wird aus Sicherheits- und Kompatibilitätsgründen **nicht** im ZIP mitgeliefert. Keine neue Firebase-Datenbank nötig. Die Datei `firestore.rules` ist im Paket enthalten; die Admin-UID ist dort noch einzusetzen und die Regeln müssen unter **Cloud Firestore → Regeln** veröffentlicht werden.

Bei der erstmaligen Einrichtung siehe [ANLEITUNG.md](ANLEITUNG.md). Ohne konfigurierte Firebase-Datei wird keine Live-Verbindung hergestellt.

**Tests mit Node.js:** `node tests/core.test.mjs`, `node tests/v3.test.mjs`, `node tests/upgrade.test.mjs`, `node tests/render.test.mjs`. Für `tests/ui.test.mjs` ist eine lokale Firebase-Konfigurationsdatei mit `configured=false` erforderlich. Live-Firestore-Zugriffsregeln müssen zusätzlich in der Firebase Console mit einem echten Spieler- und Adminkonto geprüft werden.
