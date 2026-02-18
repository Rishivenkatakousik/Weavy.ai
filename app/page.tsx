"use client";

import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Navbar,
  Hero,
  Models,
  ControlOutcome,
  Workflows,
  Footer,
} from "@/components/landing";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#e8eaed] text-black">
      {/* Navbar with Banner */}
      <div className="w-full bg-[#1a1a1a] text-white text-xs tracking-wide flex items-center justify-center gap-3 py-4">
        <Image
          src="/images/fw.avif"
          alt="Figma x Weavy"
          width={60}
          height={15}
          className="inline-block"
        />
        <span>Weavy is now a part of Figma</span>
      </div>

      {/* Hero Section */}
      <section
        className="relative w-full"
        style={{
          minHeight: "900px",
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "15px 15px",
        }}
      >
        <Navbar />

        {/* Headline */}
        <div className="w-full px-10 pt-10 pb-8 relative z-[5] pointer-events-none text-center">
          <h1 className="text-[3.5rem] md:text-[5rem] lg:text-[6.5rem] leading-[0.92] tracking-tight mb-6 flex items-center justify-center gap-8 md:gap-16">
            <span className="font-serif italic">Nodefy</span>
            <span>AI Workflows</span>
          </h1>
          <p className="text-sm md:text-base text-[#222] leading-snug max-w-xl mx-auto">
            Turn your creative vision into scalable workflows.
            <br />
            Access all AI models and professional editing tools
            <br />
            in one node based platform.
          </p>
        </div>

        {/* React Flow Canvas */}
        <div
          className="absolute left-0 right-0 top-0 bottom-0 overflow-visible"
          style={{ zIndex: 50 }}
        >
          <ReactFlowProvider>
            <Hero />
          </ReactFlowProvider>
        </div>
      </section>

      {/* Sticky AI Models Section */}
      <Models />

      {/* Control the Outcome Section */}
      <ControlOutcome />

      {/* Explore Our Workflows Section */}
      <Workflows />

      {/* Footer with CTA */}
      <Footer />
    </div>
  );
}
