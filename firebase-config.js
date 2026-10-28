/*
 * ERST EINRICHTEN: Werte aus Firebase-Konsole > Projekteinstellungen > Web-App eintragen.
 * Firebase Web-Konfiguration und Admin-UID sind KEINE Geheimnisse. Sicherheit: firestore.rules.
 * Im unveränderten Zustand startet eine lokale Demo, die NICHT geräteübergreifend synchronisiert.
 */
export const firebaseConfig = {
  apiKey: 'HIER_API_KEY',
  authDomain: 'HIER_PROJECT_ID.firebaseapp.com',
  projectId: 'HIER_PROJECT_ID',
  storageBucket: 'HIER_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'HIER_MESSAGING_SENDER_ID',
  appId: 'HIER_APP_ID'
};
// Die UID deines Firebase-Authentication-Benutzers (NICHT Passwort oder E-Mail).
export const ADMIN_UID = 'HIER_ADMIN_UID';
export const configured = !firebaseConfig.apiKey.startsWith('HIER_') && !firebaseConfig.projectId.startsWith('HIER_');
