import jwt from "jsonwebtoken";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import esbuild from "esbuild";
import { randomUUID } from "crypto";

import File from "../models/File.js";
import Room from "../models/Room.js";

const rooms = new Map(); // roomId -> Map(socketId -> { userId, name, color })
const runningExecutions = new Map(); // roomId -> { runId }

const CURSOR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
];

function pickRandomColor() {
  const idx = Math.floor(Math.random() * CURSOR_COLORS.length);
  return CURSOR_COLORS[idx];
}

const EXEC_TIMEOUT_MS = 15_000;

function isCommandMissing(errorText) {
  const value = String(errorText || "").toLowerCase();
  return value.includes("enoent") || value.includes("not found") || value.includes("is not recognized");
}

function streamProcess(io, roomId, command, args, options = {}) {
  const { timeoutMs = EXEC_TIMEOUT_MS, cwd } = options;
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { shell: false, cwd });
    } catch (error) {
      resolve({
        exitCode: 1,
        errorText: error?.message || "Failed to start process",
        commandMissing: true,
      });
      return;
    }

    let stderrBuffer = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      const text = String(chunk || "").replace(/\r\n/g, "\n");
      if (text.length > 0) {
        io.to(roomId).emit("terminal-output", { type: "stdout", text });
      }
    });

    child.stderr?.on("data", (chunk) => {
      const text = String(chunk || "").replace(/\r\n/g, "\n");
      stderrBuffer += text;
      if (text.length > 0) {
        io.to(roomId).emit("terminal-output", { type: "stderr", text });
      }
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      const errorText = `${stderrBuffer}${error?.message || "Failed to execute process"}`;
      resolve({ exitCode: 1, errorText, commandMissing: isCommandMissing(errorText) });
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      if (timedOut) {
        io.to(roomId).emit("terminal-output", {
          type: "stderr",
          text: "Process timed out after 15 seconds.",
        });
      }
      resolve({
        exitCode: timedOut ? -1 : exitCode ?? 0,
        errorText: stderrBuffer,
        commandMissing: isCommandMissing(stderrBuffer),
      });
    });
  });
}

