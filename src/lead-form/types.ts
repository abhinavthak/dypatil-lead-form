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
  };
  banner: {
    /** Show the inline form inside the hero banner. */
    enabled: boolean;
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
    socialProof: { enabled: boolean; count: number; text: string; avatars: string };
    countdown: { enabled: boolean; label: string; deadline: string /* ISO */ };
    seats: { enabled: boolean; percent: number; batch: string };
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
    enabled: boolean;
    /** Show "1 of 5 done" progress when the visitor has started filling the form. */
    showProgress: boolean;
    /** Desktop: cursor leaves through the top of the window. Mobile: fast scroll up / back button. */
    onLeaveIntent: boolean;
    /** Intercept closing an open overlay before submitting. */
    onClose: boolean;
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
}
