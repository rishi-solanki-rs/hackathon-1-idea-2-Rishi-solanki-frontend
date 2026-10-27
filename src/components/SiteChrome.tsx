import Link from 'next/link';
import { Menu, Plane } from 'lucide-react';
import { t } from '@/i18n/en';

const links = [
  { href: '/', label: t.nav.quick },
  { href: '/plan', label: t.nav.plan },
  { href: '/wallet', label: t.nav.wallet },
  { href: '/how-it-works', label: t.nav.how },
  { href: '/settings', label: t.nav.settings },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-lg" aria-label="A Una Milla, home">
      <span className="grid size-9 place-items-center rounded-full bg-terracotta text-white">
        <Plane aria-hidden className="size-5 -rotate-45" />
      </span>
      <span className="font-display text-xl text-ink">
        A Una <span className="text-sea">Milla</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-ivory/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-full px-3 py-2 text-ink-soft hover:bg-sand hover:text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <details className="relative md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden className="size-4" /> Menu
          </summary>
          <nav
            aria-label="Main"
            className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-[var(--shadow-card)]"
          >
            <ul className="flex flex-col text-sm font-medium">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-xl px-3 py-2.5 hover:bg-sand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-sand">
      <div className="tile-rule" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-ink-soft md:grid-cols-[1fr_auto]">
        <p className="max-w-2xl">{t.footer}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          <li>
            <Link className="underline-offset-4 hover:underline" href="/how-it-works">
              How we calculate
            </Link>
          </li>
          <li>
            <Link className="underline-offset-4 hover:underline" href="/settings">
              Privacy and your data
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
