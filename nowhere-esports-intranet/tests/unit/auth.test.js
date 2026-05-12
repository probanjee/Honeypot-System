/**
 * auth.test.js – Unit tests for auth service
 */
const { hashPassword, comparePassword } = require('../../server/utils/hash');
const { generateJWT, verifyJWT } = require('../../server/utils/jwt');

// ── Password hashing tests ────────────────────────────────────────────────────
describe('Password Hashing', () => {
    test('hashPassword returns a bcrypt hash (not plaintext)', async () => {
        const hash = await hashPassword('mySecretPassword');
        expect(hash).toBeDefined();
        expect(hash).not.toBe('mySecretPassword');
        expect(hash.startsWith('$2')).toBe(true); // bcrypt format
    });

    test('comparePassword returns true for correct password', async () => {
        const password = 'TestPassword123!';
        const hash = await hashPassword(password);
        const result = await comparePassword(password, hash);
        expect(result).toBe(true);
    });

    test('comparePassword returns false for wrong password', async () => {
        const hash = await hashPassword('correctPassword');
        const result = await comparePassword('wrongPassword', hash);
        expect(result).toBe(false);
    });

    test('same password hashes differently each time (salt)', async () => {
        const hash1 = await hashPassword('samePassword');
        const hash2 = await hashPassword('samePassword');
        expect(hash1).not.toBe(hash2);
    });
});

// ── JWT tests ─────────────────────────────────────────────────────────────────
describe('JWT Generation & Verification', () => {
    const payload = { id: 'user123', email: 'test@nowhere.gg', role: 'player' };

    test('generateJWT returns a string token', () => {
        const token = generateJWT(payload);
        expect(typeof token).toBe('string');
        expect(token.split('.').length).toBe(3); // header.payload.signature
    });

    test('verifyJWT decodes the correct payload', () => {
        const token = generateJWT(payload);
        const decoded = verifyJWT(token);
        expect(decoded.id).toBe(payload.id);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.role).toBe(payload.role);
    });

    test('verifyJWT throws on tampered token', () => {
        const token = generateJWT(payload);
        const tampered = token.slice(0, -5) + 'XXXXX';
        expect(() => verifyJWT(tampered)).toThrow();
    });
});
