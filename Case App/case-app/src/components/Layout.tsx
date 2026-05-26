import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TelenorLogo } from './TelenorLogo';
import { getActor, getHubSession } from '../lib/session';

interface LayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Layout({ title, subtitle, actions, children }: LayoutProps) {
  const hub = getHubSession();
  const actor = getActor();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <TelenorLogo size={28} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-bold text-telenor-blue">{title}</h1>
                <Link
                  to="/"
                  className="hidden sm:inline text-xs text-slate-400 hover:text-telenor-blue"
                >
                  Bytt rolle
                </Link>
              </div>
              {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {actions}
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-800">{actor.brukerNavn}</div>
              {hub?.email && <div className="text-xs text-slate-400">{hub.email}</div>}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
