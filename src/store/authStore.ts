import { create } from "zustand";
import { z } from "zod";
import { api } from "@/lib/api";

// Defines what a logged-in User looks like in the app
type User = {
  email: string;       // Every user must have an email (required)
  username?: string;   // Username is optional (the '?' means it may or may not exist)
};

// Describes the shape of validation errors tied to specific form fields
type FieldErrors = {
  username?: string; // Error message for the username field, if any
  email?: string;    // Error message for the email field, if any
  password?: string; // Error message for the password field, if any
};

// Describes the result returned after a login or signup attempt
type AuthResult = {
  success: boolean;          // true if the operation worked, false if it failed
  error?: string;            // A general error message (not tied to a specific field)
  fieldErrors?: FieldErrors; // Field-specific error messages (e.g., "Email already taken")
};

// Defines the full shape of the authentication state and its actions (functions)
type AuthState = {
  user: User | null;  // The currently logged-in user, or null if no one is logged in
  isAuthenticated: boolean;   // A simple true/false flag: is someone logged in?
  login: (email: string, password: string) => Promise<AuthResult>;// Function to log in with email + password, returns an AuthResult
  signup: (email: string, password: string, username: string) => Promise<AuthResult>; // Function to register a new user, returns an AuthResult
  logout: () => void;  // Function to log out — returns nothing
  loadSession: () => void;  // Function to restore a saved session from localStorage on app startup
};

//  LOCALSTORAGE KEYS

const SESSION_KEY = "ignis-session"; // The key name used to store the currently active user's session in localStorage
const TOKEN_KEY = "ignis-token";

// SIGNUP VALIDATION SCHEMA 

// Defines the validation rules for the signup form using Zod
export const signupSchema = z.object({
  username: z
    .string() // Must be a string
    .min(3, "Username must be at least 3 characters")  // Minimum 3 characters long
    .max(20, "Username must be at most 20 characters") // Maximum 20 characters long
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, "Must start with a letter. Only letters, numbers, _ and - allowed") // Must start with a letter; only allows letters, digits, underscores, and hyphens
    .refine((val) => !/^\d+$/.test(val), "Username cannot be only numbers"), // Extra custom check: rejects usernames that are entirely numeric
  email: z
    .string()          // Must be a string
    .trim()            // Removes leading/trailing whitespace before validating
    .min(1, "Email is required") // Cannot be empty
    .email("Please enter a valid email address"), // Must match a valid email format (e.g., user@example.com)
  password: z
    .string() // Must be a string
    .min(8, "Password must be at least 8 characters")                     // At least 8 characters
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")         // Must have at least one uppercase letter
    .regex(/[a-z]/, "Must contain at least one lowercase letter")         // Must have at least one lowercase letter
    .regex(/[0-9]/, "Must contain at least one number")                   // Must contain at least one digit
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"), // Must include a special char like !, @, #, etc.
});

//  LOGIN VALIDATION SCHEMA 

// Defines the (simpler) validation rules for the login form
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"), // Email must be non-empty and correctly formatted
  password: z.string().min(1, "Password is required"), // Password just needs to be non-empty (no strength rules at login)
});

// PASSWORD STRENGTH CHECKER 

// Takes a password string and returns a numeric score (1–3) and a label ("Weak", "Medium", "Strong")
export const getPasswordStrength = (password: string): { score: number; label: string } => {
  let score = 0;                                    // Start with 0 points
  if (password.length >= 8) score++;               // +1 if password is at least 8 characters
  if (password.length >= 12) score++;              // +1 more if password is at least 12 characters
  if (/[A-Z]/.test(password)) score++;             // +1 if there's at least one uppercase letter
  if (/[a-z]/.test(password)) score++;             // +1 if there's at least one lowercase letter
  if (/[0-9]/.test(password)) score++;             // +1 if there's at least one number
  if (/[^A-Za-z0-9]/.test(password)) score++;      // +1 if there's at least one special character

  if (score <= 2) return { score: 1, label: "Weak" };   // 0–2 points = Weak password
  if (score <= 4) return { score: 2, label: "Medium" }; // 3–4 points = Medium password
  return { score: 3, label: "Strong" };                  // 5–6 points = Strong password
};

//  ZUSTAND AUTH STORE 

// Creates and exports the global authentication state store using Zustand
export const useAuthStore = create<AuthState>((set) => ({ // 'set' is Zustand's function to update the store's state
  user: null,              // Initial state: no user is logged in
  isAuthenticated: false,  // Initial state: not authenticated

  //  loadSession
  // Called once when the app loads to restore a previously saved login session
  loadSession: () => {
    const session = localStorage.getItem(SESSION_KEY); // Check if a session was previously saved in localStorage
    const token = localStorage.getItem(TOKEN_KEY);
    if (session && token) { // If a session string exists...
      set({ user: JSON.parse(session), isAuthenticated: true }); // ...parse it and set the user as authenticated in the store
    } else {
      set({ user: null, isAuthenticated: false });
    }
  },

  // signup
  // Registers a new user with the given email, password, and username
  signup: async (email, password, username) => {
    const result = signupSchema.safeParse({ email, password, username }); // Validate the inputs against the signup schema (won't throw — returns a result object)
    if (!result.success) { // If validation failed...
      const fieldErrors: FieldErrors = {}; // Create an empty object to collect field-level errors
      result.error.errors.forEach((e) => { // Loop through each validation error Zod found
        const field = e.path[0] as keyof FieldErrors; // Get the field name (e.g., "email") that caused the error
        if (!fieldErrors[field]) fieldErrors[field] = e.message; // Only store the first error per field (don't overwrite)
      });
      return { success: false, fieldErrors };
    }
    try {
      const data = await api.signup({ name: username, email, password });
      const sessionUser: User = {
        email: data?.user?.email || email,
        username: data?.user?.name || username,
      };
      if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      set({ user: sessionUser, isAuthenticated: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || "Signup failed" };
    }
  },

  // login 
  // Authenticates an existing user with the given email and password
  login: async (email, password) => {
    const result = loginSchema.safeParse({ email, password }); // Validate the inputs against the login schema
    if (!result.success) { // If validation failed...
      const fieldErrors: FieldErrors = {}; // Create an empty object to collect field-level errors
      result.error.errors.forEach((e) => { // Loop through each validation error Zod found
        const field = e.path[0] as keyof FieldErrors; // Get the field name that caused the error
        if (!fieldErrors[field]) fieldErrors[field] = e.message; // Only store the first error per field
      });
      return { success: false, fieldErrors };
    }
    try {
      const data = await api.login({ email, password });
      const sessionUser: User = {
        email: data?.user?.email || email,
        username: data?.user?.name,
      };
      if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      set({ user: sessionUser, isAuthenticated: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || "Invalid email or password" };
    }
  },

 
  // Logs the current user out by clearing the session
  logout: () => {
    localStorage.removeItem(SESSION_KEY); // Delete the session from localStorage so it doesn't persist after refresh
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, isAuthenticated: false }); // Reset the Zustand store: no user, not authenticated
  },
}));