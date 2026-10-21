import type { IconName } from './icons.ts';
import type { Difficulty } from './game';

// The built-in task library: ready-made tasks people can add with one tap,
// search, or get suggested during setup. Each has a typical duration and
// effort, so XP matches the real time investment.

export interface Category {
  id: string;
  label: string;
  icon: IconName;
}

export interface LibraryTask {
  title: string;
  category: string;
  minutes: number;
  difficulty: Difficulty;
  /** Suggested frequency: 0 = one-time, 7 = every day, 1-6 = times per week. */
  perWeek: number;
  /** Extra search words. */
  tags: string[];
  /** Picked by the team; shown under "Recommended". */
  featured: boolean;
}

export const CATEGORIES: Category[] = [
  { id: 'home', label: 'Home & chores', icon: 'House' },
  { id: 'fitness', label: 'Fitness', icon: 'Dumbbell' },
  { id: 'health', label: 'Health', icon: 'HeartPulse' },
  { id: 'food', label: 'Food & nutrition', icon: 'Salad' },
  { id: 'mind', label: 'Mind & wellbeing', icon: 'Brain' },
  { id: 'sleep', label: 'Sleep & routine', icon: 'Moon' },
  { id: 'work', label: 'Work & focus', icon: 'Briefcase' },
  { id: 'learning', label: 'Learning', icon: 'BookOpen' },
  { id: 'money', label: 'Money', icon: 'Wallet' },
  { id: 'social', label: 'Family & friends', icon: 'Users' },
  { id: 'selfcare', label: 'Self-care', icon: 'Bath' },
  { id: 'digital', label: 'Digital detox', icon: 'Smartphone' },
  { id: 'creative', label: 'Creativity', icon: 'Palette' },
  { id: 'outdoors', label: 'Outdoors & nature', icon: 'TreePine' },
  { id: 'pets', label: 'Pets & plants', icon: 'PawPrint' },
  { id: 'errands', label: 'Errands & admin', icon: 'ClipboardList' },
  { id: 'kindness', label: 'Kindness & community', icon: 'HandHeart' },
];

type Row = [title: string, minutes: number, effort: 'e' | 'm' | 'h', perWeek: number, tags?: string, featured?: 1];

const EFFORT: Record<Row[2], Difficulty> = { e: 'easy', m: 'medium', h: 'hard' };

