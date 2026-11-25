import { useEditorStore } from "@/store/editorStore";
import { useMemo, useState } from "react";
import { FolderPlus, FilePlus2, RefreshCw, ChevronsUpDown } from "lucide-react";
import { useFileTree } from "@/components/editor/useFileTree";
import FileTreeNode from "@/components/editor/FileTreeNode";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FileExplorer() {
  const {
    files,
    openFile,
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    refreshFiles,
    activeFileId,
  } = useEditorStore();
  const tree = useFileTree(files);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingType, setCreatingType] = useState<"file" | "folder" | null>(null);
  const [creatingName, setCreatingName] = useState("");
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: "file" | "folder" } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const activeFileParentId = useMemo(() => {
    const active = files.find((item) => item.id === activeFileId);
    return active?.parentId ?? null;
  }, [activeFileId, files]);

  const selectedFile = selectedItem?.type === "file" ? files.find((item) => item.id === selectedItem.id) : null;
  const createTargetParentId =
    selectedItem?.type === "folder"
      ? selectedItem.id
      : selectedItem?.type === "file"
        ? selectedFile?.parentId ?? null
        : null;
  const pendingDeleteNode = pendingDeleteId
    ? files.find((file) => file.id === pendingDeleteId) || null
    : null;

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreate = (type: "file" | "folder", parentId: string | null) => {
    setCreatingType(type);
    if (parentId) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });
    }
    if (parentId) {
      const parentNode = files.find((node) => node.id === parentId);
      if (parentNode) {
        setSelectedItem({ id: parentNode.id, type: parentNode.type });
      }
    }
    setCreatingName("");
    setRenamingId(null);
    setRenamingName("");
  };

  const cancelCreate = () => {
    setCreatingType(null);
    setCreatingName("");
  };

  const submitCreate = () => {
    if (!creatingType) return;
    const trimmed = creatingName.trim();
    if (!trimmed) return;

    const result =
      creatingType === "file"
        ? createFile(trimmed, createTargetParentId)
        : createFolder(trimmed, createTargetParentId);

    if (!result.ok) return;
    if (createTargetParentId) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(createTargetParentId);
        return next;
      });
    }
    if (creatingType === "file" && result.id) {
      openFile(result.id);
      setSelectedItem({ id: result.id, type: "file" });
    }
    cancelCreate();
  };

  const startRename = (id: string) => {
    const node = files.find((item) => item.id === id);
    if (!node) return;
    setRenamingId(id);
    setRenamingName(node.name);
    setCreatingType(null);
    setCreatingName("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenamingName("");
  };

  const submitRename = () => {
    if (!renamingId) return;
    const result = renameNode(renamingId, renamingName);
    if (!result.ok) return;
    cancelRename();
  };

  const requestDeleteNode = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDeleteNode = () => {
    if (!pendingDeleteId) return;
    deleteNode(pendingDeleteId);
    if (selectedItem?.id === pendingDeleteId) setSelectedItem(null);
    setPendingDeleteId(null);
  };

  const refreshExplorer = () => {
    refreshFiles();
    setCreatingType(null);
    setCreatingName("");
    setRenamingId(null);
    setRenamingName("");
    setPendingDeleteId(null);
  };

  const handleNodeDeletedLocally = (id: string) => {
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  return (
    <div
      className="p-3 text-sm h-full"
      onClick={() => {
        setSelectedItem(null);
        cancelCreate();
        cancelRename();
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Files</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(event) => {
              event.stopPropagation();
              startCreate("file", createTargetParentId);
            }}
            className="p-1 rounded hover:bg-ignis-surface-hover text-muted-foreground hover:text-foreground transition-colors"
            title="New File"
          >
            <FilePlus2 className="w-4 h-4" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              startCreate("folder", createTargetParentId);
            }}
            className="p-1 rounded hover:bg-ignis-surface-hover text-muted-foreground hover:text-foreground transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setExpandedFolders(new Set());
            }}
            className="p-1 rounded hover:bg-ignis-surface-hover text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse All"
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              refreshExplorer();
            }}
            className="p-1 rounded hover:bg-ignis-surface-hover text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh Explorer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-0.5" onClick={(event) => event.stopPropagation()}>
        {createTargetParentId === null && creatingType !== null && (
          <div className="px-2 py-1">
            <input
              autoFocus
              value={creatingName}
              onChange={(event) => setCreatingName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitCreate();
                if (event.key === "Escape") cancelCreate();
              }}
              onBlur={() => {
                if (creatingName.trim()) submitCreate();
                else cancelCreate();
              }}
              placeholder={creatingType === "file" ? "index.ts" : "folder-name"}
              className="w-full h-7 rounded border border-primary bg-background px-2 text-xs font-mono"
            />
          </div>
        )}
        {tree.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            activeFileId={activeFileId}
            selectedNodeId={selectedItem?.id || null}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            onSelectFolder={(id) => setSelectedItem({ id, type: "folder" })}
            onSelectFile={(id) => setSelectedItem({ id, type: "file" })}
            onOpenFile={(id) => {
              openFile(id);
              setSelectedItem({ id, type: "file" });
            }}
            creatingParentId={createTargetParentId}
            creatingType={creatingType}
            creatingName={creatingName}
            onCreatingNameChange={setCreatingName}
            onSubmitCreate={submitCreate}
            onCancelCreate={cancelCreate}
            onStartCreate={startCreate}
            renamingId={renamingId}
            renamingName={renamingName}
            onStartRename={startRename}
            onRenamingNameChange={setRenamingName}
            onSubmitRename={submitRename}
            onCancelRename={cancelRename}
            onDeleteNode={requestDeleteNode}
          />
        ))}
      </div>
      <AlertDialog open={pendingDeleteNode !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDeleteNode?.type === "folder" ? "folder" : "file"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteNode?.type === "folder"
                ? `This will remove "${pendingDeleteNode?.name}" and all nested files/folders from your editor workspace.`
                : `This will remove "${pendingDeleteNode?.name}" from your editor workspace.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) handleNodeDeletedLocally(pendingDeleteId);
                confirmDeleteNode();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}