"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import StatusTag from "./status-tag";
import type { DocumentOut } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentRow({ doc, index }: { doc: DocumentOut; index: number }) {
  const isReady = doc.status === "ready";

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="group grid grid-cols-12 items-center gap-4 py-7 border-b hairline cursor-pointer"
    >
      <div className="col-span-1 label-ui text-[10px] text-slate">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="col-span-5 md:col-span-5">
        <p className="font-display text-xl md:text-2xl leading-snug group-hover:opacity-60 transition-opacity duration-300">
          {doc.original_name}
        </p>
        <p className="label-ui text-[10px] text-slate mt-2">
          {doc.file_type.toUpperCase()} · {formatSize(doc.file_size)}
        </p>
      </div>

      <div className="col-span-3 hidden md:block">
        <StatusTag status={doc.status} />
        {isReady && (
          <p className="font-body italic text-[15px] text-slate mt-2">
            {doc.page_count} pages · {doc.chunk_count} segments indexed
          </p>
        )}
      </div>

      <div className="col-span-2 hidden md:block label-ui text-[10px] text-slate">
        {formatDate(doc.upload_at)}
      </div>

      <div className="col-span-1 flex justify-end">
        <ArrowUpRight
          size={18}
          strokeWidth={1.3}
          className="text-slate group-hover:text-ink group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300"
        />
      </div>
    </motion.div>
  );

  if (!isReady) {
    return <div className="opacity-50 pointer-events-none">{content}</div>;
  }

  return (
    <Link href={`/documents/${doc.id}`} className="block">
      {content}
    </Link>
  );
}