async function executeCodeStreaming({ io, roomId, runId, code, language }) {
  const randomId = `ignis-${runId}-${Date.now()}`;
  const tmpDir = os.tmpdir();
  const createdPaths = [];

  const cleanup = async () => {
    await Promise.all(
      createdPaths.map(async (targetPath) => {
        try {
          await fs.rm(targetPath, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors.
        }
      })
    );
  };

  try {
    if (language === "javascript") {
      const filePath = path.join(tmpDir, `${randomId}.js`);
      createdPaths.push(filePath);
      await fs.writeFile(filePath, code, "utf8");
      return await streamProcess(io, roomId, "node", [filePath]);
    }

    if (language === "typescript") {
      const sourcePath = path.join(tmpDir, `${randomId}.ts`);
      const outputPath = path.join(tmpDir, `${randomId}.mjs`);
      createdPaths.push(sourcePath, outputPath);
      await fs.writeFile(sourcePath, code, "utf8");
      try {
        await esbuild.build({
          entryPoints: [sourcePath],
          outfile: outputPath,
          bundle: false,
          platform: "node",
          format: "esm",
          target: "node18",
          logLevel: "silent",
        });
      } catch (error) {
        const err = error?.message || "TypeScript compilation failed.";
        io.to(roomId).emit("terminal-output", { type: "stderr", text: err });
        return { exitCode: 1, errorText: err, commandMissing: false };
      }
      return await streamProcess(io, roomId, "node", [outputPath]);
    }

    if (language === "python") {
      const filePath = path.join(tmpDir, `${randomId}.py`);
      createdPaths.push(filePath);
      await fs.writeFile(filePath, code, "utf8");
      const primary = await streamProcess(io, roomId, "python3", [filePath]);
      if (primary.exitCode !== 0 && primary.commandMissing) {
        return await streamProcess(io, roomId, "python", [filePath]);
      }
      return primary;
    }

    if (language === "shell") {
      const filePath = path.join(tmpDir, `${randomId}.sh`);
      createdPaths.push(filePath);
      await fs.writeFile(filePath, code, "utf8");
      const primary = await streamProcess(io, roomId, "bash", [filePath]);
      if (primary.exitCode !== 0 && primary.commandMissing && process.platform === "win32") {
        const psFilePath = path.join(tmpDir, `${randomId}.ps1`);
        createdPaths.push(psFilePath);
        await fs.writeFile(psFilePath, code.replace(/\r\n/g, "\n"), "utf8");
        return await streamProcess(io, roomId, "powershell", [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          psFilePath,
        ]);
      }
      return primary;
    }

    if (language === "go") {
      const filePath = path.join(tmpDir, `${randomId}.go`);
      createdPaths.push(filePath);
      await fs.writeFile(filePath, code, "utf8");
      return await streamProcess(io, roomId, "go", ["run", filePath]);
    }

    if (language === "java") {
      const classNameMatch = code.match(/public\s+class\s+([A-Za-z_]\w*)/);
      const className = classNameMatch?.[1] || "Main";
      const workDir = path.join(tmpDir, `ignis-java-${randomId}`);
      createdPaths.push(workDir);
      await fs.mkdir(workDir, { recursive: true });
      const javaFile = path.join(workDir, `${className}.java`);
      await fs.writeFile(javaFile, code, "utf8");
      const compile = await streamProcess(io, roomId, "javac", [javaFile]);
      if (compile.exitCode !== 0) return compile;
      return await streamProcess(io, roomId, "java", ["-cp", workDir, className], { cwd: workDir });
    }

    if (language === "cpp" || language === "c") {
      const ext = language === "cpp" ? ".cpp" : ".c";
      const compiler = language === "cpp" ? "g++" : "gcc";
      const sourcePath = path.join(tmpDir, `${randomId}${ext}`);
      const outputPath =
        process.platform === "win32"
          ? path.join(tmpDir, `${randomId}.exe`)
          : path.join(tmpDir, randomId);
      createdPaths.push(sourcePath, outputPath);
      await fs.writeFile(sourcePath, code, "utf8");
      const compile = await streamProcess(io, roomId, compiler, [sourcePath, "-o", outputPath]);
      if (compile.exitCode !== 0) return compile;
      return await streamProcess(io, roomId, outputPath, []);
    }

    io.to(roomId).emit("terminal-output", {
      type: "stderr",
      text: `Unsupported language "${language}".`,
    });
    return { exitCode: 1, errorText: "Unsupported language", commandMissing: false };
  } finally {
    await cleanup();
  }
}

function getRoomUsers(roomId) {
  const roomMap = rooms.get(roomId);
  if (!roomMap) return [];
  return Array.from(roomMap.values()).map((u) => ({
    userId: u.userId,
    name: u.name,
    color: u.color,
  }));
}

async function getRoomRoleByCode(roomId, userId) {
  const room = await Room.findOne({ roomId }).select("createdBy members").lean();
  if (!room) return null;
  const member = (room.members || []).find((item) => {
    if (item?.user) return item.user.toString() === userId;
    return item?.toString?.() === userId;
  });
  if (!member) return null;
  if (member?.role) return member.role;
  return room.createdBy?.toString?.() === userId ? "owner" : "editor";
}

export default function initSockets(io) {
  io.on("connection", (socket) => {
    socket.on("join-room", async (data) => {
      try {
        const { roomId, token } = data || {};
        if (!roomId || !token) return;

        const { JWT_SECRET } = process.env;
        if (!JWT_SECRET) return;

        let decoded;
        try {
          decoded = jwt.verify(token, JWT_SECRET);
        } catch {
          return;
        }

        const userId = decoded?.id;
        const name = decoded?.name || "User";
        if (!userId) return;

        socket.join(roomId);

        let roomMap = rooms.get(roomId);
        if (!roomMap) {
          roomMap = new Map();
          rooms.set(roomId, roomMap);
        }

        const roomDoc = await Room.findOne({ roomId, members: userId }).select("_id");
        if (!roomDoc) {
          return;
        }
        roomMap.set(socket.id, {
          userId,
          name,
          color: pickRandomColor(),
          roomDbId: roomDoc._id.toString(),
          role: await getRoomRoleByCode(roomId, userId),
        });

        io.to(roomId).emit("room-users", getRoomUsers(roomId));
      } catch {
        // Silent: do not crash socket handlers
      }
    });

    socket.on("code-change", async (data) => {
      try {
        const { roomId, fileId, content, cursorPosition } = data || {};
        if (!roomId || !fileId) return;

        const roomMap = rooms.get(roomId);
        const user = roomMap?.get(socket.id);
        if (!user) return;
        const latestRole = await getRoomRoleByCode(roomId, user.userId);
        if (!latestRole || latestRole === "viewer") return;
        user.role = latestRole;

        // Update code in MongoDB first; broadcast regardless of update result.
        try {
          await File.updateOne(
            { _id: fileId, roomId: user.roomDbId },
            { $set: { content: content ?? "" } }
          );
        } catch {
          // Silent
        }

        socket.to(roomId).emit("code-change", {
          fileId,
          content: content ?? "",
          userId: user.userId,
          cursorPosition,
        });
      } catch {
        // Silent
      }
    });

    socket.on("cursor-move", (data) => {
      try {
        const { roomId, cursorPosition, selection } = data || {};
        if (!roomId) return;

        const roomMap = rooms.get(roomId);
        const user = roomMap?.get(socket.id);
        if (!user) return;

        socket.to(roomId).emit("cursor-move", {
          userId: user.userId,
          name: user.name,
          cursorPosition,
          selection,
          color: user.color,
        });
      } catch {
        // Silent
      }
    });

    socket.on("terminal-run", async (data, callback) => {
      const respond = (payload) => {
        try {
          if (typeof callback === "function") callback(payload);
        } catch {
          // Ignore callback errors.
        }
      };
      try {
        const { roomId, code, language, fileName } = data || {};
        if (!roomId || typeof code !== "string" || !code.trim() || !language) {
          respond({ ok: false, reason: "invalid-payload" });
          return;
        }

        const roomMap = rooms.get(roomId);
        const user = roomMap?.get(socket.id);
        if (!user) {
          respond({ ok: false, reason: "not-joined" });
          return;
        }

        const latestRole = await getRoomRoleByCode(roomId, user.userId);
        if (!latestRole || latestRole === "viewer") {
          respond({ ok: false, reason: "forbidden" });
          return;
        }
        user.role = latestRole;

        const activeExecution = runningExecutions.get(roomId);
        if (activeExecution) {
          io.to(roomId).emit("terminal-output", {
            type: "status",
            text: "A run is already in progress for this room.",
          });
          respond({ ok: false, reason: "busy" });
          return;
        }

        const runId = randomUUID();
        io.to(roomId).emit("terminal-start", {
          runId,
          fileName: fileName || "untitled",
          language,
          userId: user.userId,
          name: user.name,
        });
        respond({ ok: true, runId });

        const runner = executeCodeStreaming({ io, roomId, runId, code, language }).then((result) => {
          io.to(roomId).emit("terminal-end", {
            runId,
            exitCode: Number(result?.exitCode ?? 1),
          });
        });

        runningExecutions.set(roomId, { runId });

        await runner;
        runningExecutions.delete(roomId);
      } catch {
        respond({ ok: false, reason: "internal-error" });
        // Silent
      }
    });

    socket.on("file-open", (data) => {
      try {
        const { roomId, fileId, fileName } = data || {};
        if (!roomId) return;

        const roomMap = rooms.get(roomId);
        const user = roomMap?.get(socket.id);
        if (!user) return;

        socket.to(roomId).emit("file-open", {
          userId: user.userId,
          name: user.name,
          fileId,
          fileName,
        });
      } catch {
        // Silent
      }
    });

    socket.on("disconnect", () => {
      try {
        const affectedRooms = [];

        for (const [roomId, roomMap] of rooms.entries()) {
          if (roomMap.has(socket.id)) {
            roomMap.delete(socket.id);
            affectedRooms.push(roomId);
            if (roomMap.size === 0) {
              rooms.delete(roomId);
            }
          }
        }

        for (const roomId of affectedRooms) {
          io.to(roomId).emit("room-users", getRoomUsers(roomId));
        }
      } catch {
        // Silent
      }
    });
  });
}

