import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository';

const SECRET_KEY = process.env.JWT_SECRET || 'default_secret_key';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        username: string;
        firstName: string;
        lastName: string;
        role: string;
        createdAt: Date;
      };
    }
  }
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.authToken;

    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication Error', 
        message: 'No authentication token provided' 
      });
    }

    const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload;

    const user = await userRepository.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication Error', 
        message: 'User not found' 
      });
    }

    req.user = user as any;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Authentication Error', 
        message: 'Token has expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Authentication Error', 
        message: 'Invalid token' 
      });
    }

    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Authentication verification failed' 
    });
  }
};
