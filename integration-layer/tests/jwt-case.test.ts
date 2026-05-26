import {
  CaseRoles,
  rolleIdToJwtRoles,
  canAccessCaseGruppe,
  hasAnyRole,
} from '../src/middleware/jwt.middleware';

describe('JWT case roles', () => {
  it('maps rolleId to jwt roles', () => {
    expect(rolleIdToJwtRoles('kundeservice')).toEqual(['kundeservice']);
    expect(rolleIdToJwtRoles('teknisk-fiber')).toEqual(['teknisk-fiber']);
  });

  it('canAccessCaseGruppe allows kundeservice all groups', () => {
    const bruker = { sub: '1', name: 'Anna', email: 'a@t.no', roles: ['kundeservice'] };
    expect(canAccessCaseGruppe(bruker, 'teknisk-fiber')).toBe(true);
  });

  it('canAccessCaseGruppe restricts teknisk to own group', () => {
    const bruker = { sub: '2', name: 'Tom', email: 't@t.no', roles: ['teknisk-fiber'] };
    expect(canAccessCaseGruppe(bruker, 'teknisk-fiber')).toBe(true);
    expect(canAccessCaseGruppe(bruker, 'teknisk-mobil')).toBe(false);
  });

  it('hasAnyRole checks case-admin', () => {
    const bruker = { sub: '3', name: 'Admin', email: 'c@t.no', roles: [CaseRoles.CASE_ADMIN] };
    expect(hasAnyRole(bruker, CaseRoles.KUNDESERVICE)).toBe(false);
    expect(hasAnyRole(bruker, CaseRoles.CASE_ADMIN)).toBe(true);
  });
});
