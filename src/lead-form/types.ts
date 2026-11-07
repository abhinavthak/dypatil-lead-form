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

export type UrgencyType = 'none' | 'social-proof' | 'countdown' | 'seats';

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
    /** Show a ✕ on the banner form. Closing it (before submit) shows the exit screen inside the card. */
    closable: boolean;
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
    /** Only one urgency element is shown at a time. */
    type: UrgencyType;
    /** `manual`: values below. `live`: fetched from the API (manual values are the fallback). */
    source: 'manual' | 'live';
    /** How often live values refresh. */
    refreshSeconds: number;
    socialProof: { count: number; text: string; avatars: string };
    countdown: { label: string; deadline: string /* ISO */ };
    seats: { percent: number; batch: string };
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
  getUrgency(type: Exclude<UrgencyType, 'none'>): Promise<UrgencyLive>;
}
