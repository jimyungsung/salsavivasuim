import type { Metadata } from 'next';
import LegalDoc, { type Doc } from '../legal/LegalDoc';
import { OPERATOR } from '@/lib/operator';
import type { Lang } from '@/lib/i18n';
import '../legal/legal.css';

export const metadata: Metadata = { title: 'Privacy policy', description: 'What Everyday Salsa keeps about you, why, and for how long.' };

/* DRAFT for review. Written against what the code actually collects (October
   2026): account, profile, the member's week, the practice log, three small
   items in the browser, and the services below. Keep it in step: a new kind of
   data or a new processor means a new line here before it ships. */

const O = OPERATOR;

const DOC: Record<Lang, Doc> = {
  en: {
    title: 'Privacy policy',
    lede: `Everyday Salsa is a solo salsa practice service: a short routine each day, on video. This page says what we keep about you, why, who helps us run it, and what you can ask of us. ${O.name} is responsible for your data (the "controller").`,
    sections: [
      {
        h: 'What we keep',
        body: [
          { list: [
            'Your account: your email address, used to send you sign-in links. If you sign in with Google, Google tells us your email and name.',
            'Your profile: the name we greet you by, your language, and the one question we ask when you join (where you are starting from).',
            'Your week: the menu you are on and when you started it, the exercises on each day, and the days you mark done.',
            'Your practice: when you play an exercise, for how long, at what speed, how many times you loop it and whether you watched it through. This is what your streak and minutes are made of.',
          ] },
          'We do not ask for your address, your birthday or any payment details. We do not use advertising or analytics tools, and we do not sell your data.',
        ],
      },
      {
        h: 'Why we keep it',
        body: [
          { list: [
            'To give you the service you signed up for: your account, your week, the player, your progress. (Performing our agreement with you.)',
            'To keep the service working and safe, for example finding the cause of an error. (Our legitimate interest in running a reliable service.)',
          ] },
          'We do not use your data for anything else without asking you first.',
        ],
      },
      {
        h: 'What is stored in your browser',
        body: [
          'Only what the service needs to work. No tracking cookies.',
          { list: [
            'Sign-in cookies, so you stay signed in.',
            'A language cookie (suim-lang), so the site stays in English or Korean.',
            'A time zone cookie (suim-tz), so "today" and your streak follow your clock, not ours.',
            'Your playback speed, kept in your browser’s local storage.',
          ] },
        ],
      },
      {
        h: 'Who helps us run it',
        body: [
          'A few companies process data on our behalf, only to run the service:',
          { list: [
            'Supabase: our database and sign-in, including the emails with your sign-in links. Your data is stored in Seoul, South Korea.',
            'Vercel: hosting. Pages are served from Seoul, through a worldwide network that may handle requests outside Korea.',
            'Cloudflare: delivering the exercise videos, through its worldwide network.',
            'Google: only if you choose to sign in with Google. The site also loads its fonts from Google, which means Google sees your IP address when a page loads.',
          ] },
          'Some of these companies are based in the United States, so your data may be handled outside Korea or your country. They are bound by contract to protect it and to use it only for us.',
        ],
      },
      {
        h: 'How long we keep it',
        body: [
          'For as long as you have an account. When you delete your account, your profile, your week and your practice log are deleted straight away. Copies in our providers’ backups are overwritten within 30 days.',
        ],
      },
      {
        h: 'Your rights',
        body: [
          'You can ask to see the data we keep about you, correct it, get a copy, or have it deleted, and you can object to how we use it. You can delete your account yourself at any time from the menu under your name (Account). For anything else, write to us at the address below; we answer within 30 days.',
          'If you are in the European Union or the United Kingdom, you can also complain to your data protection authority. In Korea, you can contact the Personal Information Protection Commission or the Korea Internet & Security Agency’s privacy centre (국번없이 118).',
        ],
      },
      {
        h: 'Age',
        body: ['Everyday Salsa is for people aged 14 and over. If you are younger, please do not create an account.'],
      },
      {
        h: 'Changes',
        body: ['If we change this policy, we will update the date at the top, and tell you in the app or by email before a significant change takes effect. A paid plan, when it comes, will add payment details to this page first.'],
      },
      {
        h: 'Contact',
        body: [`${O.name}. Privacy officer: ${O.privacyOfficer}. Email: ${O.email}.`],
      },
    ],
  },
  ko: {
    title: '개인정보 처리방침',
    lede: `Everyday Salsa는 매일 짧은 루틴을 영상으로 연습하는 솔로 살사 서비스입니다. 이 문서는 어떤 개인정보를 왜 처리하는지, 누구에게 처리를 맡기는지, 회원이 무엇을 요구할 수 있는지를 설명합니다. 개인정보처리자는 ${O.name}입니다.`,
    sections: [
      {
        h: '처리하는 개인정보',
        body: [
          { list: [
            '계정: 이메일 주소(로그인 링크 발송용). Google로 로그인하면 Google이 이메일과 이름을 전달합니다.',
            '프로필: 인사할 때 쓰는 이름, 언어, 가입할 때 묻는 질문 하나(어디서 시작하는지)에 대한 답.',
            '나의 주간: 사용 중인 메뉴와 시작일, 요일별 운동, 완료로 표시한 날.',
            '연습 기록: 운동을 언제, 얼마나 오래, 어떤 속도로 재생했는지, 몇 번 반복했는지, 끝까지 봤는지. 연속 연습일과 연습 시간은 이 기록으로 계산합니다.',
          ] },
          '주소, 생년월일, 결제 정보는 받지 않습니다. 광고·분석 도구를 쓰지 않으며 개인정보를 판매하지 않습니다.',
        ],
      },
      {
        h: '처리 목적',
        body: [
          { list: [
            '회원이 가입한 서비스 제공: 계정, 나의 주간, 플레이어, 연습 기록(이용계약의 이행).',
            '서비스의 안정적 운영과 보안, 예를 들어 오류 원인 확인(정당한 이익).',
          ] },
          '그 밖의 목적으로는 회원의 동의 없이 이용하지 않습니다.',
        ],
      },
      {
        h: '브라우저에 저장되는 정보',
        body: [
          '서비스에 꼭 필요한 것만 저장하며, 추적용 쿠키는 쓰지 않습니다.',
          { list: [
            '로그인 쿠키: 로그인 상태 유지.',
            '언어 쿠키(suim-lang): 영어/한국어 설정 유지.',
            '시간대 쿠키(suim-tz): "오늘"과 연속 연습일을 회원의 시계에 맞추기 위함.',
            '재생 속도: 브라우저의 로컬 저장소에 보관.',
          ] },
        ],
      },
      {
        h: '처리의 위탁과 국외 이전',
        body: [
          '서비스 운영을 위해 다음 업체에 처리를 맡깁니다.',
          { list: [
            'Supabase: 데이터베이스와 로그인(로그인 링크 이메일 발송 포함). 데이터는 대한민국 서울에 저장됩니다.',
            'Vercel: 호스팅. 서울에서 제공되며, 요청이 전 세계 네트워크를 거쳐 국외에서 처리될 수 있습니다.',
            'Cloudflare: 운동 영상 전송(전 세계 네트워크).',
            'Google: Google 로그인을 선택한 경우에만. 또한 사이트 글꼴을 Google에서 불러오므로 페이지를 열 때 Google이 IP 주소를 알 수 있습니다.',
          ] },
          '일부 업체는 미국에 있어 개인정보가 국외에서 처리될 수 있습니다. 이 업체들은 계약에 따라 개인정보를 보호하고 위탁 목적으로만 이용합니다.',
        ],
      },
      {
        h: '보유 기간',
        body: ['계정이 있는 동안 보유합니다. 계정을 삭제하면 프로필, 나의 주간, 연습 기록이 즉시 삭제되며, 위탁 업체의 백업에 남은 사본은 30일 이내에 덮어써집니다.'],
      },
      {
        h: '회원의 권리',
        body: [
          '회원은 개인정보의 열람, 정정, 삭제, 처리정지, 사본 제공을 요구할 수 있습니다. 계정 삭제는 이름 아래 메뉴(계정)에서 언제든 직접 할 수 있습니다. 그 밖의 요청은 아래 연락처로 보내 주시면 30일 이내에 답변합니다.',
          '개인정보 침해에 관한 상담은 개인정보보호위원회 또는 한국인터넷진흥원 개인정보침해신고센터(국번없이 118)에 문의할 수 있습니다.',
        ],
      },
      {
        h: '연령',
        body: ['Everyday Salsa는 만 14세 이상을 위한 서비스입니다. 만 14세 미만이라면 계정을 만들지 마세요.'],
      },
      {
        h: '변경',
        body: ['이 방침을 바꾸면 상단의 시행일을 고치고, 중요한 변경은 시행 전에 앱이나 이메일로 알립니다. 유료 플랜이 생기면 결제 정보에 관한 내용을 먼저 이 문서에 추가합니다.'],
      },
      {
        h: '연락처',
        body: [`${O.name}. 개인정보 보호책임자: ${O.privacyOfficer}. 이메일: ${O.email}.`],
      },
    ],
  },
};

export default function PrivacyPage() {
  return <LegalDoc doc={DOC} effective={OPERATOR.effective} other="terms" />;
}
