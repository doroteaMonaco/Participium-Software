import React from "react";

export const Badge: React.FC<React.PropsWithChildren<{ color?: string }>> = ({
  children,
  color = "bg-amber-100 text-amber-800",
}) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
  >
    {children}
  </span>
);
