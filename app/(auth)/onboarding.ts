/* The three onboarding questions, in both languages.

   The values are the enum labels in the database (dance_experience, dance_timing,
   dance_goal), so the answers travel as sign-up metadata and land in `profiles`
   through the handle_new_user trigger without a translation step in between.

   All three are optional. The screen offers "Skip the questions" and means it. */

import type { Localized } from '@/lib/content';

export interface Choice {
  value: string;
  label: Localized;
}

export interface Question {
  /** The profiles column, and the metadata key it travels under. */
  field: 'experience' | 'timing' | 'goal';
  prompt: Localized;
  choices: Choice[];
}

export const QUESTIONS: Question[] = [
  {
    field: 'experience',
    prompt: { en: 'How long have you been dancing salsa?', ko: '살사를 춘 지 얼마나 되었나요?' },
    choices: [
      { value: 'under_1_year', label: { en: 'Under 1 year', ko: '1년 미만' } },
      { value: '1_to_3_years', label: { en: '1–3 years', ko: '1~3년' } },
      { value: 'over_3_years', label: { en: '3+ years', ko: '3년 이상' } },
    ],
  },
  {
    field: 'timing',
    prompt: { en: 'Do you dance On1 or On2?', ko: 'On1과 On2 중 어느 쪽으로 추시나요?' },
    choices: [
      { value: 'on1', label: { en: 'On1', ko: 'On1' } },
      { value: 'on2', label: { en: 'On2', ko: 'On2' } },
      { value: 'both', label: { en: 'Both', ko: '둘 다' } },
    ],
  },
  {
    field: 'goal',
    prompt: { en: 'What is hardest right now?', ko: '지금 가장 어려운 것은 무엇인가요?' },
    choices: [
      { value: 'freezing', label: { en: 'I freeze when I improvise', ko: '즉흥을 하면 얼어붙어요' } },
      { value: 'disconnected', label: { en: 'My shines feel disconnected', ko: '샤인이 서로 이어지지 않아요' } },
      { value: 'messy', label: { en: 'My movement looks messy', ko: '움직임이 정돈되지 않아요' } },
      { value: 'repetitive', label: { en: 'I always repeat myself', ko: '늘 같은 것만 반복해요' } },
    ],
  },
];

export type Answers = Partial<Record<Question['field'], string>>;
