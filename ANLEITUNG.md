# Málaga Padel Cup – genaue Einrichtungsanleitung

Die App ist eine mobile Web-App (keine Installation aus dem App Store nötig). Du kannst sie kostenlos auf GitHub Pages hosten. Zur Synchronisierung zwischen Handys brauchst du ein Firebase-Projekt mit **Cloud Firestore** und **Firebase Authentication**. Diese Anleitung ist für Einsteiger und Mac-Nutzer geschrieben.

## 1. Zuerst die Demo ansehen

Solange du in `firebase-config.js` keine Firebase-Werte eingetragen hast, zeigt die App eine **lokale Demo** mit zwölf Beispielspielern und zwei Turnieren. Du kannst im Demo-Modus unter „Admin“ sämtliche Funktionen ausprobieren, neue Turniere anlegen und Ergebnisse eintragen. Änderungen bleiben ausschließlich im **aktuellen Browser** (localStorage): Andere Spieler sehen sie nicht. Die Demo ist nicht der Live-Betrieb.

Am einfachsten: Lade die Dateien nach Schritt 5 zu GitHub hoch. Deine GitHub-Pages-Seite startet zunächst als Demo. Du kannst sie danach auf Firebase umstellen.

Wichtig: Lade die **entpackten Dateien** hoch, nicht nur die ZIP-Datei.

## 2. Firebase-Projekt anlegen

