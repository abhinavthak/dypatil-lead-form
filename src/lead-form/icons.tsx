export const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const CloseX = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const Users = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    <path d="M15.5 4.8a3.5 3.5 0 010 6.4M18 14.8c2 .8 3.2 2.5 3.5 5.2" />
  </svg>
);

export const VerifiedTick = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#1e9e50"
      d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3 3.2.1z"
    />
    <path d="M7.8 12.3l2.8 2.8 5.6-5.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowRight = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

export const Spinner = () => <span className="lf-spinner" aria-hidden />;

const ti = { width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true } as const;

/** Trust-badge icons redrawn as vectors (transparent, recolourable via `color`). */
export const trustIcons = {
  ugc: (
    <svg {...ti}>
      <path fill="currentColor" d="M12 2l8 3v6.2c0 5-3.4 9.3-8 10.8-4.6-1.5-8-5.8-8-10.8V5l8-3z" />
      <circle cx="12" cy="9.6" r="2.4" className="lf-ti-d" />
      <path className="lf-ti-d" d="M7.8 16.2c.6-2.2 2.3-3.4 4.2-3.4s3.6 1.2 4.2 3.4c-1.2 1.1-2.6 1.8-4.2 1.8s-3-.7-4.2-1.8z" />
    </svg>
  ),
  naac: (
    <svg {...ti}>
      <path fill="currentColor" d="M8.2 13.5L5 21l3.2-1.2L10 23l2.2-6.3zM15.8 13.5L19 21l-3.2-1.2L14 23l-2.2-6.3z" />
      <circle cx="12" cy="9" r="7" fill="currentColor" />
      <path className="lf-ti-d" d="M12 4.9l1.2 2.5 2.7.4-2 1.9.5 2.7L12 11.1l-2.4 1.3.5-2.7-2-1.9 2.7-.4z" />
    </svg>
  ),
  emi: (
    <svg {...ti}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="currentColor" />
      <rect x="2.5" y="8.2" width="19" height="2.4" className="lf-ti-d" opacity=".85" />
      <path fill="none" className="lf-ti-s" strokeWidth="1.8" strokeLinecap="round" d="M6 15h4" />
      <circle cx="17" cy="15" r="1.6" className="lf-ti-d" />
    </svg>
  ),
};
