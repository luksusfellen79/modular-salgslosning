import { Shield, TrendingUp, BarChart3, Settings, LayoutGrid } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'War Room', to: '/', icon: Shield },
  { label: 'Forecast', to: '/forecast', icon: TrendingUp },
  { label: 'Rapporter', to: '/reports', icon: BarChart3 },
];

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-sidebar text-sidebar-foreground flex flex-col z-30">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-base font-semibold text-sidebar-accent-foreground tracking-tight">MDU Leder</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`
          }
        >
          <Settings className="w-[18px] h-[18px]" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
