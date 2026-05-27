import * as React from "react"
import Head from 'next/head'
import { AIAssistantInterface } from "../components/ui/ai-assistant-interface"

export default function Demo() {
  return (
    <div className="w-screen">
      <Head>
        <title>rainiX AI Assistant</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </Head>
      <AIAssistantInterface />
    </div>
  )
}
