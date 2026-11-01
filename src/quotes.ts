import type { Settings } from './game.ts';
import { lang } from './i18n.ts';
// Short, classic quotes for the daily motivation card (and later the opt-in email).
export const QUOTES: [text: string, author: string][] = [
  ['The secret of getting ahead is getting started.', 'Mark Twain'],
  ['Well begun is half done.', 'Aristotle'],
  ['A journey of a thousand miles begins with a single step.', 'Lao Tzu'],
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant'],
  ['It does not matter how slowly you go as long as you do not stop.', 'Confucius'],
  ['Luck is what happens when preparation meets opportunity.', 'Seneca'],
  ['The best time to plant a tree was 20 years ago. The second best time is now.', 'Proverb'],
  ['Small deeds done are better than great deeds planned.', 'Peter Marshall'],
  ['Action is the foundational key to all success.', 'Pablo Picasso'],
  ['Energy and persistence conquer all things.', 'Benjamin Franklin'],
  ['You miss 100% of the shots you don’t take.', 'Wayne Gretzky'],
  ['He who has a why to live can bear almost any how.', 'Friedrich Nietzsche'],
  ['Do what you can, with what you have, where you are.', 'Theodore Roosevelt'],
  ['Well done is better than well said.', 'Benjamin Franklin'],
  ['Discipline is choosing between what you want now and what you want most.', 'Abraham Lincoln (attributed)'],
  ['The man who moves a mountain begins by carrying away small stones.', 'Confucius'],
  ['Little by little, one travels far.', 'J.R.R. Tolkien'],
  ['First we make our habits, then our habits make us.', 'Proverb'],
  ['Begin, be bold, and venture to be wise.', 'Horace'],
  ['No man is free who is not master of himself.', 'Epictetus'],
  ['Waste no more time arguing what a good man should be. Be one.', 'Marcus Aurelius'],
  ['You have power over your mind, not outside events. Realize this, and you will find strength.', 'Marcus Aurelius'],
  ['Difficulties strengthen the mind, as labor does the body.', 'Seneca'],
  ['Great things are done by a series of small things brought together.', 'Vincent van Gogh'],
  ['Motivation gets you going, but habit gets you there.', 'Zig Ziglar'],
  ['Don’t watch the clock; do what it does. Keep going.', 'Sam Levenson'],
  ['Quality is not an act, it is a habit.', 'Aristotle'],
  ['If you want to go fast, go alone. If you want to go far, go together.', 'Proverb'],
  ['The only way to do great work is to love what you do.', 'Steve Jobs'],
  ['Fall seven times, stand up eight.', 'Japanese proverb'],
  ['Today is the first day of the rest of your life.', 'Proverb'],
  ['It always seems impossible until it’s done.', 'Nelson Mandela (attributed)'],
  ['The future depends on what you do today.', 'Mahatma Gandhi (attributed)'],
  ['What we fear doing most is usually what we most need to do.', 'Tim Ferriss'],
  ['You don’t have to be great to start, but you have to start to be great.', 'Zig Ziglar'],
  ['Success is the sum of small efforts, repeated day in and day out.', 'Robert Collier'],
  ['The harder I work, the luckier I get.', 'Samuel Goldwyn (attributed)'],
  ['Either you run the day or the day runs you.', 'Jim Rohn'],
  ['Don’t count the days, make the days count.', 'Muhammad Ali (attributed)'],
  ['The way to get started is to quit talking and begin doing.', 'Walt Disney (attributed)'],
  ['Courage is grace under pressure.', 'Ernest Hemingway'],
  ['How we spend our days is, of course, how we spend our lives.', 'Annie Dillard'],
  ['Nothing will work unless you do.', 'Maya Angelou'],
  ['Simplicity is the ultimate sophistication.', 'Proverb'],
  ['The impediment to action advances action. What stands in the way becomes the way.', 'Marcus Aurelius'],
  ['We suffer more often in imagination than in reality.', 'Seneca'],
  ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus'],
  ['Knowing is not enough; we must apply. Willing is not enough; we must do.', 'Johann Wolfgang von Goethe'],
  ['Whatever you are, be a good one.', 'Abraham Lincoln (attributed)'],
  ['The journey is the reward.', 'Proverb'],
  ['Done is better than perfect.', 'Proverb'],
  ['A year from now you may wish you had started today.', 'Karen Lamb'],
  ['Perseverance is not a long race; it is many short races one after another.', 'Walter Elliot'],
  ['The best way out is always through.', 'Robert Frost'],
  ['Start where you are. Use what you have. Do what you can.', 'Arthur Ashe'],
  ['Habits change into character.', 'Ovid'],
  ['Dripping water hollows out stone, not through force but through persistence.', 'Ovid'],
  ['He who conquers himself is the mightiest warrior.', 'Confucius'],
  ['Act as if what you do makes a difference. It does.', 'William James'],
  ['Opportunities multiply as they are seized.', 'Sun Tzu'],
  ['Every day is a new beginning.', 'Proverb'],
];

