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
];

/** Same quote all day, a new one each day. */
export function quoteOfTheDay(day: string): { text: string; author: string } {
  const n = day.split('-').reduce((sum, part) => sum * 31 + Number(part), 0);
  const [text, author] = QUOTES[n % QUOTES.length];
  return { text, author };
}
