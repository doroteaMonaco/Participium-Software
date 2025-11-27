import React, { createContext, useContext, useState, useEffect } from "react";
import {
  verifyAuth,
  logout as apiLogout,
  type User as ApiUser,
} from "../services/api";

export type UserRole = "ADMIN" | "MUNICIPALITY" | "CITIZEN";

interface User {
  id?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: UserRole | string;
  municipality_role_id?: number;
  municipality_role?: {
    id: number;
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: ApiUser | User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const userData = await verifyAuth();
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (userData: ApiUser | User) => {
    setUser(userData as User);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
