import express, { Request, Response } from 'express';
import request from 'supertest';

jest.mock('../../../controllers/authController', () => ({
    authController: {
        login: jest.fn((req: Request, res: Response) =>
            res.status(200).json({ route: 'login', body: req.body })
        ),
        verifyAuth: jest.fn((_req: Request, res: Response) =>
            res.status(200).json({ route: 'verifyAuth' })
        ),
        logout: jest.fn((_req: Request, res: Response) => res.status(204).send()),
    },
}));

import authRouter from '../../../routes/authRouter';
import { authController } from '../../../controllers/authController';
import { userController } from '../../../controllers/userController';

const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
};

describe('authRouter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/session', () => {
        it('routes to authController.login and returns 200', async () => {
            const app = makeApp();
            const payload = { identifier: 'mrossi', password: 'plain' };

            const res = await request(app).post('/api/auth/session').send(payload);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ route: 'login', body: payload });
            expect(authController.login).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /api/auth/session', () => {
        it('routes to authController.verifyAuth and returns 200', async () => {
            const app = makeApp();

            const res = await request(app).get('/api/auth/session');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ route: 'verifyAuth' });
            expect(authController.verifyAuth).toHaveBeenCalledTimes(1);
        });
    });

    describe('DELETE /api/auth/session', () => {
        it('routes to authController.logout and returns 204', async () => {
            const app = makeApp();

            const res = await request(app).delete('/api/auth/session');

            expect(res.status).toBe(204);
            expect(res.text).toBe('');
            expect(authController.logout).toHaveBeenCalledTimes(1);
        });
    });
});