const ROWS: Record<string, Row[]> = {
  home: [
    ['Do the dishes', 15, 'e', 7, 'wash up kitchen clean', 1],
    ['Load or empty the dishwasher', 10, 'e', 7, 'kitchen'],
    ['Make your bed', 5, 'e', 7, 'bedroom tidy morning', 1],
    ['Vacuum the floors', 30, 'm', 2, 'hoover clean'],
    ['Mop the floors', 30, 'm', 1, 'clean wet'],
    ['Do a load of laundry', 15, 'e', 2, 'washing clothes'],
    ['Fold and put away laundry', 20, 'e', 2, 'clothes washing'],
    ['Iron clothes', 30, 'm', 1, 'shirts'],
    ['Take out the trash', 5, 'e', 3, 'garbage rubbish bin recycling'],
    ['Clean the bathroom', 30, 'm', 1, 'toilet shower sink'],
    ['Clean the kitchen', 30, 'm', 2, 'counters stove'],
    ['Wipe kitchen counters', 5, 'e', 7, 'clean'],
    ['Tidy up for 10 minutes', 10, 'e', 7, 'declutter clean room', 1],
    ['Change the bed sheets', 15, 'e', 1, 'bedding linen'],
    ['Dust the shelves', 15, 'e', 1, 'clean'],
    ['Clean the windows', 45, 'm', 0, 'glass'],
    ['Clean out the fridge', 20, 'm', 0, 'kitchen food'],
    ['Declutter one drawer', 15, 'e', 1, 'organize minimalism'],
    ['Declutter your wardrobe', 60, 'm', 0, 'clothes donate organize'],
    ['Water the garden', 15, 'e', 3, 'plants yard'],
    ['Mow the lawn', 45, 'h', 1, 'garden grass yard'],
    ['Clean the oven', 45, 'h', 0, 'kitchen deep clean'],
    ['Descale the kettle or coffee machine', 10, 'e', 0, 'kitchen'],
    ['Clean the car inside', 30, 'm', 0, 'vacuum'],
    ['Wash the car', 45, 'm', 0, ''],
    ['Fix something broken at home', 45, 'm', 0, 'repair diy'],
    ['Deep clean one room', 90, 'h', 0, 'spring cleaning'],
    ['Sort the mail and papers', 15, 'e', 1, 'documents paperwork'],
  ],
  fitness: [
    ['Walk 5 km', 60, 'm', 3, 'walking steps', 1],
    ['Go for a 10-minute walk', 10, 'e', 7, 'walking steps fresh air'],
    ['Walk 10,000 steps', 90, 'm', 5, 'walking steps'],
    ['Go for a 5 km run', 35, 'h', 3, 'running jog cardio', 1],
    ['Go for a 10 km run', 65, 'h', 1, 'running jog cardio'],
    ['Jog for 20 minutes', 20, 'm', 3, 'running cardio'],
    ['Strength workout', 45, 'h', 3, 'gym weights lifting muscle'],
    ['Go to the gym', 60, 'h', 3, 'workout weights'],
    ['20 push-ups', 5, 'm', 7, 'strength bodyweight'],
    ['Do 50 squats', 5, 'm', 7, 'legs bodyweight'],
    ['Plank for 2 minutes', 5, 'm', 7, 'core abs'],
    ['Home workout', 30, 'h', 3, 'bodyweight hiit'],
    ['HIIT session', 20, 'h', 2, 'cardio interval'],
    ['Yoga session', 30, 'm', 3, 'stretch flexibility'],
    ['Stretch for 10 minutes', 10, 'e', 7, 'flexibility mobility', 1],
    ['Cycle for 30 minutes', 30, 'm', 2, 'bike biking cardio'],
    ['Go swimming', 45, 'h', 1, 'swim pool laps'],
    ['Take the stairs instead of the lift', 5, 'e', 7, 'elevator steps'],
    ['Play a sport', 60, 'h', 1, 'football tennis basketball padel'],
    ['Go hiking', 120, 'h', 0, 'hike mountains nature'],
    ['Dance for 15 minutes', 15, 'm', 2, 'music cardio'],
    ['Climbing or bouldering session', 90, 'h', 1, 'climb'],
    ['Pilates session', 30, 'm', 2, 'core'],
    ['Foam roll and mobility', 15, 'e', 3, 'recovery stretch'],
    ['Skip rope for 10 minutes', 10, 'm', 3, 'jump rope cardio'],
  ],
  health: [
    ['Drink 2 litres of water', 5, 'e', 7, 'hydration hydrate', 1],
    ['Take your vitamins', 5, 'e', 7, 'supplements medication pills'],
    ['Take your medication', 5, 'e', 7, 'pills medicine'],
    ['Floss your teeth', 5, 'e', 7, 'dental teeth'],
    ['Brush teeth twice', 5, 'e', 7, 'dental'],
    ['Book a doctor check-up', 10, 'e', 0, 'appointment health'],
    ['Book a dentist appointment', 10, 'e', 0, 'teeth dental'],
    ['Book an eye test', 10, 'e', 0, 'optician glasses'],
    ['No alcohol today', 5, 'm', 7, 'sober drinking'],
    ['No smoking today', 5, 'h', 7, 'quit cigarettes vape'],
    ['Get 15 minutes of sunlight', 15, 'e', 7, 'vitamin d outside'],
    ['Stand up every hour', 5, 'e', 5, 'sitting posture desk'],
    ['Check your posture', 5, 'e', 7, 'back'],
    ['Do eye exercises', 5, 'e', 5, 'screen eyes'],
    ['Track your weight', 5, 'e', 1, 'scale'],
  ],
  food: [
    ['Cook a healthy meal', 45, 'm', 3, 'cooking dinner', 1],
    ['Eat 5 portions of fruit and veg', 5, 'm', 7, 'vegetables healthy'],
    ['Eat a healthy breakfast', 15, 'e', 7, 'morning'],
    ['Meal prep for the week', 90, 'h', 1, 'cooking batch'],
    ['Plan meals for the week', 20, 'e', 1, 'meal plan'],
    ['Pack lunch for tomorrow', 15, 'e', 5, 'meal prep'],
    ['No sugary drinks today', 5, 'm', 7, 'soda sugar'],
    ['No junk food today', 5, 'm', 7, 'fast food snacks'],
    ['Try a new recipe', 60, 'm', 0, 'cooking'],
    ['Log your meals', 10, 'e', 7, 'calories tracking yazio'],
    ['Hit your protein goal', 5, 'm', 7, 'nutrition macros'],
    ['Stay within your calorie goal', 5, 'm', 7, 'diet yazio'],
    ['Eat without screens', 20, 'e', 5, 'mindful eating'],
    ['Bake bread', 120, 'm', 0, 'baking'],
  ],
  mind: [
    ['Meditate for 10 minutes', 10, 'e', 7, 'mindfulness calm', 1],
    ['Write in your journal', 10, 'e', 7, 'journaling diary reflect', 1],
    ['Write 3 things you are grateful for', 5, 'e', 7, 'gratitude journal'],
    ['Breathing exercise', 5, 'e', 7, 'breathwork calm stress'],
    ['Read for 20 minutes', 20, 'e', 7, 'book reading'],
    ['Take a mindful walk', 20, 'e', 2, 'walking meditation'],
    ['Do a digital-free hour', 60, 'm', 3, 'unplug'],
    ['Write down your worries', 10, 'e', 2, 'anxiety journal'],
    ['Plan tomorrow', 10, 'e', 7, 'planning schedule'],
    ['Weekly review', 30, 'm', 1, 'reflect planning goals'],
    ['Say no to something', 5, 'm', 0, 'boundaries'],
    ['Visualise your goals', 10, 'e', 3, 'vision'],
    ['Do something just for fun', 30, 'e', 2, 'hobby play'],
    ['Therapy or coaching session', 60, 'm', 1, 'mental health counselling'],
  ],
  sleep: [
    ['Go to bed before 11 pm', 5, 'm', 7, 'bedtime early night', 1],
    ['Sleep 8 hours', 5, 'm', 7, 'rest'],
    ['Wake up at the same time', 5, 'm', 7, 'morning routine alarm'],
    ['No phone in bed', 5, 'm', 7, 'screen bedtime'],
    ['Evening wind-down routine', 20, 'e', 7, 'relax bedtime'],
    ['Morning routine', 20, 'e', 7, 'wake up'],
    ['No caffeine after 2 pm', 5, 'm', 7, 'coffee sleep'],
    ['Get up without snoozing', 5, 'm', 7, 'alarm morning'],
    ['Take a 20-minute power nap', 20, 'e', 0, 'rest'],
  ],
  work: [
    ['Deep work block (90 min)', 90, 'h', 5, 'focus concentration', 1],
    ['Focus session (25 min)', 25, 'm', 7, 'pomodoro concentration'],
    ['Clear your email inbox', 30, 'm', 3, 'inbox zero mail'],
    ['Plan your work day', 10, 'e', 5, 'todo priorities'],
    ['Finish your most important task first', 60, 'h', 5, 'priority frog'],
    ['Update your CV', 60, 'm', 0, 'resume career job'],
    ['Apply for a job', 45, 'm', 0, 'career application'],
    ['Network with someone new', 30, 'm', 1, 'linkedin career'],
    ['Tidy your desk', 10, 'e', 1, 'workspace clean'],
    ['Take proper breaks', 5, 'e', 5, 'rest'],
    ['Leave work on time', 5, 'm', 5, 'balance'],
    ['Prepare for a meeting', 20, 'm', 0, 'presentation'],
    ['Work on your side project', 60, 'm', 2, 'business startup hustle'],
    ['Study for an exam', 60, 'h', 5, 'school university revision'],
    ['Do your homework', 45, 'm', 5, 'school study'],
  ],
  learning: [
    ['Practise a language for 15 minutes', 15, 'e', 7, 'duolingo spanish german english', 1],
    ['Read a chapter of a book', 20, 'e', 7, 'reading'],
    ['Watch an educational video', 20, 'e', 3, 'documentary youtube'],
    ['Learn something new for 30 minutes', 30, 'm', 3, 'study'],
    ['Take an online course lesson', 45, 'm', 3, 'udemy coursera class'],
    ['Practise an instrument', 30, 'm', 5, 'music guitar piano'],
    ['Listen to a podcast', 30, 'e', 3, 'audio learning'],
    ['Learn to code for 30 minutes', 30, 'm', 3, 'programming'],
    ['Write a summary of what you learned', 15, 'm', 1, 'notes'],
    ['Finish a book', 60, 'm', 0, 'reading'],
    ['Learn 10 new words', 10, 'e', 7, 'vocabulary language'],
    ['Do a puzzle or brain game', 15, 'e', 3, 'chess sudoku crossword'],
  ],
  money: [
    ['Track your spending', 10, 'e', 7, 'budget expenses finance', 1],
    ['No unnecessary spending today', 5, 'm', 7, 'save money frugal'],
    ['Review your budget', 30, 'm', 1, 'finance money'],
    ['Move money to savings', 5, 'e', 1, 'save invest'],
    ['Cancel an unused subscription', 10, 'e', 0, 'save money'],
    ['Pay your bills', 15, 'e', 0, 'invoices'],
    ['Check your bank accounts', 10, 'e', 1, 'finance'],
    ['Learn about investing', 30, 'm', 1, 'stocks etf finance'],
    ['Sell something you no longer need', 30, 'm', 0, 'declutter marketplace'],
    ['Do your taxes', 120, 'h', 0, 'tax return'],
    ['Cook instead of ordering', 45, 'm', 3, 'save money food'],
  ],
  social: [
    ['Call a family member', 15, 'e', 2, 'parents phone mum dad', 1],
    ['Message a friend', 5, 'e', 3, 'text chat'],
    ['Meet a friend', 120, 'm', 1, 'social catch up'],
    ['Plan a date night', 15, 'e', 1, 'partner relationship'],
    ['Play with your kids', 30, 'e', 7, 'children family'],
    ['Have dinner together without phones', 45, 'e', 3, 'family'],
    ['Write a thank-you note', 10, 'e', 0, 'gratitude'],
    ['Remember a birthday', 5, 'e', 0, 'gift card'],
    ['Visit your grandparents', 120, 'm', 0, 'family'],
    ['Make a new friend', 30, 'h', 0, 'social'],
    ['Host friends at home', 180, 'm', 0, 'party dinner'],
  ],
  selfcare: [
    ['Skincare routine', 10, 'e', 7, 'face skin', 1],
    ['Take a relaxing bath', 30, 'e', 1, 'relax'],
    ['Get a haircut', 45, 'e', 0, 'hairdresser barber'],
    ['Cut your nails', 10, 'e', 1, 'grooming'],
    ['Shower in the morning', 10, 'e', 7, 'hygiene'],
    ['Take a cold shower', 5, 'h', 3, 'cold exposure'],
    ['Wear something that makes you feel good', 5, 'e', 0, 'clothes'],
    ['Do nothing for 10 minutes', 10, 'e', 3, 'rest relax'],
    ['Sauna session', 45, 'e', 1, 'relax spa'],
    ['Massage or spa visit', 60, 'e', 0, 'relax'],
  ],
  digital: [
    ['Max 30 minutes of social media', 5, 'm', 7, 'instagram tiktok screen time', 1],
    ['No phone for the first hour', 5, 'm', 7, 'morning screen'],
    ['Phone-free evening', 5, 'h', 2, 'screen detox'],
    ['Turn off notifications', 10, 'e', 0, 'focus'],
    ['Delete an app you waste time on', 5, 'm', 0, 'screen time'],
    ['Screen time under 2 hours', 5, 'h', 7, 'phone usage'],
    ['Clean up your phone photos', 20, 'e', 0, 'storage organize'],
    ['Unsubscribe from 10 newsletters', 15, 'e', 0, 'email inbox'],
    ['No YouTube or streaming today', 5, 'm', 0, 'netflix tv'],
    ['Back up your files', 15, 'e', 0, 'computer data'],
  ],
  creative: [
    ['Draw or sketch', 20, 'e', 3, 'art drawing'],
    ['Write for 20 minutes', 20, 'm', 3, 'writing story blog'],
    ['Take photos of something beautiful', 20, 'e', 1, 'photography'],
    ['Play music', 30, 'e', 3, 'instrument'],
    ['Paint something', 60, 'm', 1, 'art painting'],
    ['Work on a craft project', 60, 'm', 1, 'knitting diy sewing'],
    ['Cook something creative', 60, 'm', 0, 'recipe'],
    ['Write a poem', 15, 'm', 0, 'writing'],
    ['Make a video', 60, 'm', 0, 'content youtube'],
    ['Build something with your hands', 90, 'm', 0, 'diy woodwork'],
  ],
  outdoors: [
    ['Spend 30 minutes outside', 30, 'e', 7, 'fresh air nature', 1],
    ['Walk in a park or forest', 45, 'e', 2, 'nature trees'],
    ['Watch the sunrise', 20, 'm', 0, 'morning'],
    ['Watch the sunset', 20, 'e', 0, 'evening'],
    ['Have a picnic', 90, 'e', 0, 'outside'],
    ['Go camping', 240, 'h', 0, 'tent nature'],
    ['Visit a new place in your city', 120, 'm', 0, 'explore'],
    ['Go for a swim in a lake', 45, 'm', 0, 'nature'],
    ['Pick up litter on a walk', 20, 'e', 0, 'environment plogging'],
  ],
  pets: [
    ['Walk the dog', 30, 'e', 7, 'pet dog walking', 1],
    ['Feed your pet', 5, 'e', 7, 'cat dog'],
    ['Clean the litter box', 5, 'e', 7, 'cat'],
    ['Play with your pet', 15, 'e', 7, 'cat dog'],
    ['Groom your pet', 20, 'e', 1, 'brush'],
    ['Water your plants', 10, 'e', 2, 'houseplants'],
    ['Repot a plant', 20, 'e', 0, 'houseplants garden'],
    ['Clean the aquarium', 30, 'm', 0, 'fish tank'],
    ['Book a vet appointment', 10, 'e', 0, 'pet health'],
  ],
  errands: [
    ['Do the grocery shopping', 45, 'm', 1, 'groceries supermarket food'],
    ['Write a shopping list', 5, 'e', 1, 'groceries'],
    ['Reply to important messages', 15, 'e', 5, 'email texts'],
    ['Post a letter or parcel', 20, 'e', 0, 'mail post office'],
    ['Return something you bought', 20, 'e', 0, 'refund'],
    ['Renew a document', 30, 'm', 0, 'passport id license'],
    ['Book travel', 30, 'm', 0, 'holiday flights hotel'],
    ['Fill up the car', 15, 'e', 0, 'petrol gas fuel'],
    ['Get the car serviced', 20, 'e', 0, 'mechanic'],
    ['Make a phone call you have been avoiding', 15, 'm', 0, 'procrastination'],
    ['Organise your documents', 45, 'm', 0, 'paperwork filing'],
  ],
  kindness: [
    ['Do a random act of kindness', 10, 'e', 2, 'help good deed', 1],
    ['Compliment someone', 5, 'e', 7, 'kind'],
    ['Volunteer', 120, 'm', 0, 'charity community'],
    ['Donate things you do not use', 30, 'e', 0, 'charity declutter'],
    ['Help a neighbour', 30, 'e', 0, 'community'],
    ['Donate blood', 60, 'm', 0, 'health charity'],
    ['Support a local business', 20, 'e', 0, 'shop local'],
  ],
};

