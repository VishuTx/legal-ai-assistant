"use client";

import Navbar from "@/components/navbar";
import Reveal from "@/components/reveal";

const STEPS = [
  {
    title: "Extraction",
    body: "Every page is read and parsed — court judgments, NDAs, master agreements. Page boundaries are preserved so every citation can point back to an exact location.",
  },
  {
    title: "Segmentation",
    body: "Text is divided along legal structure — articles, sections, clauses — rather than arbitrary character counts, so no clause is read in fragments.",
  },
  {
    title: "Indexing",
    body: "Each segment is embedded into a semantic vector space, allowing the system to retrieve by meaning rather than keyword.",
  },
  {
    title: "Review",
    body: "Flagged clauses, missing protections, and risk scoring are generated against standard contract practice — every claim traceable to source text.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <section className="pt-44 pb-28 px-6 md:px-10 max-w-[1440px] mx-auto">
        <Reveal>
          <p className="label-ui text-[11px] text-slate mb-6">Method</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="font-display text-[10vw] md:text-[6vw] leading-[0.95] tracking-tight max-w-4xl">
            Read once, <span className="italic">cited always.</span>
          </h1>
        </Reveal>
      </section>

      {/* Dark inverted section */}
      <section className="bg-ink text-paper py-28 px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto">
          <Reveal>
            <p className="font-body italic text-2xl md:text-4xl leading-relaxed max-w-3xl">
              We built this on a simple conviction — an AI that reviews contracts should never say
              something it cannot point back to. Every answer carries its page number. Every flagged
              clause quotes the text it is flagging.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Process steps */}
      <section className="px-6 md:px-10 max-w-[1440px] mx-auto py-28">
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.05}>
            <div className="grid md:grid-cols-12 gap-8 py-10 border-b hairline items-baseline">
              <div className="md:col-span-1 label-ui text-[10px] text-slate">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="md:col-span-3">
                <h3 className="font-display text-3xl">{step.title}</h3>
              </div>
              <div className="md:col-span-8">
                <p className="font-body text-xl leading-relaxed text-ink/85">{step.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      <footer className="border-t hairline px-6 md:px-10 py-10">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <span className="font-display text-lg">L-SF</span>
          <span className="label-ui text-[10px] text-slate">
            Built for legal review, not legal advice
          </span>
        </div>
      </footer>
    </>
  );
}
