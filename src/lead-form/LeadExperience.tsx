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

const themeVars = (c: LeadFormConfig) => ({ '--lf-primary': c.brand.primaryColor }) as CSSProperties;

interface OverlayCtl {
  open: boolean;
  view: View;
  style: OverlayStyle;
  openForm(): void;
  /** Show the exit-intent screen (once per page view, never after submit). */
  triggerExitIntent(): void;
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
  const exitShown = useRef(false);
  const autoOpened = useRef(false);

  // When there is no overlay form, exit intent still needs a container.
  const style: OverlayStyle = configured !== 'none' ? configured : device === 'desktop' ? 'popup' : 'mobile-popup';
  const hasOverlayForm = configured !== 'none';

  const openForm = useCallback(() => {
    if (!hasOverlayForm) return onFocusBanner?.();
    setView('form');
    setOpen(true);
  }, [hasOverlayForm, onFocusBanner]);

  const triggerExitIntent = useCallback(() => {
    if (!config.exitIntent.enabled || exitShown.current || flow.submitted) return;
    exitShown.current = true;
    setView('exit');
    setOpen(true);
  }, [config.exitIntent.enabled, flow.submitted]);

  const requestClose = () => {
    if (view === 'form' && !flow.submitted && config.exitIntent.enabled && config.exitIntent.onClose && !exitShown.current) {
      exitShown.current = true;
      setView('exit');
      return;
    }
    setOpen(false);
  };

  const continueFromExit = () => {
    if (hasOverlayForm) return setView('form');
    setOpen(false);
    onFocusBanner?.();
  };

  // Reset one-shot guards whenever the configuration changes (playground).
  useEffect(() => {
    exitShown.current = false;
    autoOpened.current = false;
    setOpen(false);
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

  // Exit-intent detection.
  useEffect(() => {
    if (!config.exitIntent.enabled || !config.exitIntent.onLeaveIntent) return;
    if (device === 'desktop') {
      const onOut = (e: MouseEvent) => {
        if (!e.relatedTarget && e.clientY <= 4) triggerExitIntent();
      };
      document.addEventListener('mouseout', onOut);
      return () => document.removeEventListener('mouseout', onOut);
    }
    // Mobile: a quick flick back towards the top after reading down the page.
    const el = scrollRoot ?? document.documentElement;
    const target: HTMLElement | Window = scrollRoot ?? window;
    let lastY = el.scrollTop;
    let lastT = performance.now();
    let maxY = 0;
    const onScroll = () => {
      const y = el.scrollTop;
      const t = performance.now();
      maxY = Math.max(maxY, y);
      const velocity = (lastY - y) / Math.max(1, t - lastT); // px/ms upward
      if (velocity > 2.5 && maxY > el.clientHeight * 0.6) triggerExitIntent();
      lastY = y;
      lastT = t;
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [config.exitIntent, device, scrollRoot, triggerExitIntent]);

  const ctl: OverlayCtl = { open, view, style, openForm, triggerExitIntent };

  return (
    <OverlayCtx.Provider value={ctl}>
      {children}
      {open && <Overlay style={style} view={view} onClose={requestClose} onContinue={continueFromExit} onDismiss={() => setOpen(false)} />}
    </OverlayCtx.Provider>
  );
}

/** Inline form for the hero banner. */
export function BannerForm() {
  const { submitted, config } = useLeadFlow();
  if (!config.banner.enabled) return null;
  return <div className="lf lf-card lf-card--banner" style={themeVars(config)}>{submitted ? <SuccessPanel /> : <FormPanel />}</div>;
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
        <button
          type="button"
          className={`lf-close${image === 'top' ? ' lf-close--light' : ''}`}
          aria-label="Close"
          onClick={view === 'exit' && !submitted ? onDismiss : onClose}
        >
          <CloseX size={shell === 'drawer' ? 12 : 10} />
        </button>
        {image === 'side' && <img className="lf-side-img" src={config.overlay.sideImage} alt="" />}
        <div className="lf-shell__main">
          {image === 'top' && <img className="lf-top-img" src={config.overlay.topImage} alt="" />}
          {submitted ? <SuccessPanel /> : view === 'exit' ? <ExitPanel onContinue={onContinue} onClose={onDismiss} /> : <FormPanel />}
        </div>
      </div>
    </div>
  );
}
