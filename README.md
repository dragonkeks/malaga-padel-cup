# Málaga Padel Cup 🎾

Eine mobile, responsive Padel-Turnierverwaltung mit 4 Modi: 2 Gruppen + KO + Platzierung, Liga + Platzierung, Americano und Mexicano.

**Sofort ansehen:** Unveränderte Dateien über GitHub Pages veröffentlichen; die Web-App startet in einem Browser-lokalen Demo-Modus.

**Mit anderen live verwenden:** In Firebase Cloud Firestore + Authentication anlegen, `firebase-config.js` befüllen, `HIER_ADMIN_UID` in `firebase-config.js` und `firestore.rules` ersetzen und diese Regeln in Firestore veröffentlichen.

**Ausführliche Schritt-für-Schritt-Anleitung:** [ANLEITUNG.md](ANLEITUNG.md).

Die Live-App ist öffentlich lesbar. Schreiben ist per Firestore-Regeln auf den Admin und die vom Admin verknüpften Spieler (ausschließlich Terminänderungen eigener offener Matches) eingeschränkt.

**Tests:** `node tests/core.test.mjs`.
