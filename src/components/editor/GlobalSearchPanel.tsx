import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";

type GlobalSearchPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SearchHit = {
  fileId: string;
  fileName: string;
  line: number;
  preview: string;
};

export default function GlobalSearchPanel({ isOpen, onClose }: GlobalSearchPanelProps) {
  const { files, openFile } = useEditorStore();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const hits: SearchHit[] = [];
    files.forEach((node) => {
      if (node.type !== "file") return;
      const lines = (node.content || "").split("\n");
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(q)) {
          hits.push({
            fileId: node.id,
            fileName: node.name,
            line: index + 1,
            preview: line.trim() || "(empty line)",
          });
        }
      });
    });

    return hits.slice(0, 200);
  }, [files, query]);

  if (!isOpen) return null;

  return (
    <div className="absolute left-4 top-4 z-20 w-[32rem] max-w-[calc(100%-2rem)] rounded-md border border-border bg-card shadow-lg">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
          placeholder="Search across files (Ctrl+Shift+F)"
          className="flex-1 bg-transparent outline-none text-sm font-mono"
        />
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-ignis-surface-hover text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-80 overflow-auto p-1">
        {!query.trim() && <p className="px-2 py-1.5 text-xs text-muted-foreground">Type to search all files.</p>}
        {query.trim() && results.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No results found.</p>
        )}
        {results.map((hit, index) => (
          <button
            key={`${hit.fileId}-${hit.line}-${index}`}
            onClick={() => {
              openFile(hit.fileId);
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-ignis-surface-hover"
          >
            <p className="text-xs font-mono text-foreground">
              {hit.fileName}:{hit.line}
            </p>
            <p className="text-xs text-muted-foreground truncate">{hit.preview}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
