jest.mock("../../../repositories/userRepository", () => ({
  userRepository: {
    findUserByEmail: jest.fn(),
    findUserByUsername: jest.fn(),
    findUserById: jest.fn(),
    createUser: jest.fn(),
    createUserWithRole: jest.fn(),
    getAllUsers: jest.fn(),
    deleteUser: jest.fn(),
    getUsersByRole: jest.fn(),
  },
}));

jest.mock("../../../repositories/roleRepository", () => ({
  roleRepository: {
    getAllMunicipalityRoles: jest.fn(),
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { authService } from '../../../services/authService';
import { userRepository } from '../../../repositories/userRepository';
import { roleRepository } from '../../../repositories/roleRepository';
import { roleType } from '../../../models/enums';
import bcrypt from 'bcrypt';

type UserRepoMock = {
  findUserByEmail: jest.Mock;
  findUserByUsername: jest.Mock;
  createUserWithRole: jest.Mock;
  getUsersByRole: jest.Mock;
};

type RoleRepoMock = {
  getAllMunicipalityRoles: jest.Mock;
};

const userRepo = userRepository as unknown as UserRepoMock;
const roleRepo = roleRepository as unknown as RoleRepoMock;

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

describe('authService - Municipality Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMunicipalityUser', () => {
    const mockUserData = {
      email: 'municipality@test.com',
      username: 'municipality_user',
      firstName: 'Municipality',
      lastName: 'User',
      password: 'password123',
      municipality_role_id: 1
    };

    const mockCreatedUser = makeUser({
      email: mockUserData.email,
      username: mockUserData.username,
      firstName: mockUserData.firstName,
      lastName: mockUserData.lastName,
      municipality_role_id: mockUserData.municipality_role_id
    });

    it('creates a municipality user successfully', async () => {
      userRepo.findUserByEmail.mockResolvedValue(null);
      userRepo.findUserByUsername.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      userRepo.createUserWithRole.mockResolvedValue(mockCreatedUser);

      const result = await authService.createMunicipalityUser(
        mockUserData.email,
        mockUserData.username,
        mockUserData.firstName,
        mockUserData.lastName,
        mockUserData.password,
        mockUserData.municipality_role_id
      );

      expect(userRepo.findUserByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(userRepo.findUserByUsername).toHaveBeenCalledWith(mockUserData.username);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 10);
      expect(userRepo.createUserWithRole).toHaveBeenCalledWith(
        mockUserData.email,
        mockUserData.username,
        mockUserData.firstName,
        mockUserData.lastName,
        'hashed_password',
        'MUNICIPALITY',
        mockUserData.municipality_role_id
      );
      expect(result).toEqual(mockCreatedUser);
    });

    it('throws error when email is already in use', async () => {
      const existingUser = makeUser({
        email: mockUserData.email,
        username: 'existing_user',
        role: roleType.CITIZEN
      });
      userRepo.findUserByEmail.mockResolvedValue(existingUser);

      await expect(
        authService.createMunicipalityUser(
          mockUserData.email,
          mockUserData.username,
          mockUserData.firstName,
          mockUserData.lastName,
          mockUserData.password,
          mockUserData.municipality_role_id
        )
      ).rejects.toThrow('Email is already in use');

      expect(userRepo.findUserByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(userRepo.findUserByUsername).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepo.createUserWithRole).not.toHaveBeenCalled();
    });

    it('throws error when username is already in use', async () => {
      const existingUser = makeUser({
        email: 'existing@test.com',
        username: mockUserData.username,
        role: roleType.CITIZEN
      });
      userRepo.findUserByEmail.mockResolvedValue(null);
      userRepo.findUserByUsername.mockResolvedValue(existingUser);

      await expect(
        authService.createMunicipalityUser(
          mockUserData.email,
          mockUserData.username,
          mockUserData.firstName,
          mockUserData.lastName,
          mockUserData.password,
          mockUserData.municipality_role_id
        )
      ).rejects.toThrow('Username is already in use');

      expect(userRepo.findUserByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(userRepo.findUserByUsername).toHaveBeenCalledWith(mockUserData.username);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepo.createUserWithRole).not.toHaveBeenCalled();
    });
  });

  describe('getAllMunicipalityRoles', () => {
    const mockRoles = [
      {
        id: 1,
        name: 'Mayor',
        description: 'Municipality mayor'
      },
      {
        id: 2,
        name: 'Councilor',
        description: 'City councilor'
      }
    ];

    it('returns all municipality roles', async () => {
      roleRepo.getAllMunicipalityRoles.mockResolvedValue(mockRoles);

      const result = await authService.getAllMunicipalityRoles();

      expect(roleRepo.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(result).toEqual(mockRoles);
    });

    it('returns empty array when no roles exist', async () => {
      roleRepo.getAllMunicipalityRoles.mockResolvedValue([]);

      const result = await authService.getAllMunicipalityRoles();

      expect(roleRepo.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getMunicipalityUsers', () => {
    const mockMunicipalityUsers = [
      makeUser({
        id: 1,
        email: 'mayor@city.com',
        username: 'mayor',
        firstName: 'John',
        lastName: 'Mayor',
        municipality_role_id: 1,
        password: 'hashed_password'
      }),
      makeUser({
        id: 2,
        email: 'councilor@city.com',
        username: 'councilor',
        firstName: 'Jane',
        lastName: 'Councilor',
        municipality_role_id: 2,
        password: 'hashed_password'
      })
    ];

    it('returns all municipality users', async () => {
      userRepo.getUsersByRole.mockResolvedValue(mockMunicipalityUsers);

      const result = await authService.getMunicipalityUsers();

      expect(userRepo.getUsersByRole).toHaveBeenCalledWith(roleType.MUNICIPALITY);
      expect(result).toEqual(mockMunicipalityUsers);
    });

    it('returns empty array when no municipality users exist', async () => {
      userRepo.getUsersByRole.mockResolvedValue([]);

      const result = await authService.getMunicipalityUsers();

      expect(userRepo.getUsersByRole).toHaveBeenCalledWith(roleType.MUNICIPALITY);
      expect(result).toEqual([]);
    });
  });
});