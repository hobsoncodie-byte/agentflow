"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatInterfaceProps = {
  sessionId: string;
  agentName: string;
  initialMessages: Message[];
};

export default function ChatInterface({
  sessionId,
  agentName,
  initialMessages,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        accumulated += chunk;
        setStreamingContent(accumulated);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: accumulated,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col rounded-3xl border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border bg-muted/50 text-base">
          🤖
        </div>
        <div>
          <div className="text-sm font-semibold">{agentName}</div>
          <div className="text-xs text-muted-foreground">AI assistant</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="space-y-2">
              <div className="text-3xl">👋</div>
              <p className="text-sm font-medium">Start a conversation</p>
              <p className="text-xs text-muted-foreground">
                {agentName} is ready to chat.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                    msg.role === "user"
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "border bg-muted/40 text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl border bg-muted/40 px-4 py-3 text-sm leading-7 text-foreground">
                  {streamingContent ? (
                    <div className="whitespace-pre-wrap">{streamingContent}</div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={`Message ${agentName}...`}
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-2xl border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-black"
          >
            Send
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}
