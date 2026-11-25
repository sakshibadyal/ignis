import EditorNavbar from "@/components/editor/EditorNavbar";
import FileExplorer from "@/components/editor/FileExplorer";
import EditorTabs from "@/components/editor/EditorTabs";
import CodeEditor from "@/components/editor/CodeEditor";
import StatusBar from "@/components/editor/StatusBar";
import GlobalSearchPanel from "@/components/editor/GlobalSearchPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import TerminalPanel from "@/components/editor/TerminalPanel";
import { api } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import { socket } from "@/lib/socket";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EXECUTABLE_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "c",
  "go",
  "shell",
]);

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  editor: "Read-Write",
  viewer: "View",
};

const EditorPage = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<any[]>([]);
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [roomRole, setRoomRole] = useState<"owner" | "editor" | "viewer" | "none">("none");
  const [isRoomsDialogOpen, setIsRoomsDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [roomMembers, setRoomMembers] = useState<Array<{ userId: string; name: string; email: string; role: "owner" | "editor" | "viewer" }>>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [editorFontSize, setEditorFontSize] = useState<number>(() => {
    const stored = localStorage.getItem("ignis-editor-font-size");
    const parsed = stored ? Number(stored) : 14;
    return Number.isFinite(parsed) ? Math.min(24, Math.max(10, parsed)) : 14;
  });
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [terminalLines, setTerminalLines] = useState<Array<{ type: "stdout" | "stderr" | "status"; text: string }>>([]);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const activeRunIdRef = useRef<string | null>(null);
  const isRemoteChangeRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const saveStateTimerRef = useRef<number | null>(null);
  const emitTimersRef = useRef<Record<string, number>>({});
  const loadRoomFiles = useEditorStore((state) => state.loadRoomFiles);
  const updateFileContent = useEditorStore((state) => state.updateFileContent);
  const saveFile = useEditorStore((state) => state.saveFile);
  const setFileLanguage = useEditorStore((state) => state.setFileLanguage);
  const activeFileId = useEditorStore((state) => state.activeFileId);
  const files = useEditorStore((state) => state.files);
  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId && file.type === "file"),
    [files, activeFileId]
  );
  const isInRoom = Boolean(roomCode);

  const hydrateRoomsList = async () => {
    try {
      const rooms = await api.getMyRooms();
      setMyRooms(Array.isArray(rooms) ? rooms : []);
    } catch (error: any) {
      if ((error?.message || "").toLowerCase().includes("unauthorized")) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }
      setMyRooms([]);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        setEditorFontSize((prev) => {
          const next = Math.min(24, prev + 1);
          localStorage.setItem("ignis-editor-font-size", String(next));
          return next;
        });
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        setEditorFontSize((prev) => {
          const next = Math.max(10, prev - 1);
          localStorage.setItem("ignis-editor-font-size", String(next));
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("ignis-token");
    if (!roomCode || !token) return;
    if (!socket.connected) socket.connect();
    socket.emit("join-room", { roomId: roomCode, token });

    const onCodeChange = (payload: any) => {
      if (!payload?.fileId) return;
      isRemoteChangeRef.current = true;
      updateFileContent(payload.fileId, payload.content || "");
    };
    const onRoomUsers = (users: any[]) => {
      setRoomUsers(users || []);
    };
    const onRemoteFileOpen = () => {};
    const onCursorMove = (payload: any) => {
      if (!payload?.userId || !payload?.cursorPosition) return;
      setRemoteCursors((prev) => {
        const next = prev.filter((cursor) => cursor.userId !== payload.userId);
        next.push({
          userId: payload.userId,
          name: payload.name || "Peer",
          color: payload.color || "#4ECDC4",
          lineNumber: payload.cursorPosition.lineNumber || 1,
          column: payload.cursorPosition.column || 1,
        });
        return next.slice(-20);
      });
    };
    const onUserFileOpenToast = (payload: any) => {
      if (!payload?.fileName) return;
      toast(`${payload.name || "Someone"} opened ${payload.fileName}`);
    };
    const onTerminalStart = (payload: any) => {
      setIsTerminalOpen(true);
      setIsExecutingCode(true);
      if (payload?.runId) activeRunIdRef.current = String(payload.runId);
      const actor = payload?.name || "Someone";
      const fileName = payload?.fileName || "untitled";
      const lang = payload?.language || "code";
      appendTerminalLine("status", `${actor} started run: ${fileName} (${lang})`);
    };
    const onTerminalOutput = (payload: any) => {
      const type = payload?.type === "stderr" || payload?.type === "status" ? payload.type : "stdout";
      if (!payload?.text) return;
      appendTerminalLine(type, String(payload.text));
    };
    const onTerminalEnd = (payload: any) => {
      if (payload?.runId && activeRunIdRef.current && payload.runId !== activeRunIdRef.current) return;
      const exitCode = Number(payload?.exitCode ?? 0);
      appendTerminalLine(exitCode === 0 ? "status" : "stderr", `Process exited with code ${exitCode}`);
      setIsExecutingCode(false);
      activeRunIdRef.current = null;
    };

    socket.on("code-change", onCodeChange);
    socket.on("room-users", onRoomUsers);
    socket.on("file-open", onRemoteFileOpen);
    socket.on("cursor-move", onCursorMove);
    socket.on("file-open", onUserFileOpenToast);
    socket.on("terminal-start", onTerminalStart);
    socket.on("terminal-output", onTerminalOutput);
    socket.on("terminal-end", onTerminalEnd);
    return () => {
      socket.off("code-change", onCodeChange);
      socket.off("room-users", onRoomUsers);
      socket.off("file-open", onRemoteFileOpen);
      socket.off("cursor-move", onCursorMove);
      socket.off("file-open", onUserFileOpenToast);
      socket.off("terminal-start", onTerminalStart);
      socket.off("terminal-output", onTerminalOutput);
      socket.off("terminal-end", onTerminalEnd);
    };
  }, [roomCode, updateFileContent]);

  useEffect(() => {
    const userIds = new Set(roomUsers.map((member) => member.userId));
    setRemoteCursors((prev) => prev.filter((cursor) => userIds.has(cursor.userId)));
  }, [roomUsers]);

  useEffect(() => {
    if (!roomCode || !activeFile) return;
    socket.emit("file-open", {
      roomId: roomCode,
      fileId: activeFile.id,
      fileName: activeFile.name,
    });
  }, [roomCode, activeFile?.id]);

  useEffect(() => {
    const token = localStorage.getItem("ignis-token");
    if (!token) {
      toast.error("Please login to use collaborative rooms.");
      navigate("/login");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    hydrateRoomsList().catch(() => null);
    if (!code) return;
    setRoomCode(code);
    hydrateRoom(code).catch(() => {
      // Keep local editor usable even if room hydration fails.
    });
  }, [navigate]);

  const hydrateRoom = async (code: string) => {
    const room = await api.joinRoom({ roomId: code });
    const remoteFiles = await api.getFiles({ roomId: room._id });
    const membersPayload = await api.getRoomMembers({ roomId: room.roomId });
    if (Array.isArray(remoteFiles) && remoteFiles.length > 0) {
      loadRoomFiles(remoteFiles);
    } else if (files.length === 0) {
      loadRoomFiles([]);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("room", room.roomId);
    window.history.replaceState({}, "", url.toString());
    setRoomCode(room.roomId);
    setRoomRole((room.currentUserRole as any) || "viewer");
    setRoomMembers(Array.isArray(membersPayload?.members) ? membersPayload.members : []);
    toast.success(`Connected to room ${room.roomId}`);
    await hydrateRoomsList();
  };

  const handleCreateRoom = async () => {
    const roomName = newRoomName.trim() || `Room ${new Date().toLocaleTimeString()}`;
    setIsCreatingRoom(true);
    try {
      const room = await api.createRoom({ name: roomName });
      const url = new URL(window.location.href);
      url.searchParams.set("room", room.roomId);
      window.history.replaceState({}, "", url.toString());
      setRoomCode(room.roomId);
      setRoomRole("owner");
      await navigator.clipboard.writeText(
        `${window.location.origin}/editor?room=${encodeURIComponent(room.roomId)}`
      );
      toast.success(`Room created (${room.roomId}). Link copied.`);
      await hydrateRoomsList();
      setNewRoomName("");
      setIsRoomsDialogOpen(false);
    } catch (error: any) {
      if ((error?.message || "").toLowerCase().includes("unauthorized")) {
        toast.error("Please login to create a room.");
        navigate("/login");
      } else {
        toast.error(error?.message || "Unable to create room");
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (inputCode?: string) => {
    const selectedCode = (inputCode || joinRoomCode).trim().toUpperCase();
    if (!selectedCode) {
      toast.error("Enter a room code.");
      return;
    }
    setIsJoiningRoom(true);
    try {
      await hydrateRoom(selectedCode);
      toast.success("Joined room successfully");
      setJoinRoomCode("");
      setIsRoomsDialogOpen(false);
    } catch (error: any) {
      if ((error?.message || "").toLowerCase().includes("unauthorized")) {
        toast.error("Please login to join rooms.");
        navigate("/login");
      } else {
        toast.error(error?.message || "Unable to join room");
      }
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleShareRoom = async () => {
    if (!roomCode) {
      toast.error("Create or join a room first.");
      return;
    }
    const url = `${window.location.origin}/editor?room=${encodeURIComponent(roomCode)}`;
    await navigator.clipboard.writeText(url);
    toast.success("Room link copied to clipboard.");
  };

  const handleLeaveRoom = () => {
    setRoomCode("");
    setRoomRole("none");
    setRoomUsers([]);
    setRoomMembers([]);
    setRemoteCursors([]);
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url.toString());
    if (socket.connected) {
      socket.disconnect();
    }
    toast.success("Left room.");
  };

  const copyRoomCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    toast.success("Copied!", { duration: 2000 });
  };

  const handleLocalCodeChange = (
    fileId: string,
    content: string,
    cursorPositionArg?: { lineNumber: number; column: number }
  ) => {
    if (!roomCode || !socket.connected) return;
    if (roomRole === "viewer") return;
    if (isRemoteChangeRef.current) return;
    if (emitTimersRef.current[fileId]) {
      window.clearTimeout(emitTimersRef.current[fileId]);
    }
    emitTimersRef.current[fileId] = window.setTimeout(() => {
      socket.emit("code-change", { roomId: roomCode, fileId, content, cursorPosition: cursorPositionArg });
    }, 120);
  };

  const handleCursorMove = (payload: { lineNumber: number; column: number }) => {
    if (!roomCode || !socket.connected) return;
    socket.emit("cursor-move", { roomId: roomCode, cursorPosition: payload });
  };

  useEffect(() => {
    if (!activeFile || activeFile.type !== "file") return;
    if ((activeFile.content || "") === (activeFile.savedContent || "")) {
      setSavingState("idle");
      return;
    }
    setSavingState("saving");
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      saveFile(activeFile.id);
      setSavingState("saved");
      if (saveStateTimerRef.current) window.clearTimeout(saveStateTimerRef.current);
      saveStateTimerRef.current = window.setTimeout(() => setSavingState("idle"), 1200);
    }, 1000);
  }, [activeFile?.content, activeFile?.savedContent, activeFile?.id, saveFile]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
      if (saveStateTimerRef.current) window.clearTimeout(saveStateTimerRef.current);
    };
  }, []);

  const appendTerminalLine = (type: "stdout" | "stderr" | "status", text: string) => {
    setTerminalLines((prev) => [...prev, { type, text }]);
  };

  const runCurrentFile = async () => {
    if (!activeFile || activeFile.type !== "file") {
      toast.error("No active file to run.");
      return;
    }
    const selectedLanguage = (activeFile.language || "").toLowerCase();
    const executableLanguage = EXECUTABLE_LANGUAGES.has(selectedLanguage)
      ? selectedLanguage
      : activeFile.extension === "sh"
        ? "shell"
        : activeFile.extension === "py"
          ? "python"
        : activeFile.extension === "tsx"
          ? "typescript"
          : activeFile.extension === "jsx"
            ? "javascript"
          : activeFile.extension === "ts"
            ? "typescript"
            : activeFile.extension === "js"
              ? "javascript"
              : activeFile.extension === "java"
                ? "java"
                : activeFile.extension === "cpp" || activeFile.extension === "cc" || activeFile.extension === "cxx"
                  ? "cpp"
                  : activeFile.extension === "c"
                    ? "c"
                    : activeFile.extension === "go"
                      ? "go"
                      : "";

    if (!executableLanguage) {
      appendTerminalLine(
        "stderr",
        `Language "${activeFile.language || activeFile.extension || "unknown"}" is not executable in terminal.`
      );
      appendTerminalLine("stderr", "Use javascript/typescript/python/java/cpp/c/go/shell.");
      setIsTerminalOpen(true);
      return;
    }

    setIsTerminalOpen(true);
    setIsExecutingCode(true);
    if (roomCode && socket.connected) {
      const accepted = await new Promise<boolean>((resolve) => {
        let resolved = false;
        const timer = window.setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }, 1200);

        socket.emit(
          "terminal-run",
          {
            roomId: roomCode,
            fileName: activeFile.name,
            language: executableLanguage,
            code: activeFile.content || "",
          },
          (ack?: { ok?: boolean; reason?: string }) => {
            if (resolved) return;
            window.clearTimeout(timer);
            resolved = true;
            if (ack?.ok) {
              resolve(true);
              return;
            }
            if (ack?.reason === "busy") {
              appendTerminalLine("status", "A run is already in progress for this room.");
            } else if (ack?.reason === "forbidden") {
              appendTerminalLine("stderr", "You do not have permission to run code in this room.");
            }
            resolve(false);
          }
        );
      });
      if (accepted) return;
    }
    appendTerminalLine("status", `Running ${activeFile.name} (${executableLanguage})...`);
    try {
      const result = await api.executeCode({
        code: activeFile.content || "",
        language: executableLanguage,
      });
      if (result?.output) appendTerminalLine("stdout", String(result.output));
      if (result?.error) appendTerminalLine("stderr", String(result.error));
      if (!result?.output && !result?.error) {
        appendTerminalLine("status", "(no output)");
      }
      const exitCode = Number(result?.exitCode ?? 0);
      appendTerminalLine(exitCode === 0 ? "status" : "stderr", `Process exited with code ${exitCode}`);
    } catch (error: any) {
      const message = error?.message || "Execution failed.";
      appendTerminalLine("stderr", message);
      if (
        message.toLowerCase().includes("failed to fetch") ||
        message.toLowerCase().includes("network")
      ) {
        toast.error("Cannot reach the Ignis server. Start it with: npm run server:dev");
      }
    } finally {
      setIsExecutingCode(false);
    }
  };

  const updateMemberRole = async (memberUserId: string, role: "owner" | "editor" | "viewer") => {
    if (!roomCode) return;
    setIsUpdatingRole(memberUserId);
    try {
      const response = await api.updateRoomMemberRole({
        roomId: roomCode,
        memberUserId,
        role,
      });
      setRoomMembers(Array.isArray(response?.members) ? response.members : []);
      if (response?.currentUserRole) setRoomRole(response.currentUserRole);
      toast.success("Permission updated.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update permission.");
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const persistLanguage = async (language: string) => {
    if (!activeFile || activeFile.type !== "file") return;
    setFileLanguage(activeFile.id, language);
    try {
      await api.updateFile({
        fileId: activeFile.id,
        language,
      });
    } catch {
      // Keep local editor usable when backend file id is local-only.
    }
  };

  const startResizeTerminal = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = terminalHeight;
    const onMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      setTerminalHeight(Math.max(140, Math.min(500, startHeight + delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-card text-foreground">
      <EditorNavbar
        roomCode={roomCode}
        onlineMembers={roomUsers}
        onOpenRooms={() => setIsRoomsDialogOpen(true)}
        onShareRoom={handleShareRoom}
        onToggleTerminal={() => setIsTerminalOpen((open) => !open)}
        onRunCode={runCurrentFile}
        onCopyRoomCode={copyRoomCode}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-56 border-r border-border bg-secondary/50">
          <FileExplorer />
        </div>
        <div className="flex flex-col flex-1 min-h-0 relative">
          <GlobalSearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
          <EditorTabs />
          <div className="flex-1 min-h-0">
            <CodeEditor
              onLocalCodeChange={handleLocalCodeChange}
              onCursorMove={handleCursorMove}
              onCursorPositionChange={setCursorPosition}
              readOnly={roomRole === "viewer"}
              editorFontSize={editorFontSize}
              isRemoteChangeRef={isRemoteChangeRef}
              remoteCursors={remoteCursors}
            />
          </div>
          {isTerminalOpen && (
            <div
              className="h-1 cursor-row-resize bg-secondary border-t border-border"
              onMouseDown={startResizeTerminal}
            />
          )}
          {isTerminalOpen && (
            <TerminalPanel
              height={terminalHeight}
              lines={terminalLines}
              isRunning={isExecutingCode}
              onClear={() => setTerminalLines([])}
            />
          )}
        </div>
      </div>
      <StatusBar
        savingState={savingState}
        cursorPosition={cursorPosition}
        currentLanguage={activeFile?.language || "plaintext"}
        onLanguageChange={persistLanguage}
      />
      <Dialog open={isRoomsDialogOpen} onOpenChange={setIsRoomsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rooms</DialogTitle>
            <DialogDescription>Create, join, and manage your collaboration rooms.</DialogDescription>
          </DialogHeader>
          {isInRoom && (
            <div className="rounded-md border border-border p-3 bg-secondary/40 space-y-2">
              <p className="text-sm font-medium">Current Room</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Code</p>
                  <p className="text-sm font-mono">{roomCode}</p>
                  <p className="text-xs text-muted-foreground mt-1">Role: {roomRole}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={copyRoomCode}>
                    Copy Code
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShareRoom}>
                    Copy Link
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleLeaveRoom}>
                    Leave Room
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Online Members ({roomUsers.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {roomUsers.length === 0 && (
                    <span className="text-xs text-muted-foreground">No active members yet.</span>
                  )}
                  {roomUsers.map((member) => (
                    <span
                      key={member.userId}
                      className="text-xs font-mono px-2 py-1 rounded border border-border"
                      style={{ borderColor: member.color || undefined }}
                    >
                      {member.name || "User"}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1">Permissions</p>
                <div className="space-y-1.5">
                  {roomMembers.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono truncate">
                        {member.name} {member.email ? `(${member.email})` : ""}
                      </span>
                      {roomRole === "owner" ? (
                        <select
                          value={member.role}
                          disabled={isUpdatingRole === member.userId}
                          onChange={(event) =>
                            updateMemberRole(
                              member.userId,
                              event.target.value as "owner" | "editor" | "viewer"
                            )
                          }
                          className="h-7 rounded border border-border bg-background px-2 text-xs font-mono"
                        >
                          <option value="owner">{ROLE_LABELS.owner}</option>
                          <option value="editor">{ROLE_LABELS.editor}</option>
                          <option value="viewer">{ROLE_LABELS.viewer}</option>
                        </select>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded border border-border">
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      )}
                    </div>
                  ))}
                  {roomMembers.length === 0 && (
                    <span className="text-xs text-muted-foreground">No members yet.</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isInRoom && (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Create Room</p>
                  <Input
                    value={newRoomName}
                    onChange={(event) => setNewRoomName(event.target.value)}
                    placeholder="Optional room name"
                  />
                  <Button onClick={handleCreateRoom} disabled={isCreatingRoom} className="w-full">
                    {isCreatingRoom ? "Creating..." : "Create Room"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Join by Code</p>
                  <Input
                    value={joinRoomCode}
                    onChange={(event) => setJoinRoomCode(event.target.value)}
                    placeholder="Enter room code"
                  />
                  <Button onClick={() => handleJoinRoom()} disabled={isJoiningRoom} className="w-full" variant="outline">
                    {isJoiningRoom ? "Joining..." : "Join Room"}
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">My Rooms</p>
            <div className="max-h-56 overflow-auto border border-border rounded-md">
              {myRooms.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">No rooms yet.</p>
              )}
              {myRooms.map((room) => (
                <div
                  key={room._id}
                  className="px-3 py-2 border-b border-border last:border-b-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono truncate">{room.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{room.roomId}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const url = `${window.location.origin}/editor?room=${encodeURIComponent(room.roomId)}`;
                        await navigator.clipboard.writeText(url);
                        toast.success("Invite link copied.");
                      }}
                    >
                      Copy
                    </Button>
                    {room.currentUserRole === "owner" ? (
                      <span className="text-xs px-2 py-1 rounded border border-border">Owner</span>
                    ) : (
                      <Button size="sm" onClick={() => handleJoinRoom(room.roomId)}>
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={hydrateRoomsList}>
              Refresh Rooms
            </Button>
            <Button onClick={() => setIsRoomsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditorPage;
