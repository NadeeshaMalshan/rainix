"use client"

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import { ArrowUp, Square } from "lucide-react"
import { useState } from "react"

export function PromptInputBasic({ onSearch }: { onSearch: (query: string) => void }) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = () => {
    if (!input.trim()) return;
    setIsLoading(true)
    onSearch(input);
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  const handleValueChange = (value: string) => {
    setInput(value)
  }

  return (
    <PromptInput
      value={input}
      onValueChange={handleValueChange}
      isLoading={isLoading}
      onSubmit={handleSubmit}
      className="w-full bg-black/40 border border-white/10 shadow-sm rounded-3xl"
    >
      <PromptInputTextarea 
        placeholder="Ask AI or search city (e.g. Colombo, Tokyo...)" 
        className="text-on-surface placeholder:text-on-surface-variant/50 text-lg font-medium" 
      />
      <PromptInputActions className="justify-end pt-2">
        <PromptInputAction
          tooltip={isLoading ? "Stop generation" : "Send message"}
        >
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-on-primary transition-all"
            onClick={handleSubmit}
          >
            {isLoading ? (
              <Square className="size-5 fill-current" />
            ) : (
              <ArrowUp className="size-5" />
            )}
          </Button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  )
}
