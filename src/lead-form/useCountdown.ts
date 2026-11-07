import { useEffect, useState } from 'react';

export function useCountdown(deadlineIso: string) {
  const deadline = new Date(deadlineIso).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, Math.floor((deadline - now) / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    expired: total === 0,
  };
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** "2nd Oct’26" */
export function formatDeadline(iso: string) {
  const d = new Date(iso);
  const mon = d.toLocaleString('en-US', { month: 'short' });
  return `${ordinal(d.getDate())} ${mon}’${String(d.getFullYear()).slice(2)}`;
}
