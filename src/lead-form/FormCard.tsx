import { useEffect, useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { formatPhone, useLeadFlow } from './LeadFlow';
import type { Field } from './LeadFlow';
import { assets } from './defaults';
import { formatDeadline, useCountdown } from './useCountdown';
import { Chevron, Spinner, Users, VerifiedTick } from './icons';

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

export function FormHeader() {
  const { config } = useLeadFlow();
  const { socialProof, countdown, seats } = config.urgency;
  const showBand = countdown.enabled || seats.enabled;
  return (
    <>
      <div className="lf-head">
        <h2 className="lf-title">{config.brand.title}</h2>
        <p className="lf-sub">{config.brand.subtitle}</p>
        {socialProof.enabled && (
          <div className="lf-proof">
            <img src={socialProof.avatars} alt="" />
            <span>
              <b>{socialProof.count}</b> {socialProof.text}
            </span>
          </div>
        )}
      </div>
      {showBand && (
        <div className="lf-urgency">
          {countdown.enabled && (
            <div className="lf-urgency__row">
              <span className="lf-urgency__label">
                {countdown.label} <b>{formatDeadline(countdown.deadline)}</b>
              </span>
              <Countdown deadline={countdown.deadline} />
            </div>
          )}
          {seats.enabled && (
            <div className="lf-seats">
              <div className="lf-seats__fill" style={{ width: `${Math.min(100, Math.max(0, seats.percent))}%` }} />
              <span className="lf-seats__text">
                <Users />
                <span>
                  <b>{seats.percent}% Seat Filled</b> for {seats.batch}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function OtpBlock() {
  const { values, otp, otpError, phoneStatus, resendIn, setOtp, resendOtp, editPhone, config } = useLeadFlow();
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
    <div className={`lf-otp${otpError ? ' is-error' : ''}`}>
      <div className="lf-otp__info">
        <span>Enter the code sent to</span>
        <span className="lf-otp__num">
          {formatPhone(values.phone)}{' '}
          <button type="button" className="lf-link" onClick={editPhone}>
            Edit
          </button>
        </span>
        {resendIn > 0 ? (
          <span>Resend in 0:{pad(resendIn)}</span>
        ) : (
          <button type="button" className="lf-link lf-link--u" onClick={resendOtp}>
            Resend Code
          </button>
        )}
      </div>
      <div className="lf-otp__right">
        <div className="lf-otp__boxes" onPaste={onPaste}>
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
        {otpError && <span className="lf-otp__err">Incorrect code.</span>}
        {phoneStatus === 'verifying' && <span className="lf-otp__hint">Verifying…</span>}
      </div>
    </div>
  );
}

function TextField({ field, placeholder, type = 'text' }: { field: Field; placeholder: string; type?: string }) {
  const { values, errors, autofilled, setValue, blur } = useLeadFlow();
  const err = errors[field];
  const filled = !!values[field] && !err;
  return (
    <div className="lf-fieldwrap">
      <label className={`lf-field${err ? ' is-error' : ''}${filled ? ' is-filled' : ''}${autofilled[field] ? ' is-auto' : ''}`}>
        <input
          type={type}
          value={values[field]}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-invalid={!!err}
          autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : 'off'}
          onChange={(e) => setValue(field, e.target.value)}
          onBlur={() => blur(field)}
        />
      </label>
      {err && <span className="lf-err">{err}</span>}
    </div>
  );
}

function SelectField({ field, placeholder, options }: { field: Field; placeholder: string; options: string[] }) {
  const { values, errors, setValue, blur } = useLeadFlow();
  const err = errors[field];
  const filled = !!values[field];
  return (
    <div className="lf-fieldwrap">
      <label className={`lf-field lf-field--select${err ? ' is-error' : ''}${filled ? ' is-filled' : ''}`}>
        <select
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
        <Chevron />
      </label>
      {err && <span className="lf-err">{err}</span>}
    </div>
  );
}

function PhoneField() {
  const { values, errors, phoneStatus, setValue, blur, config } = useLeadFlow();
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
        {verified && (
          <span className="lf-verified">
            <VerifiedTick /> VERIFIED
          </span>
        )}
      </label>
      {err && !locked && <span className="lf-err">{err}</span>}
    </div>
  );
}

export function FormBody() {
  const { config, phoneStatus, canSubmit, submitting, submit } = useLeadFlow();
  const showOtp = config.otp.enabled && (phoneStatus === 'otp' || phoneStatus === 'verifying');
  return (
    <form
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
        {submitting ? <Spinner /> : 'Sign Up'}
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
  return (
    <div className="lf-trust">
      {config.trust.badges.map((b) => (
        <div key={b.title} className="lf-trust__item">
          <img src={b.icon} alt="" />
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
