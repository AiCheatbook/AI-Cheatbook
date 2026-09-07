"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");
    setLoading(true);

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

    router.push("/admin/news");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <h1 className="mb-6 text-xl font-semibold text-zinc-900">
          Admin Login
        </h1>

        <label className="mb-1 block text-sm text-zinc-600">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="mb-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-brand"
        />

        <label className="mb-1 block text-sm text-zinc-600">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          className="mb-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-brand"
        />

        {error && (
          <p className="mb-4 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-white py-2 font-medium text-black disabled:opacity-50"
        >
          {loading
            ? "Logging in..."
            : "Log In"}
        </button>
      </form>
    </main>
  );
}
