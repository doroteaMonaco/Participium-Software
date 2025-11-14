import { Request, Response, NextFunction } from "express";

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication Error",
      message: "User not authenticated",
    });
  }

  if (req.user.role !== "ADMIN") {
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

  if (req.user.role !== "MUNICIPALITY" && req.user.role !== "ADMIN") {
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

  if (req.user.role !== "CITIZEN" && req.user.role !== "ADMIN") {
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

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Authorization Error",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};
