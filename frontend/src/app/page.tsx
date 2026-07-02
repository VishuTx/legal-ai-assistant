"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/navbar";
import UploadDropzone from "@/components/upload-dropzone";
import DocumentRow from "@/components/document-row";
import Reveal from "@/components/reveal";
import { listDocuments, type DocumentOut } from "@/lib/api";

export default function LibraryPage() {
  const [documents, setDocuments] = useState<DocumentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      setFetchError(false);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
    // Poll while any document is still processing
    const interval = setInterval(() => {
      fetchDocs();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDocs]);

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="pt-44 pb-20 px-6 md:px-10 max-w-[1440px] mx-auto">
        <Reveal>
          <p className="label-ui text-[11px] text-slate mb-6">L-SF · Legal Research Assistant</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="font-display text-[12vw] md:text-[7vw] leading-[0.95] tracking-tight max-w-5xl">
            Contract review, <span className="italic">read carefully.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="font-body italic text-xl md:text-2xl text-slate max-w-xl mt-8">
            Upload a document. We index every clause, flag the risk, and answer
            what you ask — with the page cited every time.
          </p>
        </Reveal>
      </section>

      {/* Upload */}
      <section className="px-6 md:px-10 max-w-[1440px] mx-auto mb-28">
        <Reveal delay={0.1}>
          <UploadDropzone />
        </Reveal>
      </section>

      {/* Document index */}
      <section className="px-6 md:px-10 max-w-[1440px] mx-auto pb-32 flex-1">
        <Reveal>
          <div className="flex items-baseline justify-between border-b hairline pb-5 mb-2">
            <h2 className="label-ui text-[11px]">The Library</h2>
            <span className="label-ui text-[10px] text-slate">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </span>
          </div>
        </Reveal>

        {loading && (
          <p className="font-body italic text-slate py-12 text-center">Loading your library…</p>
        )}

        {fetchError && (
          <p className="font-body italic text-slate py-12 text-center">
            Could not reach the backend. Confirm the API is running at{" "}
            {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}.
          </p>
        )}

        {!loading && !fetchError && documents.length === 0 && (
          <p className="font-body italic text-slate py-16 text-center text-lg">
            No documents yet. Upload your first contract above.
          </p>
        )}

        {!loading &&
          documents.map((doc, i) => <DocumentRow key={doc.id} doc={doc} index={i} />)}
      </section>

      {/* Footer */}
      <footer className="border-t hairline px-6 md:px-10 py-10">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <span className="font-display text-lg">L-SF</span>
          <div className="flex gap-8">
            <a href="/about" className="label-ui text-[10px] text-slate hover:text-ink transition-colors">
              Method
            </a>
            <span className="label-ui text-[10px] text-slate">
              Built for legal review, not legal advice
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
