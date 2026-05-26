import { useEffect, useState } from 'react';
import { CaseType, SakPrioritet } from '../lib/types';
import { fetchCaseTypes } from '../lib/caseService';

interface CreateCaseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    typeKode: string;
    tittel: string;
    beskrivelse?: string;
    prioritet?: SakPrioritet;
    kundeNavn?: string;
    kundeEpost?: string;
    kundeTelefon?: string;
  }) => Promise<void>;
}

export function CreateCaseModal({ open, onClose, onSubmit }: CreateCaseModalProps) {
  const [typer, setTyper] = useState<CaseType[]>([]);
  const [typeKode, setTypeKode] = useState('');
  const [tittel, setTittel] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [prioritet, setPrioritet] = useState<SakPrioritet>('normal');
  const [kundeNavn, setKundeNavn] = useState('');
  const [kundeEpost, setKundeEpost] = useState('');
  const [kundeTelefon, setKundeTelefon] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchCaseTypes()
      .then((list) => {
        setTyper(list);
        setTypeKode((prev) => prev || (list[0]?.typeKode ?? ''));
      })
      .catch(() => setError('Kunne ikke hente casetyper'));
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeKode || !tittel.trim()) {
      setError('Type og tittel er påkrevd');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        typeKode,
        tittel: tittel.trim(),
        beskrivelse: beskrivelse.trim() || undefined,
        prioritet,
        kundeNavn: kundeNavn.trim() || undefined,
        kundeEpost: kundeEpost.trim() || undefined,
        kundeTelefon: kundeTelefon.trim() || undefined,
      });
      setTittel('');
      setBeskrivelse('');
      setKundeNavn('');
      setKundeEpost('');
      setKundeTelefon('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke opprette sak');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Ny sak</h2>
          <p className="text-sm text-slate-500">Opprett manuell henvendelse</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Type</span>
            <select
              value={typeKode}
              onChange={(e) => setTypeKode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {typer.map((t) => (
                <option key={t.typeKode} value={t.typeKode}>{t.navn}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Tittel *</span>
            <input
              value={tittel}
              onChange={(e) => setTittel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Kort beskrivelse av problemet"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Beskrivelse</span>
            <textarea
              value={beskrivelse}
              onChange={(e) => setBeskrivelse(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Prioritet</span>
              <select
                value={prioritet}
                onChange={(e) => setPrioritet(e.target.value as SakPrioritet)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="lav">Lav</option>
                <option value="normal">Normal</option>
                <option value="høy">Høy</option>
                <option value="kritisk">Kritisk</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Kundenavn</span>
              <input
                value={kundeNavn}
                onChange={(e) => setKundeNavn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">E-post</span>
              <input
                type="email"
                value={kundeEpost}
                onChange={(e) => setKundeEpost(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Telefon</span>
              <input
                value={kundeTelefon}
                onChange={(e) => setKundeTelefon(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-telenor-blue px-4 py-2 text-sm font-semibold text-white hover:bg-telenor-blue-dark disabled:opacity-50"
            >
              {saving ? 'Oppretter…' : 'Opprett sak'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
