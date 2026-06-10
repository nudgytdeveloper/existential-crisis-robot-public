import type { Question } from "./types";

export const TOTAL_BATCHES = 1;

export const questions: Question[] = [
  // --- BATCH 1 (ids 1–10) ---
  {
    id: 1,
    question: "What is 3/4 + 1/2?",
    options: { A: "4/6", B: "5/4", C: "1 1/4", D: "2/3" },
    correct_answer: "C",
    topic: "fractions",
    difficulty: "easy",
  },
  {
    id: 2,
    question: "A rectangle has length 12 cm and width 7 cm. What is its area?",
    options: { A: "38 cm²", B: "84 cm²", C: "76 cm²", D: "96 cm²" },
    correct_answer: "B",
    topic: "geometry",
    difficulty: "easy",
  },
  {
    id: 3,
    question: "John had $240. He spent 35% of it. How much did he spend?",
    options: { A: "$84", B: "$96", C: "$72", D: "$156" },
    correct_answer: "A",
    topic: "percentages",
    difficulty: "medium",
  },
  {
    id: 4,
    question: "What is 0.75 × 0.4?",
    options: { A: "0.03", B: "3.0", C: "0.3", D: "0.075" },
    correct_answer: "C",
    topic: "decimals",
    difficulty: "easy",
  },
  {
    id: 5,
    question: "The ratio of boys to girls in a class is 3:5. If there are 24 boys, how many girls are there?",
    options: { A: "36", B: "40", C: "32", D: "45" },
    correct_answer: "B",
    topic: "ratios",
    difficulty: "medium",
  },
  {
    id: 6,
    question: "A triangle has base 10 cm and height 8 cm. What is its area?",
    options: { A: "80 cm²", B: "18 cm²", C: "40 cm²", D: "20 cm²" },
    correct_answer: "C",
    topic: "geometry",
    difficulty: "easy",
  },
  {
    id: 7,
    question: "Mary baked 120 cookies. She gave 2/5 to her neighbours. How many did she keep?",
    options: { A: "48", B: "72", C: "60", D: "80" },
    correct_answer: "B",
    topic: "fractions",
    difficulty: "medium",
  },
  {
    id: 8,
    question: "What is 15% of 360?",
    options: { A: "54", B: "45", C: "60", D: "36" },
    correct_answer: "A",
    topic: "percentages",
    difficulty: "easy",
  },
  {
    id: 9,
    question: "A shop sold apples and oranges in the ratio 4:7. If 88 apples were sold, how many fruits were sold altogether?",
    options: { A: "154", B: "176", C: "209", D: "242" },
    correct_answer: "C",
    topic: "ratios",
    difficulty: "hard",
  },
  {
    id: 10,
    question: "Tom runs 2.4 km every day. How far does he run in 2 weeks?",
    options: { A: "16.8 km", B: "33.6 km", C: "28.8 km", D: "48 km" },
    correct_answer: "B",
    topic: "word problems",
    difficulty: "easy",
  },
];

export function getBatch(batchNum: number): Question[] {
  if (batchNum !== 1) {
    throw new Error(`Invalid batch number: ${batchNum}. Only batch 1 is available.`);
  }
  return questions;
}
