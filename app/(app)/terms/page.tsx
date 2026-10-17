import type { Metadata } from 'next';
import LegalDoc, { type Doc } from '../legal/LegalDoc';
import { OPERATOR } from '@/lib/operator';
import type { Lang } from '@/lib/i18n';
import '../legal/legal.css';

export const metadata: Metadata = { title: 'Terms of use', description: 'The agreement between you and Everyday Salsa.' };

/* DRAFT for review, in plain language. What it has to say for this service in
   particular: it is free for now and a paid plan will never start without the
   member choosing it; the videos are for the member's own practice; dancing
   is physical, so a short health note. */

const O = OPERATOR;

const DOC: Record<Lang, Doc> = {
  en: {
    title: 'Terms of use',
    lede: `These terms are the agreement between you and ${O.name}, who runs Everyday Salsa. By creating an account you agree to them. They are written to be read; if anything is unclear, ask us.`,
    sections: [
      {
        h: 'The service',
        body: ['Everyday Salsa gives you a short salsa routine each day, on video, with a player made for practice, and keeps track of your practice. We add, change and retire routines and features over time.'],
      },
      {
        h: 'Your account',
        body: [
          'You need an account to practise. You must be 14 or older. Keep your sign-in email secure: anyone who can open it can sign in as you. One account is for one person.',
          'You can delete your account at any time, from the menu under your name (Account). That deletes your data as the privacy policy describes.',
        ],
      },
      {
        h: 'Price',
        body: ['Everyday Salsa is free while we are starting out. If we introduce a paid plan, we will tell you the price first, and nothing will ever be charged unless you choose it yourself.'],
      },
      {
        h: 'The videos are for your practice',
        body: [
          `The routines, videos and teaching are owned by ${O.name} and the teachers who made them. You may watch and practise with them for your own personal use.`,
          { list: [
            'Do not download, record, copy, share or publish the videos, or let others use your account to watch them.',
            'Do not try to get around how the service controls access to its videos, or interfere with how it works.',
          ] },
        ],
      },
      {
        h: 'Practise safely',
        body: ['Dancing is physical exercise. Warm up, make room around you, and stop if anything hurts. The routines are not medical advice; if you have an injury or a health condition, check with a doctor before you start. You practise at your own risk.'],
      },
      {
        h: 'If something goes wrong',
        body: [
          'We work to keep Everyday Salsa running and correct, but we provide it as it is, without promising it will always be available or free of errors.',
          'As far as the law allows, we are not liable for indirect losses, or for injury that comes from practising. Nothing in these terms limits liability that the law does not allow us to limit, or your rights as a consumer.',
        ],
      },
      {
        h: 'Ending',
        body: ['You can stop using the service and delete your account at any time. We may suspend or close an account that breaks these terms, and will tell you why unless the law prevents it.'],
      },
      {
        h: 'Changes',
        body: ['If we change these terms, we will update the date at the top and tell you before a significant change takes effect. If you do not agree to a change, you can delete your account.'],
      },
      {
        h: 'Law',
        body: [`These terms are governed by the law of ${O.governingLaw.en}. If you live in another country, its consumer protection law still protects you.`],
      },
      {
        h: 'Contact',
        body: [`${O.name}. Email: ${O.email}.`],
      },
    ],
  },
  ko: {
    title: '이용약관',
    lede: `이 약관은 Everyday Salsa를 운영하는 ${O.name}와 회원 사이의 약속입니다. 계정을 만들면 이 약관에 동의하는 것입니다. 읽기 쉽게 썼으니, 분명하지 않은 부분이 있으면 문의해 주세요.`,
    sections: [
      {
        h: '서비스',
        body: ['Everyday Salsa는 매일 짧은 살사 루틴을 영상으로 제공하고, 연습을 위한 플레이어와 연습 기록을 제공합니다. 루틴과 기능은 시간에 따라 추가·변경·종료될 수 있습니다.'],
      },
      {
        h: '계정',
        body: [
          '연습하려면 계정이 필요하며, 만 14세 이상이어야 합니다. 로그인 이메일을 안전하게 관리하세요. 그 이메일을 열 수 있는 사람은 회원으로 로그인할 수 있습니다. 계정 하나는 한 사람만 사용합니다.',
          '계정은 이름 아래 메뉴(계정)에서 언제든 삭제할 수 있으며, 삭제하면 개인정보 처리방침에 따라 데이터가 삭제됩니다.',
        ],
      },
      {
        h: '요금',
        body: ['Everyday Salsa는 시작하는 동안 무료입니다. 유료 플랜을 도입하면 가격을 먼저 알리며, 회원이 직접 선택하지 않는 한 어떤 요금도 청구되지 않습니다.'],
      },
      {
        h: '영상은 회원의 연습을 위한 것입니다',
        body: [
          `루틴, 영상, 강의 내용의 권리는 ${O.name}와 이를 만든 강사에게 있습니다. 회원은 개인적인 연습을 위해 시청하고 따라 할 수 있습니다.`,
          { list: [
            '영상을 다운로드, 녹화, 복제, 공유, 게시하거나 다른 사람이 회원의 계정으로 시청하게 하지 마세요.',
            '영상 접근 제한을 우회하거나 서비스 운영을 방해하지 마세요.',
          ] },
        ],
      },
      {
        h: '안전하게 연습하세요',
        body: ['춤은 신체 활동입니다. 준비 운동을 하고, 주변 공간을 확보하고, 통증이 있으면 멈추세요. 루틴은 의학적 조언이 아닙니다. 부상이나 건강 문제가 있다면 시작하기 전에 의사와 상담하세요. 연습은 회원 본인의 책임 아래 이루어집니다.'],
      },
      {
        h: '문제가 생겼을 때',
        body: [
          '서비스가 잘 운영되도록 노력하지만, 서비스는 현재 상태 그대로 제공되며 항상 이용 가능하거나 오류가 없음을 보장하지 않습니다.',
          '법이 허용하는 범위에서, 간접 손해나 연습 중 입은 부상에 대해 책임을 지지 않습니다. 다만 법이 제한을 허용하지 않는 책임이나 소비자로서의 권리는 이 약관으로 제한되지 않습니다.',
        ],
      },
      {
        h: '이용 종료',
        body: ['회원은 언제든 서비스 이용을 멈추고 계정을 삭제할 수 있습니다. 이 약관을 위반한 계정은 정지되거나 해지될 수 있으며, 법이 막지 않는 한 그 이유를 알립니다.'],
      },
      {
        h: '약관의 변경',
        body: ['약관을 바꾸면 상단의 시행일을 고치고, 중요한 변경은 시행 전에 알립니다. 변경에 동의하지 않으면 계정을 삭제할 수 있습니다.'],
      },
      {
        h: '준거법',
        body: [`이 약관은 ${O.governingLaw.ko} 법을 따릅니다. 다른 나라에 거주하는 회원은 그 나라의 소비자 보호법에 따른 보호도 받습니다.`],
      },
      {
        h: '연락처',
        body: [`${O.name}. 이메일: ${O.email}.`],
      },
    ],
  },
};

export default function TermsPage() {
  return <LegalDoc doc={DOC} effective={OPERATOR.effective} other="privacy" />;
}
