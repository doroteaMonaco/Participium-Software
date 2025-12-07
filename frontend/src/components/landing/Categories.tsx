import React from "react";
import {
  Droplet,
  Construction,
  Waves,
  Lightbulb,
  Trash2,
  TrafficCone,
  Navigation,
  Trees,
  HelpCircle,
} from "lucide-react";
import { Container } from "src/components/shared/Container";
import { SectionTitle } from "src/components/shared/SectionTitle";

export const Categories: React.FC = () => {
  const categories = [
    { name: "Water Supply – Drinking Water", icon: <Droplet /> },
    { name: "Architectural Barriers", icon: <Construction /> },
    { name: "Sewer System", icon: <Waves /> },
    { name: "Public Lighting", icon: <Lightbulb /> },
    { name: "Waste", icon: <Trash2 /> },
    { name: "Road Signs & Traffic Lights", icon: <TrafficCone /> },
    { name: "Roads & Urban Furnishings", icon: <Navigation /> },
    { name: "Public Green Areas & Playgrounds", icon: <Trees /> },
    { name: "Other", icon: <HelpCircle /> },
  ];

  return (
    <section id="categories" className="bg-slate-50 py-20 sm:py-24">
      <Container>
        <SectionTitle
          eyebrow="Categories"
          title="What you can report"
          subtitle="Help route requests to the right office."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 text-slate-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  {cat.icon}
                </div>
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
