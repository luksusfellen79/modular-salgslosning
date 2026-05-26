import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { bootstrapHubSession, getAppContext } from './lib/session';
import { RolePickerView } from './views/RolePickerView';
import { KundeserviceView } from './views/KundeserviceView';
import { TekniskView } from './views/TekniskView';
import { SaksdetaljerView } from './views/SaksdetaljerView';

bootstrapHubSession();

function RequireContext({ mode, children }: { mode: 'kundeservice' | 'teknisk'; children: JSX.Element }) {
  const ctx = getAppContext();
  if (!ctx) return <Navigate to="/" replace />;
  if (ctx.mode !== mode) return <Navigate to={ctx.mode === 'kundeservice' ? '/kundeservice' : '/teknisk'} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RolePickerView />} />
        <Route
          path="/kundeservice"
          element={
            <RequireContext mode="kundeservice">
              <KundeserviceView />
            </RequireContext>
          }
        />
        <Route
          path="/teknisk"
          element={
            <RequireContext mode="teknisk">
              <TekniskView />
            </RequireContext>
          }
        />
        <Route path="/sak/:id" element={<SaksdetaljerView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
