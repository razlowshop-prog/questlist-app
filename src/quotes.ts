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

/**
 * Same quote all day, a new one every day. Steps through the list 7 at a
 * time (7 shares no factor with the list length), so every quote comes up
 * once before any repeats and neighbours in the list aren't shown back to back.
 */
export function quoteOfTheDay(day: string): { text: string; author: string } {
  const [y, m, d] = day.split('-').map(Number);
  const dayNumber = Math.round(Date.UTC(y, m - 1, d) / 86400000);
  const [text, author] = QUOTES[(dayNumber * 7) % QUOTES.length];
  return { text, author };
}
