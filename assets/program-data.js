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

/* Levels describe the material, not the dancer, and they are not a ladder: a
   session late in a module can still be All level, and an early one can be
   Intermediate. A session carries one or more of these. */
export const LEVELS = {
  en: { all:'All level', beginner:'Beginner', intermediate:'Intermediate', advanced:'Advanced', pro:'Pro' },
  ko: { all:'전체 레벨', beginner:'입문', intermediate:'중급', advanced:'고급', pro:'프로' }
};
export const LEVEL_ORDER = ['all', 'beginner', 'intermediate', 'advanced', 'pro'];

/* Levels per session, by session number. Deliberately not increasing: session
   05 is beginner-friendly, session 08 is open to everyone but goes deep. */
export const SESSION_LEVELS = [
  ['all', 'beginner'],          /* 01 One Step, Many Possibilities */
  ['beginner', 'intermediate'], /* 02 Change the Rhythm            */
  ['all', 'intermediate'],      /* 03 Connect Without Planning     */
  ['all', 'intermediate'],      /* 04 Repeat Without Looking Repetitive */
  ['all', 'beginner'],          /* 05 Change Direction             */
  ['intermediate', 'advanced'], /* 06 Create Eight Counts          */
  ['intermediate', 'advanced'], /* 07 React to Rhythm              */
  ['all', 'advanced'],          /* 08 Use Pauses                   */
  ['advanced', 'pro']           /* 09 Sixty-Second Freestyle       */
];

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

/* Everything on the shelf, grouped into the sections of the masterplan.
   Improvisation 01 is the only module this prototype builds out; the rest exist
   so each section has something in it.

   section: [id, name, what it is for, modules[]]
   module:  [id, title, subtitle, promise, weeks, sessions, level, state] */
