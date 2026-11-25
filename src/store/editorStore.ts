import { create } from "zustand";
import { nanoid } from "nanoid";
import { getLanguageFromExtension } from "@/components/editor/fileExplorerUtils";

type EditorNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  extension?: string;
  language?: string;
  content?: string;
  savedContent?: string;
  parentId: string | null;
};

type CreateNodeResult = {
  ok: boolean;
  error?: string;
  id?: string;
};

type EditorState = {
  files: EditorNode[];
  openTabs: string[];
  activeFileId: string;
  loadRoomFiles: (remoteFiles: any[]) => void;
  createFile: (name: string, parentId?: string | null) => CreateNodeResult;
  createFolder: (name: string, parentId?: string | null) => CreateNodeResult;
  renameNode: (id: string, name: string) => CreateNodeResult;
  deleteNode: (id: string) => void;
  refreshFiles: () => void;
  saveFile: (id: string) => void;
  setFileLanguage: (id: string, language: string) => void;
  openFile: (id: string) => void;
  setActiveFile: (id: string) => void;
  closeTab: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
};

type StoredEditorState = Pick<EditorState, "files" | "openTabs" | "activeFileId">;

const getExtension = (name: string) => {
  const parts = name.split(".");
  if (parts.length < 2) return "txt";
  return parts[parts.length - 1].toLowerCase();
};

const normalizeName = (name: string) => name.trim();

const hasDuplicateName = (
  files: EditorNode[],
  name: string,
  parentId: string | null
) => {
  return files.some(
    (file) =>
      file.parentId === parentId &&
      file.name.toLowerCase() === name.toLowerCase()
  );
};

const collectDescendantIds = (files: EditorNode[], rootId: string) => {
  const ids = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    files.forEach((node) => {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    });
  }

  return ids;
};

const migrateStoredState = (stored: any): StoredEditorState | null => {
  if (!stored || !Array.isArray(stored.files)) return null;

  const files: EditorNode[] = stored.files
    .map((item: any) => {
      if (!item?.id || !item?.name) return null;

      if (item.type === "folder") {
        return {
          id: String(item.id),
          name: String(item.name),
          type: "folder" as const,
          parentId: item.parentId ?? null,
        };
      }

      const normalizedName = String(item.name);
      return {
        id: String(item.id),
        name: normalizedName,
        type: "file" as const,
        extension: item.extension || getExtension(normalizedName),
        language: item.language || getLanguageFromExtension(item.extension || getExtension(normalizedName)),
        content: typeof item.content === "string" ? item.content : "",
        savedContent:
          typeof item.savedContent === "string"
            ? item.savedContent
            : typeof item.content === "string"
              ? item.content
              : "",
        parentId: item.parentId ?? null,
      };
    })
    .filter(Boolean) as EditorNode[];

  const fileIds = new Set(files.filter((file) => file.type === "file").map((file) => file.id));
  const openTabs = Array.isArray(stored.openTabs)
    ? stored.openTabs.filter((id: string) => fileIds.has(id))
    : [];
  const activeFileId = fileIds.has(stored.activeFileId)
    ? stored.activeFileId
    : openTabs[0] || files.find((file) => file.type === "file")?.id || "";

  return { files, openTabs, activeFileId };
};

const loadFromStorage = () => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("ignis-editor");
  return data ? migrateStoredState(JSON.parse(data)) : null;
};

const saveToStorage = (state: StoredEditorState) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("ignis-editor", JSON.stringify(state));
};

const persist = (state: EditorState) => {
  saveToStorage({
    files: state.files,
    openTabs: state.openTabs,
    activeFileId: state.activeFileId,
  });
};

