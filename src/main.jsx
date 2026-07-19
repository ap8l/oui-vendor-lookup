import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const socials = [
  ["X", "https://x.com/ap8l_dev", "/xlogo.svg"],
  ["Bluesky", "https://bsky.app/profile/ap8l.bsky.social", "/bluesky.svg"],
  ["Threads", "https://www.threads.com/@ap8l", "/threads.svg"],
];

function Main() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const value = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus("Enter a valid email.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("http://localhost:3000/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Subscription failed.");
      }

      setEmail("");
      setStatus(result.message || "Thanks for subscribing.");
    } catch (error) {
      setStatus(error.message || "Subscription failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="main">
      <div className="main-content">
        <App />
      </div>

      <footer className="main-footer">
        <div className="main-links">
          <div className="main-open-source-link">
            <span>
              This project is{" "}
              <a
                className="main-open-source"
                href="https://github.com/ap8l"
                target="_blank"
                rel="noreferrer"
              >
                open source
              </a>
            </span>

            <a
              href="https://github.com/ap8l"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <img src="/github.svg" alt="" />
            </a>
          </div>

          <div className="main-social-links">
            {socials.map(([name, url, icon]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label={name}
              >
                <img src={icon} alt="" />
              </a>
            ))}
          </div>
        </div>

        <form className="main-email" onSubmit={handleSubmit}>
          <span>Get new tech projects and course discounts.</span>

          <div className="main-email-row">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setStatus("");
              }}
              placeholder="Email address"
              autoComplete="email"
              disabled={loading}
            />

            <button disabled={loading}>
              {loading ? "..." : "Subscribe"}
            </button>
          </div>

          {status && <small className="main-email-status">{status}</small>}
        </form>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
