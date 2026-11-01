'use client';
import { createContext, useContext } from 'react';
const Ctx = createContext<string[]>([]);
export function EmptySectionsProvider({ value, children }: { value: string[]; children: React.ReactNode }) { return <Ctx.Provider value={value}>{children}</Ctx.Provider>; }
/** Returns a predicate: true if the href points at a section with no published articles. */
export function useIsEmptySection() { const empty = useContext(Ctx); return (href: string) => empty.includes(href.replace(/^\//, '')); }
