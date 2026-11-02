/** "Is this MoMo number a scam?" — submits to the Fraud Watch search, which only shows moderated (non-pending) accounts. */
export function MomoChecker() {
  return (
    <section aria-labelledby="momo-check" className="mb-10 rounded-md border border-border bg-muted/40 px-4 py-3">
      <h2 id="momo-check" className="mb-2 font-sans text-xs font-bold uppercase tracking-[0.16em]">Is this MoMo number a scam?</h2>
      <form action="/fraud-watch/search" method="get" role="search" className="flex gap-2">
        <input name="q" type="search" inputMode="tel" required minLength={3} maxLength={40} placeholder="Number, name or handle" className="h-10 flex-1 rounded-md border border-input bg-background px-3 font-sans text-sm" />
        <button type="submit" className="h-10 rounded-md bg-primary px-4 font-sans text-sm font-semibold text-primary-foreground">Check</button>
      </form>
      <p className="mt-2 font-sans text-[11px] text-muted-fg">Shows only accounts our moderators have reviewed. No result does not mean a number is safe. <a href="/fraud-watch/report" className="underline">Report a scam</a> · <a href="/fraud-watch/directory" className="underline">Directory</a></p>
    </section>
  );
}
