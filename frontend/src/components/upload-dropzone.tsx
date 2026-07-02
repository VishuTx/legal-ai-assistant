"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { uploadDocument } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function UploadDropzone() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "docx", "doc"].includes(ext)) {
        setError("Only PDF and DOCX files are accepted.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError("File exceeds the 20MB limit.");
        return;
      }

      setUploading(true);
      try {
        const doc = await uploadDocument(file);
        router.push(`/documents/${doc.id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
        setUploading(false);
      }
    },
    [router]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border transition-colors duration-300 cursor-pointer ${
          dragOver ? "border-ink bg-paper-dim" : "hairline"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        style={{ borderWidth: "1px" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                >
                  <FileText size={28} strokeWidth={1.2} className="text-slate" />
                </motion.div>
                <p className="label-ui text-[11px] text-slate">Uploading document…</p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5"
              >
                <Upload size={26} strokeWidth={1.2} className="text-slate" />
                <div>
                  <p className="font-display text-2xl mb-2">
                    Drop a contract <span className="italic">to begin review</span>
                  </p>
                  <p className="label-ui text-[10px] text-slate">
                    PDF or DOCX · Up to 20MB
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mt-4 text-[13px] text-ink"
          >
            <AlertCircle size={14} strokeWidth={1.5} />
            <span className="font-body italic">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
