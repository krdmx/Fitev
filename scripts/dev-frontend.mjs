import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const webRoot = path.join(repoRoot, "apps", "web");
const frontendPort = 3000;
const composeFile = path.join(repoRoot, "docker-compose.frontend-dev.yaml");
const nextBin = path.join(
  webRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next"
);

let activeProcess = null;
let frontendProcess = null;
let shutdownRequested = false;
let requestedExitCode = null;

function runText(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function runChecked(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
      ...options,
    });

    activeProcess = child;

    child.on("error", (error) => {
      if (activeProcess === child) {
        activeProcess = null;
      }

      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (activeProcess === child) {
        activeProcess = null;
      }

      if (shutdownRequested) {
        resolve();
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal
            ? `${command} exited because of signal ${signal}`
            : `${command} exited with code ${code ?? 1}`
        )
      );
    });
  });
}

function normalize(value) {
  return value.replaceAll("\\", "/").toLowerCase();
}

function getListeningPids(port) {
  if (process.platform === "win32") {
    const result = runText("powershell.exe", [
      "-NoProfile",
      "-Command",
      `$ErrorActionPreference='SilentlyContinue'; Get-NetTCPConnection -LocalPort ${port} -State Listen | Select-Object -ExpandProperty OwningProcess`,
    ]);

    if (result.status && result.status !== 0) {
      return [];
    }

    return Array.from(
      new Set(
        result.stdout
          .split(/\r?\n/)
          .map((line) => Number.parseInt(line.trim(), 10))
          .filter((pid) => Number.isInteger(pid) && pid > 0)
      )
    );
  }

  const result = runText("ss", ["-ltnp", `( sport = :${port} )`]);

  if (result.status && result.status !== 0) {
    return [];
  }

  return Array.from(
    new Set(
      Array.from(result.stdout.matchAll(/pid=(\d+)/g), (match) =>
        Number.parseInt(match[1] ?? "", 10)
      ).filter((pid) => Number.isInteger(pid) && pid > 0)
    )
  );
}

function getProcessCommand(pid) {
  if (process.platform === "win32") {
    const result = runText("powershell.exe", [
      "-NoProfile",
      "-Command",
      `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`,
    ]);

    return (result.stdout ?? "").trim();
  }

  const result = runText("bash", [
    "-lc",
    `tr '\\0' ' ' < /proc/${pid}/cmdline 2>/dev/null`,
  ]);

  return (result.stdout ?? "").trim();
}

function describeProcess(pid) {
  const command = getProcessCommand(pid);
  return command ? `${command} (pid ${pid})` : `pid ${pid}`;
}

function isSafeRepoFrontendProcess(pid) {
  const command = normalize(getProcessCommand(pid));
  const normalizedRepoRoot = normalize(repoRoot);
  const normalizedWebRoot = normalize(webRoot);

  if (!command) {
    return false;
  }

  return (
    command.includes(normalizedWebRoot) ||
    (command.includes(normalizedRepoRoot) &&
      (command.includes("/next/dist/") ||
        command.includes("/node_modules/.pnpm/next@") ||
        command.includes("start-server.js") ||
        command.includes("next dev")))
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForPortToClear(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (getListeningPids(port).length === 0) {
      return true;
    }

    await sleep(200);
  }

  return getListeningPids(port).length === 0;
}

function killProcessTree(pid) {
  if (process.platform === "win32") {
    runText("taskkill", ["/PID", String(pid), "/T", "/F"]);
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
}

async function ensureFrontendPortAvailable() {
  const listeningPids = getListeningPids(frontendPort);

  if (listeningPids.length === 0) {
    return;
  }

  const safePids = listeningPids.filter(isSafeRepoFrontendProcess);

  if (safePids.length !== listeningPids.length) {
    const processes = listeningPids.map(describeProcess).join(", ");
    console.error(
      `Port ${frontendPort} is already in use by another process: ${processes}`
    );
    console.error(
      "Refusing to kill it automatically because it does not look like this repo's frontend."
    );
    process.exit(1);
  }

  console.log(
    `Port ${frontendPort} is busy. Stopping stale frontend process${safePids.length > 1 ? "es" : ""}...`
  );

  for (const pid of safePids) {
    killProcessTree(pid);
  }

  const cleared = await waitForPortToClear(frontendPort, 5000);

  if (!cleared) {
    const processes = getListeningPids(frontendPort)
      .map(describeProcess)
      .join(", ");

    console.error(
      `Port ${frontendPort} is still busy after cleanup: ${processes || "unknown process"}`
    );
    process.exit(1);
  }
}

function stopActiveProcessTree(signal) {
  if (shutdownRequested) {
    return;
  }

  shutdownRequested = true;
  requestedExitCode = signal === "SIGINT" ? 130 : 143;

  const target = frontendProcess ?? activeProcess;

  if (!target?.pid) {
    process.exit(requestedExitCode);
  }

  killProcessTree(target.pid);
}

async function main() {
  if (!existsSync(composeFile)) {
    throw new Error(`Missing compose file: ${composeFile}`);
  }

  if (!existsSync(nextBin)) {
    throw new Error(`Missing Next.js binary: ${nextBin}`);
  }

  await ensureFrontendPortAvailable();

  await runChecked("docker", ["compose", "-f", composeFile, "up", "-d", "--build"], {
    env: {
      ...process.env,
      COMPOSE_IGNORE_ORPHANS: "true",
    },
  });

  if (shutdownRequested) {
    process.exit(requestedExitCode ?? 1);
  }

  const nextCommand =
    process.platform === "win32"
      ? `"${nextBin}" dev --hostname 0.0.0.0 --port ${frontendPort}`
      : nextBin;
  const nextArgs =
    process.platform === "win32"
      ? []
      : ["dev", "--hostname", "0.0.0.0", "--port", String(frontendPort)];

  frontendProcess = spawn(nextCommand, nextArgs, {
    cwd: webRoot,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: "http://api.localhost",
      APP_MODE: "frontend-devmode",
      MOCK_MODE: process.env.MOCK_MODE ?? "false",
    },
    stdio: "inherit",
    detached: process.platform !== "win32",
    shell: process.platform === "win32",
  });

  activeProcess = frontendProcess;

  frontendProcess.on("error", (error) => {
    console.error("Failed to start the frontend dev server.");
    console.error(error);
    process.exit(1);
  });

  frontendProcess.on("exit", (code, signal) => {
    if (requestedExitCode !== null) {
      process.exit(requestedExitCode);
    }

    if (typeof code === "number") {
      process.exit(code);
    }

    process.exit(signal === "SIGINT" ? 130 : 1);
  });
}

process.on("SIGINT", () => {
  stopActiveProcessTree("SIGINT");
});

process.on("SIGTERM", () => {
  stopActiveProcessTree("SIGTERM");
});

main().catch((error) => {
  if (shutdownRequested && requestedExitCode !== null) {
    process.exit(requestedExitCode);
  }

  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
