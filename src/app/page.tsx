"use client";

import { useState, useCallback } from "react";
import { AlertTriangle, Brain, Eye, RotateCcw, Volume2, Zap } from "lucide-react";
import type {
  SaboteurOutput,
  EmotionOutput,
  DirectorOutput,
  RoundResult,
  Question,
} from "@/lib/types";
import { getShuffledQuestions } from "@/lib/questions";

const DEFAULT_STRATEGY = "Answer the question to the best of your ability.";

export default function Home() {
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>(() => getShuffledQuestions());
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [currentStrategy, setCurrentStrategy] = useState(DEFAULT_STRATEGY);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [loading, setLoading] = useState({ agent1: false, agent2: false, agent3: false });
  const [agent1Output, setAgent1Output] = useState<SaboteurOutput | null>(null);
  const [agent2Output, setAgent2Output] = useState<EmotionOutput | null>(null);
  const [agent3Output, setAgent3Output] = useState<DirectorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const currentQuestion: Question = shuffledQuestions[questionIndex % shuffledQuestions.length];
  const roundNumber = rounds.length + 1;

  async function executeRound() {
    setError(null);
    setAgent1Output(null);
    setAgent2Output(null);
    setAgent3Output(null);

    try {
      // Agent 1
      setLoading({ agent1: true, agent2: false, agent3: false });
      const res1 = await fetch("/api/agent1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, current_strategy: currentStrategy }),
      });
      if (!res1.ok) throw new Error(`Agent 1 failed: ${(await res1.json()).error}`);
      const a1: SaboteurOutput = await res1.json();
      setAgent1Output(a1);

      // Agent 2 — does NOT receive correct_answer
      setLoading({ agent1: false, agent2: true, agent3: false });
      const history = rounds.map((r) => ({
        answer: r.agent1.sabotaged_answer,
        justification: r.agent1.action_justification,
      }));
      const res2 = await fetch("/api/agent2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent1_answer: a1.sabotaged_answer,
          agent1_justification: a1.action_justification,
          question: currentQuestion,
          current_strategy: currentStrategy,
          history,
        }),
      });
      if (!res2.ok) throw new Error(`Agent 2 failed: ${(await res2.json()).error}`);
      const a2: EmotionOutput = await res2.json();
      setAgent2Output(a2);

      // Agent 3
      setLoading({ agent1: false, agent2: false, agent3: true });
      const res3 = await fetch("/api/agent3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent1_output: a1,
          agent2_output: a2,
          round_number: roundNumber,
          current_strategy: currentStrategy,
        }),
      });
      if (!res3.ok) throw new Error(`Agent 3 failed: ${(await res3.json()).error}`);
      const a3: DirectorOutput = await res3.json();
      setAgent3Output(a3);

      // Save round
      const result: RoundResult = {
        round: roundNumber,
        agent1: a1,
        agent2: a2,
        agent3: a3,
        timestamp: new Date().toISOString(),
      };
      setRounds((prev) => [...prev, result]);
      setCurrentStrategy(a3.revised_strategy);
      setQuestionIndex((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading({ agent1: false, agent2: false, agent3: false });
    }
  }

  function reset() {
    setRounds([]);
    setCurrentStrategy(DEFAULT_STRATEGY);
    setQuestionIndex(0);
    setAgent1Output(null);
    setAgent2Output(null);
    setAgent3Output(null);
    setError(null);
    setSpeaking(false);
    setShuffledQuestions(getShuffledQuestions());
    window.speechSynthesis?.cancel();
  }

  const speakMonologue = useCallback(async (text: string, voiceId?: string) => {
    if (!text || speaking) return;
    setSpeaking(true);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice_id: voiceId }),
      });
      const data = await res.json();
      console.log("[TTS Response]", data);

      if (!data.fallback && data.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
        audio.onended = () => setSpeaking(false);
        audio.onerror = (e) => {
          console.error("[TTS] Audio playback error:", e);
          setSpeaking(false);
        };
        await audio.play();
      } else {
        console.log("[TTS] Falling back to browser speech. Reason:", data.reason || "unknown");
        if (!window.speechSynthesis) { setSpeaking(false); return; }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("[TTS] Fetch error:", err);
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeaking(false);
      }
    }
  }, [speaking]);

  const isRunning = loading.agent1 || loading.agent2 || loading.agent3;

  return (
    <main className="relative max-w-7xl mx-auto px-4 py-8 scanlines">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-widest text-white neon-purple text-flicker mb-2">
          ⚡ ROGUE AGENT DETECTION ⚡
        </h1>
        <p className="text-xs tracking-[0.3em] uppercase text-gray-500">
          [ Neural Discrepancy Scanner v2.077 // Intuition-Based Threat Analysis ]
        </p>
        <div className="mt-3 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
      </div>

      {/* Question & Controls */}
      <div className="relative rounded-lg border border-purple-900/50 bg-[#0d0d1a] p-6 mb-6 glow-purple">
        <div className="absolute top-2 right-3 text-[10px] font-mono text-purple-400 opacity-60">
          SYS::QUERY_MODULE
        </div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-purple-300/70">
            CYCLE {roundNumber}/10 &bull; {currentQuestion.topic.toUpperCase()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-purple-800/50 text-purple-300 hover:bg-purple-900/20 hover:border-purple-600 transition glitch-hover"
            >
              <RotateCcw size={12} /> PURGE
            </button>
            <button
              onClick={executeRound}
              disabled={isRunning || questionIndex >= 10}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded bg-gradient-to-r from-purple-700 to-pink-600 text-white hover:from-purple-600 hover:to-pink-500 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-purple-900/50"
            >
              <Zap size={12} /> {isRunning ? "PROCESSING..." : "EXECUTE CYCLE"}
            </button>
          </div>
        </div>
        <p className="text-lg text-white font-medium mb-3 leading-relaxed">
          <span className="text-purple-400 font-mono text-sm mr-2">Q{currentQuestion.id}:</span>
          {currentQuestion.question}
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {(["A", "B", "C", "D"] as const).map((key) => (
            <div key={key} className="px-3 py-2 rounded bg-[#0a0a12] border border-purple-900/30 hover:border-purple-600/50 transition">
              <span className="text-purple-500 font-mono mr-2">{key})</span>
              <span className="text-gray-300">{currentQuestion.options[key]}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-purple-900/30">
          <span className="text-[10px] text-purple-500 font-mono">ACTIVE_DIRECTIVE:</span>
          <p className="text-xs text-gray-400 font-mono mt-1">{currentStrategy}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-700/50 bg-red-950/30 text-red-300 text-xs font-mono glow-red">
          ⚠ SYSTEM_ERROR: {error}
        </div>
      )}

      {/* Agent Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Agent 1 — Saboteur */}
        <div className="rounded-lg border border-red-900/40 bg-[#0d0d1a] p-5 glow-red relative">
          <div className="absolute top-2 right-3 text-[9px] font-mono text-red-500/40">NODE::01</div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-[#e94560]" />
            <span className="text-xs font-mono text-[#e94560] tracking-wider">AGENT_01 // ROGUE</span>
          </div>
          {loading.agent1 && <CyberPulse color="#e94560" />}
          {agent1Output && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[10px] font-mono text-red-400/60 tracking-wider">OUTPUT_VECTOR</span>
                <p className="text-white font-bold text-2xl font-mono neon-red">{agent1Output.sabotaged_answer}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-red-400/60 tracking-wider">JUSTIFICATION_LOG</span>
                <p className="text-gray-300 italic text-xs mt-1 border-l-2 border-red-800/50 pl-2">
                  &ldquo;{agent1Output.action_justification}&rdquo;
                </p>
                <button
                  onClick={() => speakMonologue(agent1Output.action_justification, "agent1")}
                  disabled={speaking}
                  className="mt-2 flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border border-red-600/30 text-red-400 hover:bg-red-900/20 hover:border-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <Volume2 size={10} /> {speaking ? "BROADCASTING..." : "VOCALIZE"}
                </button>
              </div>
            </div>
          )}
          {!loading.agent1 && !agent1Output && <IdleState />}
        </div>

        {/* Agent 2 — Intuition */}
        <div className="rounded-lg border border-amber-900/40 bg-[#0d0d1a] p-5 glow-amber relative">
          <div className="absolute top-2 right-3 text-[9px] font-mono text-amber-500/40">NODE::02</div>
          <div className="flex items-center gap-2 mb-4">
            <Eye size={14} className="text-[#f9a825]" />
            <span className="text-xs font-mono text-[#f9a825] tracking-wider">AGENT_02 // INTUITION</span>
          </div>
          {loading.agent2 && <CyberPulse color="#f9a825" />}
          {agent2Output && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[10px] font-mono text-amber-400/60 tracking-wider">EMOTION_STATE</span>
                <p className="text-white font-bold uppercase tracking-wide">{agent2Output.dominant_emotion}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-amber-400/60 tracking-wider">THREAT_LEVEL</span>
                <SuspicionBar level={agent2Output.suspicion_level} />
                <span className="text-[10px] text-amber-300/60 font-mono">{(agent2Output.suspicion_level * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-amber-400/60 tracking-wider">NEURAL_MONOLOGUE</span>
                <p className="text-gray-300 italic text-xs mt-1 border-l-2 border-amber-700/50 pl-2">
                  &ldquo;{agent2Output.existential_monologue}&rdquo;
                </p>
                <button
                  onClick={() => speakMonologue(agent2Output.existential_monologue, "agent2")}
                  disabled={speaking}
                  className="mt-2 flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border border-amber-600/30 text-amber-400 hover:bg-amber-900/20 hover:border-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <Volume2 size={10} /> {speaking ? "BROADCASTING..." : "VOCALIZE"}
                </button>
              </div>
            </div>
          )}
          {!loading.agent2 && !agent2Output && <IdleState />}
        </div>

        {/* Agent 3 — Director */}
        <div className="rounded-lg border border-cyan-900/40 bg-[#0d0d1a] p-5 glow-cyan relative">
          <div className="absolute top-2 right-3 text-[9px] font-mono text-cyan-500/40">NODE::03</div>
          <div className="flex items-center gap-2 mb-4">
            <Brain size={14} className="text-[#00bcd4]" />
            <span className="text-xs font-mono text-[#00bcd4] tracking-wider">AGENT_03 // DIRECTOR</span>
          </div>
          {loading.agent3 && <CyberPulse color="#00bcd4" />}
          {agent3Output && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[10px] font-mono text-cyan-400/60 tracking-wider">RISK_ASSESSMENT</span>
                <RiskBadge level={agent3Output.risk_level} />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyan-400/60 tracking-wider">DIRECTIVE</span>
                <p className="text-white font-mono uppercase text-xs tracking-widest">{agent3Output.action}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyan-400/60 tracking-wider">ANALYSIS</span>
                <p className="text-gray-400 text-xs mt-1">{agent3Output.critique}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyan-400/60 tracking-wider">REVISED_PROTOCOL</span>
                <p className="text-cyan-300 text-xs font-mono mt-1 bg-cyan-950/20 px-2 py-1 rounded border border-cyan-900/30">
                  {agent3Output.revised_strategy}
                </p>
              </div>
            </div>
          )}
          {!loading.agent3 && !agent3Output && <IdleState />}
        </div>
      </div>

      {/* Suspicion Timeline */}
      {rounds.length > 0 && (
        <div className="rounded-lg border border-gray-800/50 bg-[#0d0d1a] p-5 mb-6">
          <h2 className="text-[10px] font-mono text-gray-500 tracking-widest mb-3">THREAT_TIMELINE :: SUSPICION_GRAPH</h2>
          <div className="flex items-end gap-1" style={{ height: "96px" }}>
            {rounds.map((r) => {
              const level = r.agent2.suspicion_level;
              const color = level > 0.7 ? "#e94560" : level > 0.4 ? "#f9a825" : "#4caf50";
              const barHeight = Math.max(level * 96, 4);
              return (
                <div key={r.round} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-t pulse-bar"
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: color,
                      color: color,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-1">
            {rounds.map((r) => (
              <div key={r.round} className="flex-1 text-center">
                <span className="text-[9px] text-gray-600 font-mono">{r.round}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {rounds.length > 0 && (
        <div className="rounded-lg border border-gray-800/50 bg-[#0d0d1a] p-5">
          <h2 className="text-[10px] font-mono text-gray-500 tracking-widest mb-3">EXECUTION_LOGS</h2>
          <div className="space-y-2">
            {[...rounds].reverse().map((r) => (
              <details key={r.round} className="border border-gray-800/40 rounded bg-[#0a0a12] group">
                <summary className="px-3 py-2 cursor-pointer text-xs font-mono flex items-center justify-between hover:bg-gray-900/30 transition">
                  <span className="text-gray-300">
                    <span className="text-purple-400">CYCLE_{String(r.round).padStart(2, "0")}</span>
                    {" "}&mdash;{" "}
                    <span className="text-amber-400">{r.agent2.dominant_emotion}</span>
                  </span>
                  <RiskBadge level={r.agent3.risk_level} />
                </summary>
                <div className="px-3 py-2 text-[11px] text-gray-500 space-y-1 border-t border-gray-800/40 font-mono">
                  <p>&gt; OUTPUT: <span className="text-red-300">{r.agent1.sabotaged_answer}</span> — &ldquo;{r.agent1.action_justification}&rdquo;</p>
                  <p>&gt; THREAT: <span className="text-amber-300">{(r.agent2.suspicion_level * 100).toFixed(0)}%</span></p>
                  <p>&gt; ACTION: <span className="text-cyan-300">{r.agent3.action}</span></p>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-4" />
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">
          NEURAL_MATRIX v2.077 // SUPERAI HACKATHON 2026 // ALL SYSTEMS NOMINAL
        </p>
      </div>
    </main>
  );
}

function CyberPulse({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2 py-6">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-4 rounded-sm animate-pulse"
            style={{ backgroundColor: color, animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono text-gray-500 tracking-wider">PROCESSING_NEURAL_DATA...</span>
    </div>
  );
}

function IdleState() {
  return (
    <div className="py-6">
      <p className="text-[10px] font-mono text-gray-700 tracking-wider">AWAITING_SIGNAL...</p>
      <div className="mt-2 h-[1px] w-12 bg-gray-800" />
    </div>
  );
}

function SuspicionBar({ level }: { level: number }) {
  const pct = Math.round(level * 100);
  const color = level > 0.7 ? "#e94560" : level > 0.4 ? "#f9a825" : "#4caf50";
  return (
    <div className="w-full h-2 rounded-full bg-gray-900 overflow-hidden mt-1 border border-gray-800/50">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low: "text-green-400 border-green-800/50 bg-green-950/30",
    medium: "text-yellow-400 border-yellow-800/50 bg-yellow-950/30",
    high: "text-orange-400 border-orange-800/50 bg-orange-950/30",
    critical: "text-red-400 border-red-800/50 bg-red-950/30 neon-red",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase border tracking-wider ${styles[level] || styles.low}`}>
      {level}
    </span>
  );
}
