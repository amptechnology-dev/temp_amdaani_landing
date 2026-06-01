"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "../src/components/ui/dialog";
import { Textarea } from "../src/components/ui/textarea";
import { Button } from "../src/components/ui/button";

const CHATBOT_ENDPOINT =
  process.env.NEXT_PUBLIC_CHATBOT_API_URL ||
  "http://localhost:8001/api/chatbot/chat";

const INITIAL_MESSAGES = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi, I’m Amdaani Assistant. Ask me anything about pricing, features, billing flow, or getting started.",
  },
];

const QUICK_PROMPTS = [
  "Pricing kora jabe ??",
  "How do I start using Amdaani?",
  "Do you support invoice printing?",
];

const createMessage = (role, content) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  role,
  content,
});

export default function ChatBotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const canSend = useMemo(() => Boolean(input.trim()) && !loading, [input, loading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;

    if (!messages.length) {
      setMessages(INITIAL_MESSAGES);
    }
  }, [open, messages.length]);

  const appendMessage = (role, content) => {
    setMessages((current) => [...current, createMessage(role, content)]);
  };

  const sendMessage = async (value) => {
    const message = String(value || "").trim();
    if (!message || loading) return;

    appendMessage("user", message);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(CHATBOT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const result = await response.json();
      const reply = result?.data?.reply;

      if (!response.ok || !result?.success || !reply) {
        throw new Error(result?.message || "Bot response failed");
      }

      appendMessage("assistant", reply);
    } catch (error) {
      appendMessage(
        "assistant",
        error?.message || "Sorry, I could not respond just now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open Amdaani chatbot"
          className="fixed bottom-8 right-8 z-50 group flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-[0_20px_50px_rgba(37,99,235,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(37,99,235,0.45)] focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-transparent"
        >
          <Bot className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-400" />
          </span>
        </button>
      </DialogTrigger>

      <DialogContent
        style={{ transform: "none" }}
        className="fixed bottom-6 right-6 left-6 top-auto z-50 mx-auto w-[min(100vw-1.5rem,420px)] border-0 p-0 shadow-[0_30px_90px_rgba(15,23,42,0.35)] !left-auto !right-6 !top-auto !bottom-6 !max-w-[420px] !translate-x-0 !translate-y-0 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px] sm:max-w-[420px] sm:rounded-[1.75rem]"
      >
        <div className="overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-950 text-white backdrop-blur-2xl">
          <div className="bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 px-5 py-4">
            <DialogHeader className="space-y-3 text-left sm:text-left">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-white">
                      Amdaani Assistant
                    </DialogTitle>
                    <DialogDescription className="text-xs text-white/80">
                      Ask about pricing, onboarding, invoices, or app features.
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  Online
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex h-[min(65vh,560px)] flex-col bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.98))]">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg ${
                        isUser
                          ? "rounded-br-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                          : "rounded-bl-md border border-white/10 bg-white/8 text-slate-100"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-200 shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/10 bg-slate-950/80 px-4 py-4 sm:px-5">
              <div className="mb-3 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={loading}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition-all duration-200 hover:border-sky-400/50 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here..."
                  rows={3}
                  className="min-h-[88px] resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400/70"
                />

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    Press Enter to send, Shift + Enter for a new line.
                  </p>
                  <Button
                    type="submit"
                    disabled={!canSend}
                    className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}