/* The catalogue, as data.

   Ported from the prototype's assets/program-data.js, with every text field
   reshaped as { en, ko } — the same shape as the jsonb columns in the P1 schema
   (see docs/BUILD-PLAN.md §3). That is the point of this file: it is the seam.
   In P1 these exports are replaced by Supabase queries returning the same types,
   and the components above them do not change.

   Progress (STATE, RECENT, SAVED, PRACTISED, WEEK) is still the prototype's
   hard-coded dancer: just subscribed, partway through session 1. It becomes
   real in P4, out of the practice_events table. */

export type Lang = 'en' | 'ko';
export type Localized = Record<Lang, string>;

/** Where the language choice is kept so the server can set <html lang> on the
    first paint. Seeded from profiles.locale at sign-in once P1 lands. */
export const LANG_COOKIE = 'suim-lang';
export const isLang = (value: unknown): value is Lang => value === 'en' || value === 'ko';

/** Reads a localized field, falling back to English when a translation is missing. */
export const t = (value: Localized, lang: Lang): string => value[lang] || value.en;

/* Levels describe the material, not the dancer, and they are not a ladder:
   a session late in a module can still be All level. */
export type LevelKey = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'pro';
export const LEVEL_ORDER: LevelKey[] = ["all", "beginner", "intermediate", "advanced", "pro"];

/** draft/soon/open in the schema; 'current' is the one module built out. */
export type ProgramStatus = 'current' | 'open' | 'soon';

/** The six steps of the method, always in this order. A session is these six. */
export type StepKey = "watch" | "understand" | "train" | "drill" | "transform" | "improvise";
export const DRILLABLE_STEPS: StepKey[] = ['train', 'drill'];

export interface Program {
  id: string;
  title: Localized;
  subtitle: Localized;
  promise: Localized;
  weeks: Localized;
  sessions: Localized;
  level: Localized;
  status: ProgramStatus;
}

export interface Area {
  id: string;
  name: Localized;
  blurb: Localized;
  programs: Program[];
}

/* A session is an ordered sequence of videos, each tagged with one of the six
   method steps.

   It is NOT six videos, one per step. A session may have no UNDERSTAND video at
   all, or two TRAIN videos, or three IMPROVISE ones. The six steps are the
   method's vocabulary — what a video is for — not a fixed set of slots. Order
   inside the session is `position`, which is authoritative; step order is only
   what the back office suggests when a video is added. */
export interface SessionVideo {
  id: string;
  step: StepKey;
  /** 1-based order within its session. Unique per session. */
  position: number;
  title: Localized;
  description: Localized;
  /** m:ss, as authored. Becomes videos.duration_ms once real footage lands. */
  length: string;
  /** Repeated on a loop, so it can go in a drill. Follows the step. */
  isDrillable: boolean;
}

export interface SessionRow {
  position: number;
  title: Localized;
  outcome: Localized;
  focus: Localized;
  levels: LevelKey[];
  duration: string;
  videos: SessionVideo[];
}

/** One of the six steps of the method — the vocabulary, not a slot. */
export interface MethodStep {
  key: StepKey;
  name: Localized;
  description: Localized;
  shortName: Localized;
  /** Train and drill are the two you repeat; the rest explain or improvise. */
  drillable: boolean;
  /** Stand-in length while every video is a placeholder. */
  placeholderLength: string;
}

export const LEVEL_LABELS: Record<LevelKey, Localized> = {
  all: { en: "All level", ko: "전체 레벨" },
  beginner: { en: "Beginner", ko: "입문" },
  intermediate: { en: "Intermediate", ko: "중급" },
  advanced: { en: "Advanced", ko: "고급" },
  pro: { en: "Pro", ko: "프로" },
};

