import React from "react";
import { Send } from "lucide-react";
import { Container } from "src/components/shared/Container";
import { SectionTitle } from "src/components/shared/SectionTitle";

export const TelegramCTA: React.FC = () => (
  <section id="telegram" className="bg-white py-20 sm:py-24">
    <Container>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle
            eyebrow="Telegram bot"
            title="Report and get updates on the go"
            subtitle="Use Telegram to create reports and receive status changes instantly."
          />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Send className="h-4 w-4" /> Open in Telegram
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Learn more
            </a>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <div className="flex  md:h-9 md:w-9 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Send className="w-6 h-6 md:h-4 md:w-4 py-1" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Participium Bot</p>
                <p>
                  Hi! Send your location and a description. I'll help you add a
                  title, category, and photos. You'll get updates here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  </section>
);
