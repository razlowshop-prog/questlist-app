/**
 * Launch check: each start writes down how far it got, at once and to a file,
 * so even a crash that closes the app without the crash screen (a crash in
 * the phone's own code) leaves a note. When the last start never got to
 * "running fine", the next start shows how far it came (LaunchReport.tsx).
 *
 * This file is the plain logic; launchCheck.native.ts and launchCheck.ts say
 * where the note is kept.
 */

/** The steps of a start, in order. */
// Noted from the app's screen only (LaunchGate), never at load: the home
// screen widget runs the same code in the background without a screen, and
// that must not look like a start that closed early.
export const LAUNCH_STEPS = ['started', 'save read', 'look ready', 'drawn'] as const;
export type LaunchStep = (typeof LAUNCH_STEPS)[number];

/** Where the note lives: read and write must finish before they return. */
export interface NoteBox {
  read(): string | undefined;
  write(text: string): void;
}

interface Note {
  steps: LaunchStep[];
  ok: boolean;
}

function parse(text: string | undefined): Note | undefined {
  if (!text) return undefined;
  try {
    const n = JSON.parse(text) as Partial<Note>;
    if (!Array.isArray(n.steps)) return undefined;
    return { steps: n.steps.filter((s): s is LaunchStep => (LAUNCH_STEPS as readonly string[]).includes(s)), ok: n.ok === true };
  } catch {
    return undefined;
  }
}

export interface LaunchCheck {
  /** The steps the last start reached if it closed before running fine, else undefined. */
  readonly lastCrash: LaunchStep[] | undefined;
  /** This start reached a step. */
  step(step: LaunchStep): void;
  /** This start is running fine (a few seconds after the first screen, or the app was left). */
  ok(): void;
  /** Starts the note over, e.g. after the report was shown and the app opens anyway. */
  restart(): void;
}

export function makeLaunchCheck(box: NoteBox): LaunchCheck {
  let lastCrash: LaunchStep[] | undefined;
  try {
    const old = parse(box.read());
    if (old && !old.ok) lastCrash = old.steps;
  } catch {
    // Can't read the note: no report, the app still opens.
  }
  let note: Note = { steps: [], ok: false };
  const save = () => {
    try {
      box.write(JSON.stringify(note));
    } catch {
      // Can't write the note: the check just misses this start.
    }
  };
  return {
    lastCrash,
    step(step) {
      if (note.ok || note.steps.includes(step)) return;
      note = { ...note, steps: [...note.steps, step] };
      save();
    },
    ok() {
      if (note.ok) return;
      note = { ...note, ok: true };
      save();
    },
    restart() {
      note = { steps: [], ok: false };
      save();
    },
  };
}
