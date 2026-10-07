import { describe, it, expect } from 'vitest';
import { requireRole, requireMinimumRole, requireSelfOrAdmin, requireAdmin, requireSuperAdmin } from '../src/permissions/guards';
import { UserRole } from '../src/constants/roles';
import { AuthorizationError, AuthenticationError } from '../src/errors';

// ---------------------------------------------------------------------------
// RBAC middleware unit tests — tests guard logic in isolation
// ---------------------------------------------------------------------------

function mockReq(role?: UserRole, userId = 'user-1', paramId?: string) {
  return {
    user: role ? { id: userId, email: 'test@test.com', role } : undefined,
    params: paramId ? { id: paramId } : {},
    headers: {},
    requestId: 'test-req',
  } as any;
}

function runMiddleware(
  middleware: ReturnType<typeof requireRole>,
  req: any,
): Promise<Error | undefined> {
  return new Promise((resolve) => {
    middleware(req, {} as any, (err?: any) => resolve(err));
  });
}

describe('requireRole()', () => {
  const guard = requireRole(UserRole.Administrator);

  it('should call next with AuthenticationError when no user', async () => {
    const err = await runMiddleware(guard, mockReq(undefined));
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('should call next with AuthorizationError for wrong role', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.Employee));
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('should call next() with no error for correct role', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.Administrator));
    expect(err).toBeUndefined();
  });
});

describe('requireMinimumRole()', () => {
  const guard = requireMinimumRole(UserRole.Manager);

  it('should block Employee (below Manager)', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.Employee));
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('should allow Manager (meets minimum)', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.Manager));
    expect(err).toBeUndefined();
  });

  it('should allow Administrator (above minimum)', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.Administrator));
    expect(err).toBeUndefined();
  });
});

describe('requireAdmin()', () => {
  const guard = requireAdmin();

  it('should block Employee', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.Employee));
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('should block Manager', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.Manager));
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('should allow Administrator', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.Administrator));
    expect(err).toBeUndefined();
  });

  it('should allow SuperAdmin', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.SuperAdmin));
    expect(err).toBeUndefined();
  });
});

describe('requireSuperAdmin()', () => {
  const guard = requireSuperAdmin();

  it('should block Administrator', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.Administrator));
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('should allow SuperAdmin', async () => {
    const err = await runMiddleware(guard, mockReq(UserRole.SuperAdmin));
    expect(err).toBeUndefined();
  });
});

describe('requireSelfOrAdmin()', () => {
  const guard = requireSelfOrAdmin();

  it('should allow access when user ID matches param ID', async () => {
    const req = mockReq(UserRole.Employee, 'user-1', 'user-1');
    const err = await runMiddleware(guard, req);
    expect(err).toBeUndefined();
  });

  it('should block when user ID does not match param ID and not admin', async () => {
    const req = mockReq(UserRole.Employee, 'user-1', 'user-2');
    const err = await runMiddleware(guard, req);
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('should allow Administrator to access any user ID', async () => {
    const req = mockReq(UserRole.Administrator, 'admin-1', 'user-2');
    const err = await runMiddleware(guard, req);
    expect(err).toBeUndefined();
  });

  it('should allow SuperAdmin to access any user ID', async () => {
    const req = mockReq(UserRole.SuperAdmin, 'super-1', 'user-99');
    const err = await runMiddleware(guard, req);
    expect(err).toBeUndefined();
  });

  it('should call next with AuthenticationError when no user', async () => {
    const req = mockReq(undefined, 'user-1', 'user-1');
    const err = await runMiddleware(guard, req);
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});