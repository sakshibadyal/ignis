export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  extension?: string;
  language?: string;
  content?: string;
  savedContent?: string;
  parentId: string | null;
};

export type TreeNode = FileNode & {
  children: TreeNode[];
};

export const buildFileTree = (files: FileNode[]): TreeNode[] => {
  const grouped = files.reduce<Record<string, FileNode[]>>((acc, item) => {
    const parentKey = item.parentId ?? "__root__";
    if (!acc[parentKey]) acc[parentKey] = [];
    acc[parentKey].push(item);
    return acc;
  }, {});

  const makeNode = (item: FileNode): TreeNode => ({
    ...item,
    children: (grouped[item.id] || [])
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(makeNode),
  });

  return (grouped["__root__"] || [])
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map(makeNode);
};

export const getLanguageFromExtension = (extension?: string) => {
  switch ((extension || "").toLowerCase()) {
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "ts":
      return "typescript";
    case "tsx":
      return "typescript";
    case "jsx":
      return "javascript";
    case "html":
      return "html";
    case "css":
      return "css";
    case "json":
      return "json";
    case "py":
      return "python";
    case "md":
      return "markdown";
    case "java":
      return "java";
    case "cpp":
    case "cc":
    case "cxx":
      return "cpp";
    case "c":
      return "c";
    case "cs":
      return "csharp";
    case "go":
      return "go";
    case "rs":
      return "rust";
    case "sql":
      return "sql";
    case "sh":
      return "shell";
    case "yml":
    case "yaml":
      return "yaml";
    case "xml":
      return "xml";
    default:
      return "plaintext";
  }
};
