import React from "react";
import { Badge } from "./Badge";

export const SectionTitle: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
}> = ({ eyebrow, title, subtitle }) => (
  <div className="mb-10 text-center">
    {eyebrow && <Badge>{eyebrow}</Badge>}
    <h2 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
      {title}
    </h2>
    {subtitle && (
      <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
        {subtitle}
      </p>
    )}
  </div>
);
