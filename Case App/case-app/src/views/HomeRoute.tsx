import { Navigate } from 'react-router-dom';
import { getAppContext, getHubSession, saveAppContext } from '../lib/session';
import { resolveCaseContextFromRolle } from '../lib/roles';
import { RolePickerView } from './RolePickerView';

/** Hjem-rute: auto-rut fra Hub-rolle, eller vis rolvelger */
export function HomeRoute() {
  const hub = getHubSession();
  const existing = getAppContext();

  if (existing) {
    return <Navigate to={existing.mode === 'kundeservice' ? '/kundeservice' : '/teknisk'} replace />;
  }

  const auto = resolveCaseContextFromRolle(hub?.rolleId);
  if (auto) {
    saveAppContext(auto);
    return <Navigate to={auto.mode === 'kundeservice' ? '/kundeservice' : '/teknisk'} replace />;
  }

  return <RolePickerView />;
}
