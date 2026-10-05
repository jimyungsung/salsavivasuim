/* The one onboarding question, in both languages: the landing page's three
   chips. The value is the start_point enum label, so the answer travels as
   sign-up metadata and lands in `profiles` through the handle_new_user trigger
   with no translation step. It is optional; tapping the chosen chip clears it.

   The old three (experience, On1/On2, what is hardest) are still columns, kept
   as data, and no longer asked: nothing read them. */

import type { Localized } from '@/lib/i18n';

export interface Choice {
  value: string;
  label: Localized;
}

export interface Question {
  /** The profiles column, and the metadata key it travels under. */
  field: 'start_point';
  prompt: Localized;
  choices: Choice[];
}

export const QUESTIONS: Question[] = [
  {
    field: 'start_point',
    prompt: { en: 'Where are you starting from?', ko: '어디서 시작하시나요?' },
    choices: [
      { value: 'new', label: { en: 'Never danced', ko: '춤춘 적 없음' } },
      { value: 'restarting', label: { en: 'Some classes', ko: '수업 조금' } },
      { value: 'social', label: { en: 'Social dancer', ko: '소셜 댄서' } },
    ],
  },
];

export type Answers = Partial<Record<Question['field'], string>>;
