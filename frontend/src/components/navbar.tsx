"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Library" },
  { href: "/about", label: "Method" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-paper/90 backdrop-blur-md border-b hairline"
            : "bg-transparent border-b border-transparent"
        }`}
        style={{ borderBottomWidth: "1px" }}
      >
        <nav className="max-w-[1440px] mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <Link href="/" className="font-display text-xl tracking-tight">
            L<span className="italic">-</span>SF
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="label-ui text-[11px] relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-ink group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
            <Link
              href="/"
              className="label-ui text-[11px] border hairline px-5 py-2.5 hover:bg-ink hover:text-paper hover:border-ink transition-colors duration-300"
            >
              Upload Document
            </Link>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[60] bg-ink text-paper flex flex-col"
          >
            <div className="flex items-center justify-between px-6 h-20">
              <span className="font-display text-xl">L-SF</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center px-6 gap-8">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="font-display text-4xl"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
