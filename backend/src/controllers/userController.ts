import { Request, Response } from "express";
import { throwBadRequestIfMissingObject } from "@utils";
import { CreateBaseUserDto, UserFromJSON } from "@dto/userDto";
import { Category, roleType } from "@models/enums";
import { authService } from "@services/authService";
import { cookieOpts } from "@controllers/authController";
import { userService } from "@services/userService";
import imageService from "@services/imageService";
import { BadRequestError } from "@errors/BadRequestError";
import { NotFoundError } from "@errors/NotFoundError";

const normalizeCategoryInput = (value?: string): Category | null => {
  if (!value || typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toUpperCase()
    .replaceAll(/\s+/g, "_");
  return Object.values(Category).includes(normalized as Category)
    ? (normalized as Category)
    : null;
};

export const userController = {
  async register(req: Request, res: Response) {
    try {
      const { email, username, firstName, lastName, password } = req.body || {};

      throwBadRequestIfMissingObject({
        email,
        username,
        firstName,
        lastName,
        password,
      });

      const user = await userService.registerUser(
        UserFromJSON(req.body) as CreateBaseUserDto,
        roleType.CITIZEN,
        {firstName,
        lastName}
      );

      const { token } = await authService.login(
        email,
        password,
        roleType.CITIZEN,
      );

      res.cookie("authToken", token, cookieOpts);
      res.setHeader("Location", "/reports");

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

      throwBadRequestIfMissingObject({
        email,
        username,
        firstName,
        lastName,
        password,
        municipality_role_id,
      });

      const user = await userService.createMunicipalityUser(
        UserFromJSON(req.body) as CreateBaseUserDto,
        firstName,
        lastName,
        municipality_role_id,
      );

      return res.status(201).json(user);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({
          error: "Bad Request",
          message: error?.message || "Missing required fields",
        });
      }

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

    async createExternalMaintainerUser(req: Request, res: Response) {
    try {
      const {
        email,
        username,
        firstName,
        lastName,
        companyName,
        password,
        category,
      } = req.body || {};

      throwBadRequestIfMissingObject({
        email,
        username,
        firstName,
        lastName,
        companyName,
        category,
        password
      });

      const normalizedCategory = normalizeCategoryInput(category);

      if (!normalizedCategory) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid category provided",
        });
      }
      

      const user = await userService.createExternalMaintainerUser(
        UserFromJSON(req.body) as CreateBaseUserDto,
        companyName,
        normalizedCategory,
      );

      return res.status(201).json(user);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({
          error: "Bad Request",
          message: error?.message || "Missing required fields",
        });
      }

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
      const users = await userService.getAllUsers();
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
      const userId = Number.parseInt(req.params.id);
      const { role } = req.body;

      throwBadRequestIfMissingObject({ userId, role });

      if (Number.isNaN(userId)) {
        return res
          .status(400)
          .json({ error: "Bad Request", message: "Invalid user ID" });
      }

      const user = await userService.getUserById(userId, role);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      return res.status(200).json(user);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res
          .status(404)
          .json({ error: "Not Found", message: error.message });
      }

      if (error instanceof BadRequestError) {
        return res.status(400).json({
          error: "Bad Request",
          message: error?.message || "Invalid user ID",
        });
      }

      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "Failed to retrieve user",
      });
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const userId = Number.parseInt(req.params.id);
      const { role } = req.body;

      throwBadRequestIfMissingObject({ userId, role });

      if (Number.isNaN(userId)) {
        return res
          .status(400)
          .json({ error: "Bad Request", message: "Invalid user ID" });
      }

      await userService.deleteUser(userId, role);
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({
          error: "Bad Request",
          message: error?.message || "Invalid user ID",
        });
      }

      if (error instanceof NotFoundError) {
        return res
          .status(404)
          .json({ error: "Not Found", message: error.message });
      }

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
      const roles = await userService.getAllMunicipalityRoles();
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
      const users = await userService.getMunicipalityUsers();
      return res.status(200).json(users);
    } catch (error: any) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "Failed to retrieve users",
      });
    }
  },

    async getExternalMaintainerUsers(req: Request, res: Response) {
    try {
      const users = await userService.getExternalMaintainerUsers();
      return res.status(200).json(users);
    } catch (error: any) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "Failed to retrieve users",
      });
    }
  },

  async updateCitizenProfile(req: Request, res: Response) {
    try {
      const id = req.user?.id;

      if (!id) {
        return res.status(401).json({
          error: "Authentication Error",
          message: "User not authenticated",
        });
      }

      const { telegramUsername, notificationsEnabled } = req.body || {};
      const file = req.file;

      if (!file && !telegramUsername && notificationsEnabled === undefined) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing fields: at least one field need to be provided",
        });
      }
      let tempKey;
      if (file) {
        const tempKeys = await imageService.storeTemporaryImages([
          {
            buffer: file.buffer,
            mimetype: file.mimetype,
            originalname: file.originalname,
          },
        ]);
        tempKey = tempKeys[0];
      }

      // Convert notificationsEnabled from string to boolean if it exists
      let notificationsEnabledBool: boolean | undefined = undefined;
      if (notificationsEnabled !== undefined) {
        notificationsEnabledBool =
          notificationsEnabled === "true" || notificationsEnabled === true;
      }

      await userService.updateCitizenProfile(
        id,
        tempKey,
        telegramUsername,
        notificationsEnabledBool,
      );

      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || "User profile update failed",
      });
    }
  },
};
