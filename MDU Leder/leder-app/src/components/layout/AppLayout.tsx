import { AppSidebar } from './AppSidebar';
import { Sidekick } from '@/components/Sidekick';

function getSessionUser(): { name: string; role: string } {
  try {
    const raw = localStorage.getItem('salgshub_session');
    if (!raw) return { name: 'Leder', role: '' };
    const u = JSON.parse(raw) as { name: string; role: string };
    return { name: u.name ?? 'Leder', role: u.role ?? '' };
  } catch {
    return { name: 'Leder', role: '' };
  }
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const user = getSessionUser();
  const initials = user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-card shrink-0">
          <div />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground"
              style={{ backgroundColor: 'hsl(225 70% 45%)' }}
            >
              {initials}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <Sidekick mode="leder" />
    </div>
  );
}
