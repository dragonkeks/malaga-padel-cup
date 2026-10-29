# Málaga Padel Cup – Anleitung für die zweite Version

Die App ist eine mobile Website für GitHub Pages. Live-Daten laufen über **Firebase Cloud Firestore** und das Login über **Firebase Authentication**. Für die App brauchst du keine Serverprogrammierung, keine Node-Installation und keine kostenpflichtige Hosting-Plattform.

> **Bereits die erste Version eingerichtet?** Lies **[UPDATE_VON_VERSION_1.md](UPDATE_VON_VERSION_1.md)**. Bewahre vor allem deine **bisherige `firebase-config.js`** auf. Erstelle **kein** neues Firebase-Projekt. Neue Version hochladen und neue Firestore-Regeln veröffentlichen reicht.

## A. Neuinstallation – GitHub

1. Ein neues Repository bei [GitHub](https://github.com) erstellen, z. B. `malaga-padel-cup`.
2. Alle App-Dateien in das **Hauptverzeichnis** des Repositorys hochladen. `index.html` muss direkt dort liegen.
3. Unter **Settings → Pages → Deploy from a branch** den Branch `main` und `/(root)` auswählen und speichern.
4. Die veröffentlichte App liegt normalerweise unter `https://DEINNAME.github.io/malaga-padel-cup/`. Ohne Firebase-Konfiguration wird die Demo angezeigt.

## B. Firebase – Cloud Firestore

1. Unter <https://console.firebase.google.com/> dein Firebase-Projekt wählen bzw. erstellen.
2. **Firestore Database** öffnen – **nicht Realtime Database!** Falls nötig „Datenbank erstellen“ → Standard-Edition, `(default)`, europäische Region und Produktionsmodus auswählen.
3. **Authentication → Anmeldemethode** öffnen und **E-Mail/Passwort** einschalten. Auch die namenbasierte Registrierung der Spieler nutzt intern diese Firebase-Methode.
4. In **Authentication → Nutzer** ein Adminkonto mit einer echten E-Mail-Adresse und starkem Passwort erstellen. Dessen **User UID** kopieren.
5. In **Projekteinstellungen → Deine Apps** eine Web-App registrieren. Aus der Firebase-Konfiguration die Felder `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` ablesen.

## C. App mit Firebase verknüpfen

1. In `firebase-config.js` die Platzhalter mit den Werten deiner registrierten Firebase-Web-App ersetzen.
2. In derselben Datei beim Export `ADMIN_UID` die echte **User UID** deines Adminkontos eintragen. Das Admin-Passwort kommt **nicht** in den Code.
3. In `firestore.rules` den Text `'HIER_ADMIN_UID'` durch **dieselbe UID** ersetzen.
4. Unter **Firebase → Firestore Database → Regeln** den **vollständigen** Inhalt der angepassten `firestore.rules` einfügen und auf **Veröffentlichen** klicken. Nicht bei Realtime Database einfügen.
5. Unter **Firebase → Authentication → Einstellungen → Autorisierte Domains** die GitHub-Pages-Domain eintragen, also z. B. `tigraef.github.io`, **ohne** `https://`, `github.com` oder den Repository-Pfad.
6. Neue bzw. geänderte Dateien über GitHub hochladen und committen.
7. In der Live-App mit dem Admin-Login (echte E-Mail + Passwort) anmelden.

Die sechs Firebase-Konfigurationswerte und die Admin-UID sind keine Passwörter. Zugriff schützen die Regeln in Firestore. Niemals dein Passwort oder einen Firebase-Service-Account-Schlüssel ins GitHub-Repository kopieren.

## D. Admin: Spieler und Turniere erstellen

1. Unter **Admin → Spieler & Zugänge** zunächst die Spielernamen anlegen. Maximal 12 Teilnehmer je Turnier; die gesamte Spielerliste darf länger sein.
2. Unter **Admin → Turnier erstellen** den Modus auswählen:
   - **Zwei Gruppen mit KO- und Platzierungsspielen:** 8 oder 12 Personen.
   - **Jeder gegen jeden mit Platzierungsspielen:** 4, 6, 8, 10 oder 12 Personen.
   - **Americano:** 4, 8 oder 12 Personen. Jeder wird genau einmal mit jedem anderen Doppelpartner eingeteilt.
   - **Mexicano:** 4, 8 oder 12 Personen; Rundenzahl wählbar. Ab Runde 2 setzt die aktuelle Einzelrangliste die Gegner und Partner zusammen: 1+4 gegen 2+3, 5+8 gegen 6+7 usw.
3. Spielformat auswählen: **Best of 3 Sätze**, **8 Bälle** oder **24 Bälle**.
4. Für Teamturniere „**Teams automatisch zufällig mischen**“ deaktivieren, um jedes Zweierteam einschließlich Teamnamen selbst zuzuordnen. Jeder Teilnehmer muss genau einmal vorkommen.
5. Die Schalter **Spieler dürfen eigene Matches terminieren** und **Spieler dürfen Ergebnisse ihrer offenen Matches eintragen** unabhängig voneinander setzen.
6. Platzierungsbonus einstellen, zum Beispiel 100 Punkte für Platz 1 und 30 Punkte für den letzten Platz. Das beeinflusst erst die Gesamtwertung nach dem Turnier.
7. Turnier speichern. Die App erzeugt die erste Phase automatisch.
8. Bei Gruppen-/Liga- und Mexicano-Turnieren nach vollständigem Abschluss der vorigen Runde unter **Admin → Turniere → Nächste Phase** weitergehen. Im Gruppenmodus folgen Halbfinals und Finale/weitere Platzierungsspiele.

## E. Freie Spiele, Termine, Ergebnisse

Unter **Admin → Freies Spiel** können unabhängig von Turnieren Doppel-Matches mit vier unterschiedlichen Spielern angelegt werden. Format, Zeitpunkt, Court und Freigaben sind einstellbar. Jede abgeschlossene Partie zählt für die Gesamtwertung mit 2/1/0 Matchpunkten, aber ohne Turnierbonus.

Für automatisch geplante Turniere unter **Spielplan → Zeitplan erstellen** Startzeit, Slotdauer und Courts festlegen. Bestehende Match-Termine werden auf Überschneidung geprüft. Spieler dürfen ihre eigenen Termine ändern, wenn das Match noch offen, der entsprechende Schalter gesetzt und ihr Spielerprofil freigeschaltet ist. Gleichzeitige Änderungen können trotzdem Kollisionen verursachen, daher Spielplan kontrollieren.

Ergebnisse können über die Matchkarte eingetragen werden. Sieg zählt 2 Matchpunkte für jeden Spieler des Siegerteams; Unentschieden 1 Punkt pro Spieler; Niederlage 0. Im Modus Best-of-3 werden Sätze gewertet, für 8 oder 24 Bälle die Ballpunkte. KO-/Platzierungsspiele müssen bei Gleichstand einen Golden Point erhalten.

## F. Spielerregistrierung ohne eigene E-Mail

1. Ein Spieler öffnet die App und wählt **Anmelden**.
2. Er wählt **seinen Namen aus der von dir angelegten Liste**, vergibt ein Passwort (mindestens 6 Zeichen) und tippt **Registrieren**.
3. Dabei wird ein Firebase-Authentication-Konto mit einer automatisch generierten technischen E-Mail-Adresse erstellt. **Keine echte Spieler-E-Mail notwendig.**
4. Du kontrollierst unter **Admin → Spieler & Zugänge → Registrierungsanfragen** die angezeigte Zuordnung. **Nur freigeben, wenn du sicher weißt, wer sich registriert hat.** Ein öffentlich sichtbarer Name beweist keine Identität.
5. Nach Freigabe kann sich die Person mit Name und Passwort anmelden und unter **Mein Bereich** ihre offenen Spiele, abgeschlossenen Matches, Matchpunkte und Turnierplatzierungen ansehen. Freigegebene offene Matches haben Schaltflächen „Termin“ oder „Ergebnis melden“.

**Passwort vergessen?** Bei Konten ohne echte E-Mail gibt es keine automatische E-Mail-Wiederherstellung. Die Turnierleitung muss die alte UID-Verknüpfung beim Spieler lösen und das zugehörige Firebase-Authentication-Konto in der Firebase Console löschen bzw. verwalten. Danach erneut registrieren.

Bestehende Spielerkonten aus Version 1, die eine echte E-Mail verwenden, können sich weiterhin über „Admin oder bestehendes Konto mit E-Mail anmelden“ anmelden, sofern ihre UID schon mit dem Spieler verknüpft ist.

## G. Wie die Tabellen funktionieren

- **Turniertabellen:** Rangfolge zuerst nach **Matchpunkten** (2 pro Sieg, 1 pro Unentschieden), danach Punktedifferenz, erzielten Bällen/Games und Siegen. Der Liga- bzw. Gruppenstand und die Americano-/Mexicano-Rangliste zeigen außerdem Sp., Siege, Unentschieden, Niederlagen und erzielte/verlorene Bälle/Games.
- **Gesamtwertung:** Für **jedes** beendete Match bekommt jeder Spieler die 2/1/0 Matchpunkte – auch aus freien Spielen oder aus noch laufenden Turnieren. Dazu kommt für jedes vollständig beendete Turnier ein **Platzierungsbonus**. Bei 100 Punkten für Platz 1 und 30 für den letzten Platz liegt jede dazwischenliegende Platzierung linear dazwischen. Der Teamplatz wird beiden Teammitgliedern gutgeschrieben. Die Gesamtwertung addiert Matchpunkte und Boni.
- Diese Gesamtwertung belohnt **häufige Teilnahme**, auch an einzelnen Spielen. Wer häufiger spielt, kann mit guten Leistungen mehr Gesamtpunkte erzielen.
- Die Angaben unter **Tabellen** betreffen jeweils nur das ausgewählte Turnier. Der Filter „Alle Turniere“ ist bewusst entfernt. Die turnierübergreifende Übersicht bleibt im Reiter **Gesamt**.

## H. Tests und Grenzen

- Vor dem echten Turnier im Admin-Bereich **Backup (JSON)** herunterladen. Bei neuen Daten später erneut sichern.
- Die lokalen JavaScript-Tests sind im Ordner `tests` vorhanden. Wenn Node.js installiert ist: `node tests/core.test.mjs`, `node tests/upgrade.test.mjs` und `node tests/render.test.mjs`.
- Nach dem Update mit **zwei Geräten** testen: Spieler registrieren, vom Admin freigeben, freien Termin ändern und Ergebnis melden; den neuen Tabellenstand auf dem anderen Gerät prüfen.
- Ein Teilnehmer kann ein offenes Ergebnis melden; eine **Vier-Personen-Bestätigung** gibt es derzeit nicht. Der Admin kann jedes Ergebnis korrigieren oder zurücksetzen.
- Eine Korrektur nach Erzeugen von Folgerunden baut bestehende KO-/Mexicano-Paarungen nicht automatisch neu auf.
- Live-Daten erfordern Internet. Namen und Turnierdaten sind für Besucher mit dem Seitenlink öffentlich lesbar; verwende bei Bedarf Kürzel.
- Bei Firestore-Regelfehlern unbedingt prüfen, dass **Cloud Firestore** und nicht **Realtime Database** geöffnet ist.
