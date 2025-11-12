jest.mock("../../../services/authService", () => ({
  authService: {
    createMunicipalityUser: jest.fn(),
    getAllMunicipalityRoles: jest.fn(),
    getMunicipalityUsers: jest.fn(),
  },
}));

import { Request, Response } from 'express';
import { userController } from '../../../controllers/userController';
import { authService } from '../../../services/authService';
import { roleType } from '../../../models/enums';

type AuthServiceMock = {
  createMunicipalityUser: jest.Mock;
  getAllMunicipalityRoles: jest.Mock;
  getMunicipalityUsers: jest.Mock;
};

const authServiceMock = authService as unknown as AuthServiceMock;

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  email: "test@example.com",
  username: "testuser",
  firstName: "Test",
  lastName: "User",
  role: roleType.MUNICIPALITY,
  municipality_role_id: 1,
  municipality_role: { id: 1, name: "Test Role" },
  createdAt: new Date(),
  ...overrides,
});

describe('userController - Municipality Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMunicipalityUser', () => {
    const mockRequest = {
      body: {
        email: 'municipality@test.com',
        username: 'municipality_user',
        firstName: 'Municipality',
        lastName: 'User',
        password: 'password123',
        municipality_role_id: 1
      }
    } as Request;

    it('creates municipality user successfully', async () => {
      const mockUser = makeUser({
        email: mockRequest.body.email,
        username: mockRequest.body.username,
        firstName: mockRequest.body.firstName,
        lastName: mockRequest.body.lastName,
        municipality_role_id: mockRequest.body.municipality_role_id
      });

      authServiceMock.createMunicipalityUser.mockResolvedValue(mockUser);
      const res = makeRes();

      await userController.createMunicipalityUser(mockRequest, res as unknown as Response);

      expect(authServiceMock.createMunicipalityUser).toHaveBeenCalledWith(
        'municipality@test.com',
        'municipality_user',
        'Municipality',
        'User',
        'password123',
        1
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('returns 400 when required fields are missing', async () => {
      const incompleteRequest = {
        body: {
          email: 'test@example.com',
          username: 'testuser'
          // missing firstName, lastName, password, municipality_role_id
        }
      } as Request;
      
      const res = makeRes();

      await userController.createMunicipalityUser(incompleteRequest, res as unknown as Response);

      expect(authServiceMock.createMunicipalityUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Missing required fields: email, username, firstName, lastName, password, municipality_role_id'
      });
    });

    it('returns 409 when email is already in use', async () => {
      authServiceMock.createMunicipalityUser.mockRejectedValue(new Error('Email is already in use'));
      const res = makeRes();

      await userController.createMunicipalityUser(mockRequest, res as unknown as Response);

      expect(authServiceMock.createMunicipalityUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Conflict Error',
        message: 'Email is already in use'
      });
    });

    it('returns 409 when username is already in use', async () => {
      authServiceMock.createMunicipalityUser.mockRejectedValue(new Error('Username is already in use'));
      const res = makeRes();

      await userController.createMunicipalityUser(mockRequest, res as unknown as Response);

      expect(authServiceMock.createMunicipalityUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Conflict Error',
        message: 'Username is already in use'
      });
    });

    it('returns 500 for other service errors', async () => {
      authServiceMock.createMunicipalityUser.mockRejectedValue(new Error('Database error'));
      const res = makeRes();

      await userController.createMunicipalityUser(mockRequest, res as unknown as Response);

      expect(authServiceMock.createMunicipalityUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Database error'
      });
    });
  });

  describe('getAllMunicipalityRoles', () => {
    const mockRequest = {} as Request;

    const mockRoles = [
      { id: 1, name: 'Mayor', description: 'Municipality mayor' },
      { id: 2, name: 'Councilor', description: 'City councilor' }
    ];

    it('returns all municipality roles successfully', async () => {
      authServiceMock.getAllMunicipalityRoles.mockResolvedValue(mockRoles);
      const res = makeRes();

      await userController.getAllMunicipalityRoles(mockRequest, res as unknown as Response);

      expect(authServiceMock.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRoles);
    });

    it('returns empty array when no roles exist', async () => {
      authServiceMock.getAllMunicipalityRoles.mockResolvedValue([]);
      const res = makeRes();

      await userController.getAllMunicipalityRoles(mockRequest, res as unknown as Response);

      expect(authServiceMock.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('returns 500 when service throws error', async () => {
      authServiceMock.getAllMunicipalityRoles.mockRejectedValue(new Error('Database error'));
      const res = makeRes();

      await userController.getAllMunicipalityRoles(mockRequest, res as unknown as Response);

      expect(authServiceMock.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Database error'
      });
    });
  });

  describe('getMunicipalityUsers', () => {
    const mockRequest = {} as Request;

    const mockMunicipalityUsers = [
      makeUser({
        id: 1,
        email: 'mayor@city.com',
        username: 'mayor',
        firstName: 'John',
        lastName: 'Mayor',
        municipality_role_id: 1
      }),
      makeUser({
        id: 2,
        email: 'councilor@city.com',
        username: 'councilor',
        firstName: 'Jane',
        lastName: 'Councilor',
        municipality_role_id: 2
      })
    ];

    it('returns all municipality users successfully', async () => {
      authServiceMock.getMunicipalityUsers.mockResolvedValue(mockMunicipalityUsers);
      const res = makeRes();

      await userController.getMunicipalityUsers(mockRequest, res as unknown as Response);

      expect(authServiceMock.getMunicipalityUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockMunicipalityUsers);
    });

    it('returns empty array when no municipality users exist', async () => {
      authServiceMock.getMunicipalityUsers.mockResolvedValue([]);
      const res = makeRes();

      await userController.getMunicipalityUsers(mockRequest, res as unknown as Response);

      expect(authServiceMock.getMunicipalityUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('returns 500 when service throws error', async () => {
      authServiceMock.getMunicipalityUsers.mockRejectedValue(new Error('Database error'));
      const res = makeRes();

      await userController.getMunicipalityUsers(mockRequest, res as unknown as Response);

      expect(authServiceMock.getMunicipalityUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Database error'
      });
    });
  });
});