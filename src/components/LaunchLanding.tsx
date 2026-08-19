import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import logoUrl from "@/assets/restostack-logo.png";
import heroPhoto from "@/assets/section-main.jpg";
import { DemoRequestDialog } from "@/components/DemoRequestDialog";

const GREEN = "#39D400";

/**
 * Ready-for-launch homepage variation.
 * First viewport: full-bleed atmosphere + brand + one headline + one line + CTAs.
 */
export function LaunchLanding() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="launch-landing min-h-screen text-white"
      style={{
        fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
        background: "#0a0a0a",
      }}
    >
      <style>{`
        @keyframes launch-rise {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes launch-ken {
          from { transform: scale(1.06); }
          to { transform: scale(1); }
        }
        @keyframes launch-glow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.55; }
        }
        .launch-landing .rise { animation: launch-rise 0.95s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .launch-landing .ken { animation: launch-ken 8s ease-out both; }
        .launch-landing .glow { animation: launch-glow 6s ease-in-out infinite; }
      `}</style>

      {/* Full-bleed hero plane */}
      <section className="relative min-h-screen overflow-hidden">
        <img
          src={heroPhoto}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ken ${ready ? "" : "opacity-0"}`}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(8,8,8,0.92) 0%, rgba(8,8,8,0.72) 42%, rgba(8,8,8,0.35) 100%)",
          }}
        />
        <div
          className={`pointer-events-none absolute -left-20 top-10 h-[50vh] w-[50vw] rounded-full blur-[100px] glow ${ready ? "" : "opacity-0"}`}
          style={{ background: `radial-gradient(circle, ${GREEN}40 0%, transparent 70%)` }}
          aria-hidden
        />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center">
            <img
              src={logoUrl}
              alt="RestoStack"
              className="h-11 w-auto object-contain brightness-0 invert sm:h-12"
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm text-white/75">
            <Link to="/login" className="hover:text-white transition-colors">
              Sign in
            </Link>
            <DemoRequestDialog
              trigger={
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                  style={{ background: GREEN }}
                >
                  Request access
                </button>
              }
            />
          </nav>
        </header>

        <div
          className={`relative z-10 mx-auto flex max-w-6xl flex-col justify-end px-6 pb-20 pt-24 sm:min-h-[calc(100vh-5.5rem)] sm:justify-center sm:pb-24 sm:pt-10 ${ready ? "rise" : "opacity-0"}`}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: GREEN }}
          >
            Now launching · Invite only
          </p>
          <h1
            className="mt-5 max-w-3xl text-[clamp(3rem,8vw,5.75rem)] font-semibold leading-[0.92] tracking-tight text-white"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
          >
            RestoStack
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70 sm:text-xl">
            The OS for restaurants — reservations, guests, floor, and team in one place.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <DemoRequestDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                  style={{ background: GREEN }}
                >
                  Request a demo <ArrowRight className="size-4" />
                </button>
              }
            />
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/45"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Invite-only launch
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60">
              We’re onboarding restaurants by hand. Request a demo and we’ll provision your workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/50">
            <Link to="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <a href="mailto:sales@restostacks.com" className="hover:text-white">
              sales@restostacks.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
