//  IMPORTS

import Editor from "@monaco-editor/react"; // Imports the Monaco code editor component — this is the same editor used in VS Code, ported for React
import { useEditorStore } from "@/store/editorStore"; // Imports the Zustand store that holds editor state (files, active file, etc.) — '@/' is an alias for the 'src/' folder
import { getLanguageFromExtension } from "@/components/editor/fileExplorerUtils";
import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

//  COMPONENT 

type CodeEditorProps = {
  onLocalCodeChange?: (
    fileId: string,
    content: string,
    cursorPosition?: { lineNumber: number; column: number }
  ) => void;
  onCursorMove?: (payload: { lineNumber: number; column: number }) => void;
  onCursorPositionChange?: (payload: { lineNumber: number; column: number }) => void;
  readOnly?: boolean;
  editorFontSize?: number;
  isRemoteChangeRef?: MutableRefObject<boolean>;
  remoteCursors?: Array<{
    userId: string;
    name: string;
    color: string;
    lineNumber: number;
    column: number;
  }>;
};

export default function CodeEditor({
  onLocalCodeChange,
  onCursorMove,
  onCursorPositionChange,
  readOnly = false,
  editorFontSize = 14,
  isRemoteChangeRef,
  remoteCursors = [],
}: CodeEditorProps) { // Defines and exports this as the default component — 'default' means you can import it without curly braces

  // State from Store 

  const { files, activeFileId, updateFileContent, saveFile } = useEditorStore();
  const activeFileIdRef = useRef(activeFileId);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const cursorPositionRef = useRef<{ lineNumber: number; column: number }>({ lineNumber: 1, column: 1 });
  // Pulls 3 things out of the global editor store:
  // - 'files': the array of all open files (each has id, name, language, content)
  // - 'activeFileId': the id of whichever file tab is currently selected
  // - 'updateFileContent': a function to save new content when the user types

  //  Derive the Active File

  const activeFile = files.find((f) => f.id === activeFileId);
  // Searches the 'files' array for the file whose id matches 'activeFileId'
  // 'find' returns the first match, or 'undefined' if nothing matches

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    if (!activeFile || activeFile.type !== "file") return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const cssSafeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const styleElId = "ignis-remote-cursor-styles";
    let styleEl = document.getElementById(styleElId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleElId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = remoteCursors
      .map((cursor) => {
        const safeId = cssSafeId(cursor.userId);
        const color = cursor.color || "#4ECDC4";
        return `
          .ignis-remote-cursor-${safeId} { border-left: 2px solid ${color}; }
          .ignis-remote-cursor-label-${safeId} { color: ${color}; font-size: 10px; font-family: "JetBrains Mono", monospace; }
        `;
      })
      .join("\n");

    const decorations = remoteCursors.map((cursor) => {
      const safeId = cssSafeId(cursor.userId);
      return {
      range: new monacoRef.current.Range(
        cursor.lineNumber,
        Math.max(1, cursor.column),
        cursor.lineNumber,
        Math.max(2, cursor.column + 1)
      ),
      options: {
        className: `ignis-remote-cursor-${safeId}`,
        stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        overviewRuler: {
          color: cursor.color || "#4ECDC4",
          position: monacoRef.current.editor.OverviewRulerLane.Right,
        },
        after: {
          content: ` ${cursor.name}`,
          inlineClassName: `ignis-remote-cursor-label-${safeId}`,
        },
      },
    };
    });

    decorationIdsRef.current = editorRef.current.deltaDecorations(
      decorationIdsRef.current,
      decorations
    );
  }, [remoteCursors, activeFileId]);

  useEffect(() => {
    if (!editorRef.current || !activeFile || activeFile.type !== "file") return;
    if (!isRemoteChangeRef?.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;
    const currentValue = model.getValue();
    const nextValue = activeFile.content || "";
    if (currentValue === nextValue) {
      isRemoteChangeRef.current = false;
      return;
    }
    const currentPosition = editorRef.current.getPosition();
    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: nextValue }],
      () => null
    );
    if (currentPosition) {
      editorRef.current.setPosition(currentPosition);
    }
    isRemoteChangeRef.current = false;
  }, [activeFile?.content, activeFile?.id, isRemoteChangeRef]);

  if (!activeFile || activeFile.type !== "file") return null;

  //  Render
  return (
    <Editor
      height="100%"                  // Makes the editor fill 100% of its parent container's height
      language={activeFile.language || getLanguageFromExtension(activeFile.extension)}
      value={activeFile.content || ""}     // Sets the current text content shown in the editor — driven by the file's stored content
      theme="vs-dark"                // Uses the dark color theme (same as VS Code's dark mode)
      onChange={(value) => {
        const nextValue = value || "";
        if (isRemoteChangeRef?.current) {
          isRemoteChangeRef.current = false;
          return;
        }
        updateFileContent(activeFileId, nextValue);
        onLocalCodeChange?.(activeFileId, nextValue, cursorPositionRef.current);
      }}
      // Called every time the user types or edits in the editor
      // 'value' is the new full content of the editor as a string (or undefined if empty)
      // 'value || ""' ensures we never pass undefined — falls back to an empty string
      // 'updateFileContent' saves the new content into the store for the active file
      options={{
        fontSize: editorFontSize,
        minimap: { enabled: false },  // Disables the minimap (the small code overview panel on the right in VS Code)
        scrollBeyondLastLine: false,  // Prevents the editor from scrolling empty space below the last line of code
        padding: { top: 16 },        // Adds 16px of space at the top so code doesn't start at the very edge
        readOnly,
      }}
      onMount={(editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          saveFile(activeFileIdRef.current);
        });
        editor.addCommand(
          monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
          () => {
            editor.getAction("editor.action.formatDocument")?.run();
          }
        );
        editor.onDidChangeCursorPosition((event) => {
          cursorPositionRef.current = {
            lineNumber: event.position.lineNumber,
            column: event.position.column,
          };
          onCursorMove?.({
            lineNumber: event.position.lineNumber,
            column: event.position.column,
          });
          onCursorPositionChange?.({
            lineNumber: event.position.lineNumber,
            column: event.position.column,
          });
        });
      }}
    />
  );
}
