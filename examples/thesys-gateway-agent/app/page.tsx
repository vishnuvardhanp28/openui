"use client";

import { FormEvent, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const starters = [
  "Explain a complex topic simply",
  "Help me plan a software project",
  "Compare two technical approaches",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function sendMessage(event?: FormEvent, suggested?: string) {
    event?.preventDefault();
    const prompt = (suggested ?? input).trim();
    if (!prompt || busy) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: prompt }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setError("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "The request could not be completed.");
      }
      if (!response.body) throw new Error("The server returned an empty response.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...nextMessages, { role: "assistant", content: answer }]);
      }
      answer += decoder.decode();
      setMessages([...nextMessages, { role: "assistant", content: answer }]);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setMessages(nextMessages);
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setError("");
    setBusy(false);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="OpenUI Gateway Agent home">
          <span className="brand-mark">O</span>
          <span>OpenUI <span className="muted">Gateway Agent</span></span>
        </a>
        <button className="quiet-button" onClick={clearChat} disabled={messages.length === 0 && !busy}>
          New chat
        </button>
      </header>

      <section className="chat" aria-label="Chat with the AI assistant">
        {messages.length === 0 ? (
          <div className="welcome">
            <div className="eyebrow">THESYS · OPENUI GATEWAY</div>
            <h1>What can I help you build?</h1>
            <p>Ask a question, explore an idea, or work through a technical problem.</p>
            <div className="starter-grid">
              {starters.map((starter) => (
                <button key={starter} className="starter" onClick={() => void sendMessage(undefined, starter)}>
                  <span>{starter}</span><span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages" aria-live="polite">
            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <div className="avatar">{message.role === "user" ? "You" : "AI"}</div>
                <div className="message-body">
                  <div className="message-label">{message.role === "user" ? "You" : "Assistant"}</div>
                  <div className="message-content">
                    {message.content || (busy && index === messages.length - 1 ? <span className="typing">Thinking…</span> : null)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <form className="composer" onSubmit={(event) => void sendMessage(event)}>
        <label className="sr-only" htmlFor="prompt">Your message</label>
        <textarea
          id="prompt"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Message the assistant…"
          rows={1}
          disabled={busy}
        />
        <button className="send-button" type="submit" disabled={busy || !input.trim()} aria-label="Send message">
          {busy ? "…" : "↑"}
        </button>
        <p className="composer-note">AI can make mistakes. Verify important information.</p>
      </form>
    </main>
  );
}