export const useEditorStore = create<EditorState>((set, get) => {
  const stored = loadFromStorage();

  const initialState: EditorState = stored || {
    files: [
      {
        id: "1",
        name: "main.js",
        type: "file",
        extension: "js",
        content: "// Start coding in Ignis\nconsole.log('Hello, IGNIS!');\n",
        savedContent: "// Start coding in Ignis\nconsole.log('Hello, IGNIS!');\n",
        parentId: null,
      },
    ],
    openTabs: ["1"],
    activeFileId: "1",
    loadRoomFiles: () => {},
    createFile: () => ({ ok: false }),
    createFolder: () => ({ ok: false }),
    renameNode: () => ({ ok: false }),
    deleteNode: () => {},
    refreshFiles: () => {},
    saveFile: () => {},
    setFileLanguage: () => {},
    openFile: () => {},
    setActiveFile: () => {},
    closeTab: () => {},
    updateFileContent: () => {},
  };

  return {
    ...initialState,
    loadRoomFiles: (remoteFiles) => {
      const mapped: EditorNode[] = (remoteFiles || []).map((file) => {
        const name = String(file.name || "untitled");
        const type = file.type === "folder" ? "folder" : "file";
        return {
          id: String(file._id || file.id),
          name,
          type,
          extension: type === "file" ? getExtension(name) : undefined,
          language:
            type === "file"
              ? String(file.language || getLanguageFromExtension(getExtension(name)))
              : undefined,
          content: type === "file" ? String(file.content || "") : undefined,
          savedContent: type === "file" ? String(file.content || "") : undefined,
          parentId: file.parentId ? String(file.parentId) : null,
        };
      });

      const firstFileId = mapped.find((node) => node.type === "file")?.id || "";
      const newState = {
        files: mapped,
        openTabs: firstFileId ? [firstFileId] : [],
        activeFileId: firstFileId,
      };
      set(newState);
      persist({ ...get(), ...newState });
    },

    createFile: (name, parentId = null) => {
      const normalizedName = normalizeName(name);
      if (!normalizedName) {
        return { ok: false, error: "File name is required." };
      }
      if (hasDuplicateName(get().files, normalizedName, parentId)) {
        return { ok: false, error: "A file or folder with this name already exists." };
      }

      const id = nanoid();
      const newFile = {
        id,
        name: normalizedName,
        type: "file" as const,
        extension: getExtension(normalizedName),
        language: getLanguageFromExtension(getExtension(normalizedName)),
        content: "// code your vision\n",
        savedContent: "// code your vision\n",
        parentId,
      };

      const newState = {
        files: [...get().files, newFile],
        openTabs: get().openTabs.includes(id) ? get().openTabs : [...get().openTabs, id],
        activeFileId: id,
      };

      set(newState);
      persist({ ...get(), ...newState });
      return { ok: true, id };
    },

    createFolder: (name, parentId = null) => {
      const normalizedName = normalizeName(name);
      if (!normalizedName) {
        return { ok: false, error: "Folder name is required." };
      }
      if (hasDuplicateName(get().files, normalizedName, parentId)) {
        return { ok: false, error: "A file or folder with this name already exists." };
      }

      const id = nanoid();
      const newFolder: EditorNode = {
        id,
        name: normalizedName,
        type: "folder",
        parentId,
      };

      const newState = {
        files: [...get().files, newFolder],
      };

      set(newState);
      persist({ ...get(), ...newState });
      return { ok: true, id };
    },

    renameNode: (id, name) => {
      const normalizedName = normalizeName(name);
      if (!normalizedName) {
        return { ok: false, error: "Name is required." };
      }

      const target = get().files.find((node) => node.id === id);
      if (!target) {
        return { ok: false, error: "Target not found." };
      }

      const duplicate = get().files.some(
        (node) =>
          node.id !== id &&
          node.parentId === target.parentId &&
          node.name.toLowerCase() === normalizedName.toLowerCase()
      );
      if (duplicate) {
        return { ok: false, error: "A file or folder with this name already exists." };
      }

      const updatedFiles = get().files.map((node) => {
        if (node.id !== id) return node;
        if (node.type === "file") {
          return {
            ...node,
            name: normalizedName,
            extension: getExtension(normalizedName),
            language: node.language || getLanguageFromExtension(getExtension(normalizedName)),
          };
        }
        return { ...node, name: normalizedName };
      });

      set({ files: updatedFiles });
      persist({ ...get(), files: updatedFiles });
      return { ok: true, id };
    },

    deleteNode: (id) => {
      const current = get();
      const target = current.files.find((node) => node.id === id);
      if (!target) return;

      const deleteIds = collectDescendantIds(current.files, id);
      const remainingFiles = current.files.filter((node) => !deleteIds.has(node.id));
      const remainingFileIds = new Set(
        remainingFiles.filter((node) => node.type === "file").map((node) => node.id)
      );
      const nextOpenTabs = current.openTabs.filter((tabId) => remainingFileIds.has(tabId));

      let nextActiveFileId = current.activeFileId;
      if (!remainingFileIds.has(nextActiveFileId)) {
        nextActiveFileId = nextOpenTabs[nextOpenTabs.length - 1] || "";
      }

      const newState = {
        files: remainingFiles,
        openTabs: nextOpenTabs,
        activeFileId: nextActiveFileId,
      };

      set(newState);
      persist({ ...get(), ...newState });
    },

    refreshFiles: () => {
      const stored = loadFromStorage();
      if (!stored) return;
      set({
        files: stored.files,
        openTabs: stored.openTabs,
        activeFileId: stored.activeFileId,
      });
      persist({ ...get() });
    },

    saveFile: (id) => {
      const updatedFiles = get().files.map((file) =>
        file.id === id && file.type === "file"
          ? { ...file, savedContent: file.content || "" }
          : file
      );
      set({ files: updatedFiles });
      persist({ ...get(), files: updatedFiles });
    },

    setFileLanguage: (id, language) => {
      const updatedFiles = get().files.map((file) =>
        file.id === id && file.type === "file" ? { ...file, language } : file
      );
      set({ files: updatedFiles });
      persist({ ...get(), files: updatedFiles });
    },

    openFile: (id) => {
      const target = get().files.find((file) => file.id === id);
      if (!target || target.type !== "file") return;

      const newState = {
        openTabs: get().openTabs.includes(id)
          ? get().openTabs
          : [...get().openTabs, id],
        activeFileId: id,
      };

      set(newState);
      persist({ ...get(), ...newState });
    },

    setActiveFile: (id) => {
      const target = get().files.find((file) => file.id === id);
      if (!target || target.type !== "file") return;
      set({ activeFileId: id });
      persist({ ...get(), activeFileId: id });
    },
    closeTab: (id) => {
      const newTabs = get().openTabs.filter((tabId) => tabId !== id);
      const newActiveId =
        get().activeFileId === id
          ? newTabs[newTabs.length - 1] || ""
          : get().activeFileId;

      const newState = {
        openTabs: newTabs,
        activeFileId: newActiveId,
      };

      set(newState);
      persist({ ...get(), ...newState });
    },

    updateFileContent: (id, content) => {
      const updatedFiles = get().files.map((file) =>
        file.id === id && file.type === "file" ? { ...file, content } : file
      );

      set({ files: updatedFiles });
      persist({ ...get(), files: updatedFiles });
    },
  };
});
