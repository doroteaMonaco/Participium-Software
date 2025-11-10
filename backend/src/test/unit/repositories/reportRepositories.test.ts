jest.mock('../../../database/connection', () => {
    const mPrisma = {
        report: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
    };
    return { prisma: mPrisma };
});

import { prisma } from '../../../database/connection'; 
import reportRepository from '../../../repositories/reportRepository'; 

type PrismaMock = {
    report: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
        create: jest.Mock;
        delete: jest.Mock;
    };
};

const prismaMock = prisma as unknown as PrismaMock;

// Helper
const makeReport = (overrides: Partial<any> = {}) => ({
    id: 1,
    createdAt: new Date('2025-11-04T14:30:00Z'),
    ...overrides,
});

describe('reportRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // -------- findAll --------
    describe('findAll', () => {
        it('call findAll and returns all reports', async () => {
            const rows = [makeReport({ id: 2 }), makeReport({ id: 1 })];
            prismaMock.report.findMany.mockResolvedValue(rows);

            const res = await reportRepository.findAll();

            expect(prismaMock.report.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: 'desc' },
            });
            expect(res).toBe(rows);
        });
    });

    // -------- findById --------
    describe('findById', () => {
        it('return report if it exists', async () => {
            const row = makeReport({ id: 42 });
            prismaMock.report.findUnique.mockResolvedValue(row);

            const res = await reportRepository.findById(42);

            expect(prismaMock.report.findUnique).toHaveBeenCalledWith({
                where: { id: 42 },
            });
            expect(res).toBe(row);
        });

        it('return null if the report does not exists', async () => {
            prismaMock.report.findUnique.mockResolvedValue(null);

            const res = await reportRepository.findById(999);
            expect(res).toBeNull();
        });
    });

    // -------- create --------
    describe('create', () => {
        it('create report', async () => {
            const created = makeReport({ id: 10 });
            prismaMock.report.create.mockResolvedValue(created);

            // anche se la funzione accetta un DTO, in questa storia crea un record vuoto
            const res = await reportRepository.create({} as any);

            expect(prismaMock.report.create).toHaveBeenCalledWith({
                data: {},
            });
            expect(res).toBe(created);

            // opzionale: controlli di shape
            expect(res).toEqual(
                expect.objectContaining({
                    id: expect.any(Number),
                    createdAt: expect.any(Date),
                })
            );
        });
    });

    // -------- deleteById --------
    describe('deleteById', () => {
        it('delete the report and return the deleted report', async () => {
            const deleted = makeReport({ id: 7 });
            prismaMock.report.delete.mockResolvedValue(deleted);

            const res = await reportRepository.deleteById(7);

            expect(prismaMock.report.delete).toHaveBeenCalledWith({
                where: { id: 7 },
            });
            expect(res).toBe(deleted);
        });
    });
});