// The German list: German originals where there are any, sayings, and quotes
// in their usual German wording.
export const QUOTES_DE: [text: string, author: string][] = [
  ['Es gibt nichts Gutes, außer: Man tut es.', 'Erich Kästner'],
  ['Es ist nicht genug zu wissen, man muss auch anwenden; es ist nicht genug zu wollen, man muss auch tun.', 'Johann Wolfgang von Goethe'],
  ['Der Worte sind genug gewechselt, lasst mich auch endlich Taten sehn!', 'Johann Wolfgang von Goethe'],
  ['Auch aus Steinen, die einem in den Weg gelegt werden, kann man Schönes bauen.', 'Johann Wolfgang von Goethe (zugeschrieben)'],
  ['Wer will, findet Wege. Wer nicht will, findet Gründe.', 'Sprichwort'],
  ['Aller Anfang ist schwer.', 'Sprichwort'],
  ['Übung macht den Meister.', 'Sprichwort'],
  ['Steter Tropfen höhlt den Stein.', 'Sprichwort'],
  ['Was du heute kannst besorgen, das verschiebe nicht auf morgen.', 'Sprichwort'],
  ['Auch der längste Weg beginnt mit dem ersten Schritt.', 'Laotse'],
  ['Wer kämpft, kann verlieren. Wer nicht kämpft, hat schon verloren.', 'Bertolt Brecht (zugeschrieben)'],
  ['Wer ein Warum zum Leben hat, erträgt fast jedes Wie.', 'Friedrich Nietzsche'],
  ['Und jedem Anfang wohnt ein Zauber inne.', 'Hermann Hesse'],
  ['Damit das Mögliche entsteht, muss immer wieder das Unmögliche versucht werden.', 'Hermann Hesse'],
  ['Glück ist, wenn Vorbereitung auf Gelegenheit trifft.', 'Seneca'],
  ['Nicht weil es schwer ist, wagen wir es nicht, sondern weil wir es nicht wagen, ist es schwer.', 'Seneca'],
  ['Es ist nicht wenig Zeit, die wir haben, sondern es ist viel Zeit, die wir nicht nutzen.', 'Seneca'],
  ['Gut begonnen ist halb gewonnen.', 'Sprichwort'],
  ['Wer rastet, der rostet.', 'Sprichwort'],
  ['Morgenstund hat Gold im Mund.', 'Sprichwort'],
  ['Ohne Fleiß kein Preis.', 'Sprichwort'],
  ['Kleinvieh macht auch Mist.', 'Sprichwort'],
  ['Rom wurde nicht an einem Tag erbaut.', 'Sprichwort'],
  ['In der Ruhe liegt die Kraft.', 'Sprichwort'],
  ['Wo ein Wille ist, ist auch ein Weg.', 'Sprichwort'],
  ['Fantasie ist wichtiger als Wissen, denn Wissen ist begrenzt.', 'Albert Einstein'],
  ['Das Leben ist wie Fahrradfahren. Um die Balance zu halten, musst du in Bewegung bleiben.', 'Albert Einstein'],
  ['Ich habe keine besondere Begabung, sondern bin nur leidenschaftlich neugierig.', 'Albert Einstein'],
  ['Es ist egal, wie langsam du gehst, solange du nicht stehen bleibst.', 'Konfuzius'],
  ['Wer einen Berg versetzen will, beginnt damit, kleine Steine wegzutragen.', 'Konfuzius'],
  ['Wir sind, was wir wiederholt tun. Vortrefflichkeit ist daher keine Handlung, sondern eine Gewohnheit.', 'Will Durant'],
  ['Erst formen wir unsere Gewohnheiten, dann formen sie uns.', 'Sprichwort'],
  ['Der beste Zeitpunkt, einen Baum zu pflanzen, war vor zwanzig Jahren. Der nächstbeste ist jetzt.', 'Sprichwort'],
  ['Tu, was du kannst, mit dem, was du hast, wo du bist.', 'Theodore Roosevelt'],
  ['Gut gemacht ist besser als gut gesagt.', 'Benjamin Franklin'],
  ['Verschwende keine Zeit mehr damit, darüber zu reden, was ein guter Mensch ist. Sei einer.', 'Mark Aurel'],
  ['Das Glück deines Lebens hängt von der Beschaffenheit deiner Gedanken ab.', 'Mark Aurel'],
  ['Schwierigkeiten stärken den Geist wie die Arbeit den Körper.', 'Seneca'],
  ['Große Dinge entstehen aus einer Reihe kleiner Dinge, die zusammenkommen.', 'Vincent van Gogh'],
  ['Motivation bringt dich in Gang. Gewohnheit bringt dich ans Ziel.', 'Zig Ziglar'],
  ['Schau nicht auf die Uhr. Tu, was sie tut: Mach weiter.', 'Sam Levenson'],
  ['Mut steht am Anfang des Handelns, Glück am Ende.', 'Demokrit'],
  ['Wer aufhört, besser zu werden, hat aufgehört, gut zu sein.', 'Philip Rosenthal'],
  ['Man reist nicht, um anzukommen, sondern um zu reisen.', 'Johann Wolfgang von Goethe'],
  ['Ein Ziel ohne Plan ist nur ein Wunsch.', 'Antoine de Saint-Exupéry (zugeschrieben)'],
  ['Wer nichts verändern will, wird auch das verlieren, was er bewahren möchte.', 'Gustav Heinemann'],
  ['Fange nie an aufzuhören, höre nie auf anzufangen.', 'Cicero (zugeschrieben)'],
  ['Disziplin ist die Brücke zwischen Zielen und Erfolg.', 'Jim Rohn'],
  ['Erfolg ist die Summe kleiner Anstrengungen, die man Tag für Tag wiederholt.', 'Robert Collier'],
  ['Handle so, als wäre es unmöglich zu scheitern.', 'Dorothea Brande'],
  ['Wer immer strebend sich bemüht, den können wir erlösen.', 'Johann Wolfgang von Goethe'],
  ['Hoffnung ist nicht die Überzeugung, dass etwas gut ausgeht, sondern die Gewissheit, dass etwas Sinn hat, egal wie es ausgeht.', 'Václav Havel'],
  ['Tu erst das Notwendige, dann das Mögliche, und plötzlich schaffst du das Unmögliche.', 'Franz von Assisi (zugeschrieben)'],
  ['Am Ende wird alles gut. Wenn es nicht gut ist, ist es noch nicht das Ende.', 'Oscar Wilde (zugeschrieben)'],
  ['Wer nicht wagt, der nicht gewinnt.', 'Sprichwort'],
  ['Viele kleine Leute an vielen kleinen Orten, die viele kleine Schritte tun, können das Gesicht der Welt verändern.', 'Afrikanisches Sprichwort'],
  ['Das Geheimnis des Vorwärtskommens besteht darin, den ersten Schritt zu tun.', 'Mark Twain'],
  ['Habe Mut, dich deines eigenen Verstandes zu bedienen!', 'Immanuel Kant'],
  ['Wir können den Wind nicht ändern, aber wir können die Segel anders setzen.', 'Aristoteles (zugeschrieben)'],
  ['Geduld ist bitter, aber ihre Frucht ist süß.', 'Jean-Jacques Rousseau'],
  ['Was mich nicht umbringt, macht mich stärker.', 'Friedrich Nietzsche'],
];

/**
 * Same quote all day, a new one every day, from the list in the app's language. Steps through the list 7 at a
 * time (7 shares no factor with the list length), so every quote comes up
 * once before any repeats and neighbours in the list aren't shown back to back.
 */
export function quoteOfTheDay(day: string): { text: string; author: string } {
  const [y, m, d] = day.split('-').map(Number);
  const dayNumber = Math.round(Date.UTC(y, m - 1, d) / 86400000);
  const quotes = lang() === 'de' ? QUOTES_DE : QUOTES;
  const [text, author] = quotes[(dayNumber * 7) % quotes.length];
  return { text, author };
}

/**
 * Whether the quote of the day greets the player as they open the app: once a
 * day, on the first open, unless they turned it off in Settings.
 */
export function quoteDue(settings: Pick<Settings, 'quoteDay' | 'quoteStart'>, today: string): boolean {
  return settings.quoteStart !== false && settings.quoteDay !== today;
}
