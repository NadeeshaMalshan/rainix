"use client"

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import { ArrowUp, Square } from "lucide-react"
import { useRouter } from "next/router"
import { useState } from "react"

export function PromptInputBasic() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = () => {
    if (input.trim()) {
      router.push(`/ai?q=${encodeURIComponent(input.trim())}`)
    }
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
      className="w-full max-w-[400px] deep-frosted-pill shadow-lg text-white mx-auto mt-8"
    >
      <PromptInputTextarea placeholder="Ask AI about the weather..." className="placeholder:text-white/60 text-white" />
      <PromptInputActions className="justify-end pt-2">
        <PromptInputAction
          tooltip={isLoading ? "Stop generation" : "Send message"}
        >
          <Button
            variant="default"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/30 hover:bg-white/40 text-white shadow-md border border-white/20 backdrop-blur-md"
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
