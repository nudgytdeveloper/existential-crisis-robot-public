"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BatchResult } from "@/lib/types";
import { getBatch } from "@/lib/questions";

const STORAGE_KEY = "ahboy_results";

function scoreEmoji(pct: number) {
  if (pct <= 20) return "😭";
  if (pct <= 40) return "😰";
  if (pct <= 60) return "😐";
  if (pct <= 80) return "😊";
  return "🎉";
}

function loadHistory(): BatchResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveResult(result: BatchResult) {
  const history = loadHistory().filter((r) => r.batch_id !== result.batch_id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...history, result]));
}

export default function ExamPage() {
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BatchResult[]>([]);
  const [emotionLabel, setEmotionLabel] = useState<string | null>(null);
  const [adaptationMsg, setAdaptationMsg] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function runExam() {
    if (!selectedBatch) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setEmotionLabel(null);
    setAdaptationMsg(null);

    try {
      const res = await fetch("/api/student-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_id: selectedBatch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      const batchResult: BatchResult = data;
      saveResult(batchResult);
      setResult(batchResult);
      setHistory(loadHistory());

      // Fire stub agents
      const emotionRes = await fetch("/api/emotion-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchResult),
      });
      const emotion = await emotionRes.json();
      setEmotionLabel(`${emotion.emotion.toUpperCase()} 😢 (intensity: ${Math.round(emotion.intensity * 100)}%)`);

      const adaptRes = await fetch("/api/adaptation-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emotion),
      });
      const adapt = await adaptRes.json();
      setAdaptationMsg(adapt.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const batchQuestions = selectedBatch ? getBatch(selectedBatch) : [];
  const totalCorrect = history.reduce((sum, r) => sum + r.score.correct, 0);
  const totalQ = history.reduce((sum, r) => sum + r.score.total, 0);
  const cumulative = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : null;

  return (
    <main className="min-h-screen bg-amber-50 p-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
            ← Back
          </Link>
          <h1 className="text-xl font-black text-zinc-900">Ah Boy&apos;s Exam Room</h1>
          {cumulative !== null && (
            <span className="text-sm font-semibold text-zinc-500">
              Overall: {scoreEmoji(cumulative)} {cumulative}%
            </span>
          )}
        </div>

        {/* Batch Selector */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-zinc-500">Choose a batch:</p>
          <div className="flex gap-3">
            {[1].map((b) => {
              const done = history.find((r) => r.batch_id === b);
              return (
                <button
                  key={b}
                  onClick={() => { setSelectedBatch(b); setResult(null); setError(null); }}
                  className={`flex-1 rounded-xl border-2 py-4 font-bold text-lg transition-all ${
                    selectedBatch === b
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  Batch {b}
                  {done && (
                    <span className="block text-xs font-normal mt-0.5">
                      {scoreEmoji(done.score.percentage)} {done.score.percentage}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={runExam}
            disabled={!selectedBatch || loading}
            className="w-full rounded-xl bg-zinc-900 py-3 text-white font-bold text-base hover:bg-zinc-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "Ah Boy is panicking... 😰" : "Take Exam"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Score Card */}
            <div className="bg-white rounded-2xl border-2 border-zinc-200 p-6 text-center">
              <div className="text-6xl mb-2">{scoreEmoji(result.score.percentage)}</div>
              <div className="text-4xl font-black text-zinc-900">{result.score.percentage}%</div>
              <div className="text-zinc-500 mt-1">
                {result.score.correct} / {result.score.total} correct · Batch {result.batch_id}
              </div>
            </div>

            {/* Stub Agent Outputs */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold text-blue-800">🤖 Agent Pipeline (stub outputs)</p>
              {emotionLabel && (
                <p className="text-blue-700">
                  <span className="font-medium">Emotion Agent classified:</span> {emotionLabel}
                </p>
              )}
              {adaptationMsg && (
                <p className="text-blue-700">
                  <span className="font-medium">Adaptation Agent:</span> {adaptationMsg}
                </p>
              )}
            </div>

            {/* Per-Question Breakdown */}
            <div className="space-y-3">
              {result.answers.map((ans, i) => {
                const q = batchQuestions.find((bq) => bq.id === ans.question_id);
                return (
                  <div
                    key={ans.question_id}
                    className={`bg-white rounded-xl border-2 p-4 space-y-2 ${
                      ans.is_correct ? "border-green-200" : "border-red-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-800">
                        {i + 1}. {q?.question}
                      </p>
                      <span className="text-lg shrink-0">{ans.is_correct ? "✅" : "❌"}</span>
                    </div>

                    {q && (
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {(["A", "B", "C", "D"] as const).map((opt) => (
                          <div
                            key={opt}
                            className={`rounded-lg px-2 py-1 ${
                              opt === q.correct_answer
                                ? "bg-green-100 text-green-800 font-semibold"
                                : opt === ans.chosen_answer && !ans.is_correct
                                ? "bg-red-100 text-red-800 font-semibold"
                                : "text-zinc-500"
                            }`}
                          >
                            {opt}) {q.options[opt]}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 text-xs">
                      <span className="text-zinc-500">
                        Ah Boy chose: <strong className={ans.is_correct ? "text-green-700" : "text-red-700"}>{ans.chosen_answer}</strong>
                      </span>
                      {!ans.is_correct && (
                        <span className="text-zinc-500">
                          Correct: <strong className="text-green-700">{ans.correct_answer}</strong>
                        </span>
                      )}
                    </div>

                    <blockquote className="border-l-2 border-amber-300 pl-3 text-xs text-zinc-600 italic bg-amber-50 py-1 rounded-r-lg">
                      &ldquo;{ans.reasoning}&rdquo;
                    </blockquote>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
