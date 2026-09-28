-- A starting catalogue for a fresh database: one stage, two weekly menus with
-- their routines, and the quick-drills menu Today reads. No exercises: those
-- are uploads, made in the back office, and a routine is filled from the
-- library there. Everything is a draft until someone opens it.
--
-- Re-running: clear the catalogue first.
--   delete from public.routine_items; delete from public.routines;
--   delete from public.menus; delete from public.stages;

with stage as (
  insert into public.stages (slug, position, name_t, blurb_t)
  values ('foundations', 1,
    '{"en": "Foundations", "ko": "파운데이션"}',
    '{"en": "The count, the basic, weight changes. Eight weeks, and everything after sits on them.", "ko": "카운트, 기본 스텝, 체중 이동. 8주, 그 위에 모든 것이 올라갑니다."}')
  returning id
),
menus as (
  insert into public.menus (stage_id, slug, position, title_t, subtitle_t, promise_t, level, status)
  select stage.id, m.slug, m.position, m.title_t, m.subtitle_t, m.promise_t, 'beginner', 'draft'
  from stage, (values
    ('timing-footwork', 1,
      '{"en": "Timing & footwork", "ko": "타이밍 & 풋워크"}'::jsonb,
      '{"en": "Find the one every time", "ko": "매번 1을 찾기"}'::jsonb,
      '{"en": "The basic, the pause and clean feet at two tempos.", "ko": "기본 스텝, 멈춤, 두 가지 템포의 깔끔한 발."}'::jsonb),
    ('shoulders-body', 2,
      '{"en": "Shoulders & body movement", "ko": "어깨 & 바디 무브먼트"}'::jsonb,
      '{"en": "Loosen the top half", "ko": "상체 풀기"}'::jsonb,
      '{"en": "Shoulder rolls, rib cage and body waves, always on the count.", "ko": "어깨 롤, 갈비뼈, 바디 웨이브. 언제나 카운트 위에서."}'::jsonb)
  ) as m (slug, position, title_t, subtitle_t, promise_t)
  returning id, slug
)
insert into public.routines (menu_id, position, weekday, title_t, blurb_t, levels, status)
select menus.id, r.position, r.weekday, r.title_t, r.blurb_t, '{beginner}', 'draft'
from menus
join (values
  ('timing-footwork', 1, 0, '{"en": "Timing & the count", "ko": "타이밍과 카운트"}'::jsonb, '{"en": "Hold still on 4 and 8. The pause is part of the step.", "ko": "4와 8에서 멈추기. 멈춤도 스텝의 일부입니다."}'::jsonb),
  ('timing-footwork', 2, 1, '{"en": "Footwork & timing", "ko": "풋워크 & 타이밍"}'::jsonb, '{"en": "Weight fully over the foot before the next step.", "ko": "다음 스텝 전에 체중을 발 위에 완전히."}'::jsonb),
  ('timing-footwork', 3, 2, '{"en": "Your first right turn", "ko": "첫 오른쪽 턴"}'::jsonb, '{"en": "Slow first, then on the music.", "ko": "먼저 느리게, 그다음 음악에 맞춰."}'::jsonb),
  ('timing-footwork', 4, 3, '{"en": "Body movement", "ko": "바디 무브먼트"}'::jsonb, '{"en": "", "ko": ""}'::jsonb),
  ('timing-footwork', 5, 4, '{"en": "Shines: the suzie Q", "ko": "샤인: 수지큐"}'::jsonb, '{"en": "", "ko": ""}'::jsonb),
  ('timing-footwork', 6, 5, '{"en": "Freestyle Saturday", "ko": "프리스타일 토요일"}'::jsonb, '{"en": "One song, no rules.", "ko": "한 곡, 규칙 없이."}'::jsonb),
  ('shoulders-body', 1, 0, '{"en": "Shoulder rolls & isolations", "ko": "어깨 롤 & 아이솔레이션"}'::jsonb, '{"en": "", "ko": ""}'::jsonb),
  ('shoulders-body', 2, 1, '{"en": "Rib cage slides", "ko": "갈비뼈 슬라이드"}'::jsonb, '{"en": "", "ko": ""}'::jsonb),
  ('shoulders-body', 3, 2, '{"en": "Body wave, slow then on tempo", "ko": "바디 웨이브, 느리게 그리고 템포로"}'::jsonb, '{"en": "", "ko": ""}'::jsonb),
  ('shoulders-body', 4, 3, '{"en": "Weight through the hips", "ko": "골반으로 체중 옮기기"}'::jsonb, '{"en": "", "ko": ""}'::jsonb),
  ('shoulders-body', 5, 4, '{"en": "Arm frames for shines", "ko": "샤인을 위한 팔 프레임"}'::jsonb, '{"en": "", "ko": ""}'::jsonb),
  ('shoulders-body', 6, 5, '{"en": "Freestyle, shoulders only", "ko": "프리스타일, 어깨만"}'::jsonb, '{"en": "", "ko": ""}'::jsonb)
) as r (slug, position, weekday, title_t, blurb_t) on r.slug = menus.slug;

-- The quick drills: a stageless menu whose routines are one exercise each.
-- Today reads it by this slug (lib/menus.ts QUICK_MENU_SLUG).
insert into public.menus (stage_id, slug, position, title_t, subtitle_t, promise_t, level, status)
values (null, 'quick-drills', 1,
  '{"en": "Quick drills", "ko": "퀵 드릴"}',
  '{"en": "Got 5 minutes?", "ko": "5분 있으세요?"}',
  '{"en": "Short drills for a coffee break. They count toward your week.", "ko": "잠깐 쉬는 시간의 짧은 드릴. 이번 주에 포함됩니다."}',
  'all', 'draft');
