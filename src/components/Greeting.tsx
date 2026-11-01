import { Text } from 'react-native';
import { t } from '../i18n';
import { FONTS, headingCase, themed, useStyles } from '../theme';

/** "morning" for "Good morning"; German "Morgen", "Tag" and "Abend" follow "Guten". */
function partOfDay(hour: number): string {
  if (hour < 5) return t('evening');
  if (hour < 12) return t('morning');
  if (hour < 18) return t('afternoon');
  return t('evening');
}

/**
 * The top of Today: just the greeting (picked 2026-10-31). The quote of the
 * day greets the player as the app opens instead (QuoteSplash), and the streak
 * and tasks done are shown right below in the streak card and the list.
 */
export function Greeting({ name }: { name: string }) {
  const s = useStyles(makeStyles);
  return (
    <Text style={s.greeting} accessibilityRole="header">
      {t('Good')} <Text style={s.greetingEm}>{partOfDay(new Date().getHours())}</Text>, {name}.
    </Text>
  );
}

const makeStyles = themed((c) => ({
  greeting: { fontFamily: FONTS.serif, color: c.text, fontSize: 26, lineHeight: 32, ...headingCase(c) },
  greetingEm: c.italicAccent ? { fontFamily: FONTS.serifItalic, color: c.accent } : { fontFamily: FONTS.serif, color: c.text },
}));
