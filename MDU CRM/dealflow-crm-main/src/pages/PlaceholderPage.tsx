import { AppLayout } from '@/components/layout/AppLayout';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-[calc(100vh-112px)] text-center">
        <Construction className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">This section is coming soon.</p>
      </div>
    </AppLayout>
  );
}
