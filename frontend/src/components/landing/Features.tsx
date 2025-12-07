import React from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Image as ImageIcon,
  Bell,
  Table,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { Container } from "src/components/shared/Container";
import { SectionTitle } from "src/components/shared/SectionTitle";

export const Features: React.FC = () => {
  const features = [
    {
      icon: <MapPin className="h-5 w-5" />,
      title: "Map-based reporting",
      text: "Select a location and submit title, description, category, and photos.",
    },
    {
      icon: <ImageIcon className="h-5 w-5" />,
      title: "Photo evidence",
      text: "Attach images for potholes, lighting faults, waste, and more.",
    },
    {
      icon: <Bell className="h-5 w-5" />,
      title: "Status notifications",
      text: "Get email and in-app updates on every status change.",
    },
    {
      icon: <Table className="h-5 w-5" />,
      title: "Map & table views",
      text: "View reports via map or filterable table, export CSV.",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Public & private stats",
      text: "Open charts for citizens, detailed stats for admins.",
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "Telegram bot",
      text: "Report issues and get updates through Telegram.",
    },
  ];
  return (
    <section id="features" className="bg-white py-20 sm:py-24">
      <Container>
        <SectionTitle
          eyebrow="Core features"
          title="Everything you need to participate"
          subtitle="From reporting to resolution, stay informed."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: features.indexOf(f) * 0.05 }}
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{f.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};