1. Öffne <https://console.firebase.google.com/> und melde dich mit deinem Google-Konto an.
2. Klicke auf **Projekt hinzufügen** und nenne es beispielsweise `malaga-padel-cup` (der genaue Projektname darf anders sein).
3. Google Analytics ist für diese App nicht erforderlich. Du kannst es deaktivieren.
4. Öffne das neue Projekt. Wähle im Projektmenü **Projektübersicht → Projekteinstellungen** (Zahnrad).
5. Bei **Deine Apps** klicke auf das Websymbol `</>` und registriere eine Web-App, z. B. `Padel Turnier`.
6. Du erhältst die **Firebase-Konfiguration**, etwa:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "mein-projekt.firebaseapp.com",
     projectId: "mein-projekt",
     storageBucket: "mein-projekt.firebasestorage.app",
     messagingSenderId: "123...",
     appId: "1:123:web:..."
   };
   ```

   Lass das Fenster mit diesen Werten geöffnet. Wichtig: Du brauchst **keinen Firebase Hosting-Dienst**, weil GitHub Pages das Hosting übernimmt.

## 3. Datenbank einschalten und Zugriffsregeln setzen

1. Öffne links **Build → Firestore Database** und klicke **Datenbank erstellen**.
2. Wähle den normalen Firestore-Datenbankmodus (Standard Edition / Native Mode, sofern gefragt), eine europäische Region und **Produktionsmodus**.
3. Unter **Firestore Database → Regeln (Rules)** wird ein Regeleditor angezeigt.
4. Öffne aus diesem Projekt die Datei `firestore.rules`. Kopiere **den gesamten Inhalt** in den Regeleditor. **Noch nicht veröffentlichen**: Der Text `HIER_ADMIN_UID` muss zunächst durch deine echte Admin-UID ersetzt werden (siehe Schritt 4).
5. Speichere bzw. veröffentliche die Regeln nach dem Ersetzen der UID.

**Sicherheit:** Die Regeln erlauben allen den Lesezugriff auf Spielerlisten, Turnierdaten und Ergebnisse. Erstellen, Löschen und Korrigieren darf nur die Firebase-Admin-UID. Wenn Selbstterminierung aktiviert ist, dürfen angemeldete, einem Turnierspieler zugeordnete Konten **ausschließlich** die Zeit und den Court ihrer eigenen noch offenen Matches ändern – keine Ergebnisse. Die Firebase-Konfigurationswerte und die UID sind nicht geheim; die Firestore-Regeln sind die eigentliche Zugriffskontrolle. **Nie private Passwörter oder Firebase-Service-Account-Schlüssel in GitHub ablegen.**

## 4. Dein Adminkonto erstellen

1. Öffne links **Build → Authentication** und klicke **Jetzt starten**.
2. Gehe zu **Sign-in method / Anmeldemethode**.
3. Aktiviere **E-Mail/Passwort** (Email/Password). Die Variante „E-Mail-Link“ ist nicht nötig.
4. Unter **Users / Nutzer** klicke **Nutzer hinzufügen / Add user**.
5. Trage deine E-Mail-Adresse und ein starkes Passwort ein. Das Passwort nirgends in den Code schreiben!
6. Der neue Nutzer erscheint in einer Liste. Kopiere den langen Wert in der Spalte **User UID**. Beispiel: `hjw83...` (nur als Beispiel).
7. Öffne auf deinem Mac die Datei `firebase-config.js` mit TextEdit im reinen Textmodus oder Visual Studio Code.
8. Ersetze in `firebaseConfig` die sechs Platzhalter durch die echten Firebase-Werte aus Schritt 2. **Anführungszeichen, Kommas und geschweifte Klammern beibehalten.**
9. Ersetze in derselben Datei `HIER_ADMIN_UID` durch die eben kopierte **User UID**. Nicht die E-Mail-Adresse eintragen.
10. Öffne zusätzlich die Datei `firestore.rules` und ersetze **auch dort** `HIER_ADMIN_UID` durch exakt dieselbe UID.
11. Speichere beide Dateien. Kopiere die geänderten Regeln in der Firebase-Konsole unter **Firestore Database → Regeln** und klicke **Veröffentlichen / Publish**.

So sieht das in `firebase-config.js` ungefähr aus:

```js
export const ADMIN_UID = 'DEINE_ECHTE_USER_UID';
```

Die HTML-Dateien benötigen keinen npm-Befehl und keinen Programmier-Editor. Wichtig ist nur, dass die Datei `.js` bleibt und kein `.txt` angehängt wird.

## 5. GitHub-Pages-Website veröffentlichen

1. Öffne <https://github.com/> und melde dich an.
2. Klicke rechts oben auf **+ → New repository**.
3. Repository-Name beispielsweise `malaga-padel-cup`.
4. Wähle **Public** (die Website wird ohnehin öffentlich erreichbar sein). Klicke **Create repository**.
5. Entpacke das heruntergeladene ZIP auf deinem Mac durch Doppelklick.
6. Im neuen GitHub-Repository klicke **Add file → Upload files**.
7. Ziehe aus dem entpackten Ordner **alle Dateien der obersten Ebene** in das Upload-Fenster: `index.html`, `style.css`, `app.js`, `core.mjs`, `firebase-config.js`, `firestore.rules`, `ANLEITUNG.md` sowie bei Bedarf weitere Dateien. Die versteckte `.nojekyll` ist optional. Die Tests musst du nicht hochladen.
8. Warte, bis alles hochgeladen ist, und klicke unten **Commit changes**.
9. Oben im GitHub-Repository öffne **Settings → Pages**.
10. Unter **Build and deployment → Source** wähle **Deploy from a branch**.
11. Wähle Branch **main** und Ordner **/(root)**, dann **Save**.
12. Deine Seite lautet üblicherweise:

    `https://DEIN-GITHUB-NAME.github.io/malaga-padel-cup/`

    Wenn du einen anderen Repository-Namen gewählt hast, erscheint er stattdessen im Link. Falls deine Website noch nicht erreichbar ist, überprüfe den Veröffentlichungsstatus unter **Actions** oder **Settings → Pages**.

Die Website wird neu veröffentlicht, wenn du später Dateien im Repository änderst. GitHub-Anleitung: <https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>.

## 6. Firebase für deine GitHub-Seite autorisieren

1. Öffne Firebase-Konsole → **Authentication → Settings / Einstellungen → Authorized domains / Autorisierte Domains**.
2. Füge **`DEIN-GITHUB-NAME.github.io`** hinzu (ohne `https://`, ohne `/malaga-padel-cup/`). Sonst kann die Anmeldung je nach gewähltem Auth-Verfahren blockiert werden.
3. Öffne die veröffentlichte App auf deinem Handy oder Mac.
4. Rechts oben **Anmelden** wählen und mit der Adminkonto-E-Mail und dem Passwort aus Schritt 4 einloggen.
5. Im Navigationspunkt **Admin** solltest du jetzt Turniere und Spieler verwalten können. Wenn stattdessen „Admin-Anmeldung“ erscheint, prüfe den UID-Eintrag in der Konfigurationsdatei.

### Häufige Probleme

