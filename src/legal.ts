// The legal texts shown under Menu → Legal: terms of use, privacy policy and
// imprint (Impressum). They describe the app as it is now: everything stays
// on the phone, there are no accounts, ads or analytics yet. Before accounts,
// cloud sync, ads, Premium or the photo check go live, these texts must be
// updated first. DRAFT: to be checked (e.g. WKO templates or a lawyer) before
// launch.

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

export type LegalId = 'terms' | 'privacy' | 'imprint';

export interface LegalDoc {
  id: LegalId;
  title: string;
  sections: { heading: string; paragraphs: string[] }[];
}

const MISSING = '[to be added]';

/** The operator's details with every empty field marked. */
export function filled(op: Operator): Required<Operator> {
  const f = (v: string | undefined) => (v && v.trim() ? v.trim() : MISSING);
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
