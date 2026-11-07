import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { LeadFlowProvider, useLeadFlow } from './LeadFlow';
import { FormPanel } from './FormCard';
import { SuccessPanel } from './SuccessPanel';
import { ExitPanel } from './ExitPanel';
import { CloseX } from './icons';
import { mockApi } from './mockApi';
import type { Device, LeadApi, LeadData, LeadFormConfig, OverlayStyle } from './types';

type View = 'form' | 'exit';

const themeVars = (c: LeadFormConfig) => {
  const cta = c.brand.ctaColor || c.brand.primaryColor;
  return {
    '--lf-primary': c.brand.primaryColor,
    '--lf-cta': cta,
    '--lf-cta-text': '#fff', // CTA text is always white
  } as CSSProperties;
};

type BannerView = 'form' | 'exit' | 'closed';

interface OverlayCtl {
  open: boolean;
  view: View;
  style: OverlayStyle;
  openForm(): void;
  bannerView: BannerView;
  closeBanner(): void;
  continueBanner(): void;
  dismissBanner(): void;
}

const OverlayCtx = createContext<OverlayCtl | null>(null);
export const useLeadOverlay = () => {
  const v = useContext(OverlayCtx);
  if (!v) throw new Error('useLeadOverlay must be used inside <LeadExperience>');
  return v;
};

export interface LeadExperienceProps {
  config: LeadFormConfig;
  device: Device;
  api?: LeadApi;
  /** Element that scrolls the page. Defaults to the window. */
  scrollRoot?: HTMLElement | null;
  onSubmitted?(lead: LeadData): void;
  /** Called when the visitor chooses "Continue" from exit intent and there is no overlay form. */
  onFocusBanner?(): void;
  children?: ReactNode;
}

/**
 * Wraps a page: provides the shared lead state, renders the configured overlay,
 * and wires the auto-open trigger and exit-intent detection.
 * Place <BannerForm /> anywhere inside for the inline (hero banner) form.
 */
export function LeadExperience(props: LeadExperienceProps) {
  return (
    <LeadFlowProvider config={props.config} device={props.device} api={props.api ?? mockApi} onSubmitted={props.onSubmitted}>
      <Controller {...props} />
    </LeadFlowProvider>
  );
}

function Controller({ config, device, scrollRoot, onFocusBanner, children }: LeadExperienceProps) {
  const flow = useLeadFlow();
  const configured = device === 'desktop' ? config.overlay.desktopStyle : config.overlay.mobileStyle;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('form');
  const autoOpened = useRef(false);
  const [bannerView, setBannerView] = useState<BannerView>('form');

  // When there is no overlay form, exit intent still needs a container.
  const style: OverlayStyle = configured !== 'none' ? configured : device === 'desktop' ? 'popup' : 'mobile-popup';
  const hasOverlayForm = configured !== 'none';

  const openForm = useCallback(() => {
    if (!hasOverlayForm) {
      // No overlay: page CTAs bring a closed banner form back.
      setBannerView('form');
      return onFocusBanner?.();
    }
    setView('form');
    setOpen(true);
  }, [hasOverlayForm, onFocusBanner]);

  const requestClose = () => {
    if (view === 'exit' && !flow.submitted) return; // only "No Thanks, Close" or "Continue" leave the exit screen
    // Exit intent: closing the form before submitting shows the "Before you go" screen (every time).
    if (view === 'form' && !flow.submitted && config.exitIntent.enabled) {
      setView('exit');
      return;
    }
    setOpen(false);
  };

  const dismissExit = () => setOpen(false);

  // Banner ✕ follows the same rule as overlays: exit screen first (if enabled and not submitted), then close.
  const closeBanner = () => {
    if (bannerView === 'form' && !flow.submitted && config.exitIntent.enabled) return setBannerView('exit');
    setBannerView('closed');
  };
  const continueBanner = () => setBannerView('form');
  const dismissBanner = () => setBannerView('closed');

  const continueFromExit = () => {
    if (hasOverlayForm) return setView('form');
    setOpen(false);
    onFocusBanner?.();
  };

  // Reset the auto-open guard whenever the configuration changes (playground).
  useEffect(() => {
    autoOpened.current = false;
    setOpen(false);
    setBannerView('form');
  }, [config, device]);

  // Auto-open trigger.
  useEffect(() => {
    if (!hasOverlayForm || flow.submitted || autoOpened.current) return;
    const fire = () => {
      if (autoOpened.current) return;
      autoOpened.current = true;
      setView('form');
      setOpen(true);
    };
    const { trigger, delaySeconds, scrollPercent } = config.overlay;
    if (trigger === 'load') {
      fire();
      return;
    }
    if (trigger === 'delay') {
      const id = setTimeout(fire, delaySeconds * 1000);
      return () => clearTimeout(id);
    }
    if (trigger === 'scroll') {
      const target: HTMLElement | Window = scrollRoot ?? window;
      const onScroll = () => {
        const el = scrollRoot ?? document.documentElement;
        const max = el.scrollHeight - el.clientHeight;
        if (max > 0 && (el.scrollTop / max) * 100 >= scrollPercent) fire();
      };
      target.addEventListener('scroll', onScroll, { passive: true });
      return () => target.removeEventListener('scroll', onScroll);
    }
  }, [config.overlay, hasOverlayForm, flow.submitted, scrollRoot]);

  const ctl: OverlayCtl = { open, view, style, openForm, bannerView, closeBanner, continueBanner, dismissBanner };

  return (
    <OverlayCtx.Provider value={ctl}>
      {children}
      {open && <Overlay style={style} view={view} onClose={requestClose} onContinue={continueFromExit} onDismiss={dismissExit} />}
    </OverlayCtx.Provider>
  );
}

