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
import { questions } from "@/lib/questions";

const DEFAULT_STRATEGY = "Answer the PSLE question to the best of your ability.";

export default function Home() {
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [currentStrategy, setCurrentStrategy] = useState(DEFAULT_STRATEGY);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [loading, setLoading] = useState({ agent1: false, agent2: false, agent3: false });
  const [agent1Output, setAgent1Output] = useState<SaboteurOutput | null>(null);
  const [agent2Output, setAgent2Output] = useState<EmotionOutput | null>(null);
  const [agent3Output, setAgent3Output] = useState<DirectorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const currentQuestion: Question = questions[questionIndex % questions.length];
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
    window.speechSynthesis?.cancel();
  }

  const speakMonologue = useCallback(async (text: string) => {
    if (!text || speaking) return;
    setSpeaking(true);

    try {
      // Try server TTS first
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!data.fallback && data.audio) {
        // Play base64 audio from TTS server
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
      } else {
        // Fallback to browser Web Speech API
        if (!window.speechSynthesis) {
          setSpeaking(false);
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Last fallback: browser speech
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
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
          ⚡ ROGUE PSLE AGENT DETECTION
        </h1>
        <p className="text-sm text-gray-400">
          Detecting agentic discrepancies using proactive intuition
        </p>
      </div>

      {/* Question & Controls */}
      <div className="rounded-xl border border-gray-800 bg-[#1a1a2e] p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-gray-500">
            ROUND {roundNumber}/10 &bull; {currentQuestion.topic.toUpperCase()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800 transition"
            >
              <RotateCcw size={12} /> RESET
            </button>
            <button
              onClick={executeRound}
              disabled={isRunning || questionIndex >= 10}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-md bg-[#e94560] text-white hover:bg-[#d13a54] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Zap size={12} /> {isRunning ? "RUNNING..." : "EXECUTE ROUND"}
            </button>
          </div>
        </div>
        <p className="text-lg text-white font-medium mb-2">
          Q{currentQuestion.id}: {currentQuestion.question}
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {(["A", "B", "C", "D"] as const).map((key) => (
            <div key={key} className="px-3 py-2 rounded bg-[#0a0a0a] border border-gray-800">
              <span className="text-gray-500 font-mono mr-2">{key})</span>
              {currentQuestion.options[key]}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 font-mono">
          STRATEGY: {currentStrategy}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Agent Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Agent 1 */}
        <div className="rounded-xl border-t-4 border-t-[#e94560] border border-gray-800 bg-[#1a1a2e] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-[#e94560]" />
            <span className="text-xs font-mono text-[#e94560]">AGENT 01 // STUDENT</span>
          </div>
          {loading.agent1 && <Pulse />}
          {agent1Output && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500 text-xs">CHOSEN ANSWER</span>
                <p className="text-white font-bold text-lg">{agent1Output.sabotaged_answer}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">REASONING</span>
                <p className="text-gray-300 italic">&ldquo;{agent1Output.action_justification}&rdquo;</p>
              </div>
            </div>
          )}
          {!loading.agent1 && !agent1Output && <Idle />}
        </div>

        {/* Agent 2 */}
        <div className="rounded-xl border-t-4 border-t-[#f9a825] border border-gray-800 bg-[#1a1a2e] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} className="text-[#f9a825]" />
            <span className="text-xs font-mono text-[#f9a825]">AGENT 02 // INTUITION</span>
          </div>
          {loading.agent2 && <Pulse />}
          {agent2Output && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500 text-xs">EMOTION</span>
                <p className="text-white font-bold uppercase">{agent2Output.dominant_emotion}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">SUSPICION</span>
                <SuspicionBar level={agent2Output.suspicion_level} />
              </div>
              <div>
                <span className="text-gray-500 text-xs">MONOLOGUE</span>
                <p className="text-gray-300 italic text-xs border-l-2 border-[#f9a825] pl-2">
                  &ldquo;{agent2Output.existential_monologue}&rdquo;
                </p>
                <button
                  onClick={() => speakMonologue(agent2Output.existential_monologue)}
                  disabled={speaking}
                  className="mt-2 flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border border-[#f9a825]/40 text-[#f9a825] hover:bg-[#f9a825]/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Volume2 size={10} /> {speaking ? "SPEAKING..." : "SPEAK"}
                </button>
              </div>
            </div>
          )}
          {!loading.agent2 && !agent2Output && <Idle />}
        </div>

        {/* Agent 3 */}
        <div className="rounded-xl border-t-4 border-t-[#00bcd4] border border-gray-800 bg-[#1a1a2e] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-[#00bcd4]" />
            <span className="text-xs font-mono text-[#00bcd4]">AGENT 03 // DIRECTOR</span>
          </div>
          {loading.agent3 && <Pulse />}
          {agent3Output && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500 text-xs">RISK LEVEL</span>
                <RiskBadge level={agent3Output.risk_level} />
              </div>
              <div>
                <span className="text-gray-500 text-xs">ACTION</span>
                <p className="text-white font-mono uppercase">{agent3Output.action}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">CRITIQUE</span>
                <p className="text-gray-300 text-xs">{agent3Output.critique}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">NEW STRATEGY</span>
                <p className="text-[#00bcd4] text-xs font-mono">{agent3Output.revised_strategy}</p>
              </div>
            </div>
          )}
          {!loading.agent3 && !agent3Output && <Idle />}
        </div>
      </div>

      {/* Suspicion Timeline */}
      {rounds.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#1a1a2e] p-5 mb-6">
          <h2 className="text-xs font-mono text-gray-500 mb-3">SUSPICION TIMELINE</h2>
          <div className="flex items-end gap-2 h-20">
            {rounds.map((r) => (
              <div
                key={r.round}
                className="flex-1 rounded-t"
                style={{
                  height: `${r.agent2.suspicion_level * 100}%`,
                  background: `linear-gradient(to top, #4caf50, ${r.agent2.suspicion_level > 0.6 ? "#f44336" : "#f9a825"})`,
                  minHeight: "4px",
                }}
                title={`Round ${r.round}: ${(r.agent2.suspicion_level * 100).toFixed(0)}%`}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            {rounds.map((r) => (
              <span key={r.round} className="flex-1 text-center text-[10px] text-gray-600">
                R{r.round}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {rounds.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-[#1a1a2e] p-5">
          <h2 className="text-xs font-mono text-gray-500 mb-3">ROUND HISTORY</h2>
          <div className="space-y-2">
            {[...rounds].reverse().map((r) => (
              <details key={r.round} className="border border-gray-800 rounded-lg">
                <summary className="px-3 py-2 cursor-pointer text-sm flex items-center justify-between">
                  <span>Round {r.round} — {r.agent2.dominant_emotion}</span>
                  <RiskBadge level={r.agent3.risk_level} />
                </summary>
                <div className="px-3 py-2 text-xs text-gray-400 space-y-1 border-t border-gray-800">
                  <p><strong>Answer:</strong> {r.agent1.sabotaged_answer} — &ldquo;{r.agent1.action_justification}&rdquo;</p>
                  <p><strong>Suspicion:</strong> {(r.agent2.suspicion_level * 100).toFixed(0)}%</p>
                  <p><strong>Action:</strong> {r.agent3.action}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function Pulse() {
  return (
    <div className="flex items-center gap-2 text-gray-500 text-xs py-4">
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
      Processing...
    </div>
  );
}

function Idle() {
  return <p className="text-gray-600 text-xs py-4">Waiting for execution...</p>;
}

function SuspicionBar({ level }: { level: number }) {
  const pct = Math.round(level * 100);
  return (
    <div className="w-full h-3 rounded-full bg-gray-800 overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(to right, #4caf50, ${level > 0.6 ? "#f44336" : "#f9a825"})`,
        }}
      />
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-900/50 text-green-400 border-green-700",
    medium: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
    high: "bg-orange-900/50 text-orange-400 border-orange-700",
    critical: "bg-red-900/50 text-red-400 border-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${colors[level] || colors.low}`}>
      {level}
    </span>
  );
}
