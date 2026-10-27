import type { Explanation as E } from '@/contracts/search';
import { Card } from '../ui';

const sections: { key: keyof Omit<E, 'summary'>; title: string }[] = [
  { key: 'why', title: 'Why this result' },
  { key: 'assumptions', title: 'Assumptions we used' },
  { key: 'notCounted', title: 'Not counted in your saving' },
  { key: 'risks', title: 'Before you book' },
  { key: 'dataSources', title: 'Where the numbers come from' },
];

export function Explanation({ e }: { e: E }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-xl">How we got this result</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {sections.map((s) =>
          e[s.key].length ? (
            <section key={s.key}>
              <h3 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
                {s.title}
              </h3>
              <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm text-ink-soft">
                {e[s.key].map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
          ) : null,
        )}
      </div>
    </Card>
  );
}
