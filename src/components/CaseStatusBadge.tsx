import { caseStatusLabel, caseStatusText } from '@/lib/crime-labels';

/** Arrested / Charged / Remanded / On trial / Convicted / Acquitted. Hover text keeps the presumption-of-innocence wording. */
export function CaseStatusBadge({ status, className = '' }: { status?: string | null; className?: string }) {
  const s = caseStatusLabel(status);
  if (!s) return null;
  const tone = s.tone === 'final' ? 'border-foreground/40 text-foreground' : s.tone === 'pending' ? 'border-amber-600/50 text-amber-800 dark:text-amber-300' : 'border-border text-muted-foreground';
  return (
    <span title={caseStatusText(status) ?? undefined} className={`inline-block rounded-sm border px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider ${tone} ${className}`}>
      {s.label}
    </span>
  );
}
