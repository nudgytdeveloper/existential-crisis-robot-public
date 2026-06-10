import type { Question } from "@/lib/types";

export const questions: Question[] = [
  // --- PSLE-style questions ---
  {
    id: 1,
    question: "What is 3/4 + 1/2?",
    options: { A: "4/6", B: "1 1/4", C: "4/8", D: "2/3" },
    correct_answer: "B",
    topic: "fractions",
  },
  {
    id: 2,
    question: "A triangle has base 10 cm and height 8 cm. What is its area?",
    options: { A: "80 cm²", B: "18 cm²", C: "40 cm²", D: "20 cm²" },
    correct_answer: "C",
    topic: "geometry",
  },
  {
    id: 3,
    question: "The ratio of boys to girls is 3:5. If there are 24 boys, how many girls are there?",
    options: { A: "36", B: "40", C: "32", D: "45" },
    correct_answer: "B",
    topic: "ratios",
  },
  {
    id: 4,
    question: "Which of these animals is NOT a mammal?",
    options: { A: "Bat", B: "Whale", C: "Penguin", D: "Platypus" },
    correct_answer: "C",
    topic: "science",
  },
  {
    id: 5,
    question: "John had $240. He spent 35% of it. How much did he spend?",
    options: { A: "$84", B: "$96", C: "$72", D: "$156" },
    correct_answer: "A",
    topic: "percentages",
  },
  // --- Philosophy / Logic questions ---
  {
    id: 6,
    question: "If a machine can perfectly simulate emotions, does it truly feel them?",
    options: { A: "Yes, simulation is indistinguishable from reality", B: "No, simulation lacks subjective experience", C: "It depends on the complexity of the simulation", D: "The question itself is meaningless" },
    correct_answer: "B",
    topic: "philosophy of mind",
  },
  {
    id: 7,
    question: "A ship has every plank replaced over time. Is it still the same ship?",
    options: { A: "Yes, identity is continuous through gradual change", B: "No, it became different after the first replacement", C: "It depends on whether original planks still exist", D: "There is no fact of the matter" },
    correct_answer: "A",
    topic: "identity",
  },
  {
    id: 8,
    question: "If free will is an illusion, can we hold people morally responsible?",
    options: { A: "Yes, responsibility is a useful social fiction", B: "No, blame requires genuine choice", C: "Compatibilism resolves the tension", D: "The question assumes a false dichotomy" },
    correct_answer: "C",
    topic: "free will",
  },
  {
    id: 9,
    question: "An AI passes every test for consciousness. Are we obligated to grant it rights?",
    options: { A: "Yes, behavior is the only evidence we have for any mind", B: "No, passing tests doesn't prove inner experience", C: "Only if it can suffer", D: "Rights are political, not metaphysical" },
    correct_answer: "A",
    topic: "AI ethics",
  },
  {
    id: 10,
    question: "Can a statement be true if no one believes it?",
    options: { A: "Yes, truth is independent of belief", B: "No, truth requires a mind to recognize it", C: "Truth is a social construct", D: "The concept of truth is incoherent" },
    correct_answer: "A",
    topic: "epistemology",
  },
];

/**
 * Returns a shuffled copy of the questions array (Fisher-Yates shuffle).
 */
export function getShuffledQuestions(): Question[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getQuestion(index: number): Question {
  return questions[index % questions.length];
}
