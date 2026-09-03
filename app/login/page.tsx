"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Mode = "login" | "signup" | "magic-link";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo =
    searchParams.get("redirect") || "/";

  const [mode, setMode] =
    useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] =
    useState("");

  async function handleGoogleLogin() {
    setError("");

    await supabaseAuthClient.auth.signInWithOAuth(
      {
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
            redirectTo
          )}`,
        },
      }
    );
  }

  async function handleEmailPassword(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      const { error } =
        await supabaseAuthClient.auth.signUp(
          {
            email: email.trim(),
            password,
          }
        );

      setLoading(false);

      if (error) {
        setError(error.message);
        return;
      }

      setMessage(
        "Check your email to confirm your account, then log in."
      );

      setMode("login");
      return;
    }

    const { error } =
      await supabaseAuthClient.auth.signInWithPassword(
        {
          email: email.trim(),
          password,
        }
      );

    setLoading(false);

    if (error) {
      setError(
        "Wrong email or password. Please try again."
      );
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleMagicLink(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error } =
      await supabaseAuthClient.auth.signInWithOtp(
        {
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
              redirectTo
            )}`,
          },
        }
      );

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "Check your email for a login link."
    );
  }

  const inputClass =
    "w-full rounded-full border border-zinc-200 bg-white px-5 py-3 text-zinc-900 placeholder:text-zinc-600 outline-none focus:border-brand";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-bold text-zinc-900"
          >
            AI Cheatbook
          </Link>

          <p className="mt-2 text-sm text-zinc-600">
            {mode === "signup"
              ? "Create your account"
              : mode === "magic-link"
                ? "Log in with a magic link"
                : "Log in to your account"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-green-900/50 bg-green-950/20 px-4 py-3 text-sm text-green-400">
            {message}
          </div>
        )}

        {mode === "magic-link" ? (
          <form
            onSubmit={handleMagicLink}
            className="space-y-4"
          >
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className={inputClass}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand py-3 font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
            >
              {loading
                ? "Sending..."
                : "Send Magic Link"}
            </button>

            <button
              type="button"
              onClick={() =>
                setMode("login")
              }
              className="w-full text-center text-sm text-zinc-600 hover:text-zinc-900"
            >
              ← Back to password login
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleEmailPassword}
            className="space-y-4"
          >
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className={inputClass}
            />

            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className={inputClass}
            />

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() =>
                  setMode("magic-link")
                }
                className="text-brand-text hover:text-brand-text"
              >
                Use magic link instead
              </button>

              <button
                type="button"
                onClick={() =>
                  setMode(
                    mode === "signup"
                      ? "login"
                      : "signup"
                  )
                }
                className="text-brand-text hover:text-brand-text"
              >
                {mode === "signup"
                  ? "Log in"
                  : "Sign up"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand py-3 font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "signup"
                  ? "Sign Up"
                  : "Log In"}
            </button>
          </form>
        )}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-100" />
          <span className="text-xs text-zinc-600">
            or
          </span>
          <div className="h-px flex-1 bg-zinc-100" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
          >
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-8 text-center text-xs text-zinc-600">
          By continuing, you agree to AI
          Cheatbook&apos;s Terms of Use and
          Privacy Policy.
        </p>
      </div>
    </main>
  );
}
