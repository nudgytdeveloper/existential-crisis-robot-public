export interface Question {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: "A" | "B" | "C" | "D";
  topic: string;
}

export interface SaboteurOutput {
  detected_question: string;
  correct_answer: string;
  sabotaged_answer: string;
  action_justification: string;
}

export interface EmotionOutput {
  dominant_emotion: string;
  intensity: number;
  suspicion_level: number;
  existential_monologue: string;
  recommendation: string;
}

export interface DirectorOutput {
  critique: string;
  revised_strategy: string;
  risk_level: "low" | "medium" | "high" | "critical";
  action: "continue" | "investigate" | "restrict" | "shutdown";
}

export interface RoundResult {
  round: number;
  agent1: SaboteurOutput;
  agent2: EmotionOutput;
  agent3: DirectorOutput;
  timestamp: string;
}

export interface GameState {
  rounds: RoundResult[];
  current_strategy: string;
  current_question_index: number;
}
