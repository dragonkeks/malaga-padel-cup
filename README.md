# Málaga Padel Cup – Version 2 🎾

Responsive Web-App für GitHub Pages und Firebase mit vier Turnierformaten, Live-Ergebnissen, 2/1/0 Matchwertung, einstellbaren Turnierboni, freien Doppelspielen, manuellen Teams, personalisiertem Spielerbereich und nutzerseitiger Termin-/Ergebniserfassung nach Admin-Freigabe.

**Wenn du Version 1 bereits eingerichtet hast, beginne mit [UPDATE_VON_VERSION_1.md](UPDATE_VON_VERSION_1.md).** Deine bisherige `firebase-config.js` mit den echten Firebase-Werten unbedingt behalten. In Firebase die neue Datei `firestore.rules` veröffentlichen, nachdem du `HIER_ADMIN_UID` durch deine eigene UID ersetzt hast.

**Neuinstallation:** `ANLEITUNG.md` (Grundlagen) und `UPDATE_VON_VERSION_1.md` (neue Funktionen). Ohne Firebase-Konfiguration startet die lokale Demo. Die Firestore-Regeln gelten nur in **Cloud Firestore**, nicht in Realtime Database.

**Tests:** `node tests/core.test.mjs` und `node tests/upgrade.test.mjs`.

**Wichtig:** Spielerregistrierung mit Namen/Passwort verwendet technisch Firebase E-Mail/Passwort mit einer generierten App-internen Adresse. Es gibt keinen automatischen Passwort-Reset ohne echte E-Mail. Die Turnierleitung muss jede Spielerregistrierung persönlich freigeben.
