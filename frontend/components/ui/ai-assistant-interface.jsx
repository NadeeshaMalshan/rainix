"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Mic,
  ArrowUp,
  Sparkles,
  FileText,
  Plus,
  CloudSun,
  Globe,
  AlertTriangle,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RefreshCw,
  MoreHorizontal,
  Paperclip,
  ChevronDown,
  ChevronRight,
  BrainCircuit,
  Settings,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIThinkingBlock from "./ai-thinking-block";
import { Loader } from "./loader";

export function AIAssistantInterface() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("rainix_theme") || "dark";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (targetTheme) => {
    const root = window.document.documentElement;
    if (targetTheme === "dark") {
      root.classList.add("dark");
    } else if (targetTheme === "light") {
      root.classList.remove("dark");
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemPrefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("rainix_theme", newTheme);
    applyTheme(newTheme);
  };

  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const sessionIdRef = useRef(null);

  if (!sessionIdRef.current) {
    sessionIdRef.current = Math.random().toString(36).substring(7);
  }

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const getAssistantResponse = (query) => {
    const q = query.toLowerCase();
    if (q.includes("weather") || q.includes("london") || q.includes("temperature")) {
      return "The current weather in London is 18°C with light rain. Humidity is at 74% and winds are blowing from the North-East at 12 km/h. 🌧️";
    }
    if (q.includes("rain") || q.includes("precipitation") || q.includes("umbrella")) {
      return "Yes, there is a 65% chance of light showers later this evening. I'd recommend carrying an umbrella if you're heading out! ☔";
    }
    if (q.includes("snow") || q.includes("winter") || q.includes("cold")) {
      return "Current satellite mapping indicates no active snowfall in your area, but temperatures are expected to drop near freezing by midnight. ❄️";
    }
    return "Hey! 😄 What's up? I'm rainiX AI, your intelligent weather and climate assistant. Ask me anything about current atmospheric conditions or forecasts!";
  };

  const sendMessage = async (text) => {
    if (text.trim() && !isLoading) {
      const userText = text.trim();
      const userMsg = {
        id: Date.now(),
        sender: "user",
        text: userText,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsLoading(true);

      try {
        // FastAPI server URL from environment variables or fallback
        const aiApiUrl = (process.env.NEXT_PUBLIC_AI_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        const response = await fetch(`${aiApiUrl}/chat?q=${encodeURIComponent(userText)}&session_id=${sessionIdRef.current}`);
        if (!response.ok) {
          throw new Error("Failed to connect to FastAPI backend");
        }
        const data = await response.json();
        
        let responseText = "";
        let thinkingText = "";
        let textContent = "";
        let isStructured = false;

        if (data && data.response) {
          // 1. Direct JSON array (from Native Gemini/Gemma thinking blocks)
          if (Array.isArray(data.response) && data.response.length > 0) {
            if (data.response.every(item => typeof item === "string")) {
              if (data.response.length >= 2) {
                thinkingText = data.response[0];
                textContent = data.response[1];
                isStructured = true;
              } else {
                textContent = data.response[0];
                isStructured = true;
              }
            } else {
              const thinkingObj = data.response.find(item => item.type === "thinking");
              const textObj = data.response.find(item => item.type === "text");
              if (thinkingObj || textObj) {
                thinkingText = thinkingObj ? (thinkingObj.thinking || thinkingObj.text || "") : "";
                textContent = textObj ? (textObj.text || textObj.content || "") : "";
                isStructured = true;
              }
            }
          }

          if (!isStructured) {
            if (typeof data.response === "string") {
              responseText = data.response;
            } else if (typeof data.response === "object") {
              if (data.response.content) {
                responseText = typeof data.response.content === "string" 
                  ? data.response.content 
                  : JSON.stringify(data.response.content);
              } else if (data.response.thinking) {
                responseText = typeof data.response.thinking === "string"
                  ? data.response.thinking
                  : JSON.stringify(data.response.thinking);
              } else {
                responseText = JSON.stringify(data.response, null, 2);
              }
            } else {
              responseText = String(data.response);
            }

            // 2. Stringified JSON array fallback
            try {
              const trimmed = responseText.trim();
              if (trimmed.startsWith("[")) {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  if (parsed.every(item => typeof item === "string")) {
                    if (parsed.length >= 2) {
                      thinkingText = parsed[0];
                      textContent = parsed[1];
                      isStructured = true;
                    } else {
                      textContent = parsed[0];
                      isStructured = true;
                    }
                  } else {
                    const thinkingObj = parsed.find(item => item.type === "thinking");
                    const textObj = parsed.find(item => item.type === "text");
                    if (thinkingObj || textObj) {
                      thinkingText = thinkingObj ? (thinkingObj.thinking || thinkingObj.text || "") : "";
                      textContent = textObj ? (textObj.text || textObj.content || "") : "";
                      isStructured = true;
                    }
                  }
                }
              }
            } catch (e) {
              // Not a JSON array, fallback to raw response text
            }
          }
        } else {
          responseText = "No response content received.";
        }

        const assistantMsg = {
          id: Date.now() + 1,
          sender: "assistant",
          text: isStructured ? textContent : responseText,
          thinking: isStructured ? thinkingText : "",
          isStructured: isStructured,
          feedback: null,
          userQuery: userText
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (error) {
        console.error("Error communicating with AI/main.py:", error);
        
        // Friendly developer alert/fallback
        const fallbackMsg = {
          id: Date.now() + 1,
          sender: "assistant",
          isError: true,
          fallbackText: getAssistantResponse(userText),
          feedback: null,
          userQuery: userText
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSendMessage = () => {
    sendMessage(inputValue);
  };

  const router = useRouter();
  const { q } = router.query;
  const initialSendTriggeredRef = useRef(false);

  useEffect(() => {
    if (router.isReady && q && !initialSendTriggeredRef.current) {
      initialSendTriggeredRef.current = true;
      sendMessage(q);
    }
  }, [router.isReady, q]);

  const handleCopyText = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  const handleFeedback = async (msgId, type) => {
    // Find the message to toggle feedback locally
    let targetFeedback = null;
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId) {
          targetFeedback = msg.feedback === type ? null : type;
          return { ...msg, feedback: targetFeedback };
        }
        return msg;
      })
    );

    // Asynchronously update the LangGraph state thread history with human feedback
    if (targetFeedback) {
      try {
        const aiApiUrl = (process.env.NEXT_PUBLIC_AI_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        await fetch(`${aiApiUrl}/feedback?session_id=${sessionIdRef.current}&type=${targetFeedback}`);
      } catch (err) {
        console.error("Failed to post human feedback to backend:", err);
      }
    }
  };

  const handleRegenerate = (userQuery) => {
    if (userQuery) {
      sendMessage(userQuery);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Reusable markdown formatter helper
  const renderFormattedText = (text) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ");
      let cleanLine = line;
      if (isBullet) {
        cleanLine = line.trim().substring(2);
      }
      
      const parts = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;
      
      while ((match = boldRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-bold text-gray-950 dark:text-neutral-50">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }
      
      if (isBullet) {
        return (
          <li key={idx} className="list-disc ml-5 pl-1 mb-1 text-gray-900 dark:text-neutral-200">
            {parts}
          </li>
        );
      }
      
      return (
        <p key={idx} className="mb-2 min-h-[1.2rem]">
          {parts}
        </p>
      );
    });
  };

  // Reusable search / input bar component
  const renderInputBar = () => {
    return (
      <motion.div
        layoutId="chatGPTInputBar"
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="w-full bg-neutral-100 dark:bg-[#2f2f2f] rounded-full px-4 py-2 flex items-center justify-between shadow-sm border border-transparent dark:border-zinc-800 transition-colors pl-6"
      >
        {/* Input Element */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask anything"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 text-gray-800 dark:text-neutral-100 text-base outline-none placeholder:text-gray-400 dark:placeholder:text-neutral-400 border-0 focus:ring-0 p-0 bg-transparent"
        />

        {/* Right-side utility and submit button */}
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors"
            title="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>
          
          {/* White circle audio action button (ChatGPT wave representation) */}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              inputValue.trim()
                ? "bg-white dark:bg-white text-black dark:text-black shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-white dark:bg-white text-black dark:text-black opacity-90 cursor-default"
            }`}
            title="Send message"
          >
            {inputValue.trim() ? (
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            ) : (
              // Perfect Soundwave representation inside circle
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none">
                <line x1="4" y1="12" x2="4" y2="12" />
                <line x1="8" y1="9" x2="8" y2="15" />
                <line x1="12" y1="6" x2="12" y2="18" />
                <line x1="16" y1="9" x2="16" y2="15" />
                <line x1="20" y1="12" x2="20" y2="12" />
              </svg>
            )}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen h-screen flex flex-col bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-neutral-100 transition-colors duration-300">
      
      {/* Premium Glassmorphic Navbar */}
      <nav className="w-full h-16 border-b border-neutral-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-[#0d0d0d]/70 backdrop-blur-md flex items-center justify-between px-6 z-50 sticky top-0">
        {/* Left Side: Brand Logo and Title */}
        <button 
          onClick={() => router.push("/")} 
          className="flex items-center gap-2.5 group cursor-pointer hover:opacity-90 transition-opacity"
        >
          {/* Custom Weather and Galaxy logo */}
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center p-1.5 transition-transform group-hover:scale-105">
            <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-white dark:text-black">
              <path
                d="M 72 142 A 25 25 0 0 1 78 98 A 33 33 0 0 1 138 102 A 25 25 0 0 1 144 142"
                stroke="currentColor"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M 108 108 C 108 108 126 138 126 150 C 126 160 118 168 108 168 C 98 168 90 160 90 150 C 90 138 108 108 108 108 Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-neutral-400 font-poppins">
            rainiX AI
          </span>
        </button>

        {/* Right Side: Settings Toggle */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-zinc-800/80 rounded-full transition-all cursor-pointer"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </nav>
      
      {/* Scrollable Chat Area / Welcome Screen */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 flex flex-col items-center">
        {messages.length === 0 ? (
          // Welcome Screen when no messages exist (With centered layout)
          <div className="w-full max-w-3xl flex-1 flex flex-col items-center justify-center my-auto">
            {/* Logo */}
            <div className="mb-8 w-32 h-32 relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 200 200"
                width="100%"
                height="100%"
                className="w-full h-full"
              >
                <g clipPath="url(#cs_clip_1_ellipse-12)">
                  <mask
                    id="cs_mask_1_ellipse-12"
                    style={{ maskType: "alpha" }}
                    width="200"
                    height="200"
                    x="0"
                    y="0"
                    maskUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 72 142 A 25 25 0 0 1 78 98 A 33 33 0 0 1 138 102 A 25 25 0 0 1 144 142"
                      stroke="#fff"
                      strokeWidth="15"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <path
                      d="M 108 108 C 108 108 126 138 126 150 C 126 160 118 168 108 168 C 98 168 90 160 90 150 C 90 138 108 108 108 108 Z"
                      fill="#fff"
                    />
                    <path
                      d="M 128 40 Q 128 48 136 48 Q 128 48 128 56 Q 128 48 120 48 Q 128 48 128 40 Z"
                      fill="#fff"
                    />
                    <path
                      d="M 145 49 Q 145 65 161 65 Q 145 65 145 81 Q 145 65 129 65 Q 145 65 145 49 Z"
                      fill="#fff"
                    />
                    <path
                      d="M 158 75 Q 158 82 165 82 Q 158 82 158 89 Q 158 82 151 82 Q 158 82 158 75 Z"
                      fill="#fff"
                    />
                  </mask>
                  <g mask="url(#cs_mask_1_ellipse-12)">
                    {/* Light mode: Blue animated gradient */}
                    <g className="dark:hidden">
                      <path fill="#fff" d="M200 0H0v200h200V0z"></path>
                      <path
                        fill="#0066FF"
                        fillOpacity="0.33"
                        d="M200 0H0v200h200V0z"
                      ></path>
                      <g
                        filter="url(#filter0_f_844_2811)"
                        className="animate-gradient"
                      >
                        <path fill="#0066FF" d="M110 32H18v68h92V32z"></path>
                        <path fill="#0044FF" d="M188-24H15v98h173v-98z"></path>
                        <path fill="#0099FF" d="M175 70H5v156h170V70z"></path>
                        <path fill="#00CCFF" d="M230 51H100v103h130V51z"></path>
                      </g>
                    </g>
                    {/* Dark mode: Solid white logo */}
                    <rect width="200" height="200" fill="#ffffff" className="hidden dark:block" />
                  </g>
                </g>
                <defs>
                  <filter
                    id="filter0_f_844_2811"
                    width="385"
                    height="410"
                    x="-75"
                    y="-104"
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                    <feBlend
                      in="SourceGraphic"
                      in2="BackgroundImageFix"
                      result="shape"
                    ></feBlend>
                    <feGaussianBlur
                      result="effect1_foregroundBlur_844_2811"
                      stdDeviation="40"
                    ></feGaussianBlur>
                  </filter>
                  <clipPath id="cs_clip_1_ellipse-12">
                    <path fill="#fff" d="M0 0H200V200H0z"></path>
                  </clipPath>
                </defs>
                <g
                  style={{ mixBlendMode: "overlay" }}
                  mask="url(#cs_mask_1_ellipse-12)"
                >
                  <path
                    fill="gray"
                    stroke="transparent"
                    d="M200 0H0v200h200V0z"
                    filter="url(#cs_noise_1_ellipse-12)"
                  ></path>
                </g>
                <defs>
                  <filter
                    id="cs_noise_1_ellipse-12"
                    width="100%"
                    height="100%"
                    x="0%"
                    y="0%"
                    filterUnits="objectBoundingBox"
                  >
                    <feTurbulence
                      baseFrequency="0.6"
                      numOctaves="5"
                      result="out1"
                      seed="4"
                    ></feTurbulence>
                    <feComposite
                      in="out1"
                      in2="SourceGraphic"
                      operator="in"
                      result="out2"
                    ></feComposite>
                    <feBlend
                      in="SourceGraphic"
                      in2="out2"
                      mode="overlay"
                      result="out3"
                    ></feBlend>
                  </filter>
                </defs>
              </svg>
            </div>

            {/* Welcome message */}
            <div className="text-center mb-8 w-full max-w-2xl px-4">
              <h1 className="text-3xl font-bold mb-2">
                Welcome to rainiX AI
              </h1>
              <p className="text-gray-500 dark:text-neutral-400 max-w-md mx-auto mb-8">
                Your intelligent weather companion. Ask about current conditions, rain forecasts, or climate trends.
              </p>
              
              {/* Centered Input Bar in main landing UI */}
              <div className="w-full">
                {renderInputBar()}
              </div>
            </div>
          </div>
        ) : (
          // Conversation View
          <div className="w-full max-w-3xl flex flex-col gap-8 pb-32">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`w-full flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "user" ? (
                    // User message bubble (ChatGPT Style)
                    <div className="bg-neutral-100 dark:bg-zinc-800 text-gray-900 dark:text-neutral-100 rounded-full px-5 py-2.5 max-w-[75%] text-base shadow-sm">
                      {msg.text}
                    </div>
                  ) : msg.isError ? (
                    // Beautiful Error / Fallback developer console card
                    <div className="w-full max-w-2xl flex flex-col gap-4 p-4 rounded-xl border border-amber-200 dark:border-amber-950/40 bg-amber-50/50 dark:bg-amber-950/10 text-gray-800 dark:text-neutral-200 shadow-sm">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-semibold">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Unable to connect to rainiX AI backend</span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Please make sure your Python FastAPI server is running. Activate your virtual environment and start the server:
                      </p>
                      <div className="bg-neutral-100 dark:bg-zinc-900/80 p-3.5 rounded-lg text-xs font-mono text-gray-800 dark:text-neutral-300 select-all leading-normal border border-neutral-200 dark:border-zinc-800">
                        <span className="text-gray-400"># Navigate to AI folder and activate venv</span>{"\n"}
                        cd AI{"\n"}
                        .\venv\Scripts\Activate.ps1{"\n"}
                        {"\n"}
                        <span className="text-gray-400"># Start your FastAPI server</span>{"\n"}
                        uvicorn main:app --reload
                      </div>
                      <div className="border-t border-amber-200 dark:border-zinc-800/60 pt-3 mt-1">
                        <span className="text-xs text-amber-600 dark:text-amber-500 uppercase tracking-wider font-bold block mb-1">Fallback Response</span>
                        <div className="text-base text-gray-900 dark:text-neutral-100 leading-relaxed">{renderFormattedText(msg.fallbackText)}</div>
                      </div>
                    </div>
                  ) : (
                    // Assistant response (Plain text with action row)
                    <div className="w-full flex flex-col items-start gap-3">
                      {msg.isStructured && msg.thinking && (
                        <AIThinkingToggle content={msg.thinking} />
                      )}
                      <div className="text-gray-900 dark:text-neutral-100 text-base max-w-2xl leading-relaxed">
                        {renderFormattedText(msg.text)}
                      </div>
                      
                      {/* Action Row */}
                      <div className="flex items-center gap-3.5 mt-2 text-gray-400 dark:text-neutral-500">
                        <button 
                          onClick={() => handleCopyText(msg.text)} 
                          className="p-1 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors cursor-pointer" 
                          title="Copy text"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleFeedback(msg.id, 'good')} 
                          className={`p-1 transition-colors cursor-pointer ${
                            msg.feedback === 'good' 
                              ? 'text-emerald-500 dark:text-emerald-400' 
                              : 'hover:text-gray-600 dark:hover:text-neutral-300'
                          }`} 
                          title="Good response"
                        >
                          <ThumbsUp className="w-4 h-4" style={{ fill: msg.feedback === 'good' ? 'currentColor' : 'none' }} />
                        </button>
                        <button 
                          onClick={() => handleFeedback(msg.id, 'bad')} 
                          className={`p-1 transition-colors cursor-pointer ${
                            msg.feedback === 'bad' 
                              ? 'text-rose-500 dark:text-rose-400' 
                              : 'hover:text-gray-600 dark:hover:text-neutral-300'
                          }`} 
                          title="Bad response"
                        >
                          <ThumbsDown className="w-4 h-4" style={{ fill: msg.feedback === 'bad' ? 'currentColor' : 'none' }} />
                        </button>
                        <button 
                          onClick={() => handleRegenerate(msg.userQuery)} 
                          className="p-1 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors cursor-pointer" 
                          title="Regenerate"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex justify-start"
                >
                  <LiveThinkingToggle />
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input container at the bottom (only shown when chat is active) */}
      {messages.length > 0 && (
        <div className="w-full flex justify-center py-4 bg-gradient-to-t from-white dark:from-[#0d0d0d] via-white dark:via-[#0d0d0d] to-transparent sticky bottom-0">
          <div className="w-full max-w-3xl px-4 flex flex-col gap-2">
            {renderInputBar()}
          </div>
        </div>
      )}
      
      {/* Settings Modal (Overlay) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="bg-white dark:bg-[#161616] border border-neutral-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl z-50 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900 dark:text-neutral-100">
                  <Settings className="w-5 h-5 text-gray-500" />
                  Settings
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 transition-colors p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Theme Settings Selector */}
              <div className="flex flex-col gap-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 dark:text-neutral-500">
                  Appearance Theme
                </span>
                <div className="grid grid-cols-3 gap-2 bg-neutral-100 dark:bg-zinc-900/60 p-1.5 rounded-2xl border border-neutral-200/50 dark:border-zinc-800/40">
                  {["light", "dark", "system"].map((t) => (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className={`py-2 px-3 rounded-xl text-sm font-semibold capitalize transition-all cursor-pointer ${
                        theme === t
                          ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function AIThinkingToggle({ content }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full flex flex-col items-start mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors bg-neutral-100 dark:bg-zinc-800/80 hover:bg-neutral-200 dark:hover:bg-zinc-700 px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer"
      >
        <BrainCircuit className="w-3.5 h-3.5" />
        <span>{isExpanded ? "Hide thought process" : "View thought process"}</span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden w-full mt-2"
          >
            <AIThinkingBlock content={content} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveThinkingToggle() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-start mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors bg-neutral-100 dark:bg-zinc-800/80 hover:bg-neutral-200 dark:hover:bg-zinc-700 px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer"
      >
        <Loader size={"xs"} className="text-neutral-500 dark:text-neutral-300" />
        <span>Thinking...</span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
          {timer}s
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden w-full mt-2"
          >
            <AIThinkingBlock content="Querying LangGraph agent, connecting to live weather API metrics, and processing regional river alert structures..." isLive={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
