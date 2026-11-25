// useEffect runs side effects (like timers) after render — useState tracks local component state
import { useEffect, useState } from "react";

// Link is React Router's component for client-side navigation — no full page reload
import { Link } from "react-router-dom";

// ─── TYPEWRITER DATA ─────────────────────────────────────────────────────────

// The full string that will be "typed out" character by character in the heading
const TYPEWRITER_TEXT = "Code Your Vision.";

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function HeroSection() {

  // 'displayed' holds the portion of the text revealed so far (starts as empty string)
  // As the effect runs, characters are appended one by one until the full string is shown
  const [displayed, setDisplayed] = useState("");

  // 'index' tracks which character we're currently at in TYPEWRITER_TEXT (starts at 0)
  // Each time a character is added, index increments by 1
  const [index, setIndex] = useState(0);

  // ── Typewriter Effect ───────────────────────────────────────────────────

  useEffect(() => {
    // Only run if we haven't reached the end of the string yet
    if (index < TYPEWRITER_TEXT.length) {

      // Schedule the next character to be added after 80ms — creates the typing speed
      const timeout = setTimeout(() => {
        setDisplayed((prev) => prev + TYPEWRITER_TEXT[index]);
        // Append the character at the current index to whatever text is already displayed

        setIndex((prev) => prev + 1);
        // Move to the next character — this triggers the effect to run again via the dependency array
      }, 80);

      // Cleanup: if the component unmounts mid-animation, cancel the pending timeout
      // Prevents trying to update state on an unmounted component
      return () => clearTimeout(timeout);
    }
  }, [index]);
  // Dependency array: this effect re-runs every time 'index' changes
  // Since index increments inside the effect, it creates a self-driving loop until the string is complete

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    // Full-screen section — centered vertically and horizontally, content stacked in a column
    <section className="relative z-10 flex flex-col items-center justify-center h-screen gap-6 px-4 text-center">

      {/* Main heading — large responsive font, 'ignis-glow-text' applies a custom glow effect */}
      {/* 'min-h-[1.2em]' reserves height so the layout doesn't jump before text appears */}
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight min-h-[1.2em] ignis-glow-text font-serif">

        {/* Shows the characters revealed so far by the typewriter effect */}
        {displayed}

        {/* Blinking cursor — a thin vertical bar that blinks via a CSS keyframe animation */}
        <span
          className="inline-block w-[3px] h-[0.85em] bg-primary ml-1 align-middle"
          // w-[3px]: very thin bar to mimic a text cursor
          // h-[0.85em]: slightly shorter than the full line height so it looks natural
          // align-middle: vertically centers it alongside the text
          style={{ animation: "blink 1s step-end infinite" }}
          // 'blink' is a CSS keyframe animation defined elsewhere (likely in global CSS)
          // 'step-end' makes it snap on/off instantly rather than fading — like a real cursor
          // 'infinite' keeps it blinking forever
        />
      </h1>

      {/* Subtitle — small, monospace, wide letter-spacing, muted color */}
      <p className="text-sm font-mono text-muted-foreground tracking-widest uppercase mt-2">
        The editor built for developers who think differently.
      </p>

      {/* CTA buttons row — two buttons side by side with a gap between them */}
      <div className="flex gap-4 mt-4">

        {/* Primary CTA — navigates to the editor page using React Router's Link */}
        <Link
          to="/editor"
          className="px-6 py-3 bg-primary text-primary-foreground text-xs font-mono tracking-widest uppercase rounded-sm hover:bg-ignis-teal-glow transition-all duration-200"
        >
          Start Session
        </Link>

        {/* Secondary CTA — a regular anchor tag that scrolls down to the #about section */}
        {/* href="#about" works because the AboutSection has id="about" on its <section> tag */}
        <a
          href="#about"
          className="px-6 py-3 border border-border text-foreground text-xs font-mono tracking-widest uppercase rounded-sm hover:border-primary hover:text-primary transition-all duration-200"
        >
          View Demo
        </a>

      </div>
    </section>
  );
}