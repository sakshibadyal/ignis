import { useEffect, useMemo, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Trash2 } from "lucide-react";

type TerminalPanelProps = {
  height: number;
  lines: Array<{
    type: "stdout" | "stderr" | "status";
    text: string;
  }>;
  isRunning: boolean;
  onClear: () => void;
};

export default function TerminalPanel({ height, lines, isRunning, onClear }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const renderedLineCountRef = useRef(0);

  const colors = useMemo(
    () => ({
      stdout: "\x1b[37m",
      stderr: "\x1b[31m",
      status: "\x1b[32m",
      reset: "\x1b[0m",
    }),
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;
    if (xtermRef.current) {
      return;
    }
    const term = new XTerm({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 12,
      theme: {
        background: "#111111",
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    term.writeln("Ignis terminal ready.");
  }, []);

  useEffect(() => {
    if (!xtermRef.current) return;
    fitAddonRef.current?.fit();
  }, [height]);

  useEffect(() => {
    if (!xtermRef.current) return;
    const term = xtermRef.current;
    const start = renderedLineCountRef.current;
    const next = lines.slice(start);
    next.forEach((line) => {
      const color = colors[line.type] || colors.stdout;
      const text = String(line.text ?? "");
      const needsNewLine = !text.endsWith("\n");
      term.write(`${color}${text}${colors.reset}${needsNewLine ? "\r\n" : ""}`);
    });
    renderedLineCountRef.current = lines.length;
  }, [lines, colors]);

  useEffect(() => {
    if (!xtermRef.current) return;
    if (lines.length === 0) {
      xtermRef.current.clear();
      xtermRef.current.writeln("Ignis terminal ready.");
      renderedLineCountRef.current = 0;
    }
  }, [lines.length]);

  return (
    <div
      className="border-t border-border bg-[#111] text-sm font-mono flex flex-col"
      style={{ height }}
    >
      <div className="px-3 py-1.5 border-b border-border text-xs text-muted-foreground flex items-center justify-between">
        <span>{isRunning ? "Terminal - Running..." : "Terminal"}</span>
        <button
          onClick={onClear}
          className="p-1 rounded hover:bg-ignis-surface-hover transition-colors"
          title="Clear terminal"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden px-1 py-1" />
    </div>
  );
}
