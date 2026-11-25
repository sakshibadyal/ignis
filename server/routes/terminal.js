import express from "express";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import esbuild from "esbuild";
import auth from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

const EXEC_TIMEOUT_MS = 15_000;

const LANGUAGE_CONFIG = {
  javascript: { ext: ".js" },
  typescript: { ext: ".ts" },
  python: { ext: ".py" },
  java: { ext: ".java" },
  cpp: { ext: ".cpp" },
  c: { ext: ".c" },
  go: { ext: ".go" },
  shell: { ext: ".sh" },
};

function runProcess(command, args, timeoutMs = EXEC_TIMEOUT_MS) {
  return new Promise((resolve) => {
    try {
      const child = spawn(command, args, { shell: false });
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);

      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        resolve({
          output: stdout,
          error: `${stderr}${error.message || "Failed to start process"}`,
          exitCode: 1,
        });
      });
      child.on("close", (exitCode) => {
        clearTimeout(timer);
        resolve({
          output: stdout,
          error: timedOut ? `${stderr}\nProcess timed out after 15 seconds.`.trim() : stderr,
          exitCode: timedOut ? -1 : (exitCode ?? 0),
        });
      });
    } catch (error) {
      resolve({
        output: "",
        error: error?.message || "Execution failed.",
        exitCode: 1,
      });
    }
  });
}

function isCommandMissing(errorText) {
  const value = String(errorText || "").toLowerCase();
  return value.includes("enoent") || value.includes("not found") || value.includes("is not recognized");
}

router.post("/execute", async (req, res) => {
  try {
    const { code, language } = req.body || {};
    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "Code is required." });
    }
    if (typeof language !== "string" || !LANGUAGE_CONFIG[language]) {
      return res.status(400).json({ error: "Unsupported language." });
    }

    const now = Date.now();
    const tmpDir = os.tmpdir();
    const randomId = `${req.user?.id || "user"}-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const createdPaths = [];

    const cleanup = async () => {
      await Promise.all(
        createdPaths.map(async (targetPath) => {
          try {
            await fs.rm(targetPath, { recursive: true, force: true });
          } catch {
            // ignore cleanup errors
          }
        })
      );
    };

    try {
      if (language === "javascript") {
        const filePath = path.join(tmpDir, `${randomId}.js`);
        createdPaths.push(filePath);
        await fs.writeFile(filePath, code, "utf8");
        const result = await runProcess("node", [filePath]);
        return res.json(result);
      }

      if (language === "typescript") {
        const sourcePath = path.join(tmpDir, `${randomId}.ts`);
        const outputPath = path.join(tmpDir, `${randomId}.mjs`);
        createdPaths.push(sourcePath, outputPath);
        await fs.writeFile(sourcePath, code, "utf8");
        await esbuild.build({
          entryPoints: [sourcePath],
          outfile: outputPath,
          bundle: false,
          platform: "node",
          format: "esm",
          target: "node18",
          logLevel: "silent",
        });
        const result = await runProcess("node", [outputPath]);
        return res.json(result);
      }

      if (language === "python") {
        const filePath = path.join(tmpDir, `${randomId}.py`);
        createdPaths.push(filePath);
        await fs.writeFile(filePath, code, "utf8");
        const primary = await runProcess("python3", [filePath]);
        if (primary.exitCode !== 0 && isCommandMissing(primary.error)) {
          const fallback = await runProcess("python", [filePath]);
          return res.json(fallback);
        }
        return res.json(primary);
      }

      if (language === "java") {
        const classNameMatch = code.match(/public\s+class\s+([A-Za-z_]\w*)/);
        const className = classNameMatch?.[1] || "Main";
        const workDir = path.join(tmpDir, `ignis-java-${randomId}`);
        createdPaths.push(workDir);
        await fs.mkdir(workDir, { recursive: true });
        const javaFile = path.join(workDir, `${className}.java`);
        await fs.writeFile(javaFile, code, "utf8");
        const compile = await runProcess("javac", [javaFile]);
        if (compile.exitCode !== 0) return res.json(compile);
        const run = await runProcess("java", ["-cp", workDir, className]);
        return res.json(run);
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
        const compile = await runProcess(compiler, [sourcePath, "-o", outputPath]);
        if (compile.exitCode !== 0) return res.json(compile);
        const run = await runProcess(outputPath, []);
        return res.json(run);
      }

      if (language === "go") {
        const filePath = path.join(tmpDir, `${randomId}.go`);
        createdPaths.push(filePath);
        await fs.writeFile(filePath, code, "utf8");
        const result = await runProcess("go", ["run", filePath]);
        return res.json(result);
      }

      if (language === "shell") {
        const filePath = path.join(tmpDir, `${randomId}.sh`);
        createdPaths.push(filePath);
        await fs.writeFile(filePath, code, "utf8");
        const primary = await runProcess("bash", [filePath]);
        if (primary.exitCode !== 0 && isCommandMissing(primary.error) && process.platform === "win32") {
          const powershellScript = code.replace(/\r\n/g, "\n");
          const psFilePath = path.join(tmpDir, `${randomId}.ps1`);
          createdPaths.push(psFilePath);
          await fs.writeFile(psFilePath, powershellScript, "utf8");
          const fallback = await runProcess("powershell", [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            psFilePath,
          ]);
          return res.json(fallback);
        }
        return res.json(primary);
      }

      return res.status(400).json({ error: "Unsupported language." });
    } catch (error) {
      return res.status(500).json({
        output: "",
        error: error?.message || "Failed to execute code.",
        exitCode: 1,
      });
    } finally {
      await cleanup();
    }
  } catch {
    return res.status(500).json({ output: "", error: "Internal server error", exitCode: 1 });
  }
});

export default router;
