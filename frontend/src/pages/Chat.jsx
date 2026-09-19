import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ModelSelector from "../components/ModelSelector.jsx";
import { useSelectedModel } from "../useSelectedModel.js";
import { getChatHistory, askReport } from "../api.js";

export default function Chat() {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const { models, selected, selectModel } = useSelectedModel();

  useEffect(() => {
    getChatHistory(id).then((res) => {
      setMessages(res.data.map((m) => ({ role: m.role, text: m.message, sources: m.sources, model: m.model_used })));
    });
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const q = question.trim();
    if (!q || sending) return;
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setSending(true);
    try {
      const res = await askReport(id, q, selected);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.data.answer, sources: res.data.sources, model: res.data.model_used },
      ]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, something went wrong answering that.", sources: [] }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[72vh]">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h1 className="text-lg font-semibold tracking-tight">Chat With Report</h1>
        <div className="flex items-center gap-2">
          <ModelSelector models={models} selected={selected} onChange={selectModel} />
          <Link to={`/reports/${id}`} className="text-sm text-brand-400 hover:text-brand-300">
            ← Back to dashboard
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto panel p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">Ask a question about this report — answers are grounded in the extracted text with page references.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "bg-brand-600 text-white rounded-br-md"
                  : "bg-white/10 text-slate-200 rounded-bl-md"
              }`}
            >
              <p>{m.text}</p>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-1 text-xs opacity-75">
                  Sources: {m.sources.map((s) => `p.${s.page_number}`).join(", ")}
                </div>
              )}
              {m.role === "assistant" && m.model && (
                <div className="mt-1 text-xs opacity-60">{m.model}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about this report…"
          className="input-dark flex-1"
        />
        <button onClick={send} disabled={sending} className="btn-primary">
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
