import type { LeadFormConfig } from './types';

const A = `${import.meta.env.BASE_URL}assets/`;

/** Deadline matching the design (01d 23h 12m 12s from now). */
const designDeadline = () =>
  new Date(Date.now() + ((1 * 24 + 23) * 3600 + 12 * 60 + 12) * 1000).toISOString();

export const defaultConfig: LeadFormConfig = {
  brand: {
    title: 'DY Patil University',
    subtitle: 'Get admission guidance and No-cost EMI options',
    primaryColor: '#9f1c34',
    ctaColor: '#9f1c34',
    ctaText: 'Sign Up',
  },
  banner: { enabled: true, closable: true, showImage: false, image: `${A}top-image.jpg` },
  overlay: {
    desktopStyle: 'popup',
    mobileStyle: 'bottom-drawer',
    trigger: 'delay',
    delaySeconds: 3,
    scrollPercent: 40,
    sideImage: `${A}side-image.jpg`,
    topImage: `${A}top-image.jpg`,
  },
  urgency: {
    type: 'countdown',
    source: 'manual',
    refreshSeconds: 30,
    socialProof: { count: 146, text: 'learners requested a callback today', avatars: `${A}avatars.png` },
    countdown: { label: 'Admissions close on', deadline: designDeadline() },
    seats: { percent: 82, batch: 'October Batch' },
  },
  trust: {
    enabled: true,
    style: 'tint',
    customColor: '#fff4dd',
    badges: [
      { icon: 'ugc', title: 'UGC Entitled', subtitle: 'Online degrees' },
      { icon: 'naac', title: 'NAAC A++', subtitle: 'Accredited' },
      { icon: 'emi', title: 'No-cost EMI', subtitle: 'Easy payments' },
    ],
  },
  fields: {
    defaultCourse: 'Online MBA in Product Management',
    qualifications: ['12th Pass', 'Diploma', 'Graduate', 'Post Graduate', 'Working Professional'],
    courses: [
      'Online MBA in Product Management',
      'Online MBA in Marketing',
      'Online MBA in Finance',
      'Online MBA in Human Resource Management',
      'Online MBA in Business Analytics',
    ],
  },
  otp: { enabled: true, length: 4, resendSeconds: 30 },
  consent: { termsUrl: '#terms', privacyUrl: '#privacy' },
  success: { variant: 'proceed', proceedUrl: '#apply', counsellorName: 'DY Patil' },
  exitIntent: { enabled: true, showProgress: true },
};

export const assets = {
  flag: `${A}flag.png`,
  badge: `${A}badge-success.png`,
  hourglass: `${A}hourglass.png`,
  iconCall: `${A}icon-call.png`,
  iconApp: `${A}icon-app.png`,
  iconSeat: `${A}icon-seat.png`,
  heroDesktop: `${A}hero-desktop.jpg`,
  heroMobile: `${A}hero-mobile.jpg`,
};
