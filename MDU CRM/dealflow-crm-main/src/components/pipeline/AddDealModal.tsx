import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createOpportunity, CreateOpportunityPayload } from '@/lib/salesCore';

interface AddDealModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const STAGES = [
  { id: 'prospect', label: 'Prospekt' },
  { id: 'qualification', label: 'Kontaktet' },
  { id: 'proposal', label: 'Tilbud sendt' },
  { id: 'negotiation', label: 'Forhandling' },
];

export function AddDealModal({ onClose, onCreated }: AddDealModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateOpportunityPayload>({
    name: '',
    accountName: '',
    contactName: '',
    contactEmail: '',
    stage: 'prospect',
    closeDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    estimatedAnnualValue: 0,
    units: 0,
    notes: '',
  });

  const set = (field: keyof CreateOpportunityPayload, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.accountName || !form.units || !form.estimatedAnnualValue) {
      setError('Fyll ut alle påkrevde felt (*)');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createOpportunity(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Ny deal</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dealnavn *" col="2">
              <input
                type="text"
                placeholder="F.eks. Parkveien — Fellesavtale Fiber"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Account / Borettslag *" col="2">
              <input
                type="text"
                placeholder="F.eks. Parkveien Borettslag"
                value={form.accountName}
                onChange={(e) => set('accountName', e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Kontaktperson">
              <input
                type="text"
                placeholder="Navn på styreleder"
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="E-post kontakt">
              <input
                type="email"
                placeholder="styret@borettslaget.no"
                value={form.contactEmail}
                onChange={(e) => set('contactEmail', e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Antall enheter *">
              <input
                type="number"
                min={1}
                placeholder="120"
                value={form.units || ''}
                onChange={(e) => set('units', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>

            <Field label="Estimert årsverdi (kr) *">
              <input
                type="number"
                min={0}
                step={1000}
                placeholder="1 200 000"
                value={form.estimatedAnnualValue || ''}
                onChange={(e) => set('estimatedAnnualValue', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>

            <Field label="Stage">
              <select
                value={form.stage}
                onChange={(e) => set('stage', e.target.value)}
                className={inputCls}
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Estimert lukkedato">
              <input
                type="date"
                value={form.closeDate}
                onChange={(e) => set('closeDate', e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Notat" col="2">
              <textarea
                rows={2}
                placeholder="Kort beskrivelse av muligheten..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Lagrer...</> : 'Opprett deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full text-sm rounded-lg border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

function Field({ label, children, col }: { label: string; children: React.ReactNode; col?: '2' }) {
  return (
    <div className={col === '2' ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}
