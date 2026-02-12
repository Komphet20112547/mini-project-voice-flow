"use client";

import { useEffect, useRef, useState } from "react";

type ApiResult = {
  transcript?: string;
  answer?: string;
  matches?: Array<any>;
  error?: string;
};

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("พร้อมพูด");
  const [result, setResult] = useState<ApiResult>({});

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // รองรับ Chrome: webkitSpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("เบราว์เซอร์นี้ไม่รองรับ Web Speech API (แนะนำ Chrome เท่านั้น)");
      return;
    }

    const rec = new SpeechRecognition();
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

    rec.onerror = (e: any) => {
      setIsListening(false);
      setStatus(`เกิดข้อผิดพลาด: ${e?.error || "unknown"}`);
      setResult({ error: e?.error || "speech error" });
    };

    rec.onresult = async (event: any) => {
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
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">IT Shop Voice Q&A (Web Speech)</h1>
      <p className="text-sm opacity-80 mt-2">
        กดเริ่มแล้วพูด เช่น “มี SSD 1TB ไหม ราคาเท่าไหร่”
      </p>

      <div className="mt-6 flex gap-3">
        {!isListening ? (
          <button className="px-4 py-2 rounded bg-black text-white" onClick={start}>
            เริ่มพูด
          </button>
        ) : (
          <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={stop}>
            หยุด
          </button>
        )}
        <div className="px-3 py-2 rounded border text-sm">{status}</div>
      </div>

      <section className="mt-8 space-y-4">
        <div className="p-4 rounded border">
          <div className="font-semibold">ข้อความที่ถอดเสียง</div>
          <div className="mt-2 text-sm">{result.transcript ?? "-"}</div>
        </div>

        <div className="p-4 rounded border">
          <div className="font-semibold">คำตอบ</div>
          <div className="mt-2 text-sm">{result.answer ?? "-"}</div>
          {result.error && <div className="mt-2 text-sm text-red-600">{result.error}</div>}
        </div>
      </section>
    </main>
  );
}