export const AREAS: Area[] = [
  {
    id: "improvisation",
    name: { en: "Improvisation", ko: "즉흥" },
    blurb: { en: "Stop copying and start choosing. Fewer movements, understood deeply enough to play with.", ko: "따라 하기를 멈추고 스스로 고르기 시작합니다. 적은 동작을, 가지고 놀 수 있을 만큼 깊이." },
    programs: [
    {
      id: "improvisation-01",
      title: { en: "Improvisation 01", ko: "즉흥 01" },
      subtitle: { en: "Stop Freezing", ko: "멈추지 않고 춤추기" },
      promise: { en: "Improvise with what you already know, without memorising more shines.", ko: "샤인을 더 외우지 않고, 이미 아는 것으로 즉흥을 합니다." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "current",
    },
    {
      id: "flow-01",
      title: { en: "Flow 01", ko: "플로우 01" },
      subtitle: { en: "Connect Without Planning", ko: "계획 없이 연결하기" },
      promise: { en: "Entries, exits and transitions, so separate movements start reading as dancing.", ko: "진입과 마무리, 전환. 따로 놀던 동작이 춤으로 읽히기 시작합니다." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "open",
    },
    {
      id: "improvisation-02",
      title: { en: "Improvisation 02", ko: "즉흥 02" },
      subtitle: { en: "Build Phrases", ko: "프레이즈 만들기" },
      promise: { en: "Longer freestyles, harder constraints, and repetition that never looks repetitive.", ko: "더 긴 프리스타일, 더 어려운 조건, 그리고 단조롭지 않은 반복." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "open",
    },
    {
      id: "improvisation-03",
      title: { en: "Improvisation 03", ko: "즉흥 03" },
      subtitle: { en: "Dance the Whole Song", ko: "한 곡을 완주하기" },
      promise: { en: "Structure a full song alone: entrances, breaks, choruses and an ending.", ko: "혼자서 한 곡을 구성합니다. 진입, 브레이크, 후렴, 그리고 마무리." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    ],
  },
  {
    id: "move-better",
    name: { en: "Move Better", ko: "더 잘 움직이기" },
    blurb: { en: "The foundation everything else sits on. Make the salsa you already have look cleaner.", ko: "나머지 전부가 올라앉는 토대. 이미 추고 있는 살사를 더 깔끔하게 만듭니다." },
    programs: [
    {
      id: "move-better-01",
      title: { en: "Move Better 01", ko: "더 잘 움직이기 01" },
      subtitle: { en: "Grounding and Weight", ko: "중심과 체중" },
      promise: { en: "Weight transfer, grounding, coordination and direction.", ko: "체중 이동, 중심, 협응과 방향." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Beginner", ko: "입문" },
      status: "open",
    },
    {
      id: "move-better-02",
      title: { en: "Move Better 02", ko: "더 잘 움직이기 02" },
      subtitle: { en: "Lines and Posture", ko: "라인과 자세" },
      promise: { en: "Posture, spine, shoulders, and where your eyes go.", ko: "자세와 척추, 어깨, 그리고 시선이 가는 곳." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Beginner", ko: "입문" },
      status: "open",
    },
    {
      id: "move-better-03",
      title: { en: "Move Better 03", ko: "더 잘 움직이기 03" },
      subtitle: { en: "Speed and Control", ko: "속도와 컨트롤" },
      promise: { en: "Move faster without losing the floor, and stop exactly where you meant to.", ko: "바닥을 놓치지 않고 빠르게, 그리고 의도한 지점에 정확히 멈추기." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "soon",
    },
    {
      id: "move-better-04",
      title: { en: "Move Better 04", ko: "더 잘 움직이기 04" },
      subtitle: { en: "Arms That Belong", ko: "몸에서 나오는 팔" },
      promise: { en: "Arms that come out of the body instead of being added on top.", ko: "위에 얹는 팔이 아니라 몸에서 나오는 팔." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "soon",
    },
    {
      id: "move-better-05",
      title: { en: "Move Better 05", ko: "더 잘 움직이기 05" },
      subtitle: { en: "Turns Without Wobble", ko: "흔들림 없는 턴" },
      promise: { en: "Spotting, axis, and the mechanics of staying upright.", ko: "스팟, 축, 그리고 똑바로 서 있게 하는 원리." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "soon",
    },
    ],
  },
  {
    id: "shine-language",
    name: { en: "Shine Language", ko: "샤인 랭귀지" },
    blurb: { en: "Vocabulary taught as families you can transform, not lists you memorise.", ko: "외우는 목록이 아니라, 변형할 수 있는 계열로 배우는 어휘." },
    programs: [
    {
      id: "shine-01",
      title: { en: "Shine Language 01", ko: "샤인 랭귀지 01" },
      subtitle: { en: "Ten Families", ko: "열 개의 계열" },
      promise: { en: "Turn eight to ten movement families into dozens of possibilities.", ko: "8~10개의 동작 계열을 수십 가지 가능성으로 바꿉니다." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "open",
    },
    {
      id: "shine-02",
      title: { en: "Shine Language 02", ko: "샤인 랭귀지 02" },
      subtitle: { en: "Turns and Spins", ko: "턴과 스핀" },
      promise: { en: "Preparation, spot and exit — turning without losing the count.", ko: "준비, 스팟, 마무리. 카운트를 놓치지 않고 도는 법." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "open",
    },
    {
      id: "shine-03",
      title: { en: "Shine Language 03", ko: "샤인 랭귀지 03" },
      subtitle: { en: "Footwork Speed", ko: "풋워크 스피드" },
      promise: { en: "Doubles, triples and syncopation that still land clean.", ko: "더블, 트리플, 싱코페이션을 깔끔하게 떨어뜨리기." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "shine-04",
      title: { en: "Shine Language 04", ko: "샤인 랭귀지 04" },
      subtitle: { en: "Levels and Floor", ko: "높이와 플로어" },
      promise: { en: "Take the same vocabulary down, and bring it back up.", ko: "같은 어휘를 아래로 내렸다가 다시 올리기." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "shine-05",
      title: { en: "Shine Language 05", ko: "샤인 랭귀지 05" },
      subtitle: { en: "Body Isolation", ko: "바디 아이솔레이션" },
      promise: { en: "Ribcage, hips and shoulders moving independently of the feet.", ko: "발과 따로 움직이는 갈비뼈, 골반, 어깨." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "open",
    },
    {
      id: "shine-06",
      title: { en: "Shine Language 06", ko: "샤인 랭귀지 06" },
      subtitle: { en: "Travelling Shines", ko: "이동하는 샤인" },
      promise: { en: "Vocabulary that covers ground instead of staying on the spot.", ko: "제자리에 머무르지 않고 공간을 가로지르는 어휘." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "soon",
    },
    {
      id: "shine-07",
      title: { en: "Shine Language 07", ko: "샤인 랭귀지 07" },
      subtitle: { en: "Arms and Hands", ko: "팔과 손" },
      promise: { en: "What the upper body does while the feet are busy.", ko: "발이 바쁜 동안 상체가 하는 일." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    ],
  },
  {
    id: "musicality",
    name: { en: "Musicality", ko: "뮤지컬리티" },
    blurb: { en: "Stop dancing on top of the music and start answering it.", ko: "음악 위에서 추는 것을 멈추고, 음악에 답하기 시작합니다." },
    programs: [
    {
      id: "musicality-01",
      title: { en: "Musicality 01", ko: "뮤지컬리티 01" },
      subtitle: { en: "Hear the Break", ko: "브레이크 듣기" },
      promise: { en: "Recognise a cue, answer it, and hold a pause on purpose.", ko: "신호를 알아채고, 응답하고, 의도를 가지고 멈춥니다." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "open",
    },
    {
      id: "musicality-02",
      title: { en: "Musicality 02", ko: "뮤지컬리티 02" },
      subtitle: { en: "Answer the Instruments", ko: "악기에 답하기" },
      promise: { en: "Pick an instrument and let it decide what your body does.", ko: "악기 하나를 골라 그 악기가 몸을 결정하게 합니다." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "musicality-03",
      title: { en: "Musicality 03", ko: "뮤지컬리티 03" },
      subtitle: { en: "Son, Timba, Dura", ko: "손, 팀바, 두라" },
      promise: { en: "Same steps, three feels — and knowing which one the song is asking for.", ko: "같은 스텝, 세 가지 느낌. 그리고 곡이 원하는 쪽을 아는 것." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "musicality-04",
      title: { en: "Musicality 04", ko: "뮤지컬리티 04" },
      subtitle: { en: "Dance the Lyrics", ko: "가사에 맞춰 춤추기" },
      promise: { en: "Let the singer, not the clave, decide the next eight counts.", ko: "클라베가 아니라 보컬이 다음 8카운트를 정하게 합니다." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    ],
  },
  {
    id: "choreo",
    name: { en: "Choreography", ko: "안무" },
    blurb: { en: "Learn a full piece, understand why it is built that way, then change it.", ko: "한 작품을 배우고, 그렇게 만들어진 이유를 이해한 뒤, 직접 바꿉니다." },
    programs: [
    {
      id: "choreo-01",
      title: { en: "Choreo Lab 01", ko: "코레오 랩 01" },
      subtitle: { en: "Learn, Then Rewrite", ko: "배우고, 다시 쓰기" },
      promise: { en: "A complete Suim choreography — then you replace the last eight counts.", ko: "Suim의 안무 전체를 배우고 마지막 8카운트를 직접 바꿉니다." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "open",
    },
    {
      id: "choreo-02",
      title: { en: "Choreo Lab 02", ko: "코레오 랩 02" },
      subtitle: { en: "Performance Piece", ko: "퍼포먼스 작품" },
      promise: { en: "A longer routine built for stage, with facings and a real ending.", ko: "무대를 위한 더 긴 루틴. 방향 전환과 제대로 된 엔딩까지." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "choreo-03",
      title: { en: "Choreo Lab 03", ko: "코레오 랩 03" },
      subtitle: { en: "Make Your Own 64", ko: "나만의 64카운트" },
      promise: { en: "Build, cut and finish sixty-four counts that are yours.", ko: "직접 만들고, 덜어내고, 64카운트를 완성합니다." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "choreo-04",
      title: { en: "Choreo Lab 04", ko: "코레오 랩 04" },
      subtitle: { en: "Duet Piece", ko: "듀엣 작품" },
      promise: { en: "A two-body routine, filmed so you can drill either side.", ko: "양쪽 파트를 모두 연습할 수 있게 촬영한 2인 루틴." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "choreo-05",
      title: { en: "Choreo Lab 05", ko: "코레오 랩 05" },
      subtitle: { en: "Competition Round", ko: "대회 라운드" },
      promise: { en: "Ninety seconds built to be judged.", ko: "심사받기 위해 만든 90초." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Pro", ko: "프로" },
      status: "soon",
    },
    {
      id: "choreo-06",
      title: { en: "Choreo Lab 06", ko: "코레오 랩 06" },
      subtitle: { en: "Repertoire", ko: "레퍼토리" },
      promise: { en: "Three short pieces you can pull out at any social.", ko: "어느 소셜에서든 꺼낼 수 있는 짧은 작품 세 개." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "soon",
    },
    ],
  },
  {
    id: "partnerwork",
    name: { en: "Partnerwork", ko: "파트너워크" },
    blurb: { en: "Filmed for solo practice first: what your own body has to do before it meets anyone else.", ko: "솔로 연습을 우선으로 촬영합니다. 상대를 만나기 전에 내 몸이 해야 할 일부터." },
    programs: [
    {
      id: "partner-01",
      title: { en: "Partnerwork 01", ko: "파트너워크 01" },
      subtitle: { en: "Connection and Frame", ko: "커넥션과 프레임" },
      promise: { en: "Frame, tone, and the mechanics of leading and following.", ko: "프레임과 텐션, 그리고 리드와 팔로우의 메커니즘." },
      weeks: { en: "3 weeks", ko: "3주" },
      sessions: { en: "9 sessions", ko: "9개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "soon",
    },
    {
      id: "partner-02",
      title: { en: "Partnerwork 02", ko: "파트너워크 02" },
      subtitle: { en: "Leading Shines", ko: "샤인 리드하기" },
      promise: { en: "Open up, let go, and come back on the same count.", ko: "열어주고, 놓아주고, 같은 카운트로 돌아오기." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "soon",
    },
    {
      id: "partner-03",
      title: { en: "Partnerwork 03", ko: "파트너워크 03" },
      subtitle: { en: "Musicality Together", ko: "함께하는 뮤지컬리티" },
      promise: { en: "Two people answering the same break.", ko: "같은 브레이크에 두 사람이 함께 답하기." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    ],
  },
  {
    id: "guest",
    name: { en: "Guest Series", ko: "게스트 시리즈" },
    blurb: { en: "A specialist teaches their movement language; Suim shows how it enters salsa.", ko: "전문가가 자신의 움직임 언어를 가르치고, Suim이 그것이 살사로 들어오는 길을 보여줍니다." },
    programs: [
    {
      id: "roots-01",
      title: { en: "Roots Lab 01", ko: "루츠 랩 01" },
      subtitle: { en: "Afro-Cuban into Salsa", ko: "아프로쿠반에서 살사로" },
      promise: { en: "Where the body mechanic comes from, and how it survives the translation.", ko: "그 몸의 원리가 어디서 왔고, 어떻게 살사로 옮겨오는지." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "open",
    },
    {
      id: "roots-02",
      title: { en: "Roots Lab 02", ko: "루츠 랩 02" },
      subtitle: { en: "Rumba and Guaguancó", ko: "룸바와 구아구앙코" },
      promise: { en: "Weight, hips and play, taken from rumba into a shine.", ko: "룸바의 무게와 골반, 그 놀이를 샤인으로 가져옵니다." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "guest-lines",
      title: { en: "Guest Lab 01", ko: "게스트 랩 01" },
      subtitle: { en: "Performance and Lines", ko: "퍼포먼스와 라인" },
      promise: { en: "Cleaner shapes and stronger transitions, for stage and competition.", ko: "무대와 대회를 위한 더 깨끗한 형태와 더 강한 전환." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "guest-perc",
      title: { en: "Guest Lab 02", ko: "게스트 랩 02" },
      subtitle: { en: "Body Percussion", ko: "바디 퍼커션" },
      promise: { en: "Rhythm you make yourself, then dance to.", ko: "직접 만든 리듬 위에서 춤추기." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "open",
    },
    {
      id: "guest-son",
      title: { en: "Guest Lab 03", ko: "게스트 랩 03" },
      subtitle: { en: "Cuban Son Roots", ko: "쿠반 손의 뿌리" },
      promise: { en: "Where the basic came from, and what that changes.", ko: "기본 스텝이 어디서 왔는지, 그리고 그것이 무엇을 바꾸는지." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "All level", ko: "전체 레벨" },
      status: "open",
    },
    {
      id: "guest-contemp",
      title: { en: "Guest Lab 04", ko: "게스트 랩 04" },
      subtitle: { en: "Contemporary Lines", ko: "컨템포러리 라인" },
      promise: { en: "Floor, reach and suspension borrowed from contemporary.", ko: "컨템포러리에서 가져온 플로어, 뻗음, 그리고 서스펜션." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    {
      id: "guest-groove",
      title: { en: "Guest Lab 05", ko: "게스트 랩 05" },
      subtitle: { en: "Hip-Hop Grooves", ko: "힙합 그루브" },
      promise: { en: "Bounce and groove that survive salsa timing.", ko: "살사 타이밍 위에서도 살아남는 바운스와 그루브." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Intermediate", ko: "중급" },
      status: "soon",
    },
    {
      id: "guest-flam",
      title: { en: "Guest Lab 06", ko: "게스트 랩 06" },
      subtitle: { en: "Flamenco Arms", ko: "플라멩코 팔" },
      promise: { en: "Wrists, forearms and intention above the waist.", ko: "손목과 팔뚝, 그리고 허리 위의 의도." },
      weeks: { en: "2 weeks", ko: "2주" },
      sessions: { en: "6 sessions", ko: "6개 세션" },
      level: { en: "Advanced", ko: "고급" },
      status: "soon",
    },
    ],
  },
];

const SESSION_META: Omit<SessionRow, 'videos'>[] = [
  {
    position: 1,
    title: { en: "One Step, Many Possibilities", ko: "하나의 스텝, 여러 가능성" },
    outcome: { en: "Transform a Suzie Q through direction and size.", ko: "수지큐를 방향과 크기로 변형합니다." },
    focus: { en: "direction and size", ko: "방향과 크기" },
    levels: ["all", "beginner"],
    duration: "18 min",
  },
  {
    position: 2,
    title: { en: "Change the Rhythm", ko: "리듬 바꾸기" },
    outcome: { en: "Use holds and syncopation without adding vocabulary.", ko: "동작을 늘리지 않고 홀드와 싱코페이션을 사용합니다." },
    focus: { en: "rhythm", ko: "리듬" },
    levels: ["beginner", "intermediate"],
    duration: "17 min",
  },
  {
    position: 3,
    title: { en: "Connect Without Planning", ko: "계획 없이 연결하기" },
    outcome: { en: "Move among basic, Suzie Q and crossover.", ko: "기본, 수지큐, 크로스오버 사이를 오갑니다." },
    focus: { en: "transitions", ko: "연결" },
    levels: ["all", "intermediate"],
    duration: "19 min",
  },
  {
    position: 4,
    title: { en: "Repeat Without Looking Repetitive", ko: "반복하되 단조롭지 않게" },
    outcome: { en: "Use repetition with changing energy or direction.", ko: "에너지나 방향을 바꾸며 반복합니다." },
    focus: { en: "energy", ko: "에너지" },
    levels: ["all", "intermediate"],
    duration: "18 min",
  },
  {
    position: 5,
    title: { en: "Change Direction", ko: "방향 바꾸기" },
    outcome: { en: "Travel intentionally through the space.", ko: "공간 안에서 의도를 가지고 이동합니다." },
    focus: { en: "travel", ko: "이동" },
    levels: ["all", "beginner"],
    duration: "16 min",
  },
  {
    position: 6,
    title: { en: "Create Eight Counts", ko: "8카운트 만들기" },
    outcome: { en: "Make and repeat a short phrase that is yours.", ko: "나만의 짧은 프레이즈를 만들고 반복합니다." },
    focus: { en: "phrasing", ko: "프레이즈" },
    levels: ["intermediate", "advanced"],
    duration: "21 min",
  },
  {
    position: 7,
    title: { en: "React to Rhythm", ko: "리듬에 반응하기" },
    outcome: { en: "Recognise and answer a simple musical cue.", ko: "간단한 음악적 신호를 알아채고 응답합니다." },
    focus: { en: "musical cues", ko: "음악 신호" },
    levels: ["intermediate", "advanced"],
    duration: "18 min",
  },
  {
    position: 8,
    title: { en: "Use Pauses", ko: "멈춤 사용하기" },
    outcome: { en: "Hold with intention, then restart confidently.", ko: "의도를 가지고 멈추고, 자신 있게 다시 시작합니다." },
    focus: { en: "pauses", ko: "멈춤" },
    levels: ["all", "advanced"],
    duration: "16 min",
  },
  {
    position: 9,
    title: { en: "Sixty-Second Freestyle", ko: "60초 프리스타일" },
    outcome: { en: "Dance on your own with the prompts falling away.", ko: "안내가 줄어드는 가운데 스스로 춤춥니다." },
    focus: { en: "free choice", ko: "자유 선택" },
    levels: ["advanced", "pro"],
    duration: "22 min",
  },
];

/* The six steps of the method, always in this order. Every session draws from
   this vocabulary; none is obliged to use all six, and any of them may appear
   more than once. */
export const STEPS: MethodStep[] = [
  {
    key: "watch",
    name: { en: "WATCH", ko: "보기" },
    placeholderLength: "0:20",
    description: { en: "The whole thing danced to music, before any explanation.", ko: "설명에 앞서, 음악에 맞춘 완성된 모습을 봅니다." },
    shortName: { en: "See where this goes", ko: "도착점 보기" },
    drillable: false,
  },
  {
    key: "understand",
    name: { en: "UNDERSTAND", ko: "이해하기" },
    placeholderLength: "4:00",
    description: { en: "One idea, and no more than three cues that change how it feels.", ko: "하나의 아이디어와, 감각을 바꾸는 최대 세 가지 큐." },
    shortName: { en: "The idea and the cues", ko: "아이디어와 큐" },
    drillable: false,
  },
  {
    key: "train",
    name: { en: "TRAIN", ko: "훈련하기" },
    placeholderLength: "3:00",
    description: { en: "Build the base slowly, with counts and the styling stripped out.", ko: "스타일링을 걷어내고 카운트로 기본을 천천히 쌓습니다." },
    shortName: { en: "Build the base", ko: "기본 쌓기" },
    drillable: true,
  },
  {
    key: "drill",
    name: { en: "DRILL", ko: "반복하기" },
    placeholderLength: "4:00",
    description: { en: "Follow view. Repeat to music until it stops needing your attention.", ko: "후면 뷰. 신경 쓰지 않아도 나올 때까지 음악에 맞춰 반복합니다." },
    shortName: { en: "Repeat it to music", ko: "음악에 맞춰 반복" },
    drillable: true,
  },
  {
    key: "transform",
    name: { en: "TRANSFORM", ko: "변형하기" },
    placeholderLength: "3:40",
    description: { en: "Change one variable and compare the result against the base.", ko: "한 가지 변수를 바꾸고 기본형과 비교합니다." },
    shortName: { en: "Change one thing", ko: "하나만 바꾸기" },
    drillable: false,
  },
  {
    key: "improvise",
    name: { en: "IMPROVISE", ko: "즉흥하기" },
    placeholderLength: "3:00",
    description: { en: "One rule, a timer, and no demonstration to copy.", ko: "규칙 하나와 타이머, 따라 할 시범은 없습니다." },
    shortName: { en: "Your turn", ko: "나의 차례" },
    drillable: false,
  },
];

export const STEP_ORDER: StepKey[] = STEPS.map(s => s.key);
export const stepOf = (key: StepKey): MethodStep => STEPS.find(s => s.key === key)!;

/* Which videos each session actually has, in order.

   Most sessions run the method straight through, but they are not obliged to.
   Session 06 builds a phrase and needs two TRAIN videos to do it; session 09 is
   the closing freestyle, so it introduces no new idea (no UNDERSTAND) and ends
   on two IMPROVISE videos. Both are placeholder shapes — the real plan comes out
   of the back office once filming starts — but they are here so nothing in the
   app can quietly go back to assuming six. */
const SESSION_PLAN: StepKey[][] = [
  ['watch', 'understand', 'train', 'drill', 'transform', 'improvise'],              /* 01 */
  ['watch', 'understand', 'train', 'drill', 'transform', 'improvise'],              /* 02 */
  ['watch', 'understand', 'train', 'drill', 'transform', 'improvise'],              /* 03 */
  ['watch', 'understand', 'train', 'drill', 'transform', 'improvise'],              /* 04 */
  ['watch', 'understand', 'train', 'drill', 'transform', 'improvise'],              /* 05 */
  ['watch', 'understand', 'train', 'train', 'drill', 'transform', 'improvise'],     /* 06 — two TRAIN */
  ['watch', 'understand', 'train', 'drill', 'transform', 'improvise'],              /* 07 */
  ['watch', 'understand', 'train', 'drill', 'transform', 'improvise'],              /* 08 */
  ['watch', 'train', 'drill', 'transform', 'improvise', 'improvise'],               /* 09 — no UNDERSTAND, two IMPROVISE */
];

/* Until real footage is authored, a video's copy comes from its step — the
   videos table gives every row its own title_t and description_t, so this is a
   stand-in, not the model. Where a step appears twice in one session the title
   is numbered, because two videos called "Build the base" is a bug on screen. */
function buildVideos(sessionNo: number, plan: StepKey[]): SessionVideo[] {
  const totals = plan.reduce<Partial<Record<StepKey, number>>>(
    (acc, key) => ({ ...acc, [key]: (acc[key] ?? 0) + 1 }), {});
  const seen: Partial<Record<StepKey, number>> = {};

  return plan.map((key, i) => {
    const step = stepOf(key);
    const nth = (seen[key] = (seen[key] ?? 0) + 1);
    const repeated = (totals[key] ?? 0) > 1;
    const suffix = repeated ? ` ${nth}` : '';
    return {
      id: `s${sessionNo}-v${i + 1}`,
      step: key,
      position: i + 1,
      title: { en: step.shortName.en + suffix, ko: step.shortName.ko + suffix },
      description: step.description,
      length: step.placeholderLength,
      isDrillable: step.drillable,
    };
  });
}

export const SESSIONS: SessionRow[] = SESSION_META.map((meta, i) => ({
  ...meta,
  videos: buildVideos(i + 1, SESSION_PLAN[i]),
}));

/* ---- reading a session -------------------------------------------------- */

/** The steps this session actually uses, in the order they first appear. */
export const stepsPresent = (session: SessionRow): StepKey[] =>
  [...new Set(session.videos.map(v => v.step))];

/** Every video in this session tagged with that step — none, one, or several. */
export const videosOfStep = (session: SessionRow, step: StepKey): SessionVideo[] =>
  session.videos.filter(v => v.step === step);

/** The videos that can go into a drill: the ones you repeat on a loop. */
export const drillableVideos = (session: SessionRow): SessionVideo[] =>
  session.videos.filter(v => v.isDrillable);

export const videoCount = (session: SessionRow): number => session.videos.length;

export const videoAt = (session: SessionRow, position: number): SessionVideo | undefined =>
  session.videos.find(v => v.position === position);


/* ---- the prototype dancer, until P4 replaces it with practice_events ---- */

export const STATE = {
  program: "improvisation-01",
  session: 1,
  step: 3,
  stepsDone: 2,
  sessionsDone: 0,
  minutes: 12,
  loops: 4,
  streak: 1,
  weekTarget: 3,
  weekDone: 1,
  /** 0 = Monday */
  today: 3,
} as const;

/** Newest first: [session, step (1-based), when, what]. */
export const RECENT: [number, number, string, string][] = [[1,2,"today","completed"],[1,1,"today","completed"],[1,3,"yesterday","started"],[5,1,"days3","watched"]];

/** A whole session when the step is null, otherwise one video. */
export const SAVED: [number, number | null][] = [[1,4],[6,null],[2,3]];

/** Videos already trained, as [session, step]. Richer than STATE on purpose,
    so My drills has a library to build from. */
export const PRACTISED: [number, number][] = [[1,3],[1,4],[2,3],[2,4],[3,3],[3,4],[4,4],[5,3],[5,4]];

export const CHAINS: { name: Localized; items: [number, number][] }[] = [
  { name: { en: "Direction & size", ko: "방향과 크기" }, items: [[1, 4], [1, 3]] },
  { name: { en: "Rhythm reset", ko: "리듬 리셋" }, items: [[2, 4], [3, 4]] },
];

/** One entry per run: day (0 = Monday) and which saved drill. */
export const WEEK: { day: number; drill: number; done: boolean }[] = [{"day":0,"drill":0,"done":true},{"day":0,"drill":0,"done":true},{"day":1,"drill":1,"done":false},{"day":2,"drill":1,"done":true},{"day":4,"drill":0,"done":false}];

/* ---- derived ------------------------------------------------------------- */

export const ALL_PROGRAMS = AREAS.flatMap(a => a.programs);
export const PROGRAM_COUNT = ALL_PROGRAMS.length;
export const AREA_COUNT = AREAS.length;

export const areaOf = (programId: string): Area | undefined =>
  AREAS.find(a => a.programs.some(p => p.id === programId));

/** The one module built out. Every other card is catalogue depth, not a link. */
export const currentProgram = (): Program | undefined =>
  ALL_PROGRAMS.find(p => p.status === 'current');
