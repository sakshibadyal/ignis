import { useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/components/editor/fileExplorerUtils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type FileTreeNodeProps = {
  node: TreeNode;
  depth?: number;
  activeFileId: string;
  selectedNodeId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onSelectFile: (id: string) => void;
  onOpenFile: (id: string) => void;
  creatingParentId: string | null;
  creatingType: "file" | "folder" | null;
  creatingName: string;
  onCreatingNameChange: (value: string) => void;
  onSubmitCreate: () => void;
  onCancelCreate: () => void;
  onStartCreate: (type: "file" | "folder", parentId: string | null) => void;
  renamingId: string | null;
  renamingName: string;
  onStartRename: (id: string) => void;
  onRenamingNameChange: (value: string) => void;
  onSubmitRename: () => void;
  onCancelRename: () => void;
  onDeleteNode: (id: string) => void;
};

const getFileIcon = (extension?: string) => {
  switch ((extension || "").toLowerCase()) {
    case "js":
    case "ts":
    case "tsx":
    case "jsx":
    case "py":
      return FileCode;
    case "json":
      return FileJson;
    default:
      return FileText;
  }
};

export default function FileTreeNode({
  node,
  depth = 0,
  activeFileId,
  selectedNodeId,
  expandedFolders,
  onToggleFolder,
  onSelectFolder,
  onSelectFile,
  onOpenFile,
  creatingParentId,
  creatingType,
  creatingName,
  onCreatingNameChange,
  onSubmitCreate,
  onCancelCreate,
  onStartCreate,
  renamingId,
  renamingName,
  onStartRename,
  onRenamingNameChange,
  onSubmitRename,
  onCancelRename,
  onDeleteNode,
}: FileTreeNodeProps) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders.has(node.id);
  const isSelectedNode = selectedNodeId === node.id;
  const showInlineCreate = creatingParentId === node.id && creatingType !== null;
  const isRenaming = renamingId === node.id;
  const Icon = useMemo(() => {
    if (isFolder) return isExpanded ? FolderOpen : Folder;
    return getFileIcon(node.extension);
  }, [isExpanded, isFolder, node.extension]);

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={(event) => {
              event.stopPropagation();
              if (isFolder) {
                onSelectFolder(node.id);
                onToggleFolder(node.id);
                return;
              }
              onSelectFile(node.id);
              onOpenFile(node.id);
            }}
            className={cn(
              "group flex items-center gap-1.5 py-1.5 pr-2 rounded cursor-pointer text-sm font-mono transition-colors",
              !isFolder && node.id === activeFileId
                ? "bg-primary/10 text-primary"
                : isSelectedNode
                  ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-ignis-surface-hover hover:text-foreground"
            )}
            style={{ paddingLeft: `${8 + depth * 14}px` }}
          >
            {isFolder ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              )
            ) : (
              <span className="w-3.5 h-3.5 shrink-0" />
            )}
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {isRenaming ? (
              <input
                autoFocus
                value={renamingName}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onRenamingNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmitRename();
                  if (e.key === "Escape") onCancelRename();
                }}
                onBlur={onCancelRename}
                className="h-6 rounded border border-primary bg-background px-2 text-xs font-mono w-full"
              />
            ) : (
              <div className="flex items-center gap-1 min-w-0">
                <span className="truncate">{node.name}</span>
                {node.type === "file" && (node.content || "") !== (node.savedContent || "") && (
                  <span className="text-[10px] leading-none text-primary">●</span>
                )}
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-44">
          {isFolder && (
            <>
              <ContextMenuItem
                onClick={() => {
                  onStartCreate("file", node.id);
                  if (!isExpanded) onToggleFolder(node.id);
                }}
              >
                New File
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  onStartCreate("folder", node.id);
                  if (!isExpanded) onToggleFolder(node.id);
                }}
              >
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          {!isFolder && <ContextMenuItem onClick={() => onOpenFile(node.id)}>Open</ContextMenuItem>}
          {!isFolder && <ContextMenuSeparator />}
          <ContextMenuItem onClick={() => onStartRename(node.id)}>Rename</ContextMenuItem>
          <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => onDeleteNode(node.id)}>
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isFolder && isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              selectedNodeId={selectedNodeId}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectFolder={onSelectFolder}
              onSelectFile={onSelectFile}
              onOpenFile={onOpenFile}
              creatingParentId={creatingParentId}
              creatingType={creatingType}
              creatingName={creatingName}
              onCreatingNameChange={onCreatingNameChange}
              onSubmitCreate={onSubmitCreate}
              onCancelCreate={onCancelCreate}
              onStartCreate={onStartCreate}
              renamingId={renamingId}
              renamingName={renamingName}
              onStartRename={onStartRename}
              onRenamingNameChange={onRenamingNameChange}
              onSubmitRename={onSubmitRename}
              onCancelRename={onCancelRename}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
      {isFolder && isExpanded && showInlineCreate && (
        <div style={{ paddingLeft: `${8 + (depth + 1) * 14}px` }} className="py-1 pr-2">
          <input
            autoFocus
            value={creatingName}
            onChange={(e) => onCreatingNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmitCreate();
              if (e.key === "Escape") onCancelCreate();
            }}
            onBlur={() => {
              if (creatingName.trim()) onSubmitCreate();
              else onCancelCreate();
            }}
            placeholder={creatingType === "file" ? "index.ts" : "folder-name"}
            className="w-full h-7 rounded border border-primary bg-background px-2 text-xs font-mono"
          />
        </div>
      )}
    </div>
  );
}
