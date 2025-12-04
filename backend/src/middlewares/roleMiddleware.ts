import { roleType } from "@models/enums";
import { Request, Response, NextFunction } from "express";

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication Error",
      message: "User not authenticated",
    });
  }

  if (req.role !== roleType.ADMIN) {
    return res.status(403).json({
      error: "Authorization Error",
      message: "Access denied. Admin role required.",
    });
  }

  next();
};

export const isMunicipality = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication Error",
      message: "User not authenticated",
    });
  }

  if (req.role !== roleType.MUNICIPALITY && req.role !== roleType.ADMIN) {
    return res.status(403).json({
      error: "Authorization Error",
      message: "Access denied. Municipality role required.",
    });
  }

  next();
};

export const isMunicipalityStrict = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication Error",
      message: "User not authenticated",
    });
  }

  if (req.role !== roleType.MUNICIPALITY) {
    return res.status(403).json({
      error: "Authorization Error",
      message: "Access denied. Municipality role required.",
    });
  }

  next();
};

export const isCitizen = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication Error",
      message: "User not authenticated",
    });
  }

  if (req.role !== roleType.CITIZEN && req.role !== roleType.ADMIN) {
    return res.status(403).json({
      error: "Authorization Error",
      message: "Access denied. Citizen role required.",
    });
  }

  next();
};

export const hasRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    }

    if (req.role === undefined) {
      return res.status(401).json({
        error: "Authentication Error",
        message: "User role not found",
      });
    }

    if (!allowedRoles.includes(req.role)) {
      return res.status(403).json({
        error: "Authorization Error",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};
