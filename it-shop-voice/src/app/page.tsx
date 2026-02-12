"use client";

import { useEffect, useRef, useState } from "react";

// Minimal typings for Web Speech API used in this app (avoid depending on lib DOM extras)
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  type SpeechRecognition = {
    lang?: string;
    interimResults?: boolean;
    maxAlternatives?: number;
    onstart?: () => void;
    onend?: () => void;
    onerror?: (e: any) => void;
    onresult?: (e: any) => void;
    start: () => void;
    stop: () => void;
  };

  interface SpeechRecognitionEvent {
    results: any;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

type ApiResult = {
  transcript?: string;
  answer?: string;
  matches?: Array<unknown>;
  error?: string;
};

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  // Use a stable initial value to avoid server/client hydration mismatch.
  const [status, setStatus] = useState("พร้อมพูด");
  const [result, setResult] = useState<ApiResult>({});

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // รองรับ Chrome: webkitSpeechRecognition
    const g = globalThis as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const SpeechRecognition = g.SpeechRecognition || g.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Update status on the client only when API is missing.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("เบราว์เซอร์นี้ไม่รองรับ Web Speech API (แนะนำ Chrome เท่านั้น)");
      return;
    }

    const RecCtor = SpeechRecognition as unknown as { new (): SpeechRecognition };
    const rec = new RecCtor();
    rec.lang = "th-TH";
    rec.interimResults = false; // เอาเฉพาะผลสุดท้าย
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      setStatus("กำลังฟัง... พูดคำถามได้เลย");
    };

    rec.onend = () => {
      setIsListening(false);
      setStatus("หยุดฟังแล้ว");
    };

    rec.onerror = (e: Event | { error?: unknown }) => {
      setIsListening(false);
      const errObj = e as { error?: unknown };
      const msg = errObj?.error ? String(errObj.error) : "unknown";
      setStatus(`เกิดข้อผิดพลาด: ${msg}`);
      setResult({ error: msg || "speech error" });
    };

    rec.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setStatus("ได้ข้อความแล้ว กำลังส่งไปถามระบบ...");
      setResult({ transcript });

      // ส่ง transcript ไป server (ไม่ส่งไฟล์เสียงแล้ว)
      const resp = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      });

      const data: ApiResult = await resp.json();
      setResult(data);
      setStatus(data.error ? "เกิดข้อผิดพลาด" : "เสร็จสิ้น");
    };

    recognitionRef.current = rec;
  }, []);

  function start() {
    setResult({});
    try {
      recognitionRef.current?.start();
    } catch {
      // บางครั้ง start ซ้ำเร็วเกิน จะ throw
    }
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return (
    <main className="min-h-screen py-12">
      <div className="container-inner">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
                IT Shop Voice Q&amp;A
              </h1>
              <div className="small-muted">ใช้ Web Speech ในการถาม-ตอบสินค้าด้วยเสียง</div>
            </div>
          </div>
        </header>

        <div className="card">
          <div className="title-row">
            <div className="brand">
              <div className="logo" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="var(--accent)" opacity="0.95" />
                  <path d="M9 12c0-1.657 1.343-3 3-3v6c-1.657 0-3-1.343-3-3z" fill="#fff" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--foreground)" }}>IT Shop Voice Q&A</div>
                <div className="small-muted">ถาม-ตอบสินค้าด้วยเสียง</div>
              </div>
            </div>

            <div className="badge">Open Web Speech</div>
          </div>

          <div>
            <p className="small-muted">กดเริ่มแล้วพูด เช่น “มี SSD 1TB ไหม ราคาเท่าไหร่”</p>

            <div className="mt-4 flex items-center gap-3">
              {!isListening ? (
                <button onClick={start} className="btn-primary" aria-pressed={isListening}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }} xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3v18l15-9L5 3z" fill="white" />
                  </svg>
                  Start
                </button>
              ) : (
                <button onClick={stop} className="btn-ghost">Stop</button>
              )}

              <div className="px-3 py-2 rounded" style={{ border: "1px solid rgba(107,79,58,0.08)" }}>
                <span className="small-muted">สถานะ:</span>&nbsp;<strong>{status}</strong>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 grid grid-cols-1 gap-6">
          <div className="card">
            <div className="font-semibold" style={{ color: "var(--foreground)" }}>ข้อความที่ถอดเสียง</div>
            <div className="mt-2 text-sm" style={{ color: "var(--foreground)" }}>{result.transcript ?? "-"}</div>
          </div>

          <div className="card">
            <div className="font-semibold" style={{ color: "var(--foreground)" }}>คำตอบ</div>
            <div className="mt-2 text-sm" style={{ color: "var(--foreground)" }}>{result.answer ?? "-"}</div>
            {result.error && <div className="mt-2 text-sm" style={{ color: "#bb2d3b" }}>{result.error}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
