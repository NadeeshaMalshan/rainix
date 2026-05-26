"use client";

import { Card } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";
import { BrainCircuit } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AIThinkingBlockProps {
  content: string;
  isLive?: boolean;
}

export default function AIThinkingBlock({ content, isLive = false }: AIThinkingBlockProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  useEffect(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight;
      const clientHeight = contentRef.current.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      setScrollPosition(0);

      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }

      if (maxScroll > 0) {
        scrollIntervalRef.current = setInterval(() => {
          setScrollPosition((prev) => {
            const newPosition = prev + 1;
            if (newPosition >= maxScroll) {
              return 0;
            }
            return newPosition;
          });
        }, 40); // 40ms scroll delay for smooth reading speed
      }

      return () => {
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
        }
      };
    }
  }, [content]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  return (
    <>
      <div className="flex flex-col p-3 w-full max-w-xl">
        <div className="flex items-center justify-start gap-2 mb-4">
          {isLive ? (
            <>
              <Loader size={"sm"} variant="muted" />
              <p
                className="bg-[linear-gradient(110deg,#6b7280,35%,#fff,50%,#6b7280,75%,#6b7280)] bg-[length:200%_100%] bg-clip-text text-base text-transparent animate-[shimmer_5s_linear_infinite]"
                style={{
                  animation: "shimmer 5s linear infinite",
                }}
              >
                rainiX AI is thinking
              </p>
              <span className="text-sm text-muted-foreground">
                {timer}s
              </span>
            </>
          ) : (
            <>
              <BrainCircuit className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <p className="text-base text-neutral-500 dark:text-neutral-400 font-semibold">
                Thought process
              </p>
            </>
          )}
          
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
        <Card className="relative h-[150px] overflow-hidden bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-2 rounded-xl">
          {/* Top fade overlay */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-neutral-50 dark:from-zinc-900 to-transparent z-10 pointer-events-none h-[40px]" />

          {/* Bottom fade overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-50 dark:from-zinc-900 to-transparent z-10 pointer-events-none h-[40px]" />

          {/* Scrolling content */}
          <div
            ref={contentRef}
            className="h-full overflow-hidden p-4 text-neutral-600 dark:text-neutral-400"
            style={{
              scrollBehavior: "auto",
            }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
