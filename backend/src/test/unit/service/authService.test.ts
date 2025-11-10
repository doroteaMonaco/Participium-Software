jest.mock('../../../repositories/userRepository', () => ({
    userRepository: {
        findUserByEmail: jest.fn(),
        findUserByUsername: jest.fn(),
        findUserById: jest.fn(),
        createUser: jest.fn(),
    },
}));

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn(),
}));

import { authService } from '../../../services/authService'; // <--- verifica path
import { userRepository } from '../../../repositories/userRepository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

type RepoMock = {
    findUserByEmail: jest.Mock;
    findUserByUsername: jest.Mock;
    findUserById: jest.Mock;
    createUser: jest.Mock;
};

const repo = userRepository as unknown as RepoMock;

const makeUser = (overrides: Partial<any> = {}) => ({
    id: 1,
    email: 'mario.rossi@example.com',
    username: 'mrossi',
    firstName: 'Mario',
    lastName: 'Rossi',
    password: 'hashed-pass',
    ...overrides,
});

describe('authService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ---------------- registerUser ----------------
    describe('registerUser', () => {
        it('throws if email is already in use', async () => {
            const existing = makeUser();
            repo.findUserByEmail.mockResolvedValue(existing);

            await expect(
                authService.registerUser('mario.rossi@example.com', 'mrossi', 'Mario', 'Rossi', 'plain')
            ).rejects.toThrow('Email is already in use');

            expect(repo.findUserByEmail).toHaveBeenCalledWith('mario.rossi@example.com');
            expect(repo.findUserByUsername).not.toHaveBeenCalled();
            expect(repo.createUser).not.toHaveBeenCalled();
            expect(bcrypt.hash).not.toHaveBeenCalled();
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('throws if username is already in use', async () => {
            repo.findUserByEmail.mockResolvedValue(null);
            repo.findUserByUsername.mockResolvedValue(makeUser());

            await expect(
                authService.registerUser('new@example.com', 'mrossi', 'Mario', 'Rossi', 'plain')
            ).rejects.toThrow('Username is already in use');

            expect(repo.findUserByEmail).toHaveBeenCalledWith('new@example.com');
            expect(repo.findUserByUsername).toHaveBeenCalledWith('mrossi');
            expect(repo.createUser).not.toHaveBeenCalled();
            expect(bcrypt.hash).not.toHaveBeenCalled();
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('hashes the password, creates the user, and returns { user, token }', async () => {
            repo.findUserByEmail.mockResolvedValue(null);
            repo.findUserByUsername.mockResolvedValue(null);

            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-123');
            const created = makeUser({ password: 'hashed-123' });
            repo.createUser.mockResolvedValue(created);

            (jwt.sign as jest.Mock).mockReturnValue('signed-token');

            const res = await authService.registerUser(
                'mario.rossi@example.com',
                'mrossi',
                'Mario',
                'Rossi',
                'plain-pass'
            );

            expect(bcrypt.hash).toHaveBeenCalledWith('plain-pass', 10);
            expect(repo.createUser).toHaveBeenCalledWith(
                'mario.rossi@example.com',
                'mrossi',
                'Mario',
                'Rossi',
                'hashed-123'
            );
            expect(jwt.sign).toHaveBeenCalledWith(
                { id: created.id, email: created.email },
                expect.any(String),
                expect.objectContaining({ expiresIn: '1h' })
            );

            expect(res).toEqual({ user: created, token: 'signed-token' });
        });
    });

    // ---------------- login ----------------
    describe('login', () => {
        it('throws when user is not found by email or username', async () => {
            repo.findUserByEmail.mockResolvedValue(null);
            repo.findUserByUsername.mockResolvedValue(null);

            await expect(authService.login('unknown', 'pwd')).rejects.toThrow(
                'Invalid username or email'
            );

            expect(bcrypt.compare).not.toHaveBeenCalled();
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('throws when the password is invalid', async () => {
            const user = makeUser();
            // Primo tentativo: via email (true) — se vuoi testare via username, metti null qui e metti user sull’altro
            repo.findUserByEmail.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(authService.login(user.email, 'wrong')).rejects.toThrow('Invalid password');

            expect(bcrypt.compare).toHaveBeenCalledWith('wrong', user.password);
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('returns { user, token } when credentials are valid', async () => {
            const user = makeUser();
            repo.findUserByEmail.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue('token-123');

            const res = await authService.login(user.email, 'ok');

            expect(bcrypt.compare).toHaveBeenCalledWith('ok', user.password);
            expect(jwt.sign).toHaveBeenCalledWith(
                { id: user.id, email: user.email },
                expect.any(String),
                expect.objectContaining({ expiresIn: '1h' })
            );
            expect(res).toEqual({ user, token: 'token-123' });
        });
    });

    // ---------------- verifyAuth ----------------
    describe('verifyAuth', () => {
        it('lancia se manca il cookie authToken', async () => {
            await expect(authService.verifyAuth({})).rejects.toThrow('No token provided');
            expect(jwt.verify).not.toHaveBeenCalled();
        });

        it('throws when authToken cookie is missing', async () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('bad token');
            });

            await expect(
                authService.verifyAuth({ cookies: { authToken: 'bad' } })
            ).rejects.toThrow('Invalid or expired token');

            expect(jwt.verify).toHaveBeenCalledWith('bad', expect.any(String));
        });

        it('throws when the token is invalid or expired', async () => {
            (jwt.verify as jest.Mock).mockReturnValue({ id: 99, email: 'ghost@example.com' });
            repo.findUserById.mockResolvedValue(null);

            await expect(
                authService.verifyAuth({ cookies: { authToken: 'ok' } })
            ).rejects.toThrow('Invalid or expired token');

            expect(repo.findUserById).toHaveBeenCalledWith(99);
        });

        it('throws "Invalid or expired token" when the user from the token no longer exists', async () => {
            const user = makeUser({ id: 7, email: 'u@e.com' });
            (jwt.verify as jest.Mock).mockReturnValue({ id: 7, email: 'u@e.com' });
            repo.findUserById.mockResolvedValue(user);

            const res = await authService.verifyAuth({ cookies: { authToken: 'good' } });

            expect(jwt.verify).toHaveBeenCalledWith('good', expect.any(String));
            expect(repo.findUserById).toHaveBeenCalledWith(7);
            expect(res).toBe(user);
        });
    });
});
