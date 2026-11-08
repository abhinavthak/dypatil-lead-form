import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Device, LeadApi, LeadData, LeadFormConfig } from './types';

export type Field = keyof LeadData;
export type PhoneStatus = 'editing' | 'sending' | 'otp' | 'verifying' | 'verified';

const FIELDS: Field[] = ['phone', 'name', 'email', 'qualification', 'course'];

const validators: Record<Field, (v: string) => string | null> = {
  phone: (v) => (/^[6-9]\d{9}$/.test(v) ? null : 'Enter Valid Phone Number'),
  name: (v) => (/^[A-Za-z][A-Za-z .']{1,}$/.test(v.trim()) ? null : 'Enter Valid Name'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Enter Valid Email Id'),
  qualification: (v) => (v ? null : 'Select Highest Qualification'),
  course: (v) => (v ? null : 'Select Course'),
};

export const formatPhone = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;

interface LeadFlowValue {
  config: LeadFormConfig;
  api: LeadApi;
  device: Device;
  values: LeadData;
  errors: Partial<Record<Field, string>>;
  autofilled: Partial<Record<Field, boolean>>;
  phoneStatus: PhoneStatus;
  otp: string;
  otpError: boolean;
  resendIn: number;
  submitting: boolean;
  submitted: boolean;
  canSubmit: boolean;
  progress: number; // completed fields out of 5
  /** Fields still missing or invalid (phone = not yet verified when OTP is on). */
  incomplete: Field[];
  setValue(field: Field, value: string): void;
  blur(field: Field): void;
  setOtp(code: string): void;
  resendOtp(): void;
  editPhone(): void;
  submit(): Promise<void>;
  reset(): void;
}

const Ctx = createContext<LeadFlowValue | null>(null);

export function useLeadFlow() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLeadFlow must be used inside <LeadFlowProvider>');
  return v;
}

const empty: LeadData = { phone: '', name: '', email: '', qualification: '', course: '' };

/** Starting values: the landing page's course is pre-selected (if it's in the list). */
const initialValues = (config: LeadFormConfig): LeadData => {
  const c = config.fields.defaultCourse;
  return { ...empty, course: c && config.fields.courses.includes(c) ? c : '' };
};

/**
 * Holds one lead's state, shared by every form surface on the page (banner + overlay),
 * so progress typed in one carries over to the other.
 */
