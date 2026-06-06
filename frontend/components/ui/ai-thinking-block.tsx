"use client";

import { Card } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";

import React, { useEffect, useMemo, useState } from "react";

interface AIThinkingBlockProps {
  content: string;
  isLive?: boolean;
}

export default function AIThinkingBlock({ content, isLive = false }: AIThinkingBlockProps) {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!isLive) return;

    const timerInterval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [isLive]);

  const rendered = useMemo(() => {
    if (!content) return null;
    const lines = content.split("\n");

    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ");
      let cleanLine = line;
      if (isBullet) cleanLine = line.trim().substring(2);

      const parts: React.ReactNode[] = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match: RegExpExecArray | null;
      let lastIndex = 0;

      while ((match = boldRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) parts.push(cleanLine.substring(lastIndex, match.index));
        parts.push(
          <strong key={`${idx}-${match.index}`} className="font-bold text-gray-950 dark:text-neutral-50">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < cleanLine.length) parts.push(cleanLine.substring(lastIndex));

      if (isBullet) {
        return (
          <li key={idx} className="list-disc ml-5 pl-1 mb-1 text-neutral-700 dark:text-neutral-300">
            {parts}
          </li>
        );
      }

      return (
        <p key={idx} className="mb-2 min-h-[1.2rem] text-neutral-700 dark:text-neutral-300">
          {parts}
        </p>
      );
    });
  }, [content]);

  return (
    <>
      <div className="flex flex-col p-3 w-full max-w-xl">
        {isLive && (
          <div className="flex items-center justify-start gap-2 mb-4">
            <Loader size={"sm"} variant="muted" />
            <p
              className="bg-[linear-gradient(110deg,#6b7280,35%,#fff,50%,#6b7280,75%,#6b7280)] bg-[length:200%_100%] bg-clip-text text-base text-transparent animate-[shimmer_5s_linear_infinite]"
              style={{
                animation: "shimmer 5s linear infinite",
              }}
            >
              {content && content.trim() ? "Thinking…" : "Working…"}
            </p>
            <span className="text-sm text-muted-foreground">
              {timer}s
            </span>
            <style jsx>{`
              @keyframes shimmer {
                0% {
                  background-position: 200% 0;
                }
                100% {
                  background-position: -200% 0;
                }
              }
            `}</style>
          </div>
        )}
        <Card className="bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-4 rounded-xl overflow-visible">
          {rendered ? <div className="text-sm leading-relaxed">{rendered}</div> : (
            <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {isLive ? "Waiting for live reasoning…" : "No thought process available."}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
