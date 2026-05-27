import { Navigate } from 'react-router-dom';
import { getAppContext, getHubSession, saveAppContext } from '../lib/session';
import {
  canPickAnyCaseRole,
  getEffectiveRolleId,
  hasCaseAppAccess,
  resolveCaseContextFromRolle,
} from '../lib/roles';
import { RolePickerView } from './RolePickerView';

/** Hjem-rute: auto-rut fra Hub-rolle, eller vis rolvelger */
export function HomeRoute() {
  const hub = getHubSession();
  const existing = getAppContext();

  if (existing) {
    return <Navigate to={existing.mode === 'kundeservice' ? '/kundeservice' : '/teknisk'} replace />;
  }

  if (hub && !hasCaseAppAccess(hub)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Ingen tilgang</h1>
          <p className="text-slate-600 text-sm">
            Brukeren {hub.name} har ikke tilgang til Case App. Logg inn via Hub med en case-rolle.
          </p>
        </div>
      </div>
    );
  }

  const rolleId = getEffectiveRolleId(hub);
  const auto = resolveCaseContextFromRolle(rolleId);
  if (auto) {
    saveAppContext(auto);
    return <Navigate to={auto.mode === 'kundeservice' ? '/kundeservice' : '/teknisk'} replace />;
  }

  if (canPickAnyCaseRole(hub) || !hub) {
    return <RolePickerView />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Ingen tilgang</h1>
        <p className="text-slate-600 text-sm">Kontakt administrator for Case App-tilgang.</p>
      </div>
    </div>
  );
}
