import { Router } from "express";
import { isAuthenticated } from "@middlewares/authMiddleware";
import { isAdmin, isCitizen } from "@middlewares/roleMiddleware";
import { userController } from "@controllers/userController";
import multerConfig from "@config/multerConfig";

const router = Router();

// POST /api/users/municipality-users - Create municipality user (admin required)
router.post(
  "/municipality-users",
  isAuthenticated,
  isAdmin,
  userController.createMunicipalityUser,
);

// GET /api/users/municipality-users - Get all municipality users (admin required)
router.get(
  "/municipality-users",
  isAuthenticated,
  isAdmin,
  userController.getMunicipalityUsers,
);

// GET /api/users/municipality-users/roles - Get all municipality roles (admin required)
router.get(
  "/municipality-users/roles",
  isAuthenticated,
  isAdmin,
  userController.getAllMunicipalityRoles,
);

// POST /api/users - User registration
router.post("/", userController.register);

// PATCH /api/users - Update citizen profile (citizen required)
router.patch(
  "/",
  isAuthenticated,
  isCitizen,
  multerConfig.single("photo"),
  userController.updateCitizenProfile,
);

// GET /api/users - Get all users (admin required)
router.get("/", isAuthenticated, isAdmin, userController.getAllUsers);

// GET /api/users/:id - Get user by ID (admin required)
router.get("/:id", isAuthenticated, isAdmin, userController.getUserById);

// DELETE /api/users/:id - Delete user by ID (admin required)
router.delete("/:id", isAuthenticated, isAdmin, userController.deleteUser);

export default router;