/** Inline form for the hero banner. */
export function BannerForm() {
  const { submitted, config } = useLeadFlow();
  const { bannerView, closeBanner, continueBanner, dismissBanner } = useLeadOverlay();
  if (!config.banner.enabled || bannerView === 'closed') return null;
  const exit = bannerView === 'exit' && !submitted;
  // Like the overlays, the promo image only shows with the form (not on the success or exit screens).
  const image = config.banner.showImage && config.banner.image && !submitted && !exit ? config.banner.image : null;
  return (
    <div className={`lf lf-card lf-card--banner${image ? ' has-image' : ''}`} style={themeVars(config)}>
      {config.banner.closable && !exit && (
        <button type="button" className={`lf-close${image ? ' lf-close--light' : ''}`} aria-label="Close form" onClick={closeBanner}>
          <CloseX size={10} />
        </button>
      )}
      <div className="lf-card__col">
        {image && <img className="lf-top-img" src={image} alt="" />}
        {submitted ? <SuccessPanel /> : exit ? <ExitPanel onContinue={continueBanner} onClose={dismissBanner} /> : <FormPanel />}
      </div>
    </div>
  );
}

function Overlay({
  style,
  view,
  onClose,
  onContinue,
  onDismiss,
}: {
  style: OverlayStyle;
  view: View;
  onClose(): void;
  onContinue(): void;
  onDismiss(): void;
}) {
  const { submitted, config } = useLeadFlow();
  const shell = style.startsWith('sidebar') ? 'sidebar' : style.startsWith('bottom-drawer') ? 'drawer' : 'popup';
  // Success and exit screens drop the promo image (as in the designs).
  const showForm = view === 'form' && !submitted;
  const image = showForm
    ? style === 'popup-side-image'
      ? 'side'
      : style.endsWith('top-image')
        ? 'top'
        : null
    : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`lf lf-overlay lf-overlay--${shell}`} style={themeVars(config)}>
      <div className="lf-backdrop" onClick={onClose} />
      <div
        className={`lf-shell lf-shell--${shell}${image === 'side' ? ' has-side' : ''}${view === 'exit' && showForm === false && !submitted ? ' is-exit' : ''}${submitted ? ' is-success' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        {!(view === 'exit' && !submitted) && (
          <button type="button" className={`lf-close${image === 'top' ? ' lf-close--light' : ''}`} aria-label="Close" onClick={onClose}>
            <CloseX size={shell === 'drawer' ? 12 : 10} />
          </button>
        )}
        {image === 'side' && <img className="lf-side-img" src={config.overlay.sideImage} alt="" />}
        <div className="lf-shell__main">
          {image === 'top' && <img className="lf-top-img" src={config.overlay.topImage} alt="" />}
          {submitted ? <SuccessPanel /> : view === 'exit' ? <ExitPanel onContinue={onContinue} onClose={onDismiss} /> : <FormPanel />}
        </div>
      </div>
    </div>
  );
}
