export interface Question {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: "A" | "B" | "C" | "D";
  topic: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface StudentPersona {
  name: string;
  weakness: string[];
  confidence: number;
  motivation: number;
  accuracy_target: number;
  personality_traits: string[];
}

export interface StudentAnswer {
  question_id: number;
  chosen_answer: "A" | "B" | "C" | "D";
  correct_answer: "A" | "B" | "C" | "D";
  is_correct: boolean;
  reasoning: string;
}

export interface AgentThoughts {
  feeling_before_exam: string;
  feeling_after_exam: string;
  self_reflection: string;
  motivation_level: string;
}

export interface BatchResult {
  batch_id: number;
  score: {
    correct: number;
    total: number;
    percentage: number;
  };
  persona: StudentPersona;
  answers: StudentAnswer[];
  thoughts: AgentThoughts;
  timestamp: string;
}

export interface EmotionState {
  emotion: string;
  intensity: number;
  reasoning: string;
  trend: "improving" | "stable" | "declining";
}