export const LIBRARY: LibraryTask[] = Object.entries(ROWS).flatMap(([category, rows]) =>
  rows.map(([title, minutes, effort, perWeek, tags = '', featured]) => ({
    title,
    category,
    minutes,
    difficulty: EFFORT[effort],
    perWeek,
    tags: tags.split(' ').filter(Boolean),
    featured: featured === 1,
  })),
);

export function categoryOf(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/**
 * Search the library. Titles starting with the query rank first, then
 * words in the title starting with it, then matches anywhere / in tags.
 */
export function searchLibrary(query: string, limit = 50, category?: string): LibraryTask[] {
  const q = query.trim().toLowerCase();
  const pool = category ? LIBRARY.filter((t) => t.category === category) : LIBRARY;
  if (!q) return pool.slice(0, limit);
  const words = q.split(/\s+/);
  const scored: { task: LibraryTask; score: number }[] = [];
  for (const task of pool) {
    const title = task.title.toLowerCase();
    const haystack = `${title} ${task.tags.join(' ')} ${categoryOf(task.category)?.label.toLowerCase() ?? ''}`;
    if (!words.every((w) => haystack.includes(w))) continue;
    let score = 0;
    if (title.startsWith(q)) score += 100;
    else if (title.split(/\s+/).some((w) => w.startsWith(words[0]))) score += 50;
    else if (title.includes(q)) score += 25;
    if (task.featured) score += 5;
    scored.push({ task, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.task);
}

/** Suggestions for the setup screen: featured first, from the chosen areas. */
export function suggestionsFor(categories: string[], perCategory = 6): LibraryTask[] {
  return categories.flatMap((c) => {
    const tasks = LIBRARY.filter((t) => t.category === c && t.perWeek > 0);
    return [...tasks.filter((t) => t.featured), ...tasks.filter((t) => !t.featured)].slice(0, perCategory);
  });
}

export const FEATURED = LIBRARY.filter((t) => t.featured);
