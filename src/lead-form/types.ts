export type Device = 'desktop' | 'mobile';

/** Where the overlay form appears. `none` = only the banner (inline) form. */
export type OverlayStyle =
  | 'none'
  | 'popup'
  | 'popup-side-image'
  | 'popup-top-image'
  | 'sidebar'
  | 'sidebar-top-image'
  | 'bottom-drawer'
  | 'bottom-drawer-top-image'
  | 'mobile-popup';

export type OverlayTrigger = 'load' | 'delay' | 'scroll' | 'manual';

export type UrgencyElement = 'social-proof' | 'countdown' | 'seats';
export type UrgencySource = 'manual' | 'live';
/** At most this many urgency elements can be shown at once. */
export const MAX_URGENCY = 2;

/** Live urgency values returned by the API. Only the field for the requested type is needed. */
export interface UrgencyLive {
  count?: number;
  deadline?: string;
  percent?: number;
  batch?: string;
}

export type TrustStyle = 'tint' | 'grey' | 'white' | 'brand' | 'custom';

export interface TrustBadge {
  /** Built-in icon ('ugc' | 'naac' | 'emi') or an image URL. */
  icon: string;
  title: string;
  subtitle: string;
}

export interface LeadFormConfig {
  brand: {
    title: string;
    subtitle: string;
    primaryColor: string;
    /** Sign Up button colour. Falls back to `primaryColor`. Text colour is picked automatically. */
    ctaColor?: string;
    /** Submit button label. */
    ctaText: string;
  };
  banner: {
    /** Show the inline form inside the hero banner. */
    enabled: boolean;
    /** Promo image across the top of the banner form card. */
    showImage: boolean;
    image: string;
  };
  overlay: {
    desktopStyle: OverlayStyle;
    mobileStyle: OverlayStyle;
    trigger: OverlayTrigger;
    delaySeconds: number;
    scrollPercent: number;
    sideImage: string;
    topImage: string;
  };
  urgency: {
    /** Up to two urgency elements shown together (empty = none). */
    types: UrgencyElement[];
    /** How often real-time values refresh. */
    refreshSeconds: number;
    /** Each element: `manual` values, or `live` from the API (manual values are the fallback). */
    socialProof: { source: UrgencySource; count: number; text: string; avatars: string };
    countdown: { source: UrgencySource; label: string; deadline: string /* ISO */ };
    seats: { source: UrgencySource; percent: number; batch: string };
  };
  trust: {
    enabled: boolean;
    style: TrustStyle;
    /** Background used when `style` is 'custom'. Text and icon colours adapt to it. */
    customColor?: string;
    badges: TrustBadge[];
  };
  fields: {
    qualifications: string[];
    courses: string[];
    /** Course pre-selected for this landing page ('' = none). The visitor can still change it. */
    defaultCourse: string;
  };
  otp: { enabled: boolean; length: number; resendSeconds: number };
  consent: { termsUrl: string; privacyUrl: string };
  success: {
    /** `proceed` shows the "Proceed with My Application" CTA, `callback` only promises a call. */
    variant: 'proceed' | 'callback';
    proceedUrl: string;
    counsellorName: string;
  };
  exitIntent: {
    /** Show the "Before you go" screen when someone tries to close the form overlay (✕, outside click, Esc). */
    enabled: boolean;
    /** Show "1 of 5 done" progress when the visitor has started filling the form. */
    showProgress: boolean;
  };
}

export interface LeadData {
  phone: string;
  name: string;
  email: string;
  qualification: string;
  course: string;
}

export interface LeadApi {
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<boolean>;
  /** Returns saved details when the phone belongs to an existing lead. */
  lookupLead(phone: string): Promise<Partial<LeadData> | null>;
  submitLead(lead: LeadData): Promise<void>;
  /** Real-time urgency data (callbacks today, admission deadline, seats filled). */
  getUrgency(type: UrgencyElement): Promise<UrgencyLive>;
}
