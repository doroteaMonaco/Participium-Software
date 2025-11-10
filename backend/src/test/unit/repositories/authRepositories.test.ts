jest.mock('@prisma/client', () => {
    const mPrisma = {
        user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        },
    };
    const MockedPrismaClient = jest.fn(() => mPrisma);
    return { PrismaClient: MockedPrismaClient };
});

import { PrismaClient } from '@prisma/client';
import { userRepository } from '../../../repositories/userRepository';

type PrismaMock = {
    user: {
        create: jest.Mock;
        findUnique: jest.Mock;
    };
};

let prismaMock: PrismaMock;

beforeAll(() => {
    prismaMock = new PrismaClient() as unknown as PrismaMock;
});

const makeUser = (overrides: Partial<any> = {}) => ({
    id: 1,
    email: 'mario.rossi@example.com',
    username: 'mrossi',
    firstName: 'Mario',
    lastName: 'Rossi',
    password: 'hashed',
    ...overrides,
});

describe('userRepository', () => {
    beforeEach(() => {
        prismaMock.user.create.mockReset();
        prismaMock.user.findUnique.mockReset();
    });

    describe('createUser', () => {
        it('create user correctly', async () => {
            const u = makeUser();
            prismaMock.user.create.mockResolvedValue(u);

            const res = await userRepository.createUser(
                u.email, u.username, u.firstName, u.lastName, u.password
            );

            expect(prismaMock.user.create).toHaveBeenCalledWith({
                data: {
                    username: u.username,
                    email: u.email,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    password: u.password,
                },
            });
            expect(res).toBe(u);
        });
    });

    describe('findUserByEmail', () => {
        it('return user', async () => {
            const u = makeUser();
            prismaMock.user.findUnique.mockResolvedValue(u);

            const res = await userRepository.findUserByEmail(u.email);

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
                where: { email: u.email },
            });
            expect(res).toBe(u);
        });

        it('return null if not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const res = await userRepository.findUserByEmail('missing@example.com');
            expect(res).toBeNull();
        });
    });

    describe('findUserByUsername', () => {
        it('call where: { username }', async () => {
            const u = makeUser();
            prismaMock.user.findUnique.mockResolvedValue(u);

            const res = await userRepository.findUserByUsername(u.username);

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
                where: { username: u.username },
            });
            expect(res).toBe(u);
        });

        it('return null if not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const res = await userRepository.findUserByUsername('ghost');
            expect(res).toBeNull();
        });
    });

    describe('findUserById', () => {
        it('call where: { id }', async () => {
            const u = makeUser({ id: 42 });
            prismaMock.user.findUnique.mockResolvedValue(u);

            const res = await userRepository.findUserById(42);

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
                where: { id: 42 },
            });
            expect(res).toBe(u);
        });

        it('return null if not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const res = await userRepository.findUserById(999);
            expect(res).toBeNull();
        });
    });
});
