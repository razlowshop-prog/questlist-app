import { libraryEffort } from './effort.ts';
import type { IconName } from './icons.ts';
import { DEFAULT_AMOUNTS, measuredMinutes, measuredSteps, parseMeasured, type Measure } from './measure.ts';

// The built-in task library: ready-made tasks people can add with one tap,
// search, or get suggested during setup. Each has a typical duration, so XP
// matches the real time investment.

export interface Category {
  id: string;
  label: string;
  icon: IconName;
}

export interface LibraryTask {
  /** Stable id, made from the English title when the task was added; kept if the title ever changes. */
  id: string;
  title: string;
  category: string;
  minutes: number;
  /** Suggested frequency: 0 = one-time, 7 = every day, 1-6 = times per week. */
  perWeek: number;
  /** Extra search words. */
  tags: string[];
  /** Picked by the team; shown under "Recommended". */
  featured: boolean;
  /** Steps on the way for long tasks, the last one finishing the task (see steps.ts). */
  steps?: string[];
  /** Whether the focus timer is offered for it (see `focusFits`). */
  focus: boolean;
  /** Walk, Run or Steps: sized by the player (measure.ts). */
  measure?: Measure;
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

/** [title, minutes, perWeek, search words, flags]: `*` recommended, `F` focus timer on, `x` focus timer off (see `focusFits`). */
type Row = [title: string, minutes: number, perWeek: number, tags?: string, flags?: string];

// Each category runs from the most common tasks down to the more niche ones.
// No task may simply contain another one; where two overlap, COVERS below
// says which one counts.
const ROWS: Record<string, Row[]> = {
  home: [
    ['Make your bed', 5, 7, 'bedroom tidy morning', '*'],
    ['Do the dishes', 15, 7, 'wash up kitchen clean', '*'],
    ['Load or empty the dishwasher', 10, 7, 'kitchen'],
    ['Take out the trash', 5, 3, 'garbage rubbish bin recycling'],
    ['Wipe kitchen counters', 5, 7, 'clean'],
    ['Tidy up for 10 minutes', 10, 7, 'declutter clean room', '*F'],
    ['Do a load of laundry', 15, 2, 'washing clothes machine'],
    ['Hang the laundry to dry', 10, 2, 'washing clothes'],
    ['Fold and put away laundry', 20, 2, 'clothes washing'],
    ['Vacuum the floors', 30, 2, 'hoover clean'],
    ['Clean the bathroom', 30, 1, 'toilet shower sink'],
    ['Clean the toilet', 10, 2, 'bathroom'],
    ['Clean the kitchen', 30, 2, 'counters stove'],
    ['Clean the stovetop', 10, 1, 'kitchen hob cooker'],
    ['Change the bed sheets', 15, 1, 'bedding linen'],
    ['Mop the floors', 30, 1, 'clean wet'],
    ['Dust the shelves', 15, 1, 'clean'],
    ['Iron clothes', 30, 1, 'shirts'],
    ['Water the garden', 15, 3, 'plants yard'],
    ['Sort the mail and papers', 15, 1, 'documents paperwork', 'F'],
    ['Declutter one drawer', 15, 1, 'organize minimalism', 'F'],
    ['Clean out the fridge', 20, 0, 'kitchen food'],
    ['Clean the microwave', 10, 0, 'kitchen'],
    ['Mow the lawn', 45, 1, 'garden grass yard'],
    ['Weed the garden', 30, 1, 'yard plants'],
    ['Clean the windows', 45, 0, 'glass'],
    ['Clean the oven', 45, 0, 'kitchen deep clean'],
    ['Descale the kettle or coffee machine', 10, 0, 'kitchen'],
    ['Defrost the freezer', 30, 0, 'kitchen ice'],
    ['Clean the car inside', 30, 0, 'vacuum'],
    ['Wash the car', 45, 0, ''],
    ['Declutter your wardrobe', 60, 0, 'clothes donate organize', 'F'],
    ['Fix something broken at home', 45, 0, 'repair diy'],
    ['Deep clean one room', 90, 0, 'spring cleaning'],
    ['Rake the leaves', 30, 0, 'garden autumn fall yard'],
    ['Shovel snow', 30, 0, 'winter driveway'],
    ['Test the smoke alarm', 5, 0, 'safety fire battery'],
    ['Clean the gutters', 60, 0, 'roof rain'],
    ['Tidy the cellar or garage', 120, 0, 'basement storage declutter', 'F'],
  ],
  fitness: [
    ['Walk', 30, 5, 'walking stroll steps km distance', '*'],
    ['Run', 30, 3, 'running jog jogging cardio km distance', '*'],
    ['Steps', 40, 7, 'walking step count pedometer 10000'],
    ['Stretch for 10 minutes', 10, 7, 'flexibility mobility', '*'],
    ['Strength workout', 45, 3, 'weights lifting muscle'],
    ['Go to the gym', 60, 3, 'workout weights'],
    ['Home workout', 30, 3, 'bodyweight'],
    ['20 push-ups', 5, 7, 'strength bodyweight'],
    ['Do 50 squats', 5, 7, 'legs bodyweight'],
    ['Plank for 2 minutes', 5, 7, 'core abs'],
    ['Do 30 crunches', 5, 5, 'core abs sit-ups'],
    ['Yoga session', 30, 3, 'stretch flexibility'],
    ['Cycle for 30 minutes', 30, 2, 'bike biking cardio'],
    ['Take the stairs instead of the lift', 5, 7, 'elevator steps'],
    ['HIIT session', 20, 2, 'cardio interval'],
    ['Go swimming', 45, 1, 'swim pool laps'],
    ['Play a sport', 60, 1, 'football tennis basketball padel'],
    ['Dance for 15 minutes', 15, 2, 'music cardio'],
    ['Pilates session', 30, 2, 'core'],
    ['Foam roll and mobility', 15, 3, 'recovery stretch'],
    ['Skip rope for 10 minutes', 10, 3, 'jump rope cardio'],
    ['Do 10 pull-ups', 5, 3, 'strength back bar'],
    ['Rowing machine session', 20, 2, 'row cardio erg'],
    ['Balance training', 10, 3, 'one leg stability'],
    ['Martial arts class', 60, 1, 'karate judo boxing kickboxing'],
    ['Climbing or bouldering session', 90, 1, 'climb'],
    ['Go hiking', 120, 0, 'hike mountains nature'],
    ['Go ice skating', 60, 0, 'winter skate'],
    ['Go skiing', 240, 0, 'ski snowboard winter'],
  ],
  health: [
    ['Drink 2 litres of water', 5, 7, 'hydration hydrate', '*'],
    ['Brush teeth twice', 5, 7, 'dental'],
    ['Take your vitamins', 5, 7, 'supplements pills'],
    ['Take your medication', 5, 7, 'pills medicine'],
    ['Floss your teeth', 5, 7, 'dental teeth'],
    ['Get 15 minutes of sunlight', 15, 7, 'vitamin d outside'],
    ['Put on sunscreen', 5, 7, 'sun skin spf'],
    ['No alcohol today', 5, 7, 'sober drinking'],
    ['No smoking today', 5, 7, 'quit cigarettes vape'],
    ['Stand up every hour', 5, 5, 'sitting posture desk'],
    ['Check your posture', 5, 7, 'back'],
    ['Track your weight', 5, 1, 'scale'],
    ['Do eye exercises', 5, 5, 'screen eyes'],
    ['Check your blood pressure', 5, 1, 'heart'],
    ['Book a doctor check-up', 10, 0, 'appointment health'],
    ['Book a dentist appointment', 10, 0, 'teeth dental'],
    ['Book an eye test', 10, 0, 'optician glasses'],
    ['Check your skin for new moles', 10, 0, 'skin check'],
    ['Get a vaccination', 30, 0, 'flu shot jab vaccine'],
  ],
  food: [
    ['Cook a healthy meal', 45, 3, 'cooking dinner', '*'],
    ['Eat a healthy breakfast', 15, 7, 'morning'],
    ['Eat 5 portions of fruit and veg', 5, 7, 'vegetables healthy'],
    ['Pack lunch for tomorrow', 15, 5, 'meal prep'],
    ['No sugary drinks today', 5, 7, 'soda sugar'],
    ['No junk food today', 5, 7, 'fast food snacks'],
    ['No snacking after dinner', 5, 7, 'evening snacks'],
    ['Plan meals for the week', 20, 1, 'meal plan', 'F'],
    ['Meal prep for the week', 90, 1, 'cooking batch'],
    ['Log your meals', 10, 7, 'calories tracking yazio'],
    ['Hit your protein goal', 5, 7, 'nutrition macros'],
    ['Stay within your calorie goal', 5, 7, 'diet yazio'],
    ['Eat without screens', 20, 5, 'mindful eating'],
    ['Eat meat-free today', 5, 2, 'vegetarian vegan plant'],
    ['Make a smoothie', 10, 3, 'fruit blender'],
    ['Keep to your eating window', 5, 7, 'intermittent fasting'],
    ['Try a new recipe', 60, 0, 'cooking'],
    ['Bake bread', 120, 0, 'baking'],
    ['Make something fermented', 30, 0, 'kimchi sauerkraut yoghurt kombucha'],
  ],
  mind: [
    ['Meditate for 10 minutes', 10, 7, 'mindfulness calm', '*'],
    ['Write in your journal', 10, 7, 'journaling diary reflect', '*'],
    ['Write 3 things you are grateful for', 5, 7, 'gratitude journal'],
    ['Breathing exercise', 5, 7, 'breathwork calm stress'],
    ['Read for 20 minutes', 20, 7, 'book reading'],
    ['Plan tomorrow', 10, 7, 'planning schedule'],
    ['Take a mindful walk', 20, 2, 'walking meditation', 'x'],
    ['Write down your worries', 10, 2, 'anxiety journal'],
    ['Do a digital-free hour', 60, 3, 'unplug', 'x'],
    ['Weekly review', 30, 1, 'reflect planning goals'],
    ['Visualise your goals', 10, 3, 'vision'],
    ['Do something just for fun', 30, 2, 'hobby play', 'x'],
    ['Celebrate a small win', 5, 2, 'proud reward', 'x'],
    ['Say no to something', 5, 0, 'boundaries', 'x'],
    ['Therapy or coaching session', 60, 1, 'mental health counselling', 'x'],
    ['Try a new hobby', 60, 0, 'new skill fun', 'x'],
    ['Write a letter to your future self', 20, 0, 'reflect goals'],
  ],
  sleep: [
    ['Go to bed before 11 pm', 5, 7, 'bedtime early night', '*'],
    ['Sleep 8 hours', 5, 7, 'rest'],
    ['Wake up at the same time', 5, 7, 'morning routine alarm'],
    ['No phone in bed', 5, 7, 'screen bedtime'],
    ['Get up without snoozing', 5, 7, 'alarm morning'],
    ['Evening wind-down routine', 20, 7, 'relax bedtime'],
    ['Morning routine', 20, 7, 'wake up'],
    ['No caffeine after 2 pm', 5, 7, 'coffee sleep'],
    ['Air out the bedroom', 5, 7, 'fresh air window'],
    ['Lay out your clothes for tomorrow', 5, 5, 'outfit evening'],
    ['Dim the lights after 9 pm', 5, 7, 'evening melatonin'],
    ['Keep a sleep diary', 5, 7, 'track sleep'],
    ['Take a 20-minute power nap', 20, 0, 'rest'],
  ],
  work: [
    ['Plan your work day', 10, 5, 'todo priorities'],
    ['Deep work block (90 min)', 90, 5, 'focus concentration', '*'],
    ['Focus session (25 min)', 25, 7, 'pomodoro concentration'],
    ['Clear your email inbox', 30, 3, 'inbox zero mail'],
    ['Finish your most important task first', 60, 5, 'priority frog'],
    ['Tidy your desk', 10, 1, 'workspace clean', 'x'],
    ['Take proper breaks', 5, 5, 'rest', 'x'],
    ['Leave work on time', 5, 5, 'balance', 'x'],
    ['Prepare for a meeting', 20, 0, 'presentation'],
    ['Work on your side project', 60, 2, 'business startup hustle'],
    ['Study for an exam', 60, 5, 'school university revision'],
    ['Do your homework', 45, 5, 'school study'],
    ['Read an article in your field', 15, 3, 'industry news career'],
    ['Network with someone new', 30, 1, 'linkedin career', 'x'],
    ['Ask for feedback', 10, 0, 'review manager career', 'x'],
    ['Practise a presentation', 30, 0, 'talk speech'],
    ['Update your CV', 60, 0, 'resume career job'],
    ['Update your LinkedIn profile', 30, 0, 'career profile'],
    ['Apply for a job', 45, 0, 'career application'],
    ['Prepare for a job interview', 60, 0, 'career interview'],
  ],
  learning: [
    ['Practise a language for 15 minutes', 15, 7, 'duolingo spanish german english', '*'],
    ['Read a chapter of a book', 20, 7, 'reading'],
    ['Learn 10 new words', 10, 7, 'vocabulary language'],
    ['Listen to a podcast', 30, 3, 'audio learning', 'x'],
    ['Watch an educational video', 20, 3, 'documentary youtube'],
    ['Learn something new for 30 minutes', 30, 3, 'study'],
    ['Take an online course lesson', 45, 3, 'udemy coursera class'],
    ['Practise an instrument', 30, 5, 'music guitar piano'],
    ['Learn to code for 30 minutes', 30, 3, 'programming'],
    ['Do a puzzle or brain game', 15, 3, 'chess sudoku crossword'],
    ['Write a summary of what you learned', 15, 1, 'notes'],
    ['Learn to touch type', 15, 3, 'typing keyboard'],
    ['Learn sign language', 15, 3, 'signing deaf'],
    ['Memorise a poem', 20, 0, 'memory'],
    ['Finish a book', 60, 0, 'reading'],
    ['Visit a museum', 120, 0, 'art history exhibition', 'x'],
    ['Go to a workshop or class', 120, 0, 'course evening class', 'x'],
  ],
  money: [
    ['Track your spending', 10, 7, 'budget expenses finance', '*F'],
    ['No unnecessary spending today', 5, 7, 'save money frugal'],
    ['Check your bank accounts', 10, 1, 'finance'],
    ['Review your budget', 30, 1, 'finance money', 'F'],
    ['Move money to savings', 5, 1, 'save invest'],
    ['Bring your own coffee', 5, 5, 'save money cafe'],
    ['Pay your bills', 15, 0, 'invoices', 'F'],
    ['Cancel an unused subscription', 10, 0, 'save money'],
    ['Cook instead of ordering', 45, 3, 'save money food takeaway'],
    ['Learn about investing', 30, 1, 'stocks etf finance', 'F'],
    ['Set a savings goal', 15, 0, 'save plan', 'F'],
    ['Compare prices for a big purchase', 20, 0, 'shopping deal', 'F'],
    ['Sell something you no longer need', 30, 0, 'declutter marketplace'],
    ['Switch to a cheaper contract', 30, 0, 'energy phone internet tariff', 'F'],
    ['Review your insurance', 30, 0, 'policy cover', 'F'],
    ['Check your pension', 20, 0, 'retirement', 'F'],
    ['Do your taxes', 120, 0, 'tax return', 'F'],
  ],
  social: [
    ['Call a family member', 15, 2, 'parents phone mum dad', '*'],
    ['Message a friend', 5, 3, 'text chat'],
    ['Play with your kids', 30, 7, 'children family'],
    ['Read a bedtime story', 15, 7, 'kids children family'],
    ['Meet a friend', 120, 1, 'social catch up'],
    ['Have dinner together without phones', 45, 3, 'family'],
    ['Plan a date night', 15, 1, 'partner relationship'],
    ['Help your kids with homework', 30, 5, 'children school'],
    ['Have a family game night', 60, 1, 'board games'],
    ['Ask someone how they are really doing', 10, 2, 'check in friend'],
    ['Write a thank-you note', 10, 0, 'gratitude'],
    ['Remember a birthday', 5, 0, 'gift card'],
    ['Reconnect with an old friend', 20, 0, 'call message'],
    ['Visit your grandparents', 120, 0, 'family'],
    ['Make a new friend', 30, 0, 'social'],
    ['Join a club or group', 60, 0, 'community hobby'],
    ['Host friends at home', 180, 0, 'party dinner'],
  ],
  selfcare: [
    ['Skincare routine', 10, 7, 'face skin', '*'],
    ['Shower in the morning', 10, 7, 'hygiene'],
    ['Take a relaxing bath', 30, 1, 'relax'],
    ['Cut your nails', 10, 1, 'grooming'],
    ['Take a cold shower', 5, 3, 'cold exposure'],
    ['Do nothing for 10 minutes', 10, 3, 'rest relax'],
    ['Put on a face mask', 15, 1, 'skin skincare'],
    ['Wear something that makes you feel good', 5, 0, 'clothes'],
    ['Get a haircut', 45, 0, 'hairdresser barber'],
    ['Sauna session', 45, 1, 'relax spa'],
    ['Listen to a whole album', 45, 0, 'music relax'],
    ['Massage or spa visit', 60, 0, 'relax'],
    ['Take yourself out', 90, 0, 'solo date cafe cinema'],
  ],
  digital: [
    ['Max 30 minutes of social media', 5, 7, 'instagram tiktok screen time', '*'],
    ['No phone for the first hour', 5, 7, 'morning screen'],
    ['Screen time under 2 hours', 5, 7, 'phone usage'],
    ['No social media today', 5, 2, 'instagram tiktok detox'],
    ['Phone-free evening', 5, 2, 'screen detox'],
    ['No YouTube or streaming today', 5, 0, 'netflix tv'],
    ['Turn off notifications', 10, 0, 'focus'],
    ['Set app time limits', 10, 0, 'screen time'],
    ['Delete an app you waste time on', 5, 0, 'screen time'],
    ['Clean up your phone photos', 20, 0, 'storage organize'],
    ['Unsubscribe from 10 newsletters', 15, 0, 'email inbox'],
    ['Tidy your computer files', 20, 0, 'desktop folders organize'],
    ['Back up your files', 15, 0, 'computer data'],
    ['Change a weak password', 15, 0, 'security account'],
    ['Use your phone in grayscale', 5, 0, 'greyscale black and white'],
  ],
  creative: [
    ['Draw or sketch', 20, 3, 'art drawing'],
    ['Write for 20 minutes', 20, 3, 'writing story blog'],
    ['Play music', 30, 3, 'instrument'],
    ['Take photos of something beautiful', 20, 1, 'photography', 'x'],
    ['Colour in a colouring book', 20, 2, 'coloring art relax'],
    ['Sing for 15 minutes', 15, 2, 'singing voice'],
    ['Paint something', 60, 1, 'art painting'],
    ['Work on a craft project', 60, 1, 'knitting diy sewing crochet'],
    ['Edit your photos', 30, 0, 'photography'],
    ['Write a poem', 15, 0, 'writing'],
    ['Write a short story', 60, 0, 'writing fiction'],
    ['Make a mood board', 30, 0, 'collage inspiration'],
    ['Try calligraphy', 20, 0, 'lettering handwriting'],
    ['Cook something creative', 60, 0, 'recipe', 'x'],
    ['Make a video', 60, 0, 'content youtube'],
    ['Build something with your hands', 90, 0, 'diy woodwork', 'x'],
  ],
  outdoors: [
    ['Spend 30 minutes outside', 30, 7, 'fresh air nature', '*'],
    ['Eat lunch outside', 20, 3, 'fresh air park'],
    ['Walk in a park or forest', 45, 2, 'nature trees'],
    ['Watch the sunset', 20, 0, 'evening'],
    ['Watch the sunrise', 20, 0, 'morning'],
    ['Pick up litter on a walk', 20, 0, 'environment plogging'],
    ['Go stargazing', 30, 0, 'stars night sky'],
    ['Go birdwatching', 45, 0, 'birds nature'],
    ['Have a picnic', 90, 0, 'outside'],
    ['Visit a new place in your city', 120, 0, 'explore'],
    ['Go for a swim in a lake', 45, 0, 'nature'],
    ['Go fishing', 120, 0, 'lake river'],
    ['Go foraging', 60, 0, 'mushrooms berries'],
    ['Go camping', 240, 0, 'tent nature'],
  ],
  pets: [
    ['Feed your pet', 5, 7, 'cat dog'],
    ['Walk the dog', 30, 7, 'pet dog walking', '*'],
    ['Play with your pet', 15, 7, 'cat dog'],
    ['Clean the litter box', 5, 7, 'cat'],
    ['Water your plants', 10, 2, 'houseplants'],
    ['Train your dog for 10 minutes', 10, 5, 'tricks obedience puppy'],
    ['Give your pet its medication', 5, 7, 'vet pills'],
    ['Clean the pet bowls', 5, 3, 'food water'],
    ['Groom your pet', 20, 1, 'brush'],
    ["Brush your pet's teeth", 5, 3, 'dental dog cat'],
    ['Clean the cage', 20, 1, 'rabbit hamster bird guinea pig'],
    ['Wash the pet bed', 15, 0, 'blanket'],
    ['Book a vet appointment', 10, 0, 'pet health'],
    ['Repot a plant', 20, 0, 'houseplants garden'],
    ['Fertilise your plants', 10, 0, 'houseplants feed'],
    ['Plant herbs on the windowsill', 20, 0, 'basil garden grow'],
    ['Clean the aquarium', 30, 0, 'fish tank'],
  ],
  errands: [
    ['Do the grocery shopping', 45, 1, 'groceries supermarket food'],
    ['Write a shopping list', 5, 1, 'groceries'],
    ['Reply to important messages', 15, 5, 'email texts'],
    ['Make a phone call you have been avoiding', 15, 0, 'procrastination'],
    ['Post a letter or parcel', 20, 0, 'mail post office'],
    ['Return something you bought', 20, 0, 'refund'],
    ['Pick up a prescription', 20, 0, 'pharmacy chemist medicine'],
    ['Buy a birthday present', 30, 0, 'gift shopping'],
    ['Clear out your bag', 10, 1, 'wallet backpack tidy'],
    ['Renew a document', 30, 0, 'passport id license'],
    ['Book travel', 30, 0, 'holiday flights hotel', 'F'],
    ['Fill up the car', 15, 0, 'petrol gas fuel'],
    ['Check the tyre pressure', 10, 0, 'car tires'],
    ['Get the car serviced', 20, 0, 'mechanic'],
    ['Take clothes to the dry cleaner', 20, 0, 'laundry suit'],
    ['Recycle old electronics', 30, 0, 'e-waste batteries'],
    ['Organise your documents', 45, 0, 'paperwork filing', 'F'],
  ],
  kindness: [
    ['Do a random act of kindness', 10, 2, 'help good deed', '*'],
    ['Compliment someone', 5, 7, 'kind'],
    ['Thank someone for their work', 5, 3, 'gratitude kind'],
    ['Help a neighbour', 30, 0, 'community'],
    ['Donate things you do not use', 30, 0, 'charity declutter'],
    ['Donate to a charity', 10, 0, 'money give'],
    ['Support a local business', 20, 0, 'shop local'],
    ['Teach someone a skill', 30, 0, 'help share'],
    ['Volunteer', 120, 0, 'charity community'],
    ['Donate blood', 60, 0, 'health charity'],
    ['Register as an organ donor', 10, 0, 'health donor card'],
    ['Plant a tree', 60, 0, 'environment nature'],
  ],
};

/**
 * Steps for long library tasks, where the task splits into clear parts. The
 * last step is the finish line: ticking it completes the task. Walk, Run and
 * Steps get theirs from the amount (see `measuredSteps`).
 */
const STEPS: Record<string, string[]> = {
  'Clean the bathroom': ['Toilet', 'Sink and mirror', 'Shower or bath', 'Floor'],
  'Clean the kitchen': ['Clear the counters', 'Wipe counters and stove', 'Clean the sink', 'Sweep the floor'],
  'Clean the windows': ['Inside of the glass', 'Outside of the glass', 'Frames and sills'],
  'Declutter your wardrobe': ['Take everything out', 'Sort: keep, donate, toss', 'Put the keepers back', 'Bag up the donations'],
  'Mow the lawn': ['Clear the lawn', 'Mow', 'Edges and clippings'],
  'Clean the oven': ['Take out the racks', 'Spray and let it soak', 'Scrub the inside', 'Racks and door'],
  'Wash the car': ['Rinse', 'Soap and scrub', 'Rinse and dry', 'Windows and wheels'],
  'Deep clean one room': ['Declutter', 'Dust top to bottom', 'Wipe the surfaces', 'Vacuum', 'Mop the floor'],
  'Clean the gutters': ['Set up the ladder safely', 'Scoop out the gutters', 'Flush the downpipes'],
  'Tidy the cellar or garage': ['Clear a space', 'Sort: keep, donate, toss', 'Put the keepers back', 'Take the rest away'],
  'Strength workout': ['Warm up', 'Main sets', 'Stretch'],
  'Go to the gym': ['Warm up', 'Main workout', 'Cool down and stretch'],
  'Go hiking': ['Pack water and snacks', 'Halfway point', 'Back at the start'],
  'Go skiing': ['Gear on and first run', 'Lunch break', 'Last run of the day'],
  'Cook a healthy meal': ['Prep the ingredients', 'Cook', 'Serve and clean up'],
  'Meal prep for the week': ['Plan the meals', 'Prep the ingredients', 'Cook', 'Pack the boxes'],
  'Try a new recipe': ['Get the ingredients ready', 'Cook', 'Taste and clean up'],
  'Bake bread': ['Mix the dough', 'Let it rise', 'Shape the loaf', 'Bake'],
  'Deep work block (90 min)': ['First 30 min', '60 min in', 'Full 90 min'],
  'Update your CV': ['Add your latest job', 'Refresh your skills', 'Proofread', 'Save as PDF'],
  'Apply for a job': ['Read the job ad', 'Tailor your CV', 'Write the cover letter', 'Send it'],
  'Prepare for a job interview': ['Research the company', 'Practise your answers', 'Plan your outfit and route'],
  'Study for an exam': ['Review your notes', 'Practice questions', 'Go over what you missed'],
  'Do your taxes': ['Gather the documents', 'Fill in the forms', 'Double-check', 'Submit'],
  'Host friends at home': ['Tidy up', 'Food and drinks', 'Enjoy the evening', 'Clean up'],
  'Build something with your hands': ['Plan it', 'Gather materials', 'Build', 'Tidy the workspace'],
  'Go camping': ['Pack the gear', 'Set up camp', 'Pack up and head home'],
  'Do the grocery shopping': ['Write the list', 'Shop', 'Put it all away'],
  'Organise your documents': ['Gather all papers', 'Sort into piles', 'File them', "Shred what you don't need"],
};

/** Categories where sitting down with a timer fits: work, study, making things, quiet practice. */
export const FOCUS_CATEGORIES = ['work', 'learning', 'creative', 'mind'];
/** Shortest task the focus timer is offered for. */
export const FOCUS_FROM_MINUTES = 5;

/**
 * Whether a task suits the focus timer: anything from 5 minutes in the focus
 * categories, plus tasks marked for it elsewhere (admin, long tidy-ups), less
 * the ones marked off (meetings, outings, things you do on the move).
 */
function focusFits(category: string, minutes: number, flags: string): boolean {
  if (flags.includes('x') || minutes < FOCUS_FROM_MINUTES) return false;
  return flags.includes('F') || FOCUS_CATEGORIES.includes(category);
}

/** Library ids, from the English title: "Do the dishes" -> "do-the-dishes". */
export function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const MEASURES: Record<string, Measure> = { Walk: 'walk', Run: 'run', Steps: 'steps' };

export const LIBRARY: LibraryTask[] = Object.entries(ROWS).flatMap(([category, rows]) =>
  rows.map(([title, minutes, perWeek, tags = '', flags = '']) => {
    const measure = MEASURES[title];
    return {
      id: slug(title),
      title,
      category,
      minutes: measure ? measuredMinutes(measure, DEFAULT_AMOUNTS[measure]) : minutes,
      perWeek,
      tags: tags.split(' ').filter(Boolean),
      featured: flags.includes('*'),
      ...(STEPS[title] && { steps: STEPS[title] }),
      focus: !measure && focusFits(category, minutes, flags),
      ...(measure && { measure }),
    };
  }),
);

const BY_ID = new Map(LIBRARY.map((t) => [t.id, t]));

export function libraryTask(id: string): LibraryTask | undefined {
  return BY_ID.get(id);
}

/** The library task with exactly this title, or the Walk, Run or Steps a title like "Walk 3 km" was made from. */
export function libraryMatch(title: string): LibraryTask | undefined {
  const t = title.trim().toLowerCase();
  const exact = LIBRARY.find((l) => l.title.toLowerCase() === t);
  if (exact) return exact;
  const measured = parseMeasured(t);
  return measured && LIBRARY.find((l) => l.measure === measured.measure);
}

/** Steps of the library task with exactly this title; for "Walk 3 km" and the like, steps along the way. */
export function librarySteps(title: string): string[] | undefined {
  const t = title.trim().toLowerCase();
  const exact = LIBRARY.find((l) => l.title.toLowerCase() === t);
  if (exact) return exact.steps;
  const measured = parseMeasured(t);
  if (!measured) return undefined;
  const steps = measuredSteps(measured.amount, measuredMinutes(measured.measure, measured.amount));
  return steps.length ? steps : undefined;
}

export function categoryOf(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/**
 * Search the library. Titles starting with the query rank first, then
 * words in the title starting with it, then matches anywhere / in tags.
 */
/** A filter next to the areas: the all-day willpower tasks from every area, ticked off in the evening. */
export const WILLPOWER_FILTER = 'willpower';

export function searchLibrary(query: string, limit = 50, category?: string): LibraryTask[] {
  const q = query.trim().toLowerCase();
  const pool =
    category === WILLPOWER_FILTER
      ? LIBRARY.filter((t) => libraryEffort(t.id) === 'willpower')
      : category
        ? LIBRARY.filter((t) => t.category === category)
        : LIBRARY;
  if (!q) return pool.slice(0, limit);
  const words = q.split(/\s+/);
  const scored: { task: LibraryTask; score: number }[] = [];
  for (const task of pool) {
    const title = task.title.toLowerCase();
    const willpower = libraryEffort(task.id) === 'willpower' ? ' willpower' : '';
    const haystack = `${title} ${task.tags.join(' ')} ${categoryOf(task.category)?.label.toLowerCase() ?? ''}${willpower}`;
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

/** Most XP first (`xpOf` gives each task's XP), or quickest first. */
export function sortTasks(tasks: LibraryTask[], sort: 'xp' | 'quick', xpOf: (t: LibraryTask) => number = (t) => t.minutes): LibraryTask[] {
  const key = sort === 'xp' ? (t: LibraryTask) => -xpOf(t) : (t: LibraryTask) => t.minutes;
  return [...tasks].sort((a, b) => key(a) - key(b) || a.title.localeCompare(b.title));
}

/** Suggestions for the setup screen: featured first, from the chosen areas, without the ones already on the list. */
export function suggestionsFor(categories: string[], perCategory = 6, owned: Set<string> = new Set()): LibraryTask[] {
  return categories.flatMap((c) => {
    const tasks = LIBRARY.filter((t) => t.category === c && t.perWeek > 0 && !owned.has(t.id));
    return [...tasks.filter((t) => t.featured), ...tasks.filter((t) => !t.featured)].slice(0, perCategory);
  });
}

export const FEATURED = LIBRARY.filter((t) => t.featured);

/** Group for tasks that match no library category. */
export const OTHER_CATEGORY = 'other';

/** Category of a library task with exactly this title. */
export function categoryForTitle(title: string): string | undefined {
  return libraryMatch(title)?.category;
}

/** Small words that say nothing about the kind of task. */
const FILLER_WORDS = new Set(['the', 'for', 'and', 'with', 'your', 'you', 'get', 'have', 'some', 'all', 'from', 'into', 'out', 'off']);

/** A first guess for a new task's category from the closest library task (the user can change it). */
export function guessCategory(title: string): string | undefined {
  if (title.trim().length < 3) return undefined;
  const whole = categoryForTitle(title) ?? searchLibrary(title, 1)[0]?.category;
  if (whole) return whole;
  // Otherwise the longest word that matches something ("Gym session" -> gym).
  const words = title
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 3 && !FILLER_WORDS.has(w))
    .sort((a, b) => b.length - a.length);
  for (const w of words) {
    const hit = searchLibrary(w, 1)[0];
    if (hit) return hit.category;
  }
  return undefined;
}

/** The group a task shows under on Today; tasks saved before categories use the closest library match. */
export function taskCategory(task: { title: string; category?: string }): string {
  return task.category ?? guessCategory(task.title) ?? OTHER_CATEGORY;
}
