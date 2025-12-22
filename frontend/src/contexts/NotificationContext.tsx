import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getUnreadComments } from "../services/api";

interface NotificationContextType {
  notifications: Map<number, number>; // reportId -> unread count
  totalUnread: number;
  refreshNotifications: (reportIds: number[]) => Promise<void>;
  markAsRead: (reportId: number) => void;
  addNotification: (reportId: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Map<number, number>>(new Map());

  // Calculate total unread count
  const totalUnread = Array.from(notifications.values()).reduce((sum, count) => sum + count, 0);

  // Refresh notifications for specific reports
  const refreshNotifications = useCallback(async (reportIds: number[]) => {
    if (!isAuthenticated || reportIds.length === 0) return;

    try {
      const unreadCounts = new Map<number, number>();

      await Promise.all(
        reportIds.map(async (reportId) => {
          try {
            const unreadComments = await getUnreadComments(reportId);
            if (unreadComments.length > 0) {
              unreadCounts.set(reportId, unreadComments.length);
            }
          } catch (error) {
            // Ignore errors for individual reports (e.g., 403 forbidden)
            console.debug(`Could not fetch unread comments for report ${reportId}`);
          }
        })
      );

      setNotifications(unreadCounts);
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    }
  }, [isAuthenticated]);

  // Mark a report's comments as read
  const markAsRead = useCallback((reportId: number) => {
    setNotifications((prev) => {
      const updated = new Map(prev);
      updated.delete(reportId);
      return updated;
    });
  }, []);

  // Add a notification for a report
  const addNotification = useCallback((reportId: number) => {
    setNotifications((prev) => {
      const updated = new Map(prev);
      const current = updated.get(reportId) || 0;
      updated.set(reportId, current + 1);
      return updated;
    });
  }, []);

  // Setup WebSocket connection for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Only connect for municipality and external maintainer users
    if (user.role !== "MUNICIPALITY" && user.role !== "EXTERNAL_MAINTAINER") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Remove /api from the URL if present, as WebSocket endpoint is at root level
    const host = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, "").replace(/\/api\/?$/, "")
      : "localhost:4000";
    
    const wsUrl = `${protocol}//${host}/ws/comments`;

    try {
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log("WebSocket connected for notifications");
      };

      websocket.onmessage = (event) => {
        try {
          const comment = JSON.parse(event.data);
          
          // Only show notification if the comment is not from the current user
          if (comment.userId !== user.id && comment.reportId) {
            addNotification(comment.reportId);
            
            // Optional: Show browser notification
            if (Notification.permission === "granted") {
              new Notification("New Message", {
                body: `New comment on report #${comment.reportId}`,
                icon: "/favicon.ico",
              });
            }
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      websocket.onclose = () => {
        console.log("WebSocket disconnected");
      };

      return () => {
        websocket.close();
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }
  }, [isAuthenticated, user, addNotification]);

  // Request notification permission on mount
  useEffect(() => {
    if (isAuthenticated && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        totalUnread,
        refreshNotifications,
        markAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
