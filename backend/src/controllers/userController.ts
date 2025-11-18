import { Request, Response } from "express";
import { authService } from "@services/authService";
import { cookieOpts } from "@controllers/authController";

export const userController = {
  async register(req: Request, res: Response) {
    try {
      const { email, username, firstName, lastName, password } = req.body || {};

      if (!email || !username || !firstName || !lastName || !password) {
        return res
          .status(400)
          .json({ error: "Bad Request", message: "Missing required fields" });
      }

      const { user } = await authService.registerUser(
        email,
        username,
        firstName,
        lastName,
        password,
      );
      const { token } = await authService.login(email, password);

      res.cookie("authToken", token, cookieOpts);
      res.setHeader("Location", "/reports");

      return res.status(201).json({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
    } catch (error: any) {
      if (
        error?.message === "Email is already in use" ||
        error?.message === "Username is already in use"
      ) {
        return res
          .status(409)
          .json({ error: "Conflict Error", message: error.message });
      }
      return res.status(400).json({
        error: "Bad Request",
        message: error?.message || "Registration failed",
      });
    }
  },

  async createMunicipalityUser(req: Request, res: Response) {
    try {
      const {
        email,
        username,
        firstName,
        lastName,
        password,
        municipality_role_id,
      } = req.body || {};

      if (
        !email ||
        !username ||
        !firstName ||
        !lastName ||
        !password ||
        !municipality_role_id
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message:
            "Missing required fields: email, username, firstName, lastName, password, municipality_role_id",
        });
      }

      const user = await authService.createMunicipalityUser(
        email,
        username,
        firstName,
        lastName,
        password,
        municipality_role_id,
      );

      return res.status(201).json(user);
    } catch (error: any) {
      if (
        error?.message === "Email is already in use" ||
        error?.message === "Username is already in use"
      ) {
        return res
          .status(409)
          .json({ error: "Conflict Error", message: error.message });
      }
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "User creation failed",
      });
    }
  },

  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await authService.getAllUsers();
      return res.status(200).json(users);
    } catch (error: any) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "Failed to retrieve users",
      });
    }
  },

  async getUserById(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res
          .status(400)
          .json({ error: "Bad Request", message: "Invalid user ID" });
      }

      const user = await authService.getUserById(userId);

      if (!user) {
        return res
          .status(404)
          .json({ error: "Not Found", message: "User not found" });
      }

      return res.status(200).json(user);
    } catch (error: any) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "Failed to retrieve user",
      });
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res
          .status(400)
          .json({ error: "Bad Request", message: "Invalid user ID" });
      }

      await authService.deleteUser(userId);
      return res.status(204).send();
    } catch (error: any) {
      if (error?.message === "User not found") {
        return res
          .status(404)
          .json({ error: "Not Found", message: error.message });
      }
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "Failed to delete user",
      });
    }
  },

  async getAllMunicipalityRoles(req: Request, res: Response) {
    try {
      const roles = await authService.getAllMunicipalityRoles();
      return res.status(200).json(roles);
    } catch (error: any) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "Failed to retrieve municipality roles",
      });
    }
  },

  async getMunicipalityUsers(req: Request, res: Response) {
    try {
      const users = await authService.getMunicipalityUsers();
      return res.status(200).json(users);
    } catch (error: any) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "Failed to retrieve users",
      });
    }
  },
};
