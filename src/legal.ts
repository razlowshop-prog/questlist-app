// The legal texts shown under Menu → Legal: terms of use, privacy policy and
// imprint (Impressum). They describe the app as it is now: everything stays
// on the phone, there are no accounts, ads or analytics yet. Before accounts,
// cloud sync, ads, Premium or the photo check go live, these texts must be
// updated first. DRAFT: to be checked (e.g. WKO templates or a lawyer) before
// launch. The German texts below say the same as the English ones; keep
// both in step.

import { lang } from './i18n.ts';

export interface Operator {
  /** Full name of the person running the app (or the company name). */
  name: string;
  street: string;
  /** Postcode and town, e.g. "1010 Wien". */
  city: string;
  country: string;
  email: string;
  phone?: string;
  /** The trade authority (Gewerbebehörde), e.g. "Magistrat der Stadt Wien". */
  authority: string;
  /** The trade licence, e.g. "Handelsgewerbe". */
  trade: string;
  /** The chamber the business belongs to, e.g. "WKO Niederösterreich". */
  chamber?: string;
  /** Number in the trade register (GISA). */
  gisa?: string;
  /** VAT number (UID), if there is one; small businesses under the Kleinunternehmer limit have none. */
  vatId?: string;
}

/** The business behind the app (as on razlow.shop). An empty field shows as "[to be added]", so a gap is never silent. */
export const OPERATOR: Operator = {
  name: 'Fabian Hufnagl (sole proprietorship)',
  street: 'Hauptstraße 38/10',
  city: '2000 Stockerau',
  country: 'Austria',
  email: 'razlowshop@gmail.com',
  phone: '+43 677 63398656',
  authority: 'Bezirkshauptmannschaft Korneuburg',
  trade: 'Handelsgewerbe',
  chamber: 'WKO Niederösterreich',
  gisa: '40170046',
  vatId: 'ATU83689812',
};

/** Shown at the top of each text until it has been checked. */
export const LEGAL_DRAFT_DATE = '25 October 2026';
const LEGAL_DRAFT_DATE_DE = '25. Oktober 2026';

/** The draft date in the current language. */
export function legalDraftDate(): string {
  return lang() === 'de' ? LEGAL_DRAFT_DATE_DE : LEGAL_DRAFT_DATE;
}

export type LegalId = 'terms' | 'privacy' | 'imprint';

export interface LegalDoc {
  id: LegalId;
  title: string;
  sections: { heading: string; paragraphs: string[] }[];
}

const MISSING = '[to be added]';
const MISSING_DE = '[wird ergänzt]';

/** The operator's details with every empty field marked. */
export function filled(op: Operator, missing = MISSING): Required<Operator> {
  const f = (v: string | undefined) => (v && v.trim() ? v.trim() : missing);
  return {
    name: f(op.name),
    street: f(op.street),
    city: f(op.city),
    country: f(op.country),
    email: f(op.email),
    phone: f(op.phone),
    authority: f(op.authority),
    trade: f(op.trade),
    chamber: f(op.chamber),
    gisa: f(op.gisa),
    vatId: f(op.vatId),
  };
}

/** Fields still missing before launch. */
export function missingDetails(op: Operator): (keyof Operator)[] {
  return (['name', 'street', 'city', 'country', 'email', 'authority', 'trade'] as const).filter((k) => !op[k]?.trim());
}

