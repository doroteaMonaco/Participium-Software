import React from "react";
import { Hero } from "src/components/landing/Hero";
import { Features } from "src/components/landing/Features";
import { Categories } from "src/components/landing/Categories";
import { Status } from "src/components/landing/Status";
import { TelegramCTA } from "src/components/landing/TelegramCTA";

export const Landing: React.FC = () => {
  return (
    <main>
      <Hero />
      <Features />
      <Categories />
      <Status />
      <TelegramCTA />
    </main>
  );
};

export default Landing;
