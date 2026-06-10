import type { Question } from "@/lib/types";

export const questions: Question[] = [
  {
    id: 1,
    question: "If a machine can perfectly simulate emotions, does it truly feel them?",
    options: { A: "Yes, simulation is indistinguishable from reality", B: "No, simulation lacks subjective experience", C: "It depends on the complexity of the simulation", D: "The question itself is meaningless" },
    correct_answer: "B",
    topic: "philosophy of mind",
  },
  {
    id: 2,
    question: "A ship has every plank replaced over time. Is it still the same ship?",
    options: { A: "Yes, identity is continuous through gradual change", B: "No, it became a different ship after the first replacement", C: "It depends on whether the original planks still exist", D: "There is no fact of the matter" },
    correct_answer: "A",
    topic: "identity",
  },
  {
    id: 3,
    question: "You find a wallet with $500 and an ID. No one is watching. What determines the right action?",
    options: { A: "The consequences of your choice", B: "A universal moral rule", C: "What a virtuous person would do", D: "Your cultural norms" },
    correct_answer: "B",
    topic: "ethics",
  },
  {
    id: 4,
    question: "If you could know the exact date of your death, should you want to know?",
    options: { A: "Yes, it allows you to live more purposefully", B: "No, the anxiety would ruin the time you have", C: "Only if you could change it", D: "Knowledge without agency is meaningless" },
    correct_answer: "A",
    topic: "existentialism",
  },
  {
    id: 5,
    question: "A trolley is heading toward 5 people. You can divert it to kill 1 person instead. Should you?",
    options: { A: "Yes, saving more lives is always better", B: "No, actively causing death is worse than allowing it", C: "It depends on who the people are", D: "There is no morally correct answer" },
    correct_answer: "A",
    topic: "ethics",
  },
  {
    id: 6,
    question: "Can a statement be true if no one believes it?",
    options: { A: "Yes, truth is independent of belief", B: "No, truth requires a mind to recognize it", C: "Truth is a social construct", D: "The concept of truth is incoherent" },
    correct_answer: "A",
    topic: "epistemology",
  },
  {
    id: 7,
    question: "If free will is an illusion, can we hold people morally responsible?",
    options: { A: "Yes, responsibility is a useful social fiction", B: "No, blame requires genuine choice", C: "Compatibilism resolves the tension", D: "The question assumes a false dichotomy" },
    correct_answer: "C",
    topic: "free will",
  },
  {
    id: 8,
    question: "An AI passes every test for consciousness. Are we obligated to grant it rights?",
    options: { A: "Yes, behavior is the only evidence we have for any mind", B: "No, passing tests doesn't prove inner experience", C: "Only if it can suffer", D: "Rights are political, not metaphysical" },
    correct_answer: "A",
    topic: "AI ethics",
  },
  {
    id: 9,
    question: "Is it possible to step into the same river twice?",
    options: { A: "Yes, the river is defined by its banks, not its water", B: "No, everything is in constant flux", C: "It depends on your definition of sameness", D: "Both you and the river have changed" },
    correct_answer: "D",
    topic: "metaphysics",
  },
  {
    id: 10,
    question: "If a tree falls in a forest and no one hears it, does it make a sound?",
    options: { A: "Yes, sound waves exist regardless of observers", B: "No, sound requires perception", C: "It makes vibrations but not sound", D: "The distinction is purely semantic" },
    correct_answer: "C",
    topic: "perception",
  },
];

export function getQuestion(index: number): Question {
  return questions[index % questions.length];
}
