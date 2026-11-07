import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { LeadExperience, defaultConfig, useLeadOverlay } from '../lead-form';
import type { Device, LeadFormConfig, OverlayStyle, OverlayTrigger, TrustBadge, TrustStyle, UrgencyElement, UrgencySource } from '../lead-form';
import { DesktopPage, MobilePage } from './Pages';
import { MAX_URGENCY } from '../lead-form/types';
import { assets } from '../lead-form/defaults';
import { trustIconNames, trustIcons } from '../lead-form/icons';

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
      if (!Array.isArray(saved.urgency?.types)) saved.urgency = defaultConfig.urgency;
      saved.banner = { ...defaultConfig.banner, ...saved.banner };
      saved.fields = { ...defaultConfig.fields, ...saved.fields };
      saved.brand = { ...defaultConfig.brand, ...saved.brand };
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
  const [heroDesktop, setHeroDesktop] = useState<string | undefined>();
  const [heroMobile, setHeroMobile] = useState<string | undefined>();

  useEffect(() => {
    try {
      // Uploaded images live only in this tab (blob: URLs); don't persist them.
      const o = config.overlay;
      const persistable = {
        ...config,
        trust: { ...config.trust, badges: config.trust.badges.map((b, i) => (b.icon.startsWith('blob:') ? { ...b, icon: defaultConfig.trust.badges[i]?.icon ?? 'star' } : b)) },
        banner: { ...config.banner, image: config.banner.image.startsWith('blob:') ? defaultConfig.banner.image : config.banner.image },
        overlay: {
          ...o,
          sideImage: o.sideImage.startsWith('blob:') ? defaultConfig.overlay.sideImage : o.sideImage,
          topImage: o.topImage.startsWith('blob:') ? defaultConfig.overlay.topImage : o.topImage,
        },
      };
      localStorage.setItem(STORE, JSON.stringify(persistable));
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
          <button onClick={restart}>Restart</button>
        </div>
      </header>

      <div className="pg-main">
        {panelOpen && (
          <aside className="pg-panel">
            <Section title="Placement">
              <Toggle label="Banner (inline hero form)" checked={config.banner.enabled} onChange={(v) => set('banner.enabled', v)} />
              {config.banner.enabled && (
                <Toggle label="Image at top of banner form" checked={config.banner.showImage} onChange={(v) => set('banner.showImage', v)} />
              )}
              {config.banner.enabled && config.banner.showImage && (
                <ImageField
                  label="Banner form image"
                  hint="Wide, ~1200×290"
                  value={config.banner.image}
                  onChange={(v) => set('banner.image', v)}
                  onReset={() => set('banner.image', defaultConfig.banner.image)}
                />
              )}
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
              <UrgencyEditor config={config} set={set} />
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
              {config.trust.enabled && (
                <TrustEditor badges={config.trust.badges} onChange={(b) => set('trust.badges', b)} />
              )}
            </Section>

            <Section title="Course">
              <Select<string>
                label="Pre-selected course (this landing page)"
                value={config.fields.defaultCourse}
                options={[['', 'None (visitor picks)'], ...config.fields.courses.map((c) => [c, c] as [string, string])]}
                onChange={(v) => set('fields.defaultCourse', v)}
              />
              <p className="pg-small">The form opens with this course selected; visitors can change it from the dropdown.</p>
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
              <Toggle label="Show when the form is closed" checked={config.exitIntent.enabled} onChange={(v) => set('exitIntent.enabled', v)} />
              {config.exitIntent.enabled && (
                <Toggle label="Show form progress" checked={config.exitIntent.showProgress} onChange={(v) => set('exitIntent.showProgress', v)} />
              )}
              <p className="pg-small">Appears when someone closes the form overlay (✕, outside click or Esc) before submitting.</p>
            </Section>

            <Section title="Images">
              <ImageField
                label="Popup side image"
                hint="Portrait, ~600×1200"
                value={config.overlay.sideImage}
                onChange={(v) => set('overlay.sideImage', v)}
                onReset={() => set('overlay.sideImage', defaultConfig.overlay.sideImage)}
              />
              <ImageField
                label="Top banner image"
                hint="Wide, ~1200×290"
                value={config.overlay.topImage}
                onChange={(v) => set('overlay.topImage', v)}
                onReset={() => set('overlay.topImage', defaultConfig.overlay.topImage)}
              />
              <ImageField
                label="Page hero (desktop preview)"
                hint="1430×670; form sits on the right"
                value={heroDesktop ?? assets.heroDesktop}
                onChange={(v) => {
                  setHeroDesktop(v);
                  setDevice('desktop');
                }}
                onReset={() => setHeroDesktop(undefined)}
              />
              <ImageField
                label="Page hero (mobile preview)"
                hint="375 wide; form follows below"
                value={heroMobile ?? assets.heroMobile}
                onChange={(v) => {
                  setHeroMobile(v);
                  setDevice('mobile');
                }}
                onReset={() => setHeroMobile(undefined)}
              />
              <p className="pg-small">Uploads stay in this browser tab only. Use an image URL in the config for real pages.</p>
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
              <Text label="CTA button text" value={config.brand.ctaText} onChange={(v) => set('brand.ctaText', v)} />
              <ColorField
                label="CTA (Sign Up) colour"
                value={config.brand.ctaColor || config.brand.primaryColor}
                presets={['#9f1c34', '#111111', '#e8710a', '#1e9e50', '#1a5fd0', '#6d28d9']}
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
                  {device === 'desktop' ? <DesktopPage bannerOn={config.banner.enabled} hero={heroDesktop} /> : <MobilePage bannerOn={config.banner.enabled} hero={heroMobile} />}
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
const URGENCY: { type: UrgencyElement; key: 'socialProof' | 'countdown' | 'seats'; label: string }[] = [
  { type: 'social-proof', key: 'socialProof', label: 'Social proof (callbacks today)' },
  { type: 'countdown', key: 'countdown', label: 'Countdown to deadline' },
  { type: 'seats', key: 'seats', label: 'Seats filled bar' },
];

function UrgencyEditor({ config, set }: { config: LeadFormConfig; set(path: string, value: unknown): void }) {
  const u = config.urgency;
  const full = u.types.length >= MAX_URGENCY;
  const toggle = (t: UrgencyElement, on: boolean) =>
    set('urgency.types', on ? [...u.types, t].slice(0, MAX_URGENCY) : u.types.filter((x) => x !== t));
  const anyLive = u.types.some((t) => u[URGENCY.find((x) => x.type === t)!.key].source === 'live');
  return (
    <div className="pg-field">
      <span>Urgency elements (up to {MAX_URGENCY})</span>
      <div className="pg-badges">
        {URGENCY.map(({ type, key, label }) => {
          const on = u.types.includes(type);
          const disabled = !on && full;
          const src = u[key].source;
          const fallback = src === 'live' ? 'Fallback ' : '';
          return (
            <div key={type} className={`pg-badge${disabled ? ' is-disabled' : ''}`}>
              <label className="pg-check" title={disabled ? `Only ${MAX_URGENCY} can be shown at a time. Turn one off first.` : undefined}>
                <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => toggle(type, e.target.checked)} />
                <span>{label}</span>
              </label>
              {on && (
                <>
                  <div className="pg-seg pg-seg--full" role="radiogroup" aria-label={`${label} data source`}>
                    {(['manual', 'live'] as UrgencySource[]).map((s) => (
                      <button key={s} type="button" role="radio" aria-checked={src === s} className={src === s ? 'on' : ''} onClick={() => set(`urgency.${key}.source`, s)}>
                        {s === 'manual' ? 'Manual' : 'Real-time'}
                      </button>
                    ))}
                  </div>
                  {type === 'social-proof' && (
                    <Num label={`${fallback}Callbacks today`} value={u.socialProof.count} min={0} max={9999} onChange={(v) => set('urgency.socialProof.count', v)} />
                  )}
                  {type === 'countdown' && (
                    <label className="pg-field">
                      <span>{fallback ? 'Fallback deadline' : 'Admissions close'}</span>
                      <input type="datetime-local" value={toLocalInput(u.countdown.deadline)} onChange={(e) => e.target.value && set('urgency.countdown.deadline', new Date(e.target.value).toISOString())} />
                    </label>
                  )}
                  {type === 'seats' && (
                    <>
                      <Num label={`${fallback}Seats filled (%)`} value={u.seats.percent} min={0} max={100} onChange={(v) => set('urgency.seats.percent', v)} />
                      <Text label="Batch" value={u.seats.batch} onChange={(v) => set('urgency.seats.batch', v)} />
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {full && <p className="pg-small">{MAX_URGENCY} selected, the maximum. Turn one off to pick another.</p>}
      {anyLive && (
        <>
          <Num label="Real-time refresh (s)" value={u.refreshSeconds} min={10} max={600} onChange={(v) => set('urgency.refreshSeconds', v)} />
          <p className="pg-small">Real-time values come from the urgency API (mocked; values drift up). Manual values are the fallback if it fails.</p>
        </>
      )}
    </div>
  );
}

function TrustEditor({ badges, onChange }: { badges: TrustBadge[]; onChange(b: TrustBadge[]): void }) {
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const update = (i: number, patch: Partial<TrustBadge>) => onChange(badges.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const isBuiltIn = (icon: string) => icon in trustIcons;
  return (
    <div className="pg-field">
      <span>Trust badges ({badges.length}/3)</span>
      <div className="pg-badges">
        {badges.map((b, i) => (
          <div key={i} className="pg-badge">
            <div className="pg-badge__top">
              <span className="pg-badge__icon">{isBuiltIn(b.icon) ? trustIcons[b.icon as keyof typeof trustIcons] : <img src={b.icon} alt="" />}</span>
              <select
                aria-label={`Badge ${i + 1} icon`}
                value={isBuiltIn(b.icon) ? b.icon : 'custom'}
                onChange={(e) => (e.target.value === 'custom' ? fileRefs.current[i]?.click() : update(i, { icon: e.target.value }))}
              >
                {Object.entries(trustIconNames).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
                <option value="custom">{isBuiltIn(b.icon) ? 'Upload icon…' : 'Uploaded icon'}</option>
              </select>
              <button type="button" className="pg-badge__btn" title="Upload icon" aria-label={`Upload icon for badge ${i + 1}`} onClick={() => fileRefs.current[i]?.click()}>
                ⤒
              </button>
              {badges.length > 1 && (
                <button type="button" className="pg-badge__btn" title="Remove badge" aria-label={`Remove badge ${i + 1}`} onClick={() => onChange(badges.filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
              <input
                ref={(el) => {
                  fileRefs.current[i] = el;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) update(i, { icon: URL.createObjectURL(f) });
                  e.target.value = '';
                }}
              />
            </div>
            <input aria-label={`Badge ${i + 1} title`} value={b.title} placeholder="Title" onChange={(e) => update(i, { title: e.target.value })} />
            <input aria-label={`Badge ${i + 1} subtitle`} value={b.subtitle} placeholder="Subtitle" onChange={(e) => update(i, { subtitle: e.target.value })} />
          </div>
        ))}
      </div>
      {badges.length < 3 && (
        <button type="button" className="pg-add" onClick={() => onChange([...badges, { icon: 'star', title: 'New badge', subtitle: 'Subtitle' }])}>
          + Add badge
        </button>
      )}
    </div>
  );
}

function ImageField({
  label,
  hint,
  value,
  onChange,
  onReset,
}: {
  label: string;
  hint: string;
  value: string;
  onChange(url: string): void;
  onReset(): void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const isUpload = value.startsWith('blob:');
  return (
    <div className="pg-field">
      <span>{label}</span>
      <div className="pg-image">
        <img src={value} alt="" />
        <div className="pg-image__meta">
          <small>{isUpload ? 'Uploaded image' : hint}</small>
          <div className="pg-image__btns">
            <button type="button" onClick={() => input.current?.click()}>
              Upload
            </button>
            {isUpload && (
              <button type="button" onClick={onReset}>
                Reset
              </button>
            )}
          </div>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(URL.createObjectURL(file));
            e.target.value = '';
          }}
        />
      </div>
    </div>
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
