/*
 * ERST EINRICHTEN: Werte aus Firebase-Konsole > Projekteinstellungen > Web-App eintragen.
 * Firebase Web-Konfiguration und Admin-UID sind KEINE Geheimnisse. Sicherheit: firestore.rules.
 * Im unveränderten Zustand startet eine lokale Demo, die NICHT geräteübergreifend synchronisiert.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBjKRUccYcCKK24kH-i-LHJppRWfaM_ezU',
  authDomain: 'malaga-padel-cup.firebaseapp.com',
  projectId: 'malaga-padel-cup',
  storageBucket: 'malaga-padel-cup.firebasestorage.app',
  messagingSenderId: '18647197155',
  appId: '1:18647197155:web:c6086d2d728d218fd6ecd6'
};
// Die UID deines Firebase-Authentication-Benutzers (NICHT Passwort oder E-Mail).
export const ADMIN_UID = 'RSyNpHZL6icGzo8cOdgXi8mHWBi2';
export const configured = !firebaseConfig.apiKey.startsWith('HIER_') && !firebaseConfig.projectId.startsWith('HIER_');