export const SECTIONS = {
  en: [
    ['improvisation', 'Improvisation', 'Stop copying and start choosing. Fewer movements, understood deeply enough to play with.', [
      ['improvisation-01', 'Improvisation 01', 'Stop Freezing', 'Improvise with what you already know, without memorising more shines.', '3 weeks', '9 sessions', 'Intermediate', 'current'],
      ['flow-01', 'Flow 01', 'Connect Without Planning', 'Entries, exits and transitions, so separate movements start reading as dancing.', '2 weeks', '6 sessions', 'Intermediate', 'open'],
      ['improvisation-02', 'Improvisation 02', 'Build Phrases', 'Longer freestyles, harder constraints, and repetition that never looks repetitive.', '3 weeks', '9 sessions', 'Intermediate', 'open'],
      ['improvisation-03', 'Improvisation 03', 'Dance the Whole Song', 'Structure a full song alone: entrances, breaks, choruses and an ending.', '3 weeks', '9 sessions', 'Advanced', 'soon']
    ]],
    ['move-better', 'Move Better', 'The foundation everything else sits on. Make the salsa you already have look cleaner.', [
      ['move-better-01', 'Move Better 01', 'Grounding and Weight', 'Weight transfer, grounding, coordination and direction.', '3 weeks', '9 sessions', 'Beginner', 'open'],
      ['move-better-02', 'Move Better 02', 'Lines and Posture', 'Posture, spine, shoulders, and where your eyes go.', '2 weeks', '6 sessions', 'Beginner', 'open'],
      ['move-better-03', 'Move Better 03', 'Speed and Control', 'Move faster without losing the floor, and stop exactly where you meant to.', '2 weeks', '6 sessions', 'Intermediate', 'soon'],
      ['move-better-04', 'Move Better 04', 'Arms That Belong', 'Arms that come out of the body instead of being added on top.', '2 weeks', '6 sessions', 'Intermediate', 'soon'],
      ['move-better-05', 'Move Better 05', 'Turns Without Wobble', 'Spotting, axis, and the mechanics of staying upright.', '2 weeks', '6 sessions', 'Intermediate', 'soon']
    ]],
    ['shine-language', 'Shine Language', 'Vocabulary taught as families you can transform, not lists you memorise.', [
      ['shine-01', 'Shine Language 01', 'Ten Families', 'Turn eight to ten movement families into dozens of possibilities.', '3 weeks', '9 sessions', 'Intermediate', 'open'],
      ['shine-02', 'Shine Language 02', 'Turns and Spins', 'Preparation, spot and exit — turning without losing the count.', '3 weeks', '9 sessions', 'Intermediate', 'open'],
      ['shine-03', 'Shine Language 03', 'Footwork Speed', 'Doubles, triples and syncopation that still land clean.', '2 weeks', '6 sessions', 'Advanced', 'soon'],
      ['shine-04', 'Shine Language 04', 'Levels and Floor', 'Take the same vocabulary down, and bring it back up.', '2 weeks', '6 sessions', 'Advanced', 'soon'],
      ['shine-05', 'Shine Language 05', 'Body Isolation', 'Ribcage, hips and shoulders moving independently of the feet.', '2 weeks', '6 sessions', 'Intermediate', 'open'],
      ['shine-06', 'Shine Language 06', 'Travelling Shines', 'Vocabulary that covers ground instead of staying on the spot.', '2 weeks', '6 sessions', 'Intermediate', 'soon'],
      ['shine-07', 'Shine Language 07', 'Arms and Hands', 'What the upper body does while the feet are busy.', '2 weeks', '6 sessions', 'Advanced', 'soon']
    ]],
    ['musicality', 'Musicality', 'Stop dancing on top of the music and start answering it.', [
      ['musicality-01', 'Musicality 01', 'Hear the Break', 'Recognise a cue, answer it, and hold a pause on purpose.', '3 weeks', '9 sessions', 'Intermediate', 'open'],
      ['musicality-02', 'Musicality 02', 'Answer the Instruments', 'Pick an instrument and let it decide what your body does.', '3 weeks', '9 sessions', 'Advanced', 'soon'],
      ['musicality-03', 'Musicality 03', 'Son, Timba, Dura', 'Same steps, three feels — and knowing which one the song is asking for.', '2 weeks', '6 sessions', 'Advanced', 'soon'],
      ['musicality-04', 'Musicality 04', 'Dance the Lyrics', 'Let the singer, not the clave, decide the next eight counts.', '2 weeks', '6 sessions', 'Advanced', 'soon']
    ]],
    ['choreo', 'Choreography', 'Learn a full piece, understand why it is built that way, then change it.', [
      ['choreo-01', 'Choreo Lab 01', 'Learn, Then Rewrite', 'A complete Suim choreography — then you replace the last eight counts.', '2 weeks', '6 sessions', 'Advanced', 'open'],
      ['choreo-02', 'Choreo Lab 02', 'Performance Piece', 'A longer routine built for stage, with facings and a real ending.', '3 weeks', '9 sessions', 'Advanced', 'soon'],
      ['choreo-03', 'Choreo Lab 03', 'Make Your Own 64', 'Build, cut and finish sixty-four counts that are yours.', '3 weeks', '9 sessions', 'Advanced', 'soon'],
      ['choreo-04', 'Choreo Lab 04', 'Duet Piece', 'A two-body routine, filmed so you can drill either side.', '3 weeks', '9 sessions', 'Advanced', 'soon'],
      ['choreo-05', 'Choreo Lab 05', 'Competition Round', 'Ninety seconds built to be judged.', '3 weeks', '9 sessions', 'Pro', 'soon'],
      ['choreo-06', 'Choreo Lab 06', 'Repertoire', 'Three short pieces you can pull out at any social.', '2 weeks', '6 sessions', 'Intermediate', 'soon']
    ]],
    ['partnerwork', 'Partnerwork', 'Filmed for solo practice first: what your own body has to do before it meets anyone else.', [
      ['partner-01', 'Partnerwork 01', 'Connection and Frame', 'Frame, tone, and the mechanics of leading and following.', '3 weeks', '9 sessions', 'Intermediate', 'soon'],
      ['partner-02', 'Partnerwork 02', 'Leading Shines', 'Open up, let go, and come back on the same count.', '2 weeks', '6 sessions', 'Intermediate', 'soon'],
      ['partner-03', 'Partnerwork 03', 'Musicality Together', 'Two people answering the same break.', '2 weeks', '6 sessions', 'Advanced', 'soon']
    ]],
    ['guest', 'Guest Series', 'A specialist teaches their movement language; Suim shows how it enters salsa.', [
      ['roots-01', 'Roots Lab 01', 'Afro-Cuban into Salsa', 'Where the body mechanic comes from, and how it survives the translation.', '2 weeks', '6 sessions', 'Intermediate', 'open'],
      ['roots-02', 'Roots Lab 02', 'Rumba and Guaguancó', 'Weight, hips and play, taken from rumba into a shine.', '2 weeks', '6 sessions', 'Advanced', 'soon'],
      ['guest-lines', 'Guest Lab 01', 'Performance and Lines', 'Cleaner shapes and stronger transitions, for stage and competition.', '2 weeks', '6 sessions', 'Advanced', 'soon'],
      ['guest-perc', 'Guest Lab 02', 'Body Percussion', 'Rhythm you make yourself, then dance to.', '2 weeks', '6 sessions', 'Intermediate', 'open'],
      ['guest-son', 'Guest Lab 03', 'Cuban Son Roots', 'Where the basic came from, and what that changes.', '2 weeks', '6 sessions', 'All level', 'open'],
      ['guest-contemp', 'Guest Lab 04', 'Contemporary Lines', 'Floor, reach and suspension borrowed from contemporary.', '2 weeks', '6 sessions', 'Advanced', 'soon'],
      ['guest-groove', 'Guest Lab 05', 'Hip-Hop Grooves', 'Bounce and groove that survive salsa timing.', '2 weeks', '6 sessions', 'Intermediate', 'soon'],
      ['guest-flam', 'Guest Lab 06', 'Flamenco Arms', 'Wrists, forearms and intention above the waist.', '2 weeks', '6 sessions', 'Advanced', 'soon']
    ]]
  ],
  ko: [
    ['improvisation', '즉흥', '따라 하기를 멈추고 스스로 고르기 시작합니다. 적은 동작을, 가지고 놀 수 있을 만큼 깊이.', [
      ['improvisation-01', '즉흥 01', '멈추지 않고 춤추기', '샤인을 더 외우지 않고, 이미 아는 것으로 즉흥을 합니다.', '3주', '9개 세션', '중급', 'current'],
      ['flow-01', '플로우 01', '계획 없이 연결하기', '진입과 마무리, 전환. 따로 놀던 동작이 춤으로 읽히기 시작합니다.', '2주', '6개 세션', '중급', 'open'],
      ['improvisation-02', '즉흥 02', '프레이즈 만들기', '더 긴 프리스타일, 더 어려운 조건, 그리고 단조롭지 않은 반복.', '3주', '9개 세션', '중급', 'open'],
      ['improvisation-03', '즉흥 03', '한 곡을 완주하기', '혼자서 한 곡을 구성합니다. 진입, 브레이크, 후렴, 그리고 마무리.', '3주', '9개 세션', '고급', 'soon']
    ]],
    ['move-better', '더 잘 움직이기', '나머지 전부가 올라앉는 토대. 이미 추고 있는 살사를 더 깔끔하게 만듭니다.', [
      ['move-better-01', '더 잘 움직이기 01', '중심과 체중', '체중 이동, 중심, 협응과 방향.', '3주', '9개 세션', '입문', 'open'],
      ['move-better-02', '더 잘 움직이기 02', '라인과 자세', '자세와 척추, 어깨, 그리고 시선이 가는 곳.', '2주', '6개 세션', '입문', 'open'],
      ['move-better-03', '더 잘 움직이기 03', '속도와 컨트롤', '바닥을 놓치지 않고 빠르게, 그리고 의도한 지점에 정확히 멈추기.', '2주', '6개 세션', '중급', 'soon'],
      ['move-better-04', '더 잘 움직이기 04', '몸에서 나오는 팔', '위에 얹는 팔이 아니라 몸에서 나오는 팔.', '2주', '6개 세션', '중급', 'soon'],
      ['move-better-05', '더 잘 움직이기 05', '흔들림 없는 턴', '스팟, 축, 그리고 똑바로 서 있게 하는 원리.', '2주', '6개 세션', '중급', 'soon']
    ]],
    ['shine-language', '샤인 랭귀지', '외우는 목록이 아니라, 변형할 수 있는 계열로 배우는 어휘.', [
      ['shine-01', '샤인 랭귀지 01', '열 개의 계열', '8~10개의 동작 계열을 수십 가지 가능성으로 바꿉니다.', '3주', '9개 세션', '중급', 'open'],
      ['shine-02', '샤인 랭귀지 02', '턴과 스핀', '준비, 스팟, 마무리. 카운트를 놓치지 않고 도는 법.', '3주', '9개 세션', '중급', 'open'],
      ['shine-03', '샤인 랭귀지 03', '풋워크 스피드', '더블, 트리플, 싱코페이션을 깔끔하게 떨어뜨리기.', '2주', '6개 세션', '고급', 'soon'],
      ['shine-04', '샤인 랭귀지 04', '높이와 플로어', '같은 어휘를 아래로 내렸다가 다시 올리기.', '2주', '6개 세션', '고급', 'soon'],
      ['shine-05', '샤인 랭귀지 05', '바디 아이솔레이션', '발과 따로 움직이는 갈비뼈, 골반, 어깨.', '2주', '6개 세션', '중급', 'open'],
      ['shine-06', '샤인 랭귀지 06', '이동하는 샤인', '제자리에 머무르지 않고 공간을 가로지르는 어휘.', '2주', '6개 세션', '중급', 'soon'],
      ['shine-07', '샤인 랭귀지 07', '팔과 손', '발이 바쁜 동안 상체가 하는 일.', '2주', '6개 세션', '고급', 'soon']
    ]],
    ['musicality', '뮤지컬리티', '음악 위에서 추는 것을 멈추고, 음악에 답하기 시작합니다.', [
      ['musicality-01', '뮤지컬리티 01', '브레이크 듣기', '신호를 알아채고, 응답하고, 의도를 가지고 멈춥니다.', '3주', '9개 세션', '중급', 'open'],
      ['musicality-02', '뮤지컬리티 02', '악기에 답하기', '악기 하나를 골라 그 악기가 몸을 결정하게 합니다.', '3주', '9개 세션', '고급', 'soon'],
      ['musicality-03', '뮤지컬리티 03', '손, 팀바, 두라', '같은 스텝, 세 가지 느낌. 그리고 곡이 원하는 쪽을 아는 것.', '2주', '6개 세션', '고급', 'soon'],
      ['musicality-04', '뮤지컬리티 04', '가사에 맞춰 춤추기', '클라베가 아니라 보컬이 다음 8카운트를 정하게 합니다.', '2주', '6개 세션', '고급', 'soon']
    ]],
    ['choreo', '안무', '한 작품을 배우고, 그렇게 만들어진 이유를 이해한 뒤, 직접 바꿉니다.', [
      ['choreo-01', '코레오 랩 01', '배우고, 다시 쓰기', 'Suim의 안무 전체를 배우고 마지막 8카운트를 직접 바꿉니다.', '2주', '6개 세션', '고급', 'open'],
      ['choreo-02', '코레오 랩 02', '퍼포먼스 작품', '무대를 위한 더 긴 루틴. 방향 전환과 제대로 된 엔딩까지.', '3주', '9개 세션', '고급', 'soon'],
      ['choreo-03', '코레오 랩 03', '나만의 64카운트', '직접 만들고, 덜어내고, 64카운트를 완성합니다.', '3주', '9개 세션', '고급', 'soon'],
      ['choreo-04', '코레오 랩 04', '듀엣 작품', '양쪽 파트를 모두 연습할 수 있게 촬영한 2인 루틴.', '3주', '9개 세션', '고급', 'soon'],
      ['choreo-05', '코레오 랩 05', '대회 라운드', '심사받기 위해 만든 90초.', '3주', '9개 세션', '프로', 'soon'],
      ['choreo-06', '코레오 랩 06', '레퍼토리', '어느 소셜에서든 꺼낼 수 있는 짧은 작품 세 개.', '2주', '6개 세션', '중급', 'soon']
    ]],
    ['partnerwork', '파트너워크', '솔로 연습을 우선으로 촬영합니다. 상대를 만나기 전에 내 몸이 해야 할 일부터.', [
      ['partner-01', '파트너워크 01', '커넥션과 프레임', '프레임과 텐션, 그리고 리드와 팔로우의 메커니즘.', '3주', '9개 세션', '중급', 'soon'],
      ['partner-02', '파트너워크 02', '샤인 리드하기', '열어주고, 놓아주고, 같은 카운트로 돌아오기.', '2주', '6개 세션', '중급', 'soon'],
      ['partner-03', '파트너워크 03', '함께하는 뮤지컬리티', '같은 브레이크에 두 사람이 함께 답하기.', '2주', '6개 세션', '고급', 'soon']
    ]],
    ['guest', '게스트 시리즈', '전문가가 자신의 움직임 언어를 가르치고, Suim이 그것이 살사로 들어오는 길을 보여줍니다.', [
      ['roots-01', '루츠 랩 01', '아프로쿠반에서 살사로', '그 몸의 원리가 어디서 왔고, 어떻게 살사로 옮겨오는지.', '2주', '6개 세션', '중급', 'open'],
      ['roots-02', '루츠 랩 02', '룸바와 구아구앙코', '룸바의 무게와 골반, 그 놀이를 샤인으로 가져옵니다.', '2주', '6개 세션', '고급', 'soon'],
      ['guest-lines', '게스트 랩 01', '퍼포먼스와 라인', '무대와 대회를 위한 더 깨끗한 형태와 더 강한 전환.', '2주', '6개 세션', '고급', 'soon'],
      ['guest-perc', '게스트 랩 02', '바디 퍼커션', '직접 만든 리듬 위에서 춤추기.', '2주', '6개 세션', '중급', 'open'],
      ['guest-son', '게스트 랩 03', '쿠반 손의 뿌리', '기본 스텝이 어디서 왔는지, 그리고 그것이 무엇을 바꾸는지.', '2주', '6개 세션', '전체 레벨', 'open'],
      ['guest-contemp', '게스트 랩 04', '컨템포러리 라인', '컨템포러리에서 가져온 플로어, 뻗음, 그리고 서스펜션.', '2주', '6개 세션', '고급', 'soon'],
      ['guest-groove', '게스트 랩 05', '힙합 그루브', '살사 타이밍 위에서도 살아남는 바운스와 그루브.', '2주', '6개 세션', '중급', 'soon'],
      ['guest-flam', '게스트 랩 06', '플라멩코 팔', '손목과 팔뚝, 그리고 허리 위의 의도.', '2주', '6개 세션', '고급', 'soon']
    ]]
  ]
};

/* Hard-coded prototype state: just subscribed, partway through session 1. */
export const STATE = { module: 'improvisation-01', session: 1, unit: 3, unitsDone: 2 };
export const UNIT_COUNT = 6;

export const durationOf = i => ['18 min', '17 min', '19 min', '18 min', '16 min', '21 min', '18 min', '16 min', '22 min'][i];
