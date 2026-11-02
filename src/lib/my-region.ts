'use client';
/** Reader's chosen region, kept only in this browser (localStorage). Never sent to the server. */
export const MY_REGION_KEY = 'gc_my_region';
export const MY_REGION_EVENT = 'gc-my-region';
export function getMyRegion(): string | null {
  try { return localStorage.getItem(MY_REGION_KEY); } catch { return null; }
}
export function setMyRegion(name: string | null) {
  try { name ? localStorage.setItem(MY_REGION_KEY, name) : localStorage.removeItem(MY_REGION_KEY); } catch {}
  window.dispatchEvent(new Event(MY_REGION_EVENT));
}