- **DEMO im Kopfbereich:** Die Platzhalter in `firebase-config.js` sind noch nicht alle ersetzt oder die neue Datei ist noch nicht bei GitHub veröffentlicht.
- **Missing or insufficient permissions / Zugriff verweigert:** Die Firestore-Regeln sind noch nicht veröffentlicht, die Admin-UID ist falsch oder du bist nicht angemeldet.
- **auth/operation-not-allowed:** E-Mail/Passwort in Authentication aktivieren.
- **auth/invalid-credential:** Passwort/E-Mail überprüfen.
- **Weiße Seite:** Browser-Konsole mit Rechtsklick → Untersuchen → Console kontrollieren; oft wurden Anführungszeichen oder Kommas in `firebase-config.js` beschädigt.
- **Spieler sieht keine Zeitplan-Schaltfläche:** Der Spieler muss angemeldet sein, und seine UID muss im jeweiligen Spielerdatensatz hinterlegt sein. Außerdem muss im Turnier die Selbstterminierung eingeschaltet sein.
- **GitHub zeigt statt der Website nur eine 404-Seite:** `index.html` muss direkt im Repository-Hauptordner liegen; branch `main` und `/(root)` auswählen.

## 7. Turnier einrichten und während des Events bedienen

1. **Admin → Spieler**: Zuerst alle Spielernamen hinzufügen.
2. **Admin → Turnier erstellen**: Name, Modus, Punktesystem und 4–12 Teilnehmer wählen.
3. Bei Teamturnieren **Zufallsmischung** aktivieren oder deaktivieren, um Namen und Zweierteams selbst festzulegen. Du kannst Teamnamen/Spielerzuteilung später über **Admin → Turniere → Bearbeiten** ändern; Spielerzuteilungen sind nach dem ersten eingetragenen Ergebnis gesperrt.
4. Beim Mexicano eine Rundenanzahl einstellen; bei 8/24 Bällen werden die Bälle je Paarung gezählt.
5. Turnier anlegen. Die App erzeugt die ersten Paarungen.
6. **Spielplan → Zeitplan erstellen**: Startzeit, Matchdauer und Courts (z. B. `D6, D7, D8`) einstellen. Die App prüft Terminkollisionen zwischen Spielern und Courts – auch turnierübergreifend. Noch nicht erzeugte KO- oder Mexicano-Runden müssen später separat geplant werden.
7. Ergebnisse über die Schaltfläche **Ergebnis** an einer Match-Karte eintragen. Der Admin kann sie ändern und zurücksetzen. **Achtung:** Wenn Folgerunden bereits erstellt wurden, werden deren Paarungen nach einer Korrektur von Vorrunden- oder früheren Mexicano-Ergebnissen nicht automatisch neu berechnet. Kontrolliere Folgerunden darum vor dem Weiterkommen sorgfältig.
8. Bei **2 Gruppen + KO** nach der Vorrunde unter **Admin → Turniere → Nächste Phase** die Halbfinalspiele und gegebenenfalls Platz 5 erzeugen; nach diesen Matches Finale und Platz 3 erzeugen.
9. Bei **Jeder gegen jeden + Platzierung** nach allen Ligaspielen über **Nächste Phase** die Platzierungsspiele erzeugen (Platz 1 gegen 2, 3 gegen 4 usw.). Bei ungerader Teamanzahl erhält das letzte Team den letzten Platz ohne zusätzliches Platzierungsspiel.
10. Bei **Mexicano** nach jeder fertigen Runde **Nächste Phase** wählen. Die neuen Paarungen werden aus der Live-Rangliste generiert.
11. Bei **Americano** werden alle Runden bereits beim Start generiert. Jeder Spieler bekommt jeden anderen Teilnehmer genau einmal als Doppelpartner.
12. Sobald sämtliche Matches der letzten Turnierphase erfasst wurden, erscheint das Turnier automatisch als **abgeschlossen** und zählt in der **Gesamtwertung**. Gleichzeitig können beliebig viele andere Turniere parallel offen bleiben.

### Spieler dürfen selbst Termine eintragen

1. Bei der Turniererstellung „Spieler dürfen eigene Matches terminieren“ aktivieren (alternativ später unter Turnier bearbeiten).
2. Jeder teilnehmende Spieler klickt auf **Anmelden → Spielerkonto anlegen**, gibt E-Mail und Passwort ein und öffnet anschließend oben rechts sein Konto.
3. Dort wird die **Konto-UID** angezeigt. Diese UID teilt der Spieler **dir** mit.
4. Du öffnest **Admin → Spieler → Bearbeiten** beim zugehörigen Namen und trägst die UID in das Feld **Firebase-Konto-UID** ein.
5. Danach erscheint bei seinen noch offenen Matches die Schaltfläche **Termin**. Ergebnisse bleiben weiterhin nur für dich editierbar.

