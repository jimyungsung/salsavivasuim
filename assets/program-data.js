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

/* The standard five-unit stack: [type, minutes:seconds, what it is, short name].
   The short names are the session phases the playbook already uses. */
export const UNITS = {
  en: [
    ['PREVIEW',   '0:20', 'Watch where this session ends up, with music and no explanation.', 'Show it'],
    ['TEACH',     '4:55', 'The idea, the base movement, and no more than three cues.', 'The idea'],
    ['DRILL',     '4:00', 'Follow view. Slow, then counts, then music, until it runs without you.', 'Drill it'],
    ['TRANSFORM', '4:30', 'Change one variable and compare the result against the base.', 'Play with it'],
    ['IMPROV',    '3:00', 'One rule, a timer, and no demonstration to copy.', 'Your turn']
  ],
  ko: [
    ['프리뷰', '0:20', '설명 없이 음악과 함께, 이 세션의 도착점을 봅니다.', '보기'],
    ['설명',   '4:55', '아이디어와 기본 동작, 그리고 최대 세 가지 큐.', '아이디어'],
    ['드릴',   '4:00', '후면 뷰. 느리게, 카운트로, 그다음 음악으로 반복합니다.', '반복하기'],
    ['변형',   '4:30', '한 가지 변수를 바꾸고 기본형과 비교합니다.', '바꿔보기'],
    ['즉흥',   '3:00', '규칙 하나와 타이머, 따라 할 시범은 없습니다.', '나의 차례']
  ]
};

/* Hard-coded prototype state: just subscribed, partway through session 1. */
export const STATE = { session: 1, unit: 3, unitsDone: 2 };

export const durationOf = i => ['18 min', '17 min', '19 min', '18 min', '16 min', '21 min', '18 min', '16 min', '22 min'][i];
export const weekOf = n => Math.ceil(n / 3);
