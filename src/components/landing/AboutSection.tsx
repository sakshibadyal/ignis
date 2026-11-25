// Import motion from framer-motion — wrapping any HTML element with <motion.div> lets you animate it (fade, slide, etc.)
import { motion } from "framer-motion";

// Import icons from lucide-react — each one is used as the visual icon for a feature card
import { Code2, Users, Zap, Shield } from "lucide-react";

// ─── FEATURES DATA ───────────────────────────────────────────────────────────

// An array of objects where each object represents one feature card to display on the page
const features = [
  {
    icon: Code2, // The icon is a React component itself — it will be rendered as <feature.icon /> later
    title: "Monaco-Powered Editor",
    description: "Full VS Code editing experience in the browser with syntax highlighting, IntelliSense, and multi-language support.",
  },
  {
    icon: Users,
    title: "Real-Time Collaboration",
    description: "Code together with your team in real-time. Share sessions instantly and see changes as they happen.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Zero-config setup. Open a session and start coding in seconds — no installs, no waiting.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description: "Your code stays private with end-to-end encryption and isolated execution environments.",
  },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function AboutSection() {
  return (
    // The section wrapper — 'id="about"' allows anchor links like href="#about" to scroll here
    // z-10 keeps it above any background elements, py-32 adds large vertical spacing
    <section id="about" className="relative z-10 py-32 px-6">

      {/* Centers the content and limits max width to keep it readable on wide screens */}
      <div className="max-w-6xl mx-auto">

        {/* ── Section Header ─────────────────────────────────────────────── */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}   // Starts invisible and 30px below its final position
          whileInView={{ opacity: 1, y: 0 }} // Animates to fully visible and back to normal position when scrolled into view
          transition={{ duration: 0.7 }}     // The animation takes 0.7 seconds to complete
          viewport={{ once: true }}          // Only plays the animation once — won't replay if you scroll back up
          className="text-center mb-20"      // Centers all text and adds bottom margin before the feature grid
        >
          {/* Small label above the heading — "Why IGNIS" in wide-spaced monospace caps */}
          <p className="text-xs font-mono tracking-[0.3em] uppercase text-primary mb-4">
            Why IGNIS
          </p>

          {/* Main section heading — large, bold, serif font, responsive size (4xl on mobile, 5xl on medium+) */}
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-serif text-foreground">
            An IDE That Gets Out<br />of Your Way.
            {/* <br /> forces a line break so the heading splits into two lines */}
          </h2>

          {/* Supporting paragraph below the heading — muted color, relaxed line height for readability */}
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            IGNIS strips away complexity so you can focus on what matters — writing beautiful code.
            Designed for speed, built for collaboration.
          </p>
        </motion.div>

        {/* ── Feature Cards Grid ─────────────────────────────────────────── */}

        {/* 2-column grid on medium screens and above, single column on mobile */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Loop through the features array and render a card for each one */}
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}              // Unique key for React's list rendering — uses the feature title since it's unique
              initial={{ opacity: 0, y: 30 }}  // Each card starts invisible and slightly below
              whileInView={{ opacity: 1, y: 0 }}// Animates in when scrolled into view
              transition={{ duration: 0.5, delay: i * 0.1 }}
              // Cards animate in one after another — each card is delayed by 0.1s × its index (i)
              // So card 0 = no delay, card 1 = 0.1s delay, card 2 = 0.2s, card 3 = 0.3s
              viewport={{ once: true }}        // Animation only plays once per card
              className="group p-8 rounded-lg bg-card border border-border hover:border-primary/30 transition-all duration-300"
              // 'group' class allows child elements to react to the parent's hover state using 'group-hover:'
              style={{ boxShadow: "var(--shadow-card)" }} // Applies a CSS custom property for a consistent card shadow
            >

              {/* Icon container — square box with rounded corners and a subtle primary-colored background */}
              {/* On hover, the background gets slightly more opaque thanks to 'group-hover:bg-primary/20' */}
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                {/* Dynamically renders whichever icon is stored in feature.icon (e.g., Code2, Users, etc.) */}
                <feature.icon className="w-6 h-6 text-primary" />
              </div>

              {/* Feature title — larger, semi-bold, uses the display font */}
              <h3 className="text-xl font-semibold text-foreground mb-3 font-display">
                {feature.title}
              </h3>

              {/* Feature description — muted color, relaxed line height for easy reading */}
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

            </motion.div>
          ))}

        </div>
      </div>
    </section>
  );
}