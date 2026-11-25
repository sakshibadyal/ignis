// Import the editor store to access open tabs, files, and tab management functions
import { useEditorStore } from "@/store/editorStore";

// Import the X icon from lucide-react — used as the close button on each tab
import { X } from "lucide-react";

export default function EditorTabs() {

  // Pull everything needed from the global editor store:
  // - openTabs: array of file IDs that are currently open as tabs
  // - files: the full array of all file objects (id, name, language, content)
  // - setActiveFile: function to switch focus to a different tab
  // - activeFileId: the ID of the tab currently selected/visible
  // - closeTab: function to remove a tab from the open tabs list
  const { openTabs, files, setActiveFile, activeFileId, closeTab } = useEditorStore();

  return (
    // Outer tab bar container — fixed height, bottom border, horizontal flex layout with small gaps
    <div className="h-10 border-b border-border flex items-center px-3 gap-1 bg-secondary">

      {/* Loop over each open tab ID and render a tab for it*/ }
      {openTabs.map((id) => {

        // Find the full file object that matches this tab's ID
        const file = files.find((f) => f.id === id);

        // If no matching file is found (e.g., it was deleted), skip rendering this tab
        if (!file) return null;

        return (
          <div
            key={id} // React needs a unique key when rendering lists — using the file ID here
            onClick={() => setActiveFile(id)} // Clicking the tab makes this file the active one
            className={`px-3 py-1.5 rounded-t text-sm font-mono cursor-pointer flex items-center gap-2 transition-colors ${
              activeFileId === id
                ? "bg-card text-foreground"  // Active tab: brighter background and full text color
                : "bg-secondary text-muted-foreground hover:text-foreground" // Inactive tab: dimmer styling, brightens on hover
            }`}
          >
            {/* Display the file's name inside the tab (e.g., "index.js") */}
            {file.name}
            {file.type === "file" && (file.content || "") !== (file.savedContent || "") && (
              <span className="text-[10px] leading-none text-primary">●</span>
            )}

            {/* Close (X) button — clicking it removes this tab from the open tabs */}
            <X
              className="w-3 h-3 opacity-50 hover:opacity-100" // Small icon, semi-transparent by default, fully visible on hover
              onClick={(e) => {
                e.stopPropagation(); // Prevents the click from bubbling up to the tab's onClick — otherwise it would also call setActiveFile
                closeTab(id); // Removes this tab from the openTabs list in the store
              }}
            />

          </div>
        );
      })}

    </div>
  );
}
