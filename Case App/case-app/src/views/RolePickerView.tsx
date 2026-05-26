import { useNavigate } from 'react-router-dom';
import { TelenorLogo } from '../components/TelenorLogo';
import { saveAppContext, getHubSession } from '../lib/session';
import { TEKNISKE_GRUPPER, TekniskGruppe } from '../lib/types';

export function RolePickerView() {
  const navigate = useNavigate();
  const hub = getHubSession();

  const selectKundeservice = () => {
    saveAppContext({ mode: 'kundeservice' });
    navigate('/kundeservice');
  };

  const selectTeknisk = (gruppe: TekniskGruppe) => {
    saveAppContext({ mode: 'teknisk', gruppe });
    navigate('/teknisk');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-telenor-blue-dark via-telenor-blue to-telenor-teal flex flex-col items-center justify-center px-5">
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <TelenorLogo size={40} white />
          <span className="text-2xl font-bold text-white">Telenor Case</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Saksbehandling</h1>
        <p className="text-sm text-white/60">
          {hub ? `Innlogget som ${hub.name}` : 'Velg arbeidsflate'}
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <button
          type="button"
          onClick={selectKundeservice}
          className="w-full rounded-2xl border border-white/20 bg-white/10 p-5 text-left hover:bg-white/20 transition"
        >
          <div className="text-lg font-bold text-white">Kundeservice</div>
          <div className="text-sm text-white/60 mt-1">Alle saker, opprett, lukk og gjenåpne</div>
        </button>

        <div className="pt-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-3 px-1">
            Teknisk gruppe
          </div>
          <div className="space-y-2">
            {TEKNISKE_GRUPPER.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => selectTeknisk(g.id)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left hover:bg-white/15 transition"
              >
                <div className="text-white font-medium">{g.label}</div>
                <div className="text-xs text-white/45 mt-0.5">{g.id}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
