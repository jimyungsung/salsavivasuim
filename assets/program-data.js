/* The one program the prototype covers: Improvisation 01 — Stop Freezing.
   Session titles and outcomes come from the concept playbook's week-by-week map.
   Every session is built from the same five-unit asset stack the playbook
   prescribes, so unit copy is per-type and the session supplies the focus. */

export const SESSIONS = {
  en: [
    ['One Step, Many Possibilities', 'Transform a Suzie Q through direction and size.', 'direction and size'],
    ['Change the Rhythm',            'Use holds and syncopation without adding vocabulary.', 'rhythm'],
    ['Connect Without Planning',     'Move among basic, Suzie Q and crossover.', 'transitions'],
    ['Repeat Without Looking Repetitive', 'Use repetition with changing energy or direction.', 'energy'],
    ['Change Direction',             'Travel intentionally through the space.', 'travel'],
    ['Create Eight Counts',          'Make and repeat a short phrase that is yours.', 'phrasing'],
    ['React to Rhythm',              'Recognise and answer a simple musical cue.', 'musical cues'],
    ['Use Pauses',                   'Hold with intention, then restart confidently.', 'pauses'],
    ['Sixty-Second Freestyle',       'Dance on your own with the prompts falling away.', 'free choice']
  ],
  ko: [
    ['하나의 스텝, 여러 가능성', '수지큐를 방향과 크기로 변형합니다.', '방향과 크기'],
    ['리듬 바꾸기',           '동작을 늘리지 않고 홀드와 싱코페이션을 사용합니다.', '리듬'],
    ['계획 없이 연결하기',      '기본, 수지큐, 크로스오버 사이를 오갑니다.', '연결'],
    ['반복하되 단조롭지 않게',   '에너지나 방향을 바꾸며 반복합니다.', '에너지'],
    ['방향 바꾸기',           '공간 안에서 의도를 가지고 이동합니다.', '이동'],
    ['8카운트 만들기',        '나만의 짧은 프레이즈를 만들고 반복합니다.', '프레이즈'],
    ['리듬에 반응하기',        '간단한 음악적 신호를 알아채고 응답합니다.', '음악 신호'],
    ['멈춤 사용하기',         '의도를 가지고 멈추고, 자신 있게 다시 시작합니다.', '멈춤'],
    ['60초 프리스타일',       '안내가 줄어드는 가운데 스스로 춤춥니다.', '자유 선택']
  ]
};

export const WEEKS = {
  en: [['Week 1', 'You already know enough'], ['Week 2', 'Build phrases'], ['Week 3', 'Dance to music']],
  ko: [['1주차', '이미 충분히 알고 있습니다'], ['2주차', '프레이즈 만들기'], ['3주차', '음악에 맞춰 춤추기']]
};

/* The six steps of the Suim method. Every session is the same six videos:
   [step, minutes:seconds, what it is, short name]. Six short videos, not one
   long one — the talking shrinks and the practice grows as you go down. */
export const UNITS = {
  en: [
    ['WATCH',      '0:20', 'The whole thing danced to music, before any explanation.', 'See where this goes'],
    ['UNDERSTAND', '4:00', 'One idea, and no more than three cues that change how it feels.', 'The idea and the cues'],
    ['TRAIN',      '3:00', 'Build the base slowly, with counts and the styling stripped out.', 'Build the base'],
    ['DRILL',      '4:00', 'Follow view. Repeat to music until it stops needing your attention.', 'Repeat it to music'],
    ['TRANSFORM',  '3:40', 'Change one variable and compare the result against the base.', 'Change one thing'],
    ['IMPROVISE',  '3:00', 'One rule, a timer, and no demonstration to copy.', 'Your turn']
  ],
  ko: [
    ['보기',      '0:20', '설명에 앞서, 음악에 맞춘 완성된 모습을 봅니다.', '도착점 보기'],
    ['이해하기',   '4:00', '하나의 아이디어와, 감각을 바꾸는 최대 세 가지 큐.', '아이디어와 큐'],
    ['훈련하기',   '3:00', '스타일링을 걷어내고 카운트로 기본을 천천히 쌓습니다.', '기본 쌓기'],
    ['반복하기',   '4:00', '후면 뷰. 신경 쓰지 않아도 나올 때까지 음악에 맞춰 반복합니다.', '음악에 맞춰 반복'],
    ['변형하기',   '3:40', '한 가지 변수를 바꾸고 기본형과 비교합니다.', '하나만 바꾸기'],
    ['즉흥하기',   '3:00', '규칙 하나와 타이머, 따라 할 시범은 없습니다.', '나의 차례']
  ]
};

/* Where each step starts inside an 18-minute session. */
export const STEP_STARTS = ['0:00', '0:20', '4:20', '7:20', '11:20', '15:00'];