export function LeadFlowProvider({
  config,
  device,
  api,
  onSubmitted,
  children,
}: {
  config: LeadFormConfig;
  device: Device;
  api: LeadApi;
  onSubmitted?: (lead: LeadData) => void;
  children: ReactNode;
}) {
  const [values, setValues] = useState<LeadData>(() => initialValues(config));
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [autofilled, setAutofilled] = useState<Partial<Record<Field, boolean>>>({});
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>('editing');
  const [otp, setOtpState] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const phoneRef = useRef('');

  // Tick for the resend timer only while an OTP is pending.
  useEffect(() => {
    if (phoneStatus !== 'otp' && phoneStatus !== 'verifying') return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phoneStatus]);

  // Config changed (e.g. a different landing page / playground edit): re-apply the pre-selected course
  // unless the visitor has already picked one themselves.
  const courseTouched = useRef(false);
  useEffect(() => {
    if (courseTouched.current) return;
    setValues((v) => ({ ...v, course: initialValues(config).course }));
  }, [config]);

  const otpOn = config.otp.enabled;

  const errors = useMemo(() => {
    const e: Partial<Record<Field, string>> = {};
    for (const f of FIELDS) {
      const msg = validators[f](values[f]);
      if (msg && touched[f]) e[f] = msg;
    }
    return e;
  }, [values, touched]);

  const isValid = (f: Field) => validators[f](values[f]) === null;
  const phoneDone = otpOn ? phoneStatus === 'verified' : isValid('phone');
  const progress = FIELDS.filter((f) => (f === 'phone' ? phoneDone : isValid(f))).length;
  const incomplete = FIELDS.filter((f) => !(f === 'phone' ? phoneDone : isValid(f)));
  const canSubmit = progress === FIELDS.length && !submitting;

  const startOtp = useCallback(
    async (phone: string) => {
      setPhoneStatus('sending');
      setOtpState('');
      setOtpError(false);
      await api.sendOtp(phone);
      if (phoneRef.current !== phone) return; // number edited meanwhile
      setResendAt(Date.now() + config.otp.resendSeconds * 1000);
      setNow(Date.now());
      setPhoneStatus('otp');
    },
    [api, config.otp.resendSeconds],
  );

  const prefillExisting = useCallback(
    async (phone: string) => {
      const found = await api.lookupLead(phone);
      if (!found || phoneRef.current !== phone) return;
      const filled: Partial<Record<Field, boolean>> = {};
      setValues((v) => {
        const next = { ...v };
        for (const [k, val] of Object.entries(found) as [Field, string][]) {
          if (k !== 'phone' && val && !v[k]) {
            next[k] = val;
            filled[k] = true;
          }
        }
        return next;
      });
      setAutofilled((a) => ({ ...a, ...filled }));
    },
    [api],
  );

  const setValue = useCallback(
    (field: Field, raw: string) => {
      let value = raw;
      if (field === 'phone') {
        value = raw.replace(/\D/g, '').slice(0, 10);
        phoneRef.current = value;
        setTouched((t) => ({ ...t, phone: value.length === 10 ? true : t.phone }));
        if (value.length === 10 && validators.phone(value) === null) {
          if (otpOn) startOtp(value);
          else prefillExisting(value);
        }
      }
      if (field === 'course') courseTouched.current = true;
      setAutofilled((a) => (a[field] ? { ...a, [field]: false } : a));
      setValues((v) => ({ ...v, [field]: value }));
    },
    [otpOn, startOtp, prefillExisting],
  );

  // Leaving an empty field shows nothing (the grey Sign Up already says the form is incomplete);
  // once something is typed, leaving the field validates its format.
  const blur = useCallback(
    (field: Field) => {
      if (!values[field]) return;
      setTouched((t) => ({ ...t, [field]: true }));
    },
    [values],
  );

  const setOtp = useCallback(
    async (code: string) => {
      const clean = code.replace(/\D/g, '').slice(0, config.otp.length);
      setOtpState(clean);
      setOtpError(false);
      if (clean.length !== config.otp.length) return;
      const phone = phoneRef.current;
      setPhoneStatus('verifying');
      const ok = await api.verifyOtp(phone, clean);
      if (phoneRef.current !== phone) return;
      if (ok) {
        setPhoneStatus('verified');
        prefillExisting(phone);
      } else {
        setPhoneStatus('otp');
        setOtpError(true);
      }
    },
    [api, config.otp.length, prefillExisting],
  );

  const resendOtp = useCallback(() => startOtp(phoneRef.current), [startOtp]);

  const editPhone = useCallback(() => {
    setPhoneStatus('editing');
    setOtpState('');
    setOtpError(false);
  }, []);

  const submit = useCallback(async () => {
    setTouched({ phone: true, name: true, email: true, qualification: true, course: true });
    if (!canSubmit) return;
    setSubmitting(true);
    await api.submitLead(values);
    setSubmitting(false);
    setSubmitted(true);
    onSubmitted?.(values);
  }, [api, canSubmit, values, onSubmitted]);

  const reset = useCallback(() => {
    phoneRef.current = '';
    courseTouched.current = false;
    setValues(initialValues(config));
    setTouched({});
    setAutofilled({});
    setPhoneStatus('editing');
    setOtpState('');
    setOtpError(false);
    setSubmitted(false);
  }, [config]);

  const value: LeadFlowValue = {
    config,
    api,
    device,
    values,
    errors,
    autofilled,
    phoneStatus,
    otp,
    otpError,
    resendIn: Math.max(0, Math.ceil((resendAt - now) / 1000)),
    submitting,
    submitted,
    canSubmit,
    incomplete,
    progress,
    setValue,
    blur,
    setOtp,
    resendOtp,
    editPhone,
    submit,
    reset,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
