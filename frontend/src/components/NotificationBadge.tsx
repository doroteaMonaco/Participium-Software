import React from "react";
import { MessageCircle } from "lucide-react";

interface NotificationBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
  showIcon?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  onClick,
  className = "",
  showIcon = true,
}) => {
  if (count === 0) {
    return showIcon ? (
      <div className={`relative ${className}`}>
        <MessageCircle className="h-5 w-5 text-slate-400" />
      </div>
    ) : null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative ${className}`}
      aria-label={`${count} unread message${count > 1 ? "s" : ""}`}
    >
      {showIcon && <MessageCircle className="h-5 w-5 text-indigo-600" />}
      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
        {count > 9 ? "9+" : count}
      </span>
    </button>
  );
};

export default NotificationBadge;
