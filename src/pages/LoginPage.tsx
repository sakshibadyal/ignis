// useState manages local component state, useCallback memoizes functions to avoid re-creating them on every render
import { useState, useCallback } from "react";

// Link is for client-side navigation without page reload, useNavigate lets us redirect programmatically
import { Link, useNavigate } from "react-router-dom";

// Animated star background component rendered behind the login form
import StarsBackground from "@/components/StarsBackground";

// Importing from our auth store: login/signup functions, validation schemas, and password strength utility
import { useAuthStore, signupSchema, loginSchema, getPasswordStrength } from "@/store/authStore";

// ─── TYPES ───────────────────────────────────────────────────────────────────

// Describes which fields can show inline validation errors below the inputs
type FieldErrors = {
  username?: string; // Error message for the username field, if any
  email?: string;    // Error message for the email field, if any
  password?: string; // Error message for the password field, if any
};

// ─── PASSWORD STRENGTH BAR ────────────────────────────────────────────────────

// A small sub-component that receives the current password and renders a 3-segment strength bar
const PasswordStrengthBar = ({ password }: { password: string }) => {

  // If the password field is empty, render nothing — no bar shown until the user starts typing
  if (!password) return null;

  // Get the numeric score (1–3) and the label ("Weak", "Medium", "Strong") from our utility function
  const { score, label } = getPasswordStrength(password);

  // Pick a Tailwind color class based on the score:
  // score 1 = red (destructive), score 2 = yellow, score 3 = primary brand color (teal)
  const colorClass =
    score === 1 ? "bg-destructive" : score === 2 ? "bg-[hsl(45,90%,50%)]" : "bg-primary";

  return (
    // Wrapper with a small top margin and vertical spacing between the bar and the label
    <div className="mt-2 space-y-1">

      {/* Three horizontal bar segments — one per strength level */}
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i} // Unique key for React's list rendering
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colorClass : "bg-muted"
              // If this segment's number is within the score, fill it with the color
              // Otherwise keep it muted/grey (not yet reached)
            }`}
          />
        ))}
      </div>

      {/* Text label below the bar — matches the same color as the filled segments */}
      <p className={`text-xs font-mono ${
        score === 1 ? "text-destructive" : score === 2 ? "text-[hsl(45,90%,50%)]" : "text-primary"
      }`}>
        {label} {/* Displays "Weak", "Medium", or "Strong" */}
      </p>

    </div>
  );
};

// ─── LOGIN PAGE COMPONENT ─────────────────────────────────────────────────────

const LoginPage = () => {

  // Tracks whether the form is in "Sign Up" mode (true) or "Sign In" mode (false)
  const [isSignUp, setIsSignUp] = useState(false);

  // Controlled input state — each piece of state is bound to its respective input field
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // Only used in sign up mode

  // General error message shown at the top of the form (e.g., "Invalid email or password")
  const [error, setError] = useState("");

  // Field-specific errors shown directly below each input (e.g., "Password too short")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Used to redirect to /editor after a successful login or signup
  const navigate = useNavigate();

  // Pull login and signup functions from the global auth store
  const { login, signup } = useAuthStore();

  // ── Real-time Field Validation ──────────────────────────────────────────

  // useCallback memoizes this function — it only gets re-created if one of its dependencies changes
  // This prevents unnecessary re-renders of child components that receive this as a prop
  const validateField = useCallback(
    (field: string, value: string) => {

      if (isSignUp) {
        // Build a data object with all current field values, overriding the field being validated with the new value
        // [field]: value is computed property syntax — the key is dynamic (e.g., "email", "password")
        const data = { username, email, password, [field]: value };

        // Run validation against the signup schema — safeParse won't throw, it returns a result object
        const result = signupSchema.safeParse(data);

        if (!result.success) {
          // Find the first error that belongs to the specific field being validated
          const err = result.error.errors.find((e) => e.path[0] === field);

          // Update only this field's error, leaving other fields' errors untouched using spread
          setFieldErrors((prev) => ({ ...prev, [field]: err?.message }));
        } else {
          // Validation passed — clear this field's error message
          setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        }

      } else {
        // Same logic as above but uses the simpler loginSchema (no username field)
        const data = { email, password, [field]: value };
        const result = loginSchema.safeParse(data);

        if (!result.success) {
          const err = result.error.errors.find((e) => e.path[0] === field);
          setFieldErrors((prev) => ({ ...prev, [field]: err?.message }));
        } else {
          setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        }
      }
    },
    [isSignUp, username, email, password]
    // Dependencies: if any of these change, useCallback recreates the function with fresh values
  );

  // ── Form Submission ─────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the browser's default form submission (which would reload the page)

    // Clear any previous errors before attempting a new submission
    setError("");
    setFieldErrors({});

    // Call either signup or login depending on current mode — both return an AuthResult object
    const result = isSignUp
      ? signup(email, password, username)
      : login(email, password);
    const resolved = await result;

    if (resolved.success) {
      navigate("/editor"); // Redirect to the editor on successful auth
    } else if (resolved.fieldErrors) {
      setFieldErrors(resolved.fieldErrors); // Show field-specific errors (e.g., "Email already exists")
    } else {
      setError(resolved.error || "Something went wrong"); // Show a general error message as fallback
    }
  };

  // ── Dynamic Input Class Helper ──────────────────────────────────────────

  // Returns a Tailwind class string for an input — adds red border/ring if there's an error for that field
  const inputClass = (field: keyof FieldErrors) =>
    `w-full px-4 py-2.5 rounded-md bg-secondary border text-foreground text-sm font-mono focus:outline-none focus:ring-1 transition-all ${
      fieldErrors[field]
        ? "border-destructive focus:ring-destructive" // Red border when field has an error
        : "border-border focus:ring-primary"          // Default border with primary-colored focus ring
    }`;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    // Full-screen container — centers the form vertically and horizontally
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center">

      {/* Animated stars rendered in the background behind everything */}
      <StarsBackground />

      {/* z-10 ensures the form sits above the star background */}
      <div className="relative z-10 w-full max-w-md px-6">

        {/* Clickable logo at the top — navigates back to the home page */}
        <Link to="/" className="block text-center mb-10">
          <span className="text-2xl font-bold tracking-wide">
            IG<span className="text-primary">NI</span>S
            {/* "NI" gets the primary brand color to match the rest of the app's logo styling */}
          </span>
        </Link>

        {/* The form card — frosted glass effect via backdropFilter blur */}
        <div
          className="rounded-xl border border-border p-8 bg-card/80"
          // bg-card/80 means 80% opacity of the card background color — lets stars show through slightly
          style={{ backdropFilter: "blur(20px)", boxShadow: "var(--shadow-card)" }}
        >

          {/* Heading — switches between "Create Account" and "Welcome Back" based on mode */}
          <h2 className="text-2xl font-bold text-center mb-2 font-display">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>

          {/* Subheading — also changes based on sign up vs sign in mode */}
          <p className="text-sm text-muted-foreground text-center mb-8">
            {isSignUp ? "Start coding with IGNIS today." : "Sign in to your IGNIS account."}
          </p>

          {/* General error banner — only renders if 'error' state is non-empty */}
          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {/* Form — calls handleSubmit on submission, space-y-4 adds vertical gaps between fields */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username field — only rendered when in sign up mode */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}                                      // Controlled input — value is always in sync with state
                  onChange={(e) => setUsername(e.target.value)}         // Updates state on every keystroke
                  onBlur={(e) => validateField("username", e.target.value)} // Validates when the user leaves the field
                  className={inputClass("username")}                    // Red border if there's a username error
                  placeholder="devmaster"
                  required
                />
                {/* Only renders the error message if there's a username error */}
                {fieldErrors.username && (
                  <p className="mt-1 text-xs text-destructive font-mono">{fieldErrors.username}</p>
                )}
              </div>
            )}

            {/* Email field — always shown in both sign in and sign up */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => validateField("email", e.target.value)} // Validates on blur (when user clicks away)
                className={inputClass("email")}
                placeholder="you@example.com"
                required
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-destructive font-mono">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password field — always shown, but strength bar only appears in sign up mode */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"          // 'password' type masks the input characters
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={(e) => validateField("password", e.target.value)}
                className={inputClass("password")}
                placeholder="••••••••"  // Visual placeholder showing masked dots
                required
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-destructive font-mono">{fieldErrors.password}</p>
              )}
              {/* Only show the strength bar during sign up — not needed for login */}
              {isSignUp && <PasswordStrengthBar password={password} />}
            </div>

            {/* Submit button — label changes based on current mode */}
            <button
              type="submit"
              className="w-full py-3 bg-primary text-primary-foreground font-mono text-sm tracking-widest uppercase rounded-md hover:bg-ignis-teal-glow transition-all duration-200 mt-2"
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </button>

          </form>

          {/* Toggle between sign in and sign up modes */}
          <p className="text-sm text-muted-foreground text-center mt-6">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            {/* {" "} adds a space between the text and the button */}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);  // Flip the mode
                setError("");            // Clear any general errors from the previous mode
                setFieldErrors({});      // Clear all field errors so they don't carry over
              }}
              className="text-primary hover:text-ignis-teal-glow transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
};

export default LoginPage; // Exported as default so it can be imported without curly braces