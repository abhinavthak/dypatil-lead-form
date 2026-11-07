import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { LeadExperience, defaultConfig, useLeadOverlay } from '../lead-form';
import type { Device, LeadFormConfig, OverlayStyle, OverlayTrigger, TrustStyle } from '../lead-form';
import { DesktopPage, MobilePage } from './Pages';

const STORE = 'dyp-lead-form-config-v1';
const DESKTOP_W = 1430;
const MOBILE_W = 375;
const MOBILE_H = 812;

const desktopStyles: [OverlayStyle, string][] = [
  ['none', 'None (banner only)'],
  ['popup', 'Popup'],
  ['popup-side-image', 'Popup + side image'],
  ['popup-top-image', 'Popup + top image'],
  ['sidebar', 'Sidebar'],
  ['sidebar-top-image', 'Sidebar + top image'],
];
const mobileStyles: [OverlayStyle, string][] = [
  ['none', 'None (banner only)'],
  ['bottom-drawer', 'Bottom drawer'],
  ['bottom-drawer-top-image', 'Bottom drawer + top image'],
  ['mobile-popup', 'Popup'],
];

function loadConfig(): LeadFormConfig {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const saved = JSON.parse(raw) as LeadFormConfig;
      // Keep the countdown live: a saved past deadline falls back to the design default.
      if (new Date(saved.urgency.countdown.deadline).getTime() < Date.now()) saved.urgency.countdown.deadline = defaultConfig.urgency.countdown.deadline;
      if (!saved.trust?.style) saved.trust = defaultConfig.trust;
      return { ...defaultConfig, ...saved };
    }
  } catch {
    /* storage unavailable */
  }
  return defaultConfig;
}

type Ctl = ReturnType<typeof useLeadOverlay>;
function CtlBridge({ onCtl }: { onCtl(c: Ctl): void }) {
  const ctl = useLeadOverlay();
  useEffect(() => {
    onCtl(ctl);
  });
  return null;
}

/** Shallow-path immutable update helper. */
function setIn<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const o = obj as Record<string, unknown>;
  return { ...o, [head]: rest.length ? setIn(o[head], rest.join('.'), value) : value } as T;
}

