
import { useState } from "react";
import axios from "axios";
import "./helpChat.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

const suggestions = [
  "Show me product prices",
  "How can I check my order?",
  "I need payment help",
  "What about delivery?",
];

function HelpChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! 👋 Welcome to our store. I'm your AI help assistant. Ask me about products, orders, payments, or delivery.",
    },
  ]);

  const sendMessage = async (text = message) => {
    const question = text.trim();

    if (!question || loading) return;

    if (question.length > 1000) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: "Please keep your question under 1000 characters.",
        },
      ]);
      return;
    }

    const previousMessages = messages;
    const updatedMessages = [
      ...previousMessages,
      { role: "user", content: question },
    ];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/help-chat`, {
        message: question,
        history: previousMessages
          .filter((item) =>
            ["user", "assistant"].includes(item.role)
          )
          .slice(-8)
          .map(({ role, content }) => ({ role, content })),
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            response.data.reply ||
            "Sorry, I could not find an answer. Please try again.",
        },
      ]);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "I couldn't connect to customer support. Please try again.";

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="help-chat-widget">
      {isOpen && (
        <section
          className="help-chat-window"
          aria-label="Customer help chat"
        >
          <header className="help-chat-header">
            <div className="help-chat-avatar">💬</div>

            <div className="help-chat-heading">
              <strong>Customer Help</strong>
              <span>AI support assistant</span>
            </div>

            <button
              type="button"
              className="help-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div className="help-chat-messages" aria-live="polite">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`help-chat-message ${
                  item.role === "user" ? "user-message" : "bot-message"
                }`}
              >
                {item.content}
              </div>
            ))}

            {loading && (
              <div className="help-chat-message bot-message">
                Thinking...
              </div>
            )}
          </div>

          {messages.length === 1 && (
            <div className="help-chat-suggestions">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={loading}
                  onClick={() => sendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form
            className="help-chat-input-area"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your question..."
              aria-label="Type your question"
              maxLength={1000}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </form>

          <div className="help-chat-disclaimer">
            AI answers may need confirmation from store support.
          </div>
        </section>
      )}

      <button
        type="button"
        className="help-chat-launcher"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Close customer help" : "Open customer help"}
      >
        {isOpen ? "×" : "💬"}
        {!isOpen && <span>Help</span>}
      </button>
    </div>
  );
}

export default HelpChat;
