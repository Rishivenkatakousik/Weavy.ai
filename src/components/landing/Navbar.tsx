import Image from "next/image";
import Link from "next/link";

const navLinks = [
  "COLLECTIVE",
  "ENTERPRISE",
  "PRICING",
  "REQUEST A DEMO",
  "SIGN IN",
];

export default function Navbar() {
  return (
    <header className="relative w-full text-black z-[100]">
      {/* Main Navbar */}
      <nav className="w-full flex items-center justify-between px-6 py-3 pr-[220px]">
        {/* Left: Logo */}
        <div className="flex items-center shrink-0">
          <Image
            src="/images/weavy.svg"
            alt="Weavy - Artistic Intelligence"
            width={235}
            height={40}
            className="brightness-0"
            priority
          />
        </div>

        {/* Right: Nav Links */}
        <div className="flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link}
              href="#"
              className="text-black text-[14px] font-medium hover:text-black/60 transition-colors whitespace-nowrap"
            >
              {link}
            </a>
          ))}
        </div>
      </nav>

      {/* Start Now Button - anchored top-right, overflows below navbar */}
      <Link
        href="/login"
        className="absolute top-0 right-0 bg-[#F8FF9E] text-black rounded-bl-xl px-5 py-6 text-4xl font-normal hover:bg-[#d4f055] transition-colors whitespace-nowrap"
      >
        Start Now
      </Link>
    </header>
  );
}
