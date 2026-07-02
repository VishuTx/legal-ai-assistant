"use client";

import { motion } from "framer-motion";
import type { RedlineItem } from "@/lib/api";

const PRIORITY_LABEL: Record<string, string> = {
  "must-have": "Must Change",
  recommended: "Recommended",
  optional: "Optional",
};

export default function RedlineRow({ redline, index }: { redline: RedlineItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.08, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="py-8 border-b hairline"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl">{redline.clause_type}</h3>
        <span className="label-ui text-[9px]">{PRIORITY_LABEL[redline.priority]}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-4">
        <div>
          <p className="label-ui text-[9px] text-slate mb-2">Original</p>
          <p className="font-body text-[16px] leading-relaxed text-slate line-through decoration-1">
            {redline.original_text}
          </p>
        </div>
        <div>
          <p className="label-ui text-[9px] text-slate mb-2">Proposed</p>
          <p className="font-body text-[16px] leading-relaxed">{redline.suggested_text}</p>
        </div>
      </div>

      <p className="font-body italic text-[15px] text-slate border-l hairline pl-5" style={{ borderLeftWidth: "1.5px" }}>
        {redline.reason}
      </p>
    </motion.div>
  );
}
