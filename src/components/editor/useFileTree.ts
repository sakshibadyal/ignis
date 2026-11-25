import { useMemo } from "react";
import type { FileNode } from "@/components/editor/fileExplorerUtils";
import { buildFileTree } from "@/components/editor/fileExplorerUtils";

export function useFileTree(files: FileNode[]) {
  return useMemo(() => buildFileTree(files), [files]);
}
