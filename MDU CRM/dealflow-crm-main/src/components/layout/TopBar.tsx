import { Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export function TopBar() {
  const [search, setSearch] = useState('');

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search deals, contacts, accounts..."
          className="pl-9 h-9 bg-secondary border-none text-sm"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
            SC
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">Sarah Chen</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sales Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
}