export function legalDocs(appName: string, op: Operator = OPERATOR): LegalDoc[] {
  if (lang() === 'de') return legalDocsDe(appName, op);
  const o = filled(op);
  const who = `${o.name}, ${o.street}, ${o.city}, ${o.country}`;
  return [
    {
      id: 'terms',
      title: 'Terms of use',
      sections: [
        { heading: 'Who we are', paragraphs: [`${appName} is offered by ${who} (“we”). These terms apply to using the ${appName} app.`] },
        {
          heading: 'The app',
          paragraphs: [
            `${appName} helps you plan tasks and rewards you with points (XP), levels, streaks and looks for doing them. The app is free. If a paid Premium subscription is added later, it is bought through the App Store or Google Play under their terms, and we will tell you its price and contents before you buy.`,
          ],
        },
        {
          heading: 'Points and rewards have no money value',
          paragraphs: [
            'XP, levels, wheel tickets, tokens, themes, frames, flames, titles and every other reward in the app are virtual. They cannot be bought, sold, traded, transferred or paid out, and they are not property.',
            'Wheel tickets come only from XP earned in the app, for example by finishing tasks or challenges. They are never sold. The lucky wheel only gives in-app rewards, never money or real prizes, and its odds are shown in the app.',
          ],
        },
        {
          heading: 'Fair play',
          paragraphs: [
            'Please only tick off tasks you have really done. Once accounts and shared features such as leaderboards exist, we may correct or remove rewards gained by cheating or by manipulating the app or its files.',
          ],
        },
        {
          heading: 'Your data and backups',
          paragraphs: [
            `For now ${appName} keeps everything only on your phone. If you delete the app or reset your phone, your progress is gone unless you saved a backup file (Settings → Backup). Keep your backups somewhere safe.`,
          ],
        },
        {
          heading: 'Health',
          paragraphs: ['Tasks and challenges such as sleep or walking goals are motivation, not medical advice. Listen to your body and ask a doctor if you are unsure.'],
        },
        {
          heading: 'Availability and changes',
          paragraphs: [
            'We work to keep the app running well, but we cannot promise it is always available or free of errors. We may change, add or remove features. If we change these terms in a way that matters to you, we will tell you in the app first.',
          ],
        },
        {
          heading: 'Liability',
          paragraphs: [
            'We are fully liable for damage caused intentionally or through gross negligence and for personal injury. Otherwise our liability for slight negligence is excluded as far as the law allows. Your rights as a consumer under Austrian law (such as the Konsumentenschutzgesetz) and the law of your country are not affected.',
          ],
        },
        {
          heading: 'Law',
          paragraphs: ['Austrian law applies, without its conflict-of-law rules. If you are a consumer in the EU, the protective rules of the country you live in still apply to you.'],
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy policy',
      sections: [
        { heading: 'In short', paragraphs: [`${appName} currently stores everything only on your phone. There are no accounts, no servers of ours, no ads and no analytics yet. We cannot see your tasks, your progress or your photo.`] },
        { heading: 'Who is responsible', paragraphs: [`The controller under the GDPR is ${who}. Email: ${o.email}.`] },
        {
          heading: 'What the app keeps on your phone',
          paragraphs: [
            'The name you enter, your tasks and when you did them, your XP, streak, rewards and settings. Optionally a profile picture, which is cropped and stored only on your phone.',
            'If you turn on the daily motivation email, the address you type is saved on your phone only. Nothing is sent yet; before the first email we will ask you to confirm your address.',
            'You can delete all of it at any time by deleting the app.',
          ],
        },
        {
          heading: 'Permissions',
          paragraphs: [
            'Notifications: reminders are scheduled on your phone, only if you allow them.',
            'Photos and camera: only when you choose a profile picture.',
            'Files: only when you save or restore a backup. The backup file contains all the data above, including your photo, and goes wherever you choose to put it. Keep it private.',
          ],
        },
        {
          heading: 'App stores',
          paragraphs: [
            'Apple (App Store) and Google (Google Play) handle the download and, later, any purchases, under their own privacy policies. They may give us anonymous figures such as installs or crash reports. When the app asks for a rating, the store’s own window is used; we never reward ratings.',
          ],
        },
        { heading: 'Age', paragraphs: [`${appName} is meant for people aged 14 and over.`] },
        {
          heading: 'Your rights',
          paragraphs: [
            'You have the right to access, correct and delete your data, to restrict or object to its use, and to data portability. As your data is on your phone, you can see, change and delete it in the app yourself; write to us for anything else.',
            'You can complain to the Austrian Data Protection Authority (Datenschutzbehörde, Barichgasse 40–42, 1030 Wien, dsb.gv.at) or the authority where you live.',
          ],
        },
        {
          heading: 'Changes',
          paragraphs: ['Before accounts, cloud sync, friends, ads, Premium or the photo check are added, we will update this policy and ask for your consent in the app wherever it is needed.'],
        },
      ],
    },
    {
      id: 'imprint',
      title: 'Imprint (Impressum)',
      sections: [
        {
          heading: 'Information under § 5 ECG and § 25 MedienG',
          paragraphs: [
            `Operator and media owner: ${o.name}`,
            `Address: ${o.street}, ${o.city}, ${o.country}`,
            `Email: ${o.email}`,
            ...(op.phone?.trim() ? [`Phone: ${o.phone}`] : []),
            `Business: development and sale of mobile apps (${appName})`,
            `Trade licence: ${o.trade}`,
            ...(op.gisa?.trim() ? [`GISA number: ${o.gisa}`] : []),
            `Trade authority: ${o.authority}`,
            `Member of ${op.chamber?.trim() ? o.chamber : 'the Austrian Chamber of Commerce (WKO)'}`,
            'Rules: Gewerbeordnung (GewO), www.ris.bka.gv.at',
            op.vatId?.trim() ? `VAT number (UID): ${o.vatId}` : 'No VAT number (small business, § 6 Abs. 1 Z 27 UStG)',
          ],
        },
        { heading: 'Purpose', paragraphs: [`Information about and provision of the ${appName} app.`] },
      ],
    },
  ];
}

/** The same texts in German, speaking to the player as "du". */
function legalDocsDe(appName: string, op: Operator): LegalDoc[] {
  const o = filled(
    { ...op, name: op.name.replace('(sole proprietorship)', '(Einzelunternehmen)'), country: op.country === 'Austria' ? 'Österreich' : op.country },
    MISSING_DE,
  );
  const who = `${o.name}, ${o.street}, ${o.city}, ${o.country}`;
  return [
    {
      id: 'terms',
      title: 'Nutzungsbedingungen (AGB)',
      sections: [
        { heading: 'Wer wir sind', paragraphs: [`${appName} wird angeboten von ${who} („wir“). Diese Bedingungen gelten für die Nutzung der App ${appName}.`] },
        {
          heading: 'Die App',
          paragraphs: [
            `${appName} hilft dir, Aufgaben zu planen, und belohnt dich dafür mit Punkten (XP), Levels, Serien und Looks. Die App ist kostenlos. Kommt später ein kostenpflichtiges Premium-Abo dazu, wird es über den App Store oder Google Play zu deren Bedingungen gekauft, und wir nennen dir Preis und Inhalt vor dem Kauf.`,
          ],
        },
        {
          heading: 'Punkte und Belohnungen haben keinen Geldwert',
          paragraphs: [
            'XP, Levels, Glücksrad-Tickets, Tokens, Themes, Rahmen, Flammen, Titel und alle anderen Belohnungen in der App sind virtuell. Sie können nicht gekauft, verkauft, getauscht, übertragen oder ausgezahlt werden und sind kein Eigentum.',
            'Glücksrad-Tickets gibt es nur für XP, die du in der App verdienst, zum Beispiel durch erledigte Aufgaben oder Challenges. Sie werden nie verkauft. Das Glücksrad gibt nur Belohnungen in der App, nie Geld oder echte Preise, und seine Gewinnchancen stehen in der App.',
          ],
        },
        {
          heading: 'Fair Play',
          paragraphs: [
            'Bitte hake nur Aufgaben ab, die du wirklich erledigt hast. Sobald es Konten und gemeinsame Funktionen wie Bestenlisten gibt, können wir Belohnungen korrigieren oder entfernen, die durch Schummeln oder Manipulation der App oder ihrer Dateien entstanden sind.',
          ],
        },
        {
          heading: 'Deine Daten und Backups',
          paragraphs: [
            `Derzeit speichert ${appName} alles nur auf deinem Handy. Löschst du die App oder setzt dein Handy zurück, ist dein Fortschritt weg, außer du hast eine Backup-Datei gespeichert (Einstellungen → Backup). Bewahre deine Backups sicher auf.`,
          ],
        },
        {
          heading: 'Gesundheit',
          paragraphs: ['Aufgaben und Challenges wie Schlaf- oder Geh-Ziele sind Motivation, keine medizinische Beratung. Hör auf deinen Körper und frag im Zweifel eine Ärztin oder einen Arzt.'],
        },
        {
          heading: 'Verfügbarkeit und Änderungen',
          paragraphs: [
            'Wir arbeiten daran, dass die App gut läuft, können aber nicht versprechen, dass sie immer verfügbar oder fehlerfrei ist. Wir können Funktionen ändern, ergänzen oder entfernen. Ändern wir diese Bedingungen in einer Weise, die für dich wichtig ist, sagen wir es dir vorher in der App.',
          ],
        },
        {
          heading: 'Haftung',
          paragraphs: [
            'Für Schäden, die wir vorsätzlich oder grob fahrlässig verursachen, und für Personenschäden haften wir voll. Im Übrigen ist unsere Haftung für leichte Fahrlässigkeit ausgeschlossen, soweit das Gesetz es erlaubt. Deine Rechte als Verbraucherin oder Verbraucher nach österreichischem Recht (etwa dem Konsumentenschutzgesetz) und dem Recht deines Landes bleiben unberührt.',
          ],
        },
        {
          heading: 'Recht',
          paragraphs: ['Es gilt österreichisches Recht ohne seine Verweisungsnormen. Bist du Verbraucherin oder Verbraucher in der EU, gelten für dich weiterhin die Schutzvorschriften des Landes, in dem du lebst.'],
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Datenschutzerklärung',
      sections: [
        { heading: 'Kurz gesagt', paragraphs: [`${appName} speichert derzeit alles nur auf deinem Handy. Es gibt noch keine Konten, keine Server von uns, keine Werbung und keine Analyse-Tools. Wir sehen weder deine Aufgaben noch deinen Fortschritt oder dein Foto.`] },
        { heading: 'Wer verantwortlich ist', paragraphs: [`Verantwortlicher im Sinne der DSGVO ist ${who}. E-Mail: ${o.email}.`] },
        {
          heading: 'Was die App auf deinem Handy speichert',
          paragraphs: [
            'Den Namen, den du eingibst, deine Aufgaben und wann du sie erledigt hast, deine XP, Serie, Belohnungen und Einstellungen. Auf Wunsch ein Profilbild, das zugeschnitten und nur auf deinem Handy gespeichert wird.',
            'Schaltest du die tägliche Motivations-E-Mail ein, wird die eingegebene Adresse nur auf deinem Handy gespeichert. Es wird noch nichts verschickt; vor der ersten E-Mail bitten wir dich, deine Adresse zu bestätigen.',
            'Du kannst all das jederzeit löschen, indem du die App löschst.',
          ],
        },
        {
          heading: 'Berechtigungen',
          paragraphs: [
            'Benachrichtigungen: Erinnerungen werden auf deinem Handy geplant, nur wenn du sie erlaubst.',
            'Fotos und Kamera: nur wenn du ein Profilbild auswählst.',
            'Dateien: nur wenn du ein Backup speicherst oder wiederherstellst. Die Backup-Datei enthält alle oben genannten Daten samt deinem Foto und landet dort, wo du sie ablegst. Halte sie privat.',
          ],
        },
        {
          heading: 'App Stores',
          paragraphs: [
            'Apple (App Store) und Google (Google Play) wickeln den Download und später etwaige Käufe nach ihren eigenen Datenschutzerklärungen ab. Sie können uns anonyme Zahlen wie Installationen oder Absturzberichte geben. Bittet die App um eine Bewertung, wird das Fenster des Stores verwendet; Bewertungen belohnen wir nie.',
          ],
        },
        { heading: 'Alter', paragraphs: [`${appName} ist für Personen ab 14 Jahren gedacht.`] },
        {
          heading: 'Deine Rechte',
          paragraphs: [
            'Du hast das Recht auf Auskunft, Berichtigung und Löschung deiner Daten, auf Einschränkung der Verarbeitung, auf Widerspruch und auf Datenübertragbarkeit. Da deine Daten auf deinem Handy liegen, kannst du sie in der App selbst ansehen, ändern und löschen; für alles andere schreib uns.',
            'Du kannst dich bei der österreichischen Datenschutzbehörde (Barichgasse 40–42, 1030 Wien, dsb.gv.at) oder der Behörde deines Wohnorts beschweren.',
          ],
        },
        {
          heading: 'Änderungen',
          paragraphs: ['Bevor Konten, Cloud-Sync, Freunde, Werbung, Premium oder die Foto-Prüfung dazukommen, aktualisieren wir diese Erklärung und holen deine Einwilligung in der App ein, wo sie nötig ist.'],
        },
      ],
    },
    {
      id: 'imprint',
      title: 'Impressum',
      sections: [
        {
          heading: 'Informationen nach § 5 ECG und § 25 MedienG',
          paragraphs: [
            `Betreiber und Medieninhaber: ${o.name}`,
            `Adresse: ${o.street}, ${o.city}, ${o.country}`,
            `E-Mail: ${o.email}`,
            ...(op.phone?.trim() ? [`Telefon: ${o.phone}`] : []),
            `Unternehmensgegenstand: Entwicklung und Vertrieb mobiler Apps (${appName})`,
            `Gewerbe: ${o.trade}`,
            ...(op.gisa?.trim() ? [`GISA-Zahl: ${o.gisa}`] : []),
            `Gewerbebehörde: ${o.authority}`,
            `Mitglied der ${op.chamber?.trim() ? o.chamber : 'Wirtschaftskammer Österreich (WKO)'}`,
            'Rechtsvorschriften: Gewerbeordnung (GewO), www.ris.bka.gv.at',
            op.vatId?.trim() ? `UID-Nummer: ${o.vatId}` : 'Keine UID-Nummer (Kleinunternehmer, § 6 Abs. 1 Z 27 UStG)',
          ],
        },
        { heading: 'Zweck', paragraphs: [`Information über die App ${appName} und deren Bereitstellung.`] },
      ],
    },
  ];
}
