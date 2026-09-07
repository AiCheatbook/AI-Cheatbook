"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Users, BookOpen, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type ArtworkTile = {
  id: string;
  title: string;
  imageUrl: string;
};

type Mode = "login" | "signup" | "magic-link";

const FEATURES = [
  { Icon: Sparkles, label: "Prompts" },
  { Icon: Users, label: "Community" },
  { Icon: BookOpen, label: "Learn" },
  { Icon: BarChart3, label: "Get Inspired" },
];

// Rotation + pill label for each of up to 5 collage cards.
const CARD_LAYOUT = [
  { rotate: "-rotate-6", label: "Create", position: "top-0 left-4" },
  { rotate: "rotate-3", label: "Explore", position: "top-6 right-0" },
  { rotate: "rotate-0", label: null, position: "top-24 left-1/2 -translate-x-1/2" },
  { rotate: "-rotate-3", label: "Learn", position: "bottom-0 left-0" },
  { rotate: "rotate-6", label: "Share", position: "bottom-6 right-4" },
];

function FirstVisitIntroContent({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter();

  const [artwork, setArtwork] = useState<ArtworkTile[]>([]);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("community_artwork")
        .select("id, title, media_assets ( storage_path, media_type )")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(5);

      const tiles: ArtworkTile[] = (data || [])
        .map((row) => {
          const asset = Array.isArray(row.media_assets)
            ? row.media_assets[0]
            : row.media_assets;

          if (!asset || asset.media_type === "youtube" || !asset.storage_path) {
            return null;
          }

          return { id: row.id, title: row.title, imageUrl: asset.storage_path };
        })
        .filter((t): t is ArtworkTile => t !== null);

      setArtwork(tiles);
    }

    load();
  }, []);

  function dismiss() {
    sessionStorage.setItem("introSeen", "1");
    onDismiss();
  }

  async function handleGoogleLogin() {
    setError("");

    await supabaseAuthClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleEmailPassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      const { error: err } = await supabaseAuthClient.auth.signUp({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (err) {
        setError(err.message);
        return;
      }

      setMessage("Check your email to confirm your account, then log in.");
      setMode("login");
      return;
    }

    const { error: err } = await supabaseAuthClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (err) {
      setError("Wrong email or password. Please try again.");
      return;
    }

    dismiss();
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    const { error: err } = await supabaseAuthClient.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    setMessage("Check your email for a login link.");
  }

  const inputClass =
    "w-full rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-brand";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="grid min-h-full grid-cols-1 lg:grid-cols-2">
        {/* LEFT — marketing */}
        <div className="relative flex flex-col justify-center overflow-hidden px-8 py-16 sm:px-16">
          <Link href="/" onClick={dismiss} className="text-2xl font-bold">
            <span className="text-brand">AI</span>{" "}
            <span className="text-zinc-900">Cheatbook</span>
          </Link>

          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Create · Learn · Share · Together
          </p>

          <h1 className="mt-4 text-5xl font-bold leading-[1.05] text-zinc-900 sm:text-6xl">
            Community for
            <br />
            <span className="text-brand">AI Content</span>
            <br />
            Creators
          </h1>

          <p className="mt-6 max-w-md text-zinc-600">
            Discover prompts, workflows, inspiration and a global
            community to create better with AI.
          </p>

          <div className="mt-10 flex flex-wrap gap-8">
            {FEATURES.map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <Icon className="h-6 w-6 text-zinc-700" strokeWidth={1.5} />
                <span className="text-xs font-medium text-zinc-600">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Card collage */}
          <div className="relative mx-auto mt-14 hidden h-72 w-full max-w-md lg:block">
            {artwork.map((tile, i) => {
              const layout = CARD_LAYOUT[i % CARD_LAYOUT.length];
              return (
                <div
                  key={tile.id}
                  className={`absolute h-40 w-32 overflow-hidden rounded-2xl border-4 border-white shadow-lg ${layout.rotate} ${layout.position}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tile.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {layout.label && (
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-900 shadow">
                      {layout.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10">
            <div className="h-1 w-10 rounded-full bg-brand" />
            <p className="mt-2 text-sm text-zinc-500">
              A more creative tomorrow.
            </p>
          </div>
        </div>

        {/* RIGHT — real login */}
        <div className="flex flex-col justify-center border-t border-zinc-100 bg-white px-8 py-16 sm:px-16 lg:border-l lg:border-t-0">
          <button
            type="button"
            onClick={dismiss}
            className="mb-8 self-end text-sm text-zinc-500 hover:text-zinc-900"
          >
            Explore without login →
          </button>

          <div className="mx-auto w-full max-w-sm">
            <h2 className="text-2xl font-bold text-zinc-900">
              {mode === "signup"
                ? "Join AI Cheatbook"
                : "Log in to AI Cheatbook"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Join a global community of AI content creators.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
              </svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-100" />
              <span className="text-xs text-zinc-500">or</span>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <form onSubmit={handleEmailPassword} className="space-y-4">
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />

              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />

              <div className="flex items-center justify-end text-sm">
                <button
                  type="button"
                  onClick={handleMagicLink}
                  className="text-brand-text hover:underline"
                >
                  Use magic link instead
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {loading
                  ? "Please wait..."
                  : mode === "signup"
                    ? "Sign Up"
                    : "Log In"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-600">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-semibold text-brand-text hover:underline"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-semibold text-brand-text hover:underline"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>

            <p className="mt-8 text-center text-xs text-zinc-500">
              By continuing, you agree to AI Cheatbook&apos;s Terms
              of Use and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FirstVisitIntro({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  return <FirstVisitIntroContent onDismiss={onDismiss} />;
}