export default function App() {
  const [config, setConfig] = useState<LeadFormConfig>(loadConfig);
  const [device, setDevice] = useState<Device>(() => (window.innerWidth < 760 ? 'mobile' : 'desktop'));
  const [runId, setRunId] = useState(0);
  const [panelOpen, setPanelOpen] = useState(window.innerWidth >= 760);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const ctlRef = useRef<Ctl | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [stageH, setStageH] = useState(800);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(config));
    } catch {
      /* ignore */
    }
  }, [config]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth - 32;
      const h = el.clientHeight - 32;
      setStageH(h);
      setScale(device === 'desktop' ? Math.min(1, w / DESKTOP_W) : Math.min(1, h / MOBILE_H, w / MOBILE_W));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device, panelOpen]);

  const set = (path: string, value: unknown) => setConfig((c) => setIn(c, path, value));
  const desktopH = Math.max(500, stageH / scale);
  const frameW = device === 'desktop' ? DESKTOP_W : MOBILE_W;
  const frameH = device === 'desktop' ? desktopH : MOBILE_H;

  const focusBanner = () => {
    const el = scrollRoot?.querySelector<HTMLElement>('#lead-banner');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }), 400);
  };

  const u = config.urgency;
  const restart = () => setRunId((n) => n + 1);

  return (
    <div className="pg">
      <header className="pg-bar">
        <button className="pg-iconbtn" onClick={() => setPanelOpen((v) => !v)} aria-label="Toggle settings">
          ☰
        </button>
        <strong className="pg-brand">Lead Form Prototype</strong>
        <div className="pg-seg" role="tablist">
          {(['desktop', 'mobile'] as Device[]).map((d) => (
            <button key={d} role="tab" aria-selected={device === d} className={device === d ? 'on' : ''} onClick={() => setDevice(d)}>
              {d === 'desktop' ? 'Desktop' : 'Mobile'}
            </button>
          ))}
        </div>
        <div className="pg-actions">
          <button onClick={() => ctlRef.current?.openForm()}>Open form</button>
          <button onClick={() => ctlRef.current?.triggerExitIntent()}>
            <span className="pg-long">Simulate exit intent</span>
            <span className="pg-short">Exit intent</span>
          </button>
          <button onClick={restart}>Restart</button>
        </div>
      </header>

      <div className="pg-main">
        {panelOpen && (
          <aside className="pg-panel">
            <Section title="Placement">
              <Toggle label="Banner (inline hero form)" checked={config.banner.enabled} onChange={(v) => set('banner.enabled', v)} />
              <Select
                label="Desktop overlay"
                value={config.overlay.desktopStyle}
                options={desktopStyles}
                onChange={(v) => {
                  set('overlay.desktopStyle', v);
                  setDevice('desktop');
                }}
              />
              <Select
                label="Mobile overlay"
                value={config.overlay.mobileStyle}
                options={mobileStyles}
                onChange={(v) => {
                  set('overlay.mobileStyle', v);
                  setDevice('mobile');
                }}
              />
              <Select<OverlayTrigger>
                label="Open overlay"
                value={config.overlay.trigger}
                options={[
                  ['load', 'On page load'],
                  ['delay', 'After a delay'],
                  ['scroll', 'After scrolling'],
                  ['manual', 'Only on CTA click'],
                ]}
                onChange={(v) => set('overlay.trigger', v)}
              />
              {config.overlay.trigger === 'delay' && (
                <Num label="Delay (seconds)" value={config.overlay.delaySeconds} min={0} max={120} onChange={(v) => set('overlay.delaySeconds', v)} />
              )}
              {config.overlay.trigger === 'scroll' && (
                <Num label="Scroll depth (%)" value={config.overlay.scrollPercent} min={1} max={100} onChange={(v) => set('overlay.scrollPercent', v)} />
              )}
            </Section>

            <Section title="Urgency & trust">
              <Toggle label="Social proof pill" checked={u.socialProof.enabled} onChange={(v) => set('urgency.socialProof.enabled', v)} />
              {u.socialProof.enabled && (
                <Num label="Callbacks today" value={u.socialProof.count} min={0} max={9999} onChange={(v) => set('urgency.socialProof.count', v)} />
              )}
              <Toggle label="Countdown timer" checked={u.countdown.enabled} onChange={(v) => set('urgency.countdown.enabled', v)} />
              {u.countdown.enabled && (
                <label className="pg-field">
                  <span>Admissions close</span>
                  <input
                    type="datetime-local"
                    value={toLocalInput(u.countdown.deadline)}
                    onChange={(e) => e.target.value && set('urgency.countdown.deadline', new Date(e.target.value).toISOString())}
                  />
                </label>
              )}
              <Toggle label="Seats filled bar" checked={u.seats.enabled} onChange={(v) => set('urgency.seats.enabled', v)} />
              {u.seats.enabled && (
                <>
                  <Num label="Seats filled (%)" value={u.seats.percent} min={0} max={100} onChange={(v) => set('urgency.seats.percent', v)} />
                  <Text label="Batch" value={u.seats.batch} onChange={(v) => set('urgency.seats.batch', v)} />
                </>
              )}
              <Toggle label="Trust badges strip" checked={config.trust.enabled} onChange={(v) => set('trust.enabled', v)} />
              {config.trust.enabled && (
                <Select<TrustStyle>
                  label="Trust strip background"
                  value={config.trust.style ?? 'tint'}
                  options={[
                    ['tint', 'Brand tint (light maroon)'],
                    ['grey', 'Grey (original design)'],
                    ['white', 'White'],
                    ['brand', 'Solid brand colour'],
                    ['custom', 'Custom colour'],
                  ]}
                  onChange={(v) => set('trust.style', v)}
                />
              )}
              {config.trust.enabled && (
                <ColorField
                  label="Trust strip colour"
                  value={config.trust.style === 'custom' ? (config.trust.customColor ?? '#fff4dd') : ''}
                  placeholder="Pick to customise"
                  presets={['#fbeff1', '#f1f1f1', '#ffffff', '#fff4dd', '#eaf6ef', '#e8f0fe', '#9f1c34', '#1f1f23']}
                  onChange={(v) => setConfig((c) => setIn(setIn(c, 'trust.customColor', v), 'trust.style', 'custom'))}
                />
              )}
            </Section>

            <Section title="Flow">
              <Toggle label="Verify phone with OTP" checked={config.otp.enabled} onChange={(v) => set('otp.enabled', v)} />
              <Select<'proceed' | 'callback'>
                label="Success screen"
                value={config.success.variant}
                options={[
                  ['proceed', 'Proceed with application'],
                  ['callback', 'Wait for a callback'],
                ]}
                onChange={(v) => set('success.variant', v)}
              />
            </Section>

            <Section title="Exit intent">
              <Toggle label="Enabled" checked={config.exitIntent.enabled} onChange={(v) => set('exitIntent.enabled', v)} />
              {config.exitIntent.enabled && (
                <>
                  <Toggle
                    label={device === 'desktop' ? 'On cursor leaving the page' : 'On back button or tab return'}
                    checked={config.exitIntent.onLeaveIntent}
                    onChange={(v) => set('exitIntent.onLeaveIntent', v)}
                  />
                  <Toggle label="On closing the overlay" checked={config.exitIntent.onClose} onChange={(v) => set('exitIntent.onClose', v)} />
                  <Toggle label="Show form progress" checked={config.exitIntent.showProgress} onChange={(v) => set('exitIntent.showProgress', v)} />
                </>
              )}
            </Section>

            <Section title="Brand">
              <Text label="Title" value={config.brand.title} onChange={(v) => set('brand.title', v)} />
              <Text label="Subtitle" value={config.brand.subtitle} onChange={(v) => set('brand.subtitle', v)} />
              <ColorField
                label="Primary colour"
                value={config.brand.primaryColor}
                presets={['#9f1c34', '#c62828', '#1a5fd0', '#0f7b5f', '#5b2a86']}
                onChange={(v) => set('brand.primaryColor', v)}
              />
              <ColorField
                label="CTA (Sign Up) colour"
                value={config.brand.ctaColor || config.brand.primaryColor}
                presets={['#9f1c34', '#111111', '#e8710a', '#1e9e50', '#1a5fd0', '#f5c518']}
                onChange={(v) => set('brand.ctaColor', v)}
              />
            </Section>

            <div className="pg-note">
              <b>Mock data</b>
              <span>OTP <code>1111</code> is rejected; any other code works.</span>
              <span>
                Phone ending in <code>2168</code> (e.g. 8275612168) is an existing user, so their details get pre-filled.
              </span>
            </div>
            <div className="pg-panel__foot">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(config, null, 2)).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? 'Copied ✓' : 'Copy config JSON'}
              </button>
              <button
                onClick={() => {
                  setConfig(defaultConfig);
                  restart();
                }}
              >
                Reset
              </button>
            </div>
          </aside>
        )}

        <div className="pg-stage" ref={stageRef}>
          <div className="pg-frame-holder" style={{ width: frameW * scale, height: frameH * scale }}>
            <div className={`pg-frame pg-frame--${device}`} style={{ width: frameW, height: frameH, transform: `scale(${scale})` }}>
              <LeadExperience key={`${device}-${runId}`} config={config} device={device} scrollRoot={scrollRoot} onFocusBanner={focusBanner}>
                <CtlBridge
                  onCtl={(c) => {
                    ctlRef.current = c;
                  }}
                />
                <div className="pg-scroll" ref={setScrollRoot}>
                  {device === 'desktop' ? <DesktopPage bannerOn={config.banner.enabled} /> : <MobilePage bannerOn={config.banner.enabled} />}
                </div>
              </LeadExperience>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pg-sec">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
