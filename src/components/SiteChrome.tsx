import Link from 'next/link';
import { Menu, Plane } from 'lucide-react';
import { t } from '@/i18n/en';
import { AccountButton } from './account/AccountButton';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { href: '/plan', label: t.nav.plan },
  { href: '/compare', label: t.nav.compare },
  { href: '/my-plans', label: t.nav.myPlans },
];

function Logo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 rounded-lg"
      aria-label="A Una Milla, home"
    >
      <span className="grid size-9 place-items-center rounded-full bg-[#a23d18] text-white">
        <Plane aria-hidden className="size-5 -rotate-45" />
      </span>
      <span className="font-display text-xl text-ink">
        A Una <span className="text-sea-dark">Milla</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-ivory/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
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
        <div className="flex items-center gap-2">
          <AccountButton />
          <ThemeToggle />
          <details className="relative md:hidden">
            <summary
              aria-label="Menu"
              className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-line [&::-webkit-details-marker]:hidden"
            >
              <Menu aria-hidden className="size-5" />
            </summary>
            <nav
              aria-label="Main"
              className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-card)]"
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
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-sand">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 text-sm text-ink-soft sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="max-w-2xl">{t.footer}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          <li>
            <Link className="underline-offset-4 hover:underline" href="/how-it-works">
              How it works
            </Link>
          </li>
          <li>
            <Link className="underline-offset-4 hover:underline" href="/settings">
              Privacy and data
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