Der manuelle UID-Schritt dient als Kontrolle, damit nicht irgendwer fremde Spieltermine verändern kann.

## 8. Wertungslogik genau erklärt

- **Teamturniere:** Die endgültige Platzierung im Teamturnier wird jedem Teammitglied einzeln gutgeschrieben. Vorrundenspiele erzeugen vorläufige Tabellen, aber noch keine Gesamtpunkte.
- **Americano/Mexicano:** Einzelplatzierungen folgen zunächst der Summe der gewonnenen Ball- bzw. Spielpunkte; danach entscheiden Punktedifferenz und Siege. Bei Best-of-3 werden gewonnene *Games* je Satz für die Einzelrangliste addiert.
- **Gesamtwertung:** Pro abgeschlossenem Turnier: **30 + 70 × (N − Platz) / (N − 1)** Punkte (1 Dezimalstelle). `N` ist die Zahl der Teams bei Teamturnieren, sonst die Zahl der Einzelspieler. Somit gibt es zwischen 30 und 100 Punkte pro Turnier und Leistung. Mehrere gute Turniere addieren sich, ein einmaliger Sieg kann nicht fünf gute Ergebnisse übertrumpfen. Beispiel bei 6 Teams: 1. Platz 100, 2. Platz 86, 3. Platz 72, 4. Platz 58, 5. Platz 44, 6. Platz 30.
- **Unentschieden:** Bei 8 oder 24 Bällen sind 4:4 und 12:12 in Vorrunden und Americano/Mexicano möglich. In KO- und Platzierungsspielen ist ein Golden Point nötig, also 5:4 oder 13:12. Beim Satzmodus werden zwei Gewinnsätze erfasst; bei 6:6 entscheidet ein letzter Punkt 7:6.
- **Zeitplanung:** Die automatische Planung berücksichtigt alle derzeit existierenden Matches. Sie berücksichtigt keine echten Öffnungszeiten deiner Anlage und kann zukünftige KO-Paarungen erst planen, wenn diese erzeugt sind. Eine Terminkollision wird im Browser geprüft; bei gleichzeitigem Bearbeiten durch mehrere Spieler sind seltene Konflikte dennoch möglich. Daher im Zweifel den Plan gemeinsam kontrollieren.

## 9. Datensicherung und Grenzen

- Unter **Admin → Backup (JSON)** kannst du Spieler, Turniere, Matches und Ergebnisse als JSON herunterladen. Bewahre gelegentlich eine Kopie auf. Eine Importfunktion ist in dieser ersten Version noch nicht vorhanden.
- Die App ist als leichter, gemeinsamer Turniermanager ausgelegt, nicht als professionelles Ligamanagement-System. Es gibt keine automatische Reservierung der echten Courts bei der Anlage, keine Push-Benachrichtigungen und keinen echten Kalenderabgleich.
- Ohne Internetverbindung können Teilnehmer nicht zuverlässig live synchronisieren.
- Für Cloud Firestore und Authentication gelten die jeweils aktuellen Firebase-Limits und ggf. Kosten. Für eine kleine Gruppe ist häufig die kostenlose Stufe ausreichend, aber bitte in der Firebase-Konsole die Nutzung prüfen.
- **Die App ist nicht für geheime Daten gedacht:** Namen, Paarungen und Ergebnisse sind per öffentlichem Link lesbar. Verwende nur Vornamen/Kürzel, wenn du die persönlichen Daten deiner Bekannten möglichst gering halten möchtest.

## Enthaltene Dateien

- `index.html`: Einstiegspunkt der Web-App
- `style.css`: responsives Design
- `app.js`: Oberfläche, Live-Daten, Verwaltung und Zeitplanung
- `core.mjs`: Turnierregeln, Paarungen, Punkte und Tabellen
- `firebase-config.js`: deine Firebase-Projektkonfiguration und Admin-UID
- `firestore.rules`: Datenbankregeln, die du in Firebase einfügst
- `tests/core.test.mjs`: automatische Tests (freiwillig, lokal mit Node.js ausführbar)

Entwickelt als GitHub-Pages-Web-App mit Firebase. Keine npm-Installation erforderlich.
