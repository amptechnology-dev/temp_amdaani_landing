"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Headphones,
  GraduationCap,
  PhoneCall,
  MonitorPlay,
  BadgeIndianRupee,
  BriefcaseBusiness,
  HelpCircle,
  User,
  Phone,
} from "lucide-react";
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
import { Input } from "../src/components/ui/input";

const CHATBOT_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/chatbot/chat`;
const CHATBOT_HISTORY_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/chatbot/history`;

const SESSION_STORAGE_KEY = "chat_session";
const USER_INFO_STORAGE_KEY = "chat_user_info";

const INITIAL_MESSAGES = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi, I’m Amdaani Assistant. Ask me anything about pricing, features, billing flow, or getting started.",
  },
];

const CHAT_CATEGORIES = [
  {
    id: "technical-support",
    label: "Technical Support",
    icon: Headphones,
    query: "I need Technical Support regarding the Amdaani app.",
  },
  {
    id: "training-required",
    label: "Training Required",
    icon: GraduationCap,
    query: "I need training on how to use Amdaani.",
  },
  {
    id: "request-callback",
    label: "Request Call Back",
    icon: PhoneCall,
    query: "Please request a call back from your team for me.",
  },
  {
    id: "request-demo",
    label: "Request Demo",
    icon: MonitorPlay,
    query: "I would like to request a live demo of Amdaani.",
  },
  {
    id: "sales-query",
    label: "Sales Query",
    icon: BriefcaseBusiness,
    query: "I have a sales related query about Amdaani.",
  },
  {
    id: "pricing",
    label: "Pricing",
    icon: BadgeIndianRupee,
    query: "Can you share the pricing details of Amdaani?",
  },
  {
    id: "other",
    label: "Other",
    icon: HelpCircle,
    query: "I have a different query that is not listed above.",
  },
];

