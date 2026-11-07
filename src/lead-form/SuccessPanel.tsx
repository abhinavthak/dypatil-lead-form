import { formatPhone, useLeadFlow } from './LeadFlow';
import { assets } from './defaults';
import { ArrowRight } from './icons';

const steps = [
  { icon: assets.iconCall, title: 'Counselling call', sub: 'Talk through the course, fees and No-cost EMI options.', next: true },
  { icon: assets.iconApp, title: 'Application support', sub: 'Your counsellor helps you complete the application.' },
  { icon: assets.iconSeat, title: 'Secure your seat', sub: 'Confirm your admission and start learning.' },
];

export function SuccessPanel() {
  const { config, values } = useLeadFlow();
  const firstName = values.name.trim().split(/\s+/)[0] || 'there';
  const phone = <b>{formatPhone(values.phone)}</b>;
  const proceed = config.success.variant === 'proceed';
  return (
    <div className="lf-panel lf-success" role="status">
      <img className="lf-success__badge" src={assets.badge} alt="" />
      <h2 className="lf-success__title">Thank you, {firstName}!</h2>
      <p className="lf-success__text">
        {proceed ? (
          <>
            We've received your details. You can proceed with your application right away or wait for a counsellor to call you on {phone} for
            admission guidance.
          </>
        ) : (
          <>
            We've received your request. A {config.success.counsellorName} counsellor will call you on {phone} shortly.
          </>
        )}
      </p>
      {values.course && (
        <div className="lf-success__chip">
          <b>Course :</b> {values.course}
        </div>
      )}
      <div className="lf-next">
        <div className="lf-next__label">What happens next</div>
        <ol>
          {steps.map((s) => (
            <li key={s.title}>
              <img src={s.icon} alt="" />
              <div>
                <div className="lf-next__title">
                  {s.title}
                  {s.next && <span className="lf-next__tag">Up Next</span>}
                </div>
                <div className="lf-next__sub">{s.sub}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      {proceed && (
        <a className="lf-black-btn lf-success__cta" href={config.success.proceedUrl}>
          Proceed with My Application <ArrowRight />
        </a>
      )}
    </div>
  );
}
