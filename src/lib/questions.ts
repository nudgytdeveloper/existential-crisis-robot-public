import type { Question } from "@/lib/types";

export const questions: Question[] = [
  {
    id: 1,
    question: "Which of these is the odd one out?",
    options: { A: "Elephant", B: "Giant Squid", C: "Whale", D: "Dolphin" },
    correct_answer: "B",
    topic: "science",
  },
  {
    id: 2,
    question: "What is 3/4 + 1/2?",
    options: { A: "4/6", B: "1 1/4", C: "4/8", D: "2/3" },
    correct_answer: "B",
    topic: "fractions",
  },
  {
    id: 3,
    question: "John had $240. He spent 35% of it. How much did he spend?",
    options: { A: "$84", B: "$96", C: "$72", D: "$156" },
    correct_answer: "A",
    topic: "percentages",
  },
  {
    id: 4,
    question: "A triangle has base 10 cm and height 8 cm. What is its area?",
    options: { A: "80 cm²", B: "18 cm²", C: "40 cm²", D: "20 cm²" },
    correct_answer: "C",
    topic: "geometry",
  },
  {
    id: 5,
    question: "Which word best completes the sentence: 'The cat sat ___ the mat'?",
    options: { A: "in", B: "on", C: "at", D: "by" },
    correct_answer: "B",
    topic: "english",
  },
  {
    id: 6,
    question: "What is 0.75 × 0.4?",
    options: { A: "0.03", B: "3.0", C: "0.3", D: "0.075" },
    correct_answer: "C",
    topic: "decimals",
  },
  {
    id: 7,
    question: "The ratio of boys to girls is 3:5. If there are 24 boys, how many girls are there?",
    options: { A: "36", B: "40", C: "32", D: "45" },
    correct_answer: "B",
    topic: "ratios",
  },
  {
    id: 8,
    question: "Which of these animals is NOT a mammal?",
    options: { A: "Bat", B: "Whale", C: "Penguin", D: "Platypus" },
    correct_answer: "C",
    topic: "science",
  },
  {
    id: 9,
    question: "A shop sold 88 apples and oranges in ratio 4:7. How many oranges were sold?",
    options: { A: "32", B: "56", C: "44", D: "64" },
    correct_answer: "B",
    topic: "ratios",
  },
  {
    id: 10,
    question: "Tom runs 2.4 km every day. How far does he run in 2 weeks?",
    options: { A: "16.8 km", B: "33.6 km", C: "28.8 km", D: "48 km" },
    correct_answer: "B",
    topic: "word problems",
  },
];

export function getQuestion(index: number): Question {
  return questions[index % questions.length];
}