const createMessage = (role, content, idSeed) => ({
  id:
    idSeed ?? `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  role,
  content,
});

const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
};

const normalizeHistoryMessages = (rawHistory) => {
  if (!Array.isArray(rawHistory)) return [];

  return rawHistory
    .map((item, index) => {
      const rawRole = item?.role || item?.sender || item?.from || "";
      const role = String(rawRole).toLowerCase().includes("user")
        ? "user"
        : "assistant";

      const content =
        item?.content ?? item?.message ?? item?.text ?? item?.reply ?? "";

      if (!String(content).trim()) return null;

      return createMessage(role, content, item?._id || `history-${index}`);
    })
    .filter(Boolean);
};

const isValidName = (value) => String(value || "").trim().length >= 2;
const isValidPhone = (value) => {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  return digitsOnly.length >= 10;
};

const readStoredUserInfo = () => {
  try {
    const stored = localStorage.getItem(USER_INFO_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed?.name && parsed?.phoneNumber) return parsed;
    return null;
  } catch {
    return null;
  }
};

export default function ChatBotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const hasDoneInitialScrollRef = useRef(false);

  const [userInfo, setUserInfo] = useState(null); // { name, phoneNumber } | null
  const [showUserInfoForm, setShowUserInfoForm] = useState(false);
  const [infoFormData, setInfoFormData] = useState({ name: "", phone: "" });
  const [infoFormError, setInfoFormError] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);

  const canSend = useMemo(
    () => Boolean(input.trim()) && !loading,
    [input, loading],
  );

  useEffect(() => {
    const storedUserInfo = readStoredUserInfo();
    let storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedSessionId) {
      storedSessionId = generateSessionId();
      localStorage.setItem(SESSION_STORAGE_KEY, storedSessionId);
    }

    setSessionId(storedSessionId);
    setUserInfo(storedUserInfo);
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (open && bootstrapped && !userInfo) {
      setShowUserInfoForm(true);
    }
  }, [open, bootstrapped, userInfo]);

  useEffect(() => {
    if (!sessionId) return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      hasDoneInitialScrollRef.current = false;

      try {
        const response = await fetch(
          `${CHATBOT_HISTORY_ENDPOINT}/${sessionId}`,
          { method: "GET" },
        );
        const result = await response.json();

        if (!response.ok || !result?.success) {
          return;
        }

        const rawHistory =
          result?.data?.messages || result?.data?.history || result?.data;

        const normalized = normalizeHistoryMessages(rawHistory);

        if (normalized.length > 0) {
          setMessages([...INITIAL_MESSAGES, ...normalized]);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [sessionId]);

  // Scroll behaviour: history load shesh howar por, DOM paint hoye jaowar
  // por (requestAnimationFrame diye) ekbar "instant" jump kore shesh
  // message e niye jay — jate user ke prothome e purono conversation-er
  // shesh e thake, upor theke manually scroll korte na hoy. Notun message
  // asle (send/receive) smooth scroll hoy.
  useEffect(() => {
    if (historyLoading) return;

    const scrollToBottom = (behavior) => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    };

    if (!hasDoneInitialScrollRef.current) {
      // Double rAF — ekbar DOM commit, tarpor layout finalize howa
      // porjonto wait kora hoy, jate lomba history-teo thik jaygay jump hoy.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("auto");
          hasDoneInitialScrollRef.current = true;
        });
      });
      return;
    }

    scrollToBottom("smooth");
  }, [messages, open, historyLoading]);

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
    if (!message || loading || !sessionId || !userInfo) return;

    appendMessage("user", message);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(CHATBOT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message,
          name: userInfo.name,
          phoneNumber: userInfo.phoneNumber,
        }),
      });

      const result = await response.json();

      if (result?.data?.sessionId) {
        localStorage.setItem(SESSION_STORAGE_KEY, result.data.sessionId);
        setSessionId(result.data.sessionId);
      }

      const reply = result?.data?.reply;

      if (!response.ok || !result?.success || !reply) {
        throw new Error(result?.message || "Bot response failed");
      }

      appendMessage("assistant", reply);
    } catch (error) {
      appendMessage(
        "assistant",
        error?.message ||
          "Sorry, I could not respond just now. Please try again.",
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

  const handleInfoFieldChange = (field) => (event) => {
    setInfoFormError("");
    setInfoFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleInfoFormSubmit = (event) => {
    event.preventDefault();
    setInfoFormError("");

    const trimmedName = infoFormData.name.trim();
    const trimmedPhone = infoFormData.phone.trim();

    if (!isValidName(trimmedName)) {
      setInfoFormError("Please enter your name.");
      return;
    }

    if (!isValidPhone(trimmedPhone)) {
      setInfoFormError("Please enter a valid phone number.");
      return;
    }

    const savedInfo = { name: trimmedName, phoneNumber: trimmedPhone };

    localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(savedInfo));
    setUserInfo(savedInfo);
    setShowUserInfoForm(false);
  };

  const handleCategorySelect = (category) => {
    sendMessage(category.query);
  };

  const handleNewChat = () => {
    const newId = generateSessionId();

    localStorage.setItem(SESSION_STORAGE_KEY, newId);
    hasDoneInitialScrollRef.current = false;
    setSessionId(newId);
    setMessages(INITIAL_MESSAGES);
    setInput("");

    if (!userInfo) {
      setShowUserInfoForm(true);
    }
  };

  const handleDeleteChat = () => {
    const newId = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, newId);

    hasDoneInitialScrollRef.current = false;
    setSessionId(newId);
    setMessages(INITIAL_MESSAGES);
    setInput("");

    if (!userInfo) {
      setShowUserInfoForm(true);
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNewChat}
                    title="Start a new chat"
                    aria-label="Start a new chat"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors duration-200 hover:bg-white/20"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteChat}
                    title="Delete this chat"
                    aria-label="Delete this chat"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors duration-200 hover:bg-red-500/70"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                <Sparkles className="h-3.5 w-3.5" />
                Online
              </div>
            </DialogHeader>
          </div>

          <div className="relative flex h-[min(65vh,560px)] flex-col bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.98))]">
            {showUserInfoForm && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 px-5 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 ring-1 ring-sky-400/30">
                      <Bot className="h-5 w-5 text-sky-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Before we start chatting
                      </h3>
                      <p className="text-xs text-slate-400">
                        Please share your name and phone number.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleInfoFormSubmit} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Your Name
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          value={infoFormData.name}
                          onChange={handleInfoFieldChange("name")}
                          placeholder="Enter your name"
                          className="rounded-xl border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-sky-400/70"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          type="tel"
                          value={infoFormData.phone}
                          onChange={handleInfoFieldChange("phone")}
                          placeholder="Enter your phone number"
                          className="rounded-xl border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-sky-400/70"
                        />
                      </div>
                    </div>

                    {infoFormError && (
                      <p className="text-xs font-medium text-red-400">
                        {infoFormError}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      Start Chatting
                    </Button>

                    <p className="text-center text-[11px] text-slate-500">
                      We use this only to assist you better and follow up if
                      needed.
                    </p>
                  </form>
                </div>
              </div>
            )}

            <div
              ref={messagesContainerRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
            >
              {historyLoading && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
                    Loading conversation...
                  </div>
                </div>
              )}

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
                {CHAT_CATEGORIES.map((category) => {
                  const Icon = category.icon;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => sendMessage(category.query)}
                      disabled={loading}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition-all duration-200 hover:border-sky-400/50 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon className="h-3.5 w-3.5 text-sky-300" />
                      {category.label}
                    </button>
                  );
                })}
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