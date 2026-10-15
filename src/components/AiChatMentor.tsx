"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  HelpCircle, 
  MessageSquare,
  Globe,
  Briefcase,
  Award
} from "lucide-react";
import { AiFormattedText } from "./AiFormattedText";
import { AnimatePresence, motion } from "framer-motion";
import { AppNote } from "@/components/AppNote";

interface AiChatMentorProps {
  activeProfile: StudentProfile | null;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  /** Canned guidance served while no AI provider is reachable. */
  offline?: boolean;
  /** Request failed (rate limit, signed out…) — rendered as a notice. */
  error?: boolean;
}

export function AiChatMentor({ activeProfile }: AiChatMentorProps) {
  const t = useTranslations("ai");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: activeProfile?.name
        ? t("chatWelcomeNamed", { name: activeProfile.name })
        : t("chatWelcome"),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    t("chatPrompt1"),
    t("chatPrompt2"),
    t("chatPrompt3"),
    t("chatPrompt4"),
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          profileId: activeProfile?.id,
          chatHistory: messages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "ai",
            text: data.reply,
            offline: Boolean(data.offline),
          },
        ]);
      } else {
        // Previously a 401/429 left the chat silently stuck with no answer.
        const text =
          res.status === 429
            ? t("chatRateLimit", { seconds: data.retryAfter ?? 60 })
            : res.status === 401
            ? t("chatSignIn")
            : data.error || t("chatError");
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), sender: "ai", text, error: true },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: t("chatNetworkError"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[700px]">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
            <Bot className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h1 className="font-bold text-base flex items-center gap-2">
              ScholarBridgeAI Counselor
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-semibold">
                Online
              </span>
            </h1>
            <p className="text-xs text-slate-300">
              Personalized for {activeProfile?.name} • {activeProfile?.targetMajor}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.div
            key={m.id}
            layout="position"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={`flex gap-3 max-w-3xl ${m.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
          >
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-amber-300"
              }`}
            >
              {m.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            <div
              className={`min-w-0 p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                m.sender === "user"
                  ? "whitespace-pre-wrap bg-indigo-600 text-white rounded-tr-none shadow-xs"
                  : m.error
                  ? "bg-red-50 text-red-700 rounded-tl-none border border-red-200"
                  : "bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-xs"
              }`}
            >
              {m.offline && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {t("chatOfflineBadge")}
                </span>
              )}
              {m.sender === "ai" && !m.error ? <AiFormattedText text={m.text} /> : m.text}
            </div>
          </motion.div>
        ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 items-center text-xs text-slate-500"
            role="status"
            aria-live="polite"
          >
            <Bot className="h-5 w-5 text-indigo-600" />
            <span className="inline-flex gap-1" aria-label={t("chatTypingAria")}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-indigo-500"
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </span>
          </motion.div>
        )}
      </div>

      {/* Prompt Suggestions */}
      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white p-3">
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="min-h-11 max-w-full rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            💡 {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder={t("inputPlaceholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {t("send")}
        </button>
      </form>

      {/*
        AI disclosure — still before any reply is trusted, but as a quiet line
        under the composer instead of an amber strip above the conversation.
      */}
      <AppNote kind="ai" variant="inline" className="px-3 pb-2.5 text-center" />
    </div>
  );
}
