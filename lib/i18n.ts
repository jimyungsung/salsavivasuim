/* The two languages, and the shape every content string takes.

   Was the top of lib/content.ts, which also carried the hand-written catalogue
   and the six method steps; those went with the daily concept
   (docs/DAILY-PLAN.md). This is what every screen still needs. */

export type Lang = 'en' | 'ko';
export type Localized = Record<Lang, string>;

/** Where the language choice is kept so the server can set <html lang> on the
    first paint. */
export const LANG_COOKIE = 'suim-lang';
/** The browser's time zone, for the server's idea of today (lib/clock.ts). */
export const TZ_COOKIE = 'suim-tz';
export const isLang = (value: unknown): value is Lang => value === 'en' || value === 'ko';

/** Reads a localized field, falling back to English when a translation is missing. */
export const t = (value: Localized, lang: Lang): string => value[lang] || value.en;

/* Levels describe the material, not the dancer, and they are not a ladder:
   a routine late in a stage can still be for everyone. */
export type LevelKey = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'pro';
export const LEVEL_ORDER: LevelKey[] = ['all', 'beginner', 'intermediate', 'advanced', 'pro'];

export const LEVEL_LABELS: Record<LevelKey, Localized> = {
  all: { en: 'All levels', ko: '전체 레벨' },
  beginner: { en: 'Beginner', ko: '입문' },
  intermediate: { en: 'Intermediate', ko: '중급' },
  advanced: { en: 'Advanced', ko: '고급' },
  pro: { en: 'Pro', ko: '프로' },
};

/* What an exercise works. Not a Postgres enum: a new tag is a line here, not a
   migration. Not free text either: the planner's chips filter by this list, and
   a typo would make a tag nobody can filter by. Ten to twelve is the right size. */
export type ExerciseTag =
  | 'warm-up' | 'timing' | 'footwork' | 'body' | 'hips' | 'shoulders'
  | 'arms' | 'turns' | 'shines' | 'styling' | 'musicality';

export const EXERCISE_TAGS: ExerciseTag[] = [
  'warm-up', 'timing', 'footwork', 'body', 'hips', 'shoulders',
  'arms', 'turns', 'shines', 'styling', 'musicality',
];

export const TAG_LABELS: Record<ExerciseTag, Localized> = {
  'warm-up': { en: 'Warm-up', ko: '워밍업' },
  timing: { en: 'Timing', ko: '타이밍' },
  footwork: { en: 'Footwork', ko: '풋워크' },
  body: { en: 'Body movement', ko: '바디 무브먼트' },
  hips: { en: 'Hips', ko: '골반' },
  shoulders: { en: 'Shoulders', ko: '어깨' },
  arms: { en: 'Arms', ko: '팔' },
  turns: { en: 'Turns', ko: '턴' },
  shines: { en: 'Shines', ko: '샤인' },
  styling: { en: 'Styling', ko: '스타일링' },
  musicality: { en: 'Musicality', ko: '뮤지컬리티' },
};

export const isTag = (value: string): value is ExerciseTag =>
  (EXERCISE_TAGS as string[]).includes(value);

/** The weekdays, Monday first, as the database counts them (0 = Monday). */
export const DAY_NAMES: Localized[] = [
  { en: 'Monday', ko: '월요일' },
  { en: 'Tuesday', ko: '화요일' },
  { en: 'Wednesday', ko: '수요일' },
  { en: 'Thursday', ko: '목요일' },
  { en: 'Friday', ko: '금요일' },
  { en: 'Saturday', ko: '토요일' },
  { en: 'Sunday', ko: '일요일' },
];

export const DAY_SHORT: Localized[] = [
  { en: 'Mon', ko: '월' },
  { en: 'Tue', ko: '화' },
  { en: 'Wed', ko: '수' },
  { en: 'Thu', ko: '목' },
  { en: 'Fri', ko: '금' },
  { en: 'Sat', ko: '토' },
  { en: 'Sun', ko: '일' },
];
