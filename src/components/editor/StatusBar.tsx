import { useState } from "react";

type StatusBarProps = {
  savingState: "idle" | "saving" | "saved";
  cursorPosition: { lineNumber: number; column: number };
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
};

const LANGUAGE_OPTIONS = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "c",
  "csharp",
  "go",
  "rust",
  "html",
  "css",
  "json",
  "markdown",
  "shell",
  "yaml",
  "xml",
];

export default function StatusBar({
  savingState,
  cursorPosition,
  currentLanguage,
  onLanguageChange,
}: StatusBarProps) {
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const savingLabel =
    savingState === "saving" ? "Saving..." : savingState === "saved" ? "Saved ✓" : "Ready";

  return (
    <div className="h-8 border-t border-border flex items-center justify-between px-4 bg-secondary text-xs font-mono text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>{savingLabel}</span>
        <span>
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </span>
      </div>
      <div className="relative">
        <button
          onClick={() => setLanguageMenuOpen((prev) => !prev)}
          className="hover:text-foreground cursor-pointer transition-colors capitalize"
        >
          {currentLanguage}
        </button>
        {languageMenuOpen && (
          <div className="absolute bottom-7 right-0 z-40 min-w-40 max-h-56 overflow-auto rounded border border-border bg-card shadow-lg">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onLanguageChange(option);
                  setLanguageMenuOpen(false);
                }}
                className="w-full text-left px-2 py-1 hover:bg-ignis-surface-hover capitalize"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
