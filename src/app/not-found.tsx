import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase">404</p>
      <h1 className="mt-2 font-display text-3xl">This page took a different flight</h1>
      <p className="mt-2 text-ink-soft">The link may be old or mistyped.</p>
      <ButtonLink href="/" className="mt-6">
        Back to search
      </ButtonLink>
    </div>
  );
}
