import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Lock,
  MapPin,
  Camera,
  Tag,
  Send,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { Container } from "../shared/Container";
import { Badge } from "../shared/Badge";

export const Hero: React.FC = () => {
  const steps = [
    { icon: <MapPin className="h-5 w-5" />, label: "Choose location" },
    { icon: <Camera className="h-5 w-5" />, label: "Attach photos" },
    { icon: <Tag className="h-5 w-5" />, label: "Select category" },
    { icon: <Send className="h-5 w-5" />, label: "Submit report" },
    { icon: <Bell className="h-5 w-5" />, label: "Get updates" },
    { icon: <CheckCircle2 className="h-5 w-5" />, label: "Resolved!" },
  ];

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white"
    >
      <Container>
        <div className="py-20 sm:py-24 lg:py-28 grid items-center gap-10 lg:grid-cols-2">
          {/* Left Text Side */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge>City participation, simplified</Badge>

            <h1 className="mt-6 text-3xl md:text-5xl font-extrabold leading-tight text-slate-900 sm:text-6xl">
              Report issues.
              <br />
              Track progress.
              <br />
              Improve Torino together.
              {/* <span className="bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                {" "}
              </span> */}
            </h1>

            <p className="mt-5 max-w-xl text-sm md:text-lg text-slate-600">
              A transparent way to connect citizens and city offices — your
              reports make public spaces better for everyone.
            </p>

            <div className="mt-8 grid grid-cols-2 items-center gap-3" id="cta">
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-2 py-2 md:px-5 md:py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Start reporting <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#stats"
                className="flex justify-center items-center gap-2 rounded-xl border border-slate-300 bg-white px-2 py-2 md:px-5 md:py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                View public stats
              </a>
            </div>

            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Lock className="h-4 w-4" /> You can choose to appear as{" "}
              <strong className="ml-1 font-semibold">anonymous</strong>.
            </p>
          </motion.div>

          {/* Right Grid Side */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative mx-auto max-w-lg">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-emerald-100/60 blur-2xl" />
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl ring-1 ring-black/5">
                <div className="grid grid-cols-3 gap-3">
                  {steps.map((s) => (
                    <div
                      key={s.label}
                      className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-4 text-center transition-all hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="rounded-full bg-indigo-50 p-3 text-indigo-600">
                        {s.icon}
                      </div>
                      <span className="mt-2 text-xs text-slate-600">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-emerald-600" /> Geolocate,
                  attach photos, choose category
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};
