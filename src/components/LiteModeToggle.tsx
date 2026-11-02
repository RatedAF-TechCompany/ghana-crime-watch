'use client';
import { useEffect, useState } from 'react';

/** Low-data mode: hides photos, ads and embeds on this device. */
export function LiteModeToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(document.documentElement.classList.contains('lite')); }, []);
  const toggle = () => {
    const next = !on; setOn(next);
    document.documentElement.classList.toggle('lite', next);
    try { next ? localStorage.setItem('gc_lite', '1') : localStorage.removeItem('gc_lite'); } catch {}
  };
  return <button type="button" onClick={toggle} aria-pressed={on} className="hover:text-primary">{on ? 'Lite mode: on' : 'Lite mode (save data)'}</button>;
}
