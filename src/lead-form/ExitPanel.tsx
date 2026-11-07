import { useLeadFlow } from './LeadFlow';
import { assets } from './defaults';

export function ExitPanel({ onContinue, onClose }: { onContinue(): void; onClose(): void }) {
  const { config, progress } = useLeadFlow();
  const showProgress = config.exitIntent.showProgress && progress > 0;
  return (
    <div className="lf-panel lf-exit" role="dialog" aria-label="Before you go">
      <img className="lf-exit__icon" src={assets.hourglass} alt="" />
      <h2 className="lf-exit__title">
        Before you go, your degree
        <br />
        is a minute away
      </h2>
      <p className="lf-exit__text">A quick call can answer your questions on fees, EMI and eligibility. No pressure to enrol.</p>
      {showProgress && (
        <div className="lf-exit__progress" aria-label={`${progress} of 5 details done`}>
          <div className="lf-exit__fill" style={{ width: `${Math.max(20, (progress / 5) * 100)}%` }}>
            Your details
          </div>
          <span>{progress} of 5 done</span>
        </div>
      )}
      <div className="lf-exit__stats">
        <div>
          <b>Free</b>
          <span>
            one-on-one counselling
            <br />
            with an expert
          </span>
        </div>
        <div>
          <b>No-cost EMI</b>
          <span>
            So fees don't have to be
            <br />
            paid upfront
          </span>
        </div>
      </div>
      <button type="button" className="lf-black-btn" onClick={onContinue}>
        Continue to Get a Call back
      </button>
      <button type="button" className="lf-exit__dismiss" onClick={onClose}>
        No Thanks, Close
      </button>
    </div>
  );
}
