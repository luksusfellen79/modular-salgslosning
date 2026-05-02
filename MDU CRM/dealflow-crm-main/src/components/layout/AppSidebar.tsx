import { LayoutGrid, Users, Building2, TrendingUp, BarChart3, Settings, Zap, Flag } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useWarRoom } from '@/context/WarRoomContext';

const navItems = [
  { label: 'Pipeline', to: '/', icon: LayoutGrid },
  { label: 'Offer Hub', to: '/offer-hub', icon: Zap },
  { label: 'War Room', to: '/war-room', icon: Flag },
  { label: 'Leads', to: '/leads', icon: Users },
  { label: 'Accounts', to: '/accounts', icon: Building2 },
  { label: 'Forecast', to: '/forecast', icon: TrendingUp },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
];

export function AppSidebar() {
  const { items } = useWarRoom();
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-sidebar text-sidebar-foreground flex flex-col z-30">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-base font-semibold text-sidebar-accent-foreground tracking-tight">SalesFlow</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span className="flex-1">{item.label}</span>
            {item.to === '/war-room' && pendingCount > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
        >
          <Settings className="w-[18px] h-[18px]" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
