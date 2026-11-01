// BBC-style developing-story update box. Server/client safe (no DOM access).
export type StoryUpdate = {
  id: string;
  posted_at: string;
  summary: string;
  body_md: string | null;
  sources: string[] | null;
  kind: "update" | "correction" | string;
};

const ukTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" }).format(new Date(iso));
function host(u: string) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } }

function Item({ u, label }: { u: StoryUpdate; label: string }) {
  return (
    <li className="py-2 border-b border-[#E5E5E5] last:border-0">
      <p className="font-sans text-[14px] text-[#1A1A1A]">
        <strong>{label} {ukTime(u.posted_at)} UK:</strong> {u.summary}
      </p>
      {u.body_md && <p className="font-sans text-[13px] text-[#3A3A3A] mt-1 whitespace-pre-line">{u.body_md}</p>}
      {u.sources && u.sources.length > 0 && (
        <p className="font-sans text-[12px] text-[#5B5B5B] mt-1">
          Sources:{" "}
          {u.sources.map((s, i) => (
            <span key={s}>{i > 0 && ", "}{/^https?:\/\//.test(s) ? <a href={s} target="_blank" rel="noopener nofollow" className="underline">{host(s)}</a> : s}</span>
          ))}
        </p>
      )}
    </li>
  );
}

export function StoryUpdates({ updates }: { updates?: StoryUpdate[] | null }) {
  if (!updates || updates.length === 0) return null;
  const sorted = [...updates].sort((a, b) => b.posted_at.localeCompare(a.posted_at));
  const ups = sorted.filter((u) => u.kind !== "correction");
  const corr = sorted.filter((u) => u.kind === "correction");
  return (
    <>
      {ups.length > 0 && (
        <section aria-label="Latest updates" className="mb-6 border-l-4 border-primary bg-muted px-4 py-3">
          <h2 className="font-sans text-xs font-bold uppercase tracking-wide text-primary mb-1">Latest updates</h2>
          <ul>{ups.map((u) => <Item key={u.id} u={u} label="Updated" />)}</ul>
        </section>
      )}
      {corr.length > 0 && (
        <section aria-label="Corrections" className="mb-6 border-l-4 border-muted-foreground bg-muted px-4 py-3">
          <ul>{corr.map((u) => <Item key={u.id} u={u} label="Correction:" />)}</ul>
        </section>
      )}
    </>
  );
}
