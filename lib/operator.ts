/* Who runs Everyday Salsa, for the privacy policy and the terms.

   DRAFT: these are placeholders. The legal pages show a "draft" notice for as
   long as any value below still starts with "[", and they must not be relied
   on until the owner has filled them in and had the text reviewed. Korea's
   Personal Information Protection Act asks for a named privacy officer with
   a contact; GDPR asks for the controller's identity and contact. */

export const OPERATOR = {
  /** The person or company responsible for the service (the "controller"). */
  name: '[Operator name or company]',
  /** Where members write about their data or the service. */
  email: '[contact@example.com]',
  /** 개인정보 보호책임자: the named person responsible for personal data. */
  privacyOfficer: '[Privacy officer name]',
  /** Whose courts and law the terms are under. */
  governingLaw: { en: '[the Republic of Korea]', ko: '[대한민국]' },
  /** The date these texts take effect, YYYY-MM-DD. */
  effective: '2026-10-16',
};

export const OPERATOR_IS_DRAFT = Object.values(OPERATOR).some(v =>
  typeof v === 'string' ? v.startsWith('[') : Object.values(v).some(x => x.startsWith('[')),
);
