// src/pages/Landing.tsx
import React from "react";
import { NavBar } from "src/components/Navbar";
import { Hero } from "src/components/landing/Hero";
import { Features } from "src/components/landing/Features";
import { Categories } from "src/components/landing/Categories";
import { Status } from "src/components/landing/Status";
import { TelegramCTA } from "src/components/landing/TelegramCTA";
import Footer from "src/components/Footer";

export const Landing: React.FC = () => {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            <NavBar />
            <main>
                <Hero />
                <Features />
                <Categories />
                <Status />
                <TelegramCTA />
            </main>
            <Footer />
        </div>
    );
};

export default Landing;