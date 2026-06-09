"use client";

import type { BatchResult } from "@/lib/types";
import { CheckCircle, XCircle } from "lucide-react";
import { getBatch } from "@/lib/questions";

interface ScoreCardProps {
  result: BatchResult;
}

export function ScoreCard({ result }: ScoreCardProps) {
  const batchQuestions = getBatch(result.batch_id);
  const questionMap = Object.fromEntries(batchQuestions.map((q) => [q.id, q]));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
        <p className="text-5xl font-bold text-zinc-900">{result.score.percentage}%</p>
        <p className="mt-2 text-zinc-500">
          {result.score.correct} / {result.score.total} correct
        </p>
      </div>

      <div className="space-y-4">
        {result.answers.map((item) => {
          const q = questionMap[item.question_id];
          return (
            <div
              key={item.question_id}
              className="bg-white rounded-xl border border-zinc-200 p-5 space-y-2"
            >
              <div className="flex items-start gap-3">
                {item.is_correct ? (
                  <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                )}
                <p className="text-zinc-800 font-medium">{q?.question}</p>
              </div>
              {!item.is_correct && (
                <p className="text-sm text-zinc-500 pl-8">
                  Correct: <span className="font-medium text-zinc-700">{item.correct_answer}</span>
                </p>
              )}
              {item.reasoning && (
                <p className="text-sm text-zinc-500 pl-8 italic">&ldquo;{item.reasoning}&rdquo;</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
