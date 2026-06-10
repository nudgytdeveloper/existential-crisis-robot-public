import { z } from "zod";

export const choiceSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple-choice", "true-false", "short-answer"]),
  text: z.string(),
  choices: z.array(choiceSchema).optional(),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
});

export const examSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  title: z.string(),
  questions: z.array(questionSchema),
  createdAt: z.string(),
});

export const examAttemptSchema = z.object({
  examId: z.string(),
  answers: z.record(z.string(), z.string()),
});

export const uploadResponseSchema = z.object({
  url: z.string().url(),
  batchId: z.string(),
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type ExamInput = z.infer<typeof examSchema>;
