"use client";

export default function ControlOutcome() {
  return (
    <section
      className="relative w-full py-20 px-6 md:px-12"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)",
        backgroundSize: "15px 15px",
        backgroundColor: "#e8eaed",
      }}
    >
      <div className="flex flex-col items-center">
        {/* Heading */}
        <div className="text-center mb-10 md:mb-12 w-full">
          <h2 className="mb-8 font-display text-[94px] leading-[82px] font-normal tracking-[-4.7px] text-[#333333]">
            Control the
            <br />
            Outcome
          </h2>
          <p className="font-display text-[18px] leading-[18px] font-normal tracking-normal text-[#333333] max-w-2xl mx-auto">
            Layers, type, and blends—all the tools to bring your wildest ideas to
            life. Your creativity, our compositing power.
          </p>
        </div>

        {/* Image - 90vw, displayed as-is */}
        <div className="w-[90vw] rounded-xl overflow-hidden shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/image.png"
            alt="Compositing workspace with layers, canvas, and text controls"
            className="w-full h-auto block"
          />
        </div>
      </div>
    </section>
  );
}
