// useState lets us track local component state (e.g., whether a dropdown is open or closed)
// useEffect lets us run side effects (e.g., attaching event listeners when the component mounts)
// useRef lets us get a direct reference to a DOM element (e.g., to detect clicks outside of it)
import { useState, useEffect, useRef } from "react";

// Link is React Router's component for client-side navigation — faster than a regular <a> tag
import { Link } from "react-router-dom";

// ─── NAV DATA ────────────────────────────────────────────────────────────────

// Static array that defines each navbar item — each has a label (the button text) and a dropdown list of sub-items
const NAV_ITEMS = [
  { label: "About",   items: ["Our Story", "Team", "Careers"] },
  { label: "Docs",    items: ["Getting Started", "API Reference", "Changelog"] },
  { label: "Blog",    items: ["Updates", "Tutorials", "News"] },
  { label: "Contact", items: ["Support", "Sales", "Community"] },
];

// ─── DROPDOWN ITEM COMPONENT ─────────────────────────────────────────────────

// A reusable component that renders a single nav button with its dropdown menu
// It receives 'label' (button text) and 'items' (dropdown options) as props
function DropdownItem({ label, items }: { label: string; items: string[] }) {

  // 'open' tracks whether this dropdown is currently visible — starts as false (closed)
  const [open, setOpen] = useState(false);

  // 'ref' is attached to the dropdown's outer div so we can detect if a click happened outside of it
  const ref = useRef<HTMLDivElement>(null);

  // ── Click Outside Detection ─────────────────────────────────────────────

  useEffect(() => {
    // This function runs every time the user clicks anywhere on the page
    const handler = (e: MouseEvent) => {
      // ref.current is the actual DOM element this ref is attached to
      // .contains(e.target) checks if the clicked element is inside our dropdown
      // If the click was OUTSIDE the dropdown, close it
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); // Close the dropdown
      }
    };

    // Attach the handler to the document so every mousedown anywhere triggers it
    document.addEventListener("mousedown", handler);

    // Cleanup function — removes the event listener when the component unmounts
    // This prevents memory leaks from listeners piling up
    return () => document.removeEventListener("mousedown", handler);
  }, []); // Empty dependency array — this effect only runs once when the component first mounts

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    // Attach ref to this wrapper div so we can detect outside clicks relative to it
    // 'relative' positioning makes the dropdown menu position itself relative to this div
    <div ref={ref} className="relative">

      {/* The nav button that toggles the dropdown open/closed when clicked */}
      <button
        onClick={() => setOpen((p) => !p)}
        // '(p) => !p' is a functional update — 'p' is the previous state value, we flip it (true→false or false→true)
        className="flex items-center gap-1 text-sm text-ignis-text-secondary hover:text-foreground transition-colors duration-150"
      >
        {label} {/* The button's visible text, e.g. "About", "Docs" */}

        {/* Chevron arrow icon — rotates 180° when dropdown is open using conditional class */}
        <svg
          className={`w-3 h-3 mt-[1px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          // 'rotate-180' flips the arrow to point up when open, down when closed
          fill="none" stroke="currentColor" strokeWidth="2"
          viewBox="0 0 24 24"
        >
          {/* SVG path that draws a downward-pointing chevron ">" shape */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Only render the dropdown menu if 'open' is true — conditional rendering with && */}
      {open && (
        <div
          className="absolute top-full mt-2 left-0 min-w-[160px] rounded-md overflow-hidden z-50 border border-border"
          // 'absolute' positions it relative to the parent div
          // 'top-full' places it directly below the button
          // 'mt-2' adds a small gap between the button and the dropdown
          // 'z-50' ensures it floats above other page content
          style={{
            background: "hsl(160 25% 4% / 0.92)", // Very dark, slightly transparent background
            backdropFilter: "blur(16px)",           // Blurs whatever is behind the dropdown (frosted glass effect)
            boxShadow: "var(--shadow-card)",        // Uses a CSS variable for consistent shadow styling
          }}
        >
          {/* Render each dropdown item as a clickable link */}
          {items.map((item) => (
            <a
              key={item} // Unique key for React's list rendering — item name is unique within each dropdown
              href="#"   // Placeholder href — in a real app this would link somewhere
              className="block px-4 py-2.5 text-sm text-ignis-text-secondary hover:text-foreground hover:bg-ignis-surface-hover transition-colors duration-150"
            >
              {/* 'block' makes the <a> fill the full width so the whole row is clickable */}
              {item} {/* The dropdown option text, e.g. "Our Story", "API Reference" */}
            </a>
          ))}
        </div>
      )}

    </div>
  );
}

// ─── MAIN NAVBAR COMPONENT ───────────────────────────────────────────────────

export default function LandingNavbar() {
  return (
    // 'fixed' keeps the navbar stuck to the top of the screen even when scrolling
    // 'z-50' ensures it always appears above all other page content
    // 'ignis-glass' is a custom class that applies the frosted glass background style
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-3 ignis-glass">

      {/* Logo on the left — clicking navigates to the home page */}
      <Link to="/" className="text-base font-bold tracking-wide text-foreground">
        IG<span className="text-primary">NI</span>S
        {/* "NI" is wrapped in a span to give it the primary brand color */}
      </Link>

      {/* Right side — nav dropdown items + login button */}
      <div className="flex items-center gap-8">

        {/* Loop through NAV_ITEMS and render a DropdownItem component for each one */}
        {NAV_ITEMS.map((item) => (
          <DropdownItem
            key={item.label}   // Unique key for React's list rendering
            label={item.label} // Pass the button label as a prop (e.g., "About")
            items={item.items} // Pass the dropdown options as a prop (e.g., ["Our Story", "Team", "Careers"])
          />
        ))}

        {/* Login button — navigates to the login page, styled with the primary brand color */}
        <Link
          to="/login"
          className="text-sm px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-ignis-teal-glow transition-all duration-200 ml-2"
        >
          Login
        </Link>

      </div>
    </nav>
  );
}