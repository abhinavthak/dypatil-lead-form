import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { UrgencyLive } from './types';
import { isDark } from './color';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { formatPhone, useLeadFlow } from './LeadFlow';
import type { Field } from './LeadFlow';
import { assets } from './defaults';
import { formatDeadline, useCountdown } from './useCountdown';
import { Chevron, Spinner, Users, VerifiedTick, trustIcons } from './icons';

const pad = (n: number) => String(n).padStart(2, '0');

function Countdown({ deadline }: { deadline: string }) {
  const { d, h, m, s } = useCountdown(deadline);
  return (
    <div className="lf-countdown" role="timer" aria-label="Time left to apply">
      {[
        [d, 'd'],
        [h, 'h'],
        [m, 'm'],
        [s, 's'],
      ].map(([v, u]) => (
        <span key={u} className="lf-countdown__box">
          {pad(v as number)}
          <small>{u}</small>
        </span>
      ))}
    </div>
  );
}

/** Resolves the single urgency element's values: manual config, or live API data (manual as fallback). */
function useUrgency() {
  const { config, api } = useLeadFlow();
  const u = config.urgency;
  const [live, setLive] = useState<UrgencyLive | null>(null);
  useEffect(() => {
    setLive(null);
    if (u.source !== 'live' || u.type === 'none') return;
    let alive = true;
    const type = u.type;
    const load = () =>
      api.getUrgency(type).then(
        (v) => alive && setLive(v),
        () => {}, // keep last value / manual fallback
      );
    load();
    const id = setInterval(load, Math.max(10, u.refreshSeconds) * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [api, u.source, u.type, u.refreshSeconds]);
  return {
    type: u.type,
    isLive: u.source === 'live' && !!live,
    count: live?.count ?? u.socialProof.count,
    deadline: live?.deadline ?? u.countdown.deadline,
    percent: live?.percent ?? u.seats.percent,
    batch: live?.batch ?? u.seats.batch,
  };
}

const LiveDot = () => <span className="lf-live" title="Live" aria-label="Live data" />;

export function FormHeader() {
  const { config } = useLeadFlow();
  const u = useUrgency();
  const { socialProof, countdown } = config.urgency;
  return (
    <>
      <div className="lf-head">
        <h2 className="lf-title">{config.brand.title}</h2>
        <p className="lf-sub">{config.brand.subtitle}</p>
        {u.type === 'social-proof' && (
          <div className="lf-proof">
            <img src={socialProof.avatars} alt="" />
            <span>
              <b>{u.count}</b> {socialProof.text}
            </span>
            {u.isLive && <LiveDot />}
          </div>
        )}
      </div>
      {(u.type === 'countdown' || u.type === 'seats') && (
        <div className="lf-urgency">
          {u.type === 'countdown' && (
            <div className="lf-urgency__row">
              <span className="lf-urgency__label">
                {countdown.label} <b>{formatDeadline(u.deadline)}</b>
              </span>
              <Countdown deadline={u.deadline} />
            </div>
          )}
          {u.type === 'seats' && (
            <div className="lf-seats">
              <div className="lf-seats__fill" style={{ width: `${Math.min(100, Math.max(0, u.percent))}%` }} />
              <span className="lf-seats__text">
                <Users />
                <span>
                  <b>{u.percent}% Seat Filled</b> for {u.batch}
                </span>
                {u.isLive && <LiveDot />}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function OtpBlock() {
  const { values, otp, otpError, phoneStatus, resendIn, setOtp, resendOtp, config } = useLeadFlow();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const len = config.otp.length;

  useEffect(() => {
    if (phoneStatus === 'otp' && !otpError && otp === '') refs.current[0]?.focus();
    if (otpError) refs.current[0]?.focus();
  }, [phoneStatus, otpError, otp]);

  const onChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (otpError) {
      // After a wrong code, the next keystroke starts a fresh attempt.
      setOtp(digit);
      refs.current[digit ? 1 : 0]?.focus();
      return;
    }
    const at = Math.min(i, otp.length); // digits stay contiguous
    const next = digit ? otp.slice(0, at) + digit + otp.slice(at + 1) : otp.slice(0, at) + otp.slice(at + 1);
    setOtp(next);
    if (digit) refs.current[Math.min(at + 1, len - 1)]?.focus();
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle digits here so retyping the same digit over a selected box still registers.
    if (/^\d$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onChange(i, e.key);
      return;
    }
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      refs.current[i - 1]?.focus();
      setOtp(otp.slice(0, i - 1));
    }
  };
  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const code = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, len);
    setOtp(code);
    refs.current[Math.min(code.length, len - 1)]?.focus();
  };

  return (
    <div className={`lf-otp${otpError ? ' is-error' : ''}`} role="group" aria-label="One-time password">
      <div className="lf-otp__label">
        Enter {len}-digit OTP sent to <b>{formatPhone(values.phone)}</b>
      </div>
      <div className="lf-otp__boxes" onPaste={onPaste} style={{ gridTemplateColumns: `repeat(${len}, 1fr)` }}>
        {Array.from({ length: len }).map((_, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              aria-label={`OTP digit ${i + 1}`}
              value={otp[i] ?? ''}
              disabled={phoneStatus === 'verifying'}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              onFocus={(e) => e.target.select()}
            />
        ))}
      </div>
      <div className="lf-otp__meta">
        {otpError ? (
          <span className="lf-otp__err" role="alert">
            Incorrect OTP. Please try again.
          </span>
        ) : phoneStatus === 'verifying' ? (
          <span>Verifying…</span>
        ) : (
          <span />
        )}
        {resendIn > 0 ? (
          <span>Resend OTP in 0:{pad(resendIn)}</span>
        ) : (
          <span>
            Didn't get it?{' '}
            <button type="button" className="lf-link lf-link--u" onClick={resendOtp}>
              Resend OTP
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

/** Other fields stay locked until the phone is verified (when OTP is on). */
function useLocked() {
  const { config, phoneStatus } = useLeadFlow();
  return config.otp.enabled && phoneStatus !== 'verified';
}

/** Clicking a locked field sends the visitor back to the phone / OTP step. */
const focusPhoneStep = (el: HTMLElement) => {
  const body = el.closest('.lf-body');
  const target = body?.querySelector<HTMLInputElement>('.lf-otp__boxes input:not([disabled])') ?? body?.querySelector<HTMLInputElement>('input[type="tel"]');
  target?.focus();
};

const Lock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa0a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);

function TextField({ field, placeholder, type = 'text' }: { field: Field; placeholder: string; type?: string }) {
  const { values, errors, autofilled, setValue, blur } = useLeadFlow();
  const locked = useLocked();
  const err = locked ? undefined : errors[field];
  const filled = !!values[field] && !err;
  return (
    <div className="lf-fieldwrap" onClick={locked ? (e) => focusPhoneStep(e.currentTarget) : undefined}>
      <label className={`lf-field${err ? ' is-error' : ''}${filled ? ' is-filled' : ''}${autofilled[field] ? ' is-auto' : ''}${locked ? ' is-locked' : ''}`}>
        <input
          disabled={locked}
          title={locked ? 'Verify your phone number first' : undefined}
          type={type}
          value={values[field]}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-invalid={!!err}
          autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : 'off'}
          onChange={(e) => setValue(field, e.target.value)}
          onBlur={() => blur(field)}
        />
        {locked && <Lock />}
      </label>
      {err && <span className="lf-err">{err}</span>}
    </div>
  );
}

function SelectField({ field, placeholder, options }: { field: Field; placeholder: string; options: string[] }) {
  const { values, errors, setValue, blur } = useLeadFlow();
  const locked = useLocked();
  const err = locked ? undefined : errors[field];
  const filled = !!values[field];
  return (
    <div className="lf-fieldwrap" onClick={locked ? (e) => focusPhoneStep(e.currentTarget) : undefined}>
      <label className={`lf-field lf-field--select${err ? ' is-error' : ''}${filled ? ' is-filled' : ''}${locked ? ' is-locked' : ''}`}>
        <select
          disabled={locked}
          title={locked ? 'Verify your phone number first' : undefined}
          value={values[field]}
          aria-label={placeholder}
          className={filled ? '' : 'is-placeholder'}
          onChange={(e) => {
            setValue(field, e.target.value);
            blur(field);
          }}
          onBlur={() => blur(field)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {locked ? <Lock /> : <Chevron />}
      </label>
      {err && <span className="lf-err">{err}</span>}
    </div>
  );
}

function PhoneField() {
  const { values, errors, phoneStatus, setValue, blur, editPhone, config } = useLeadFlow();
  const err = errors.phone;
  const locked = config.otp.enabled && phoneStatus !== 'editing';
  const verified = phoneStatus === 'verified';
  const cls = ['lf-field', 'lf-field--phone'];
  if (err && !locked) cls.push('is-error');
  if (verified) cls.push('is-verified');
  else if (values.phone && !err) cls.push('is-filled');
  return (
    <div className="lf-fieldwrap">
      <label className={cls.join(' ')}>
        <img className="lf-flag" src={assets.flag} alt="" />
        <span className="lf-cc">+91</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={values.phone}
          placeholder="Phone number *"
          aria-label="Phone number"
          readOnly={locked}
          onChange={(e) => setValue('phone', e.target.value)}
          onBlur={() => blur('phone')}
        />
        {phoneStatus === 'sending' && <Spinner />}
        {(phoneStatus === 'otp' || phoneStatus === 'verifying') && (
          <button type="button" className="lf-link lf-phone-edit" onClick={editPhone}>
            Edit
          </button>
        )}
        {verified && (
          <span className="lf-verified">
            <VerifiedTick /> VERIFIED
          </span>
        )}
      </label>
      {err && !locked && <span className="lf-err">{err}</span>}
      {config.otp.enabled && phoneStatus === 'editing' && !err && (
        <span className="lf-hint">We'll send an OTP to verify your number</span>
      )}
    </div>
  );
}

export function FormBody() {
  const { config, phoneStatus, canSubmit, submitting, submit } = useLeadFlow();
  const showOtp = config.otp.enabled && (phoneStatus === 'otp' || phoneStatus === 'verifying');
  const formRef = useRef<HTMLFormElement>(null);

  // Once verified, move the visitor straight on to the first empty field of the form they're using.
  useEffect(() => {
    const form = formRef.current;
    if (phoneStatus !== 'verified' || !form) return;
    const t = setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body && !form.contains(active)) return;
      form.querySelector<HTMLInputElement>('.lf-fields input:not([type="tel"]):placeholder-shown:not(:disabled)')?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [phoneStatus]);

  return (
    <form
      ref={formRef}
      className="lf-body"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="lf-fields">
        <PhoneField />
        {showOtp && <OtpBlock />}
        <TextField field="name" placeholder="Full name *" />
        <TextField field="email" placeholder="Email Id *" type="email" />
        <SelectField field="qualification" placeholder="Highest qualification *" options={config.fields.qualifications} />
        <SelectField field="course" placeholder="Select Course *" options={config.fields.courses} />
      </div>
      <div className="lf-grow" />
      <button type="submit" className="lf-submit" disabled={!canSubmit} aria-disabled={!canSubmit}>
        {submitting ? <Spinner /> : config.brand.ctaText?.trim() || 'Sign Up'}
      </button>
      <p className="lf-consent">
        By submitting this form, you agree to our <a href={config.consent.termsUrl}>Terms of Service</a> &amp;{' '}
        <a href={config.consent.privacyUrl}>Privacy Policy</a> and to be contacted by us via Call/Email/WhatsApp/SMS.
      </p>
    </form>
  );
}

export function TrustFooter() {
  const { config } = useLeadFlow();
  if (!config.trust.enabled) return null;
  const custom = config.trust.style === 'custom' && config.trust.customColor ? config.trust.customColor : null;
  const trustClass = custom ? (isDark(custom) ? 'custom-dark' : 'custom-light') : (config.trust.style ?? 'tint');
  const trustStyle = custom ? ({ '--lf-trust-bg': custom } as CSSProperties) : undefined;
  return (
    <div className={`lf-trust lf-trust--${trustClass}`} style={trustStyle}>
      {config.trust.badges.map((b) => (
        <div key={b.title} className="lf-trust__item">
          <span className="lf-trust__icon">
            {b.icon in trustIcons ? trustIcons[b.icon as keyof typeof trustIcons] : <img src={b.icon} alt="" />}
          </span>
          <div>
            <b>{b.title}</b>
            <span>{b.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The complete form panel: header, urgency band, fields, consent and trust strip. */
export function FormPanel() {
  return (
    <div className="lf-panel">
      <FormHeader />
      <FormBody />
      <TrustFooter />
    </div>
  );
}