/* Everything on the shelf. Improvisation 01 is the one this prototype builds
   out; the rest exist so module selection has something to select from.
   [id, track, title, promise, weeks, sessions, level, state] */
export const MODULES = {
  en: [
    ['improvisation-01', 'Solo · Improvisation', 'Improvisation 01', 'Stop freezing. Improvise with what you already know, without memorising more shines.', '3 weeks', '9 sessions', 'Improver+', 'current'],
    ['move-better', 'Solo · Foundations', 'Move Better', 'Clean up weight transfer, grounding, coordination and direction.', '3 weeks', '9 sessions', 'Improver', 'open'],
    ['shine-language-01', 'Solo · Vocabulary', 'Shine Language 01', 'Turn eight to ten movement families into dozens of possibilities.', '3 weeks', '9 sessions', 'Improver+', 'open'],
    ['flow', 'Solo · Connection', 'Flow', 'Entries, exits, transitions and phrasing, so steps start reading as dancing.', '2 weeks', '6 sessions', 'Improver+', 'open'],
    ['choreo-lab-01', 'Lab · Choreography', 'Choreo Lab 01', 'Learn a full choreography, understand why it is built that way, then rewrite the last eight counts.', '2 weeks', '6 sessions', 'Advanced', 'open'],
    ['roots-lab-01', 'Lab · Guest artist', 'Roots Lab 01', 'A specialist teaches Afro-Cuban principles; Suim shows how they enter salsa.', '2 weeks', '6 sessions', 'Improver+', 'open'],
    ['musicality-01', 'Solo · Musicality', 'Musicality 01', 'Hear the cue, answer it, and hold a pause on purpose.', '3 weeks', '9 sessions', 'Improver+', 'soon'],
    ['partnerwork-01', 'Partnerwork', 'Partnerwork 01', 'Lead and follow mechanics, connection and frame — filmed for solo practice first.', '3 weeks', '9 sessions', 'Improver+', 'soon'],
    ['improvisation-02', 'Solo · Improvisation', 'Improvisation 02', 'Longer freestyles, harder constraints, and dancing a full song alone.', '3 weeks', '9 sessions', 'Advanced', 'soon']
  ],
  ko: [
    ['improvisation-01', '솔로 · 즉흥', '즉흥 01', '멈추지 않고 춤추기. 샤인을 더 외우지 않고 이미 아는 것으로 즉흥을 합니다.', '3주', '9개 세션', '초중급 이상', 'current'],
    ['move-better', '솔로 · 기초', '더 잘 움직이기', '체중 이동, 중심, 협응과 방향을 정리합니다.', '3주', '9개 세션', '초중급', 'open'],
    ['shine-language-01', '솔로 · 어휘', '샤인 랭귀지 01', '8~10개의 동작 계열을 수십 가지 가능성으로 바꿉니다.', '3주', '9개 세션', '초중급 이상', 'open'],
    ['flow', '솔로 · 연결', '플로우', '진입과 마무리, 전환과 프레이징. 스텝이 춤으로 읽히기 시작합니다.', '2주', '6개 세션', '초중급 이상', 'open'],
    ['choreo-lab-01', '랩 · 안무', '코레오 랩 01', '안무를 배우고, 그렇게 구성된 이유를 이해한 뒤, 마지막 8카운트를 직접 바꿉니다.', '2주', '6개 세션', '고급', 'open'],
    ['roots-lab-01', '랩 · 게스트 아티스트', '루츠 랩 01', '전문가가 아프로쿠반 원리를 가르치고, Suim이 살사로 연결하는 법을 보여줍니다.', '2주', '6개 세션', '초중급 이상', 'open'],
    ['musicality-01', '솔로 · 음악성', '뮤지컬리티 01', '신호를 듣고, 응답하고, 의도를 가지고 멈춥니다.', '3주', '9개 세션', '초중급 이상', 'soon'],
    ['partnerwork-01', '파트너워크', '파트너워크 01', '리드와 팔로우의 메커니즘, 커넥션과 프레임. 솔로 연습을 우선으로 촬영합니다.', '3주', '9개 세션', '초중급 이상', 'soon'],
    ['improvisation-02', '솔로 · 즉흥', '즉흥 02', '더 긴 프리스타일, 더 어려운 조건, 그리고 한 곡을 혼자 완주하기.', '3주', '9개 세션', '고급', 'soon']
  ]
};

/* Hard-coded prototype state: just subscribed, partway through session 1. */
export const STATE = { module: 'improvisation-01', session: 1, unit: 3, unitsDone: 2 };
export const UNIT_COUNT = 6;

export const durationOf = i => ['18 min', '17 min', '19 min', '18 min', '16 min', '21 min', '18 min', '16 min', '22 min'][i];
export const weekOf = n => Math.ceil(n / 3);