const HEX = /^#[0-9a-f]{6}$/i;

function ColorField({
  label,
  value,
  presets,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  presets: string[];
  placeholder?: string;
  onChange(v: string): void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="pg-field">
      <span>{label}</span>
      <div className="pg-color">
        <input type="color" value={HEX.test(value) ? value : '#ffffff'} onChange={(e) => onChange(e.target.value)} aria-label={`${label} picker`} />
        <input
          className="pg-color__hex"
          value={draft}
          placeholder={placeholder ?? '#000000'}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.trim();
            setDraft(v);
            const full = v.startsWith('#') ? v : `#${v}`;
            if (HEX.test(full)) onChange(full.toLowerCase());
          }}
          aria-label={`${label} hex`}
        />
      </div>
      <div className="pg-swatches">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className={`pg-swatch${value.toLowerCase() === p ? ' on' : ''}`}
            style={{ background: p }}
            title={p}
            aria-label={`${label} ${p}`}
            onClick={() => onChange(p)}
          />
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange(v: boolean): void }) {
  return (
    <label className="pg-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  );
}
function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange(v: T): void }) {
  return (
    <label className="pg-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
function Num({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange(v: number): void }) {
  return (
    <label className="pg-field pg-field--row">
      <span>{label}</span>
      <input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))} />
    </label>
  );
}
function Text({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) {
  return (
    <label className="pg-field">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
