import { BannerForm, useLeadOverlay } from '../lead-form';
import { assets } from '../lead-form/defaults';

const features = [
  ['MBA + CFP® Global Certification', 'Earn a UGC-entitled MBA and a globally recognised CFP® certification in one program.'],
  ['Learn from industry leaders', 'Live sessions with product leaders from top tech companies, plus case studies from PwC and HBP.'],
  ['Built for working professionals', 'Weekend live classes and recorded lectures so you can learn without a career break.'],
  ['No-cost EMI', 'Spread your fee across easy monthly instalments with zero interest.'],
  ['Career services', 'Resume reviews, mock interviews and placement support with 300+ hiring partners.'],
  ['Hands-on capstone', 'Scope, ship and scale a real AI product feature with mentor feedback.'],
];

function WhyChoose({ mobile }: { mobile?: boolean }) {
  const { openForm } = useLeadOverlay();
  return (
    <section className={`pg-why${mobile ? ' is-mobile' : ''}`}>
      <h2>Why Choose This Program?</h2>
      <div className="pg-why__grid">
        {features.map(([t, d]) => (
          <div key={t} className="pg-why__item">
            <span className="pg-why__dot" />
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </div>
      <button className="pg-apply" onClick={openForm}>
        Apply Now
      </button>
    </section>
  );
}

export function DesktopPage({ hero = assets.heroDesktop }: { bannerOn?: boolean; hero?: string }) {
  const { openForm } = useLeadOverlay();
  return (
    <div className="pg-page">
      <section className="pg-hero-d" style={{ backgroundImage: `linear-gradient(to bottom, rgba(61,7,16,0) 636px, #3d0710 670px), url(${hero})` }}>
        {/* The hero image is a design export with a form baked in on the right; always cover it. */}
        <div className="pg-hero-d__mask" />
        <button className="pg-hotspot" style={{ left: 80, top: 573, width: 242, height: 56 }} onClick={openForm} aria-label="Download Brochure" />
        <div className="pg-hero-d__form" id="lead-banner">
          <BannerForm />
        </div>
      </section>
      <WhyChoose />
      <footer className="pg-foot">© D. Y. Patil University · Prototype</footer>
    </div>
  );
}

export function MobilePage({ bannerOn, hero = assets.heroMobile }: { bannerOn: boolean; hero?: string }) {
  const { openForm } = useLeadOverlay();
  return (
    <div className="pg-page">
      <section className="pg-hero-m">
        <img src={hero} alt="India's 1st Online MBA in Product Management" />
        <button className="pg-hotspot" style={{ left: 24, top: 632, width: 326, height: 56 }} onClick={openForm} aria-label="Download Brochure" />
        {bannerOn && (
          <div className="pg-hero-m__form" id="lead-banner">
            <BannerForm />
          </div>
        )}
      </section>
      <WhyChoose mobile />
      <footer className="pg-foot">© D. Y. Patil University · Prototype</footer>
    </div>
  );
}
