import { rolleIdToJwtRoles, rolleIdToHubFields } from '../src/db/mappers';

describe('Case role mapping', () => {
  it('maps kundeservice rolle to case_app permission', () => {
    const fields = rolleIdToHubFields('kundeservice');
    expect(fields.role).toBe('kundeservice');
    expect(fields.permissions).toContain('case_app');
  });

  it('maps teknisk-fiber rolle to jwt role', () => {
    expect(rolleIdToJwtRoles('teknisk-fiber')).toEqual(['teknisk-fiber']);
  });

  it('superadmin gets all case jwt roles', () => {
    const roles = rolleIdToJwtRoles('superadmin');
    expect(roles).toContain('superadmin');
    expect(roles).toContain('case-admin');
    expect(roles).toContain('kundeservice');
    expect(roles).toContain('teknisk-fiber');
  });
});
