"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const urlMessage = searchParams.get("message");
  const urlError = searchParams.get("error");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#111827",
          border: "1px solid #334155",
          borderRadius: "20px",
          padding: "32px",
        }}
      >
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>
          Login
        </h1>

        <p style={{ color: "#cbd5e1", marginBottom: "24px" }}>
          Sign in to access your AgentFlow dashboard.
        </p>

        {(error || urlError) && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#3f1d1d",
              border: "1px solid #7f1d1d",
              color: "#fecaca",
            }}
          >
            {error || urlError}
          </div>
        )}

        {urlMessage && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#132b1d",
              border: "1px solid #166534",
              color: "#bbf7d0",
            }}
          >
            {urlMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #475569",
                background: "#0b1220",
                color: "#ffffff",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #475569",
                background: "#0b1220",
                color: "#ffffff",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              background: "#ffffff",
              color: "#0f172a",
              border: "none",
              borderRadius: "12px",
              padding: "14px 24px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ marginTop: "20px", color: "#cbd5e1" }}>
          No account yet?{" "}
          <Link href="/signup" style={{ color: "#ffffff" }}>
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
