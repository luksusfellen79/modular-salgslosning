import { X, Phone, Mail, Video, CheckSquare, Building2, User, Calendar, DollarSign, TrendingUp, ArrowRight, FileText } from 'lucide-react';
import { Opportunity, Activity, HistoryEntry, Product, activities as allActivities, historyEntries as allHistory, products as allProducts, formatCurrency, formatDate, formatDateTime } from '@/data/mockData';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SidePanelProps {
  deal: Opportunity;
  onClose: () => void;
}

const tabs = ['Overview', 'Activities', 'Products', 'History'] as const;

function ActivityIcon({ type }: { type: Activity['type'] }) {
  const cls = 'w-4 h-4';
  switch (type) {
    case 'call': return <Phone className={cls} />;
    case 'email': return <Mail className={cls} />;
    case 'meeting': return <Video className={cls} />;
    case 'task': return <CheckSquare className={cls} />;
  }
}

function activityColor(type: Activity['type']) {
  switch (type) {
    case 'call': return 'bg-primary/10 text-primary';
    case 'email': return 'bg-stage-proposal/10 text-stage-proposal';
    case 'meeting': return 'bg-stage-qualification/10 text-stage-qualification';
    case 'task': return 'bg-success/10 text-success';
  }
}

export function SidePanel({ deal, onClose }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Overview');
  const navigate = useNavigate();
  const dealActivities = allActivities.filter((a) => a.opportunityId === deal.id);
  const dealHistory = allHistory.filter((h) => h.opportunityId === deal.id);
  const dealProducts = allProducts.filter((p) => p.opportunityId === deal.id);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-card shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-1">{deal.accountName}</p>
              <h2 className="text-lg font-bold text-foreground truncate">{deal.name}</h2>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => { onClose(); navigate(`/offer-hub?opportunityId=${deal.id}`); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Bygg tilbud
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <DollarSign className="w-4 h-4 text-primary" />
              {formatCurrency(deal.value)}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {formatDate(deal.closeDate)}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              {deal.probability}%
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {activeTab === 'Overview' && <OverviewTab deal={deal} />}
          {activeTab === 'Activities' && <ActivitiesTab activities={dealActivities} />}
          {activeTab === 'Products' && <ProductsTab products={dealProducts} />}
          {activeTab === 'History' && <HistoryTab history={dealHistory} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ deal }: { deal: Opportunity }) {
  const fields = [
    { icon: Building2, label: 'Account', value: deal.accountName },
    { icon: User, label: 'Contact', value: deal.contactName || '—' },
    { icon: Mail, label: 'Email', value: deal.contactEmail || '—' },
    { icon: Phone, label: 'Phone', value: deal.phone || '—' },
    { icon: TrendingUp, label: 'Source', value: deal.source || '—' },
    { icon: CheckSquare, label: 'Type', value: deal.type || '—' },
    { icon: Calendar, label: 'Created', value: formatDate(deal.createdDate) },
  ];

  return (
    <div className="space-y-4">
      {deal.description && (
        <p className="text-sm text-muted-foreground leading-relaxed pb-4 border-b border-border">{deal.description}</p>
      )}
      {fields.map((f) => (
        <div key={f.label} className="flex items-center gap-3 py-1.5">
          <f.icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground w-20 shrink-0">{f.label}</span>
          <span className="text-sm font-medium text-foreground">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

function ActivitiesTab({ activities }: { activities: Activity[] }) {
  const quickActions = [
    { icon: Phone, label: 'Call', type: 'call' as const },
    { icon: Mail, label: 'Email', type: 'email' as const },
    { icon: Video, label: 'Meeting', type: 'meeting' as const },
    { icon: CheckSquare, label: 'Task', type: 'task' as const },
  ];

  return (
    <div className="space-y-5">
      {/* Quick add */}
      <div className="flex gap-2">
        {quickActions.map((a) => (
          <button
            key={a.type}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <a.icon className="w-3.5 h-3.5" />
            {a.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {activities.length === 0 && <p className="text-sm text-muted-foreground">No activities yet.</p>}
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3 items-start">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activityColor(activity.type)}`}>
              <ActivityIcon type={activity.type} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${activity.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {activity.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(activity.date)}</p>
            </div>
            <input
              type="checkbox"
              defaultChecked={activity.completed}
              className="mt-1 w-4 h-4 rounded border-border text-primary accent-primary"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductsTab({ products }: { products: Product[] }) {
  const total = products.reduce((s, p) => s + p.total, 0);

  return (
    <div>
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products attached.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.quantity} × {formatCurrency(p.unitPrice)}</p>
              </div>
              <span className="text-sm font-semibold text-foreground">{formatCurrency(p.total)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-sm font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ history }: { history: HistoryEntry[] }) {
  return (
    <div className="space-y-4">
      {history.length === 0 && <p className="text-sm text-muted-foreground">No changes recorded.</p>}
      {history.map((h) => (
        <div key={h.id} className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-foreground">
              <span className="font-medium">{h.field}</span> changed from{' '}
              <span className="text-muted-foreground">{h.oldValue}</span> to{' '}
              <span className="font-medium">{h.newValue}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{h.user} · {formatDateTime(h.date)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
