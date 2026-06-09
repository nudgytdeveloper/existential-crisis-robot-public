import Link from "next/link";
import { BookOpen } from "lucide-react";
import { DEFAULT_PERSONA } from "@/lib/prompts";

export default function Home() {
  const persona = DEFAULT_PERSONA;

  return (
    <main className="min-h-screen bg-amber-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2 pt-8">
          <p className="text-sm font-semibold tracking-widest text-amber-600 uppercase">
            🏫 PSLE Math Simulator
          </p>
          <h1 className="text-4xl font-black text-zinc-900 leading-tight">
            Speedrunning Singaporean Childhood
          </h1>
          <p className="text-zinc-500">Can Ah Boy pass his PSLE Math? (Spoiler: probably not lah)</p>
        </div>

        {/* Persona Card */}
        <div className="bg-white rounded-2xl border-2 border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-3xl">
              😰
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">{persona.name}</h2>
              <p className="text-sm text-zinc-500">P6 Student · Bukit Timah Primary</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Weaknesses</p>
              <ul className="space-y-0.5">
                {persona.weakness.map((w) => (
                  <li key={w} className="text-sm text-red-700 capitalize">• {w}</li>
                ))}
              </ul>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 space-y-2">
              <StatBar label="Confidence" value={persona.confidence} color="bg-blue-400" />
              <StatBar label="Motivation" value={persona.motivation} color="bg-amber-400" />
              <StatBar label="Target Score" value={persona.accuracy_target} color="bg-red-400" />
            </div>
          </div>

          <div className="bg-zinc-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Traits</p>
            <div className="flex flex-wrap gap-2">
              {persona.personality_traits.map((t) => (
                <span key={t} className="text-xs bg-zinc-200 text-zinc-700 rounded-full px-2 py-0.5">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/exam"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-8 py-4 text-white font-bold text-lg hover:bg-zinc-700 transition-colors shadow-lg"
          >
            <BookOpen size={22} />
            Start Ah Boy&apos;s Exam
          </Link>
          <p className="mt-3 text-sm text-zinc-400">3 batches · 10 questions each · powered by local Ollama</p>
        </div>

        {/* Agent Pipeline Info */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Agent Pipeline</p>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { num: 1, label: "Student Agent", desc: "Simulates Ah Boy answering MCQs", active: true },
              { num: 2, label: "Emotion Agent", desc: "Detects emotional state from score", active: false },
              { num: 3, label: "Adaptation Agent", desc: "Updates persona based on emotions", active: false },
            ].map((agent) => (
              <div key={agent.num} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${agent.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-400"}`}>
                  {agent.num}
                </span>
                <span className={agent.active ? "text-zinc-800 font-medium" : "text-zinc-400"}>
                  {agent.label}
                </span>
                <span className="text-zinc-400">— {agent.desc}</span>
                {!agent.active && <span className="text-xs bg-zinc-100 text-zinc-400 rounded px-1.5">stub</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500 mb-0.5">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}
