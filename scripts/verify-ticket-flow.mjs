import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const apiDir = path.join(rootDir, "apps/api");
const composeFile = path.join(rootDir, "docker-compose.backend-dev.yaml");
const apiPort = 3101;
const mockPort = 5689;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

function log(message) {
  console.log(`[verify:ticket-flow] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fileExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readEnvFile(targetPath) {
  if (!(await fileExists(targetPath))) {
    return {};
  }

  const content = await readFile(targetPath, "utf8");
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value.replace(/\\n/g, "\n");
  }

  return entries;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Command failed: ${command} ${args.join(" ")}\n${stdout}${stderr}`
        )
      );
    });
  });
}

async function runCommandWithRetries(command, args, attempts, delayMs) {
  let lastError = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      return await runCommand(command, args);
    } catch (error) {
      lastError = error;
      await delay(delayMs);
    }
  }

  throw lastError;
}

function startProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? rootDir,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("error", (error) => {
    process.stderr.write(`[${name}] ${error.message}\n`);
  });

  return child;
}

async function stopProcess(child, name) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  child.kill("SIGTERM");

  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    delay(5_000).then(() => false),
  ]);

  if (!exited) {
    process.stderr.write(`[${name}] did not exit in time, sending SIGKILL\n`);
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", () => resolve(true)));
  }
}

async function waitForHttp(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const intervalMs = options.intervalMs ?? 500;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (response.ok) {
        return;
      }
    } catch {
      // retry until timeout
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (options.expectedStatus && response.status !== options.expectedStatus) {
    throw new Error(
      `Expected HTTP ${options.expectedStatus} for ${url}, received ${response.status}`
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request to ${url} failed with ${response.status}: ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function isPostgresRunning() {
  const result = await runCommand("docker", [
    "compose",
    "-f",
    composeFile,
    "ps",
    "--services",
    "--status",
    "running",
  ]);

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .includes("postgres");
}

function startMockN8n(callbackTarget, appSecret) {
  const callbackErrors = [];
  const receivedPayloads = [];

  const server = createServer((request, response) => {
    if (
      request.method !== "POST" ||
      request.url !== "/webhook/generate-cv"
    ) {
      response.statusCode = 404;
      response.end("Not found");
      return;
    }

    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      let payload;

      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch (error) {
        response.statusCode = 400;
        response.end("Invalid JSON");
        callbackErrors.push(error);
        return;
      }

      receivedPayloads.push(payload);

      setTimeout(() => {
        void fetch(`${callbackTarget}/api/v1/applications/${payload.ticketId}/result`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-app-secret": appSecret,
          },
          body: JSON.stringify({
            body: {
              personalNote: {
                message: "Mocked live callback result from verification flow.",
              },
              cvMarkdown: `# ${payload.fullName}\n\n## Summary\nLive webhook markdown for ${payload.ticketId} at ${payload.companyName}.\n\n## Target Role\n${payload.vacancyDescription}\n`,
              coverLetterMarkdown: `# Cover Letter\n\nDear Hiring Team at ${payload.companyName},\n\nThis live callback was mocked for ${payload.fullName}.\n\n## Context\n${payload.workTasks}\n`,
            },
          }),
        }).catch((error) => {
          callbackErrors.push(error);
        });
      }, 50);

      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ accepted: true }));
    });
  });

  return {
    async start() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(mockPort, "127.0.0.1", resolve);
      });
      log(`Mock n8n webhook listening on port ${mockPort}`);
    },
    async stop() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
    getLastError() {
      return callbackErrors[0] ?? null;
    },
    getReceivedPayloads() {
      return receivedPayloads;
    },
  };
}

async function seedProfile(apiBase) {
  await jsonRequest(`${apiBase}/api/v1/applications/fullName`, {
    method: "PUT",
    body: {
      fullName: "Verify User",
    },
  });

  await jsonRequest(`${apiBase}/api/v1/applications/baseCv`, {
    method: "PUT",
    body: {
      baseCv: "# Base CV\n\n- React\n- TypeScript\n- Systems thinking",
    },
  });

  await jsonRequest(`${apiBase}/api/v1/applications/workTasks`, {
    method: "PUT",
    body: {
      workTasks:
        "Build frontend features, collaborate with product, and ship reliable UI flows.",
    },
  });
}

async function createTicket(apiBase, suffix) {
  return jsonRequest(`${apiBase}/api/v1/applications`, {
    method: "POST",
    body: {
      companyName: `Verify Company ${suffix}`,
      vacancyDescription: `Senior Frontend Engineer role ${suffix}`,
    },
    expectedStatus: 202,
  });
}

async function waitForTicketCompletion(apiBase, ticketId, getBackgroundError) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 20_000) {
    const backgroundError = getBackgroundError?.();

    if (backgroundError) {
      throw backgroundError;
    }

    const response = await fetch(`${apiBase}/api/v1/applications/${ticketId}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Ticket poll failed with HTTP ${response.status} for ${ticketId}`
      );
    }

    const payload = await response.json();

    if (payload.status === "completed" && payload.result) {
      return payload;
    }

    if (payload.status === "failed") {
      throw new Error(`Ticket ${ticketId} failed: ${payload.lastError ?? "unknown"}`);
    }

    await delay(400);
  }

  throw new Error(`Timed out waiting for ticket ${ticketId} to complete`);
}

async function verifyLiveFlow(apiBase, envBase) {
  log("Building API for live-flow verification");
  await runCommand("pnpm", ["--filter", "@repo/api", "build"]);

  log("Applying Prisma migrations");
  await runCommandWithRetries(
    "pnpm",
    ["--filter", "@repo/api", "prisma:migrate"],
    12,
    2_000
  );

  const mockN8n = startMockN8n(apiBase, envBase.BACKEND_APP_SECRET);
  await mockN8n.start();

  const apiProcess = startProcess("api-live", "node", ["dist/main.js"], {
    cwd: apiDir,
    env: {
      ...envBase,
      BACKEND_PORT: String(apiPort),
      FRONTEND_ORIGIN:
        "http://localhost,http://localhost:3000,http://land.localhost",
      APP_MODE: "backend-devmode",
      APPLICATION_PIPELINE_MODE: "live",
      N8N_WORKFLOW_WEBHOOK_URL: `http://127.0.0.1:${mockPort}/webhook/generate-cv`,
    },
  });

  try {
    await waitForHttp(`${apiBase}/health`);
    await seedProfile(apiBase);

    const createPayload = await createTicket(apiBase, "live");
    const ticket = await waitForTicketCompletion(
      apiBase,
      createPayload.ticketId,
      () => mockN8n.getLastError()
    );

    assert(
      mockN8n.getReceivedPayloads().length > 0,
      "Mock n8n did not receive the application payload."
    );
    const [receivedPayload] = mockN8n.getReceivedPayloads();
    assert(
      receivedPayload?.companyName === "Verify Company live",
      "Live payload did not include the expected companyName."
    );
    assert(
      receivedPayload?.fullName === "Verify User",
      "Live payload did not include the expected profile fullName."
    );
    assert(
      ticket.result.cvMarkdown.includes("Live webhook markdown"),
      "Live callback CV markdown was not persisted."
    );
    assert(
      ticket.result.coverLetterMarkdown.includes("mocked for"),
      "Live callback cover letter markdown was not persisted."
    );
    assert(
      ticket.result.personalNote.includes("Mocked live callback result"),
      "Live callback personal note was not persisted."
    );

    await jsonRequest(`${apiBase}/api/v1/applications/${ticket.ticketId}/result`, {
      method: "PUT",
      body: {
        cvMarkdown: "# Edited CV\n\nUpdated after verification.",
        coverLetterMarkdown:
          "# Edited Cover Letter\n\nUpdated after verification.",
      },
    });

    const updatedTicket = await jsonRequest(
      `${apiBase}/api/v1/applications/${ticket.ticketId}`
    );

    assert(
      updatedTicket.result.cvMarkdown.includes("Edited CV"),
      "PUT /result did not save the edited CV markdown."
    );
    assert(
      updatedTicket.result.coverLetterMarkdown.includes("Edited Cover Letter"),
      "PUT /result did not save the edited cover letter markdown."
    );

    await jsonRequest(`${apiBase}/api/v1/applications/${ticket.ticketId}`, {
      method: "DELETE",
      expectedStatus: 204,
    });

    const deletedResponse = await fetch(
      `${apiBase}/api/v1/applications/${ticket.ticketId}`,
      {
        method: "GET",
      }
    );

    assert(
      deletedResponse.status === 404,
      "Deleted ticket should return HTTP 404."
    );

    log("Live-flow verification passed");
  } finally {
    await stopProcess(apiProcess, "api-live");
    await mockN8n.stop();
  }
}

async function verifyMockFlow(apiBase, envBase) {
  const apiProcess = startProcess("api-mock", "node", ["dist/main.js"], {
    cwd: apiDir,
    env: {
      ...envBase,
      BACKEND_PORT: String(apiPort),
      FRONTEND_ORIGIN:
        "http://localhost,http://localhost:3000,http://land.localhost",
      APP_MODE: "backend-devmode",
      APPLICATION_PIPELINE_MODE: "mock",
    },
  });

  try {
    await waitForHttp(`${apiBase}/health`);
    await seedProfile(apiBase);

    const createPayload = await createTicket(apiBase, "mock");
    const ticket = await waitForTicketCompletion(apiBase, createPayload.ticketId);

    assert(
      ticket.result.cvMarkdown.includes("Generated in backend-devmode"),
      "Mock mode should generate markdown CV placeholder."
    );
    assert(
      ticket.result.coverLetterMarkdown.includes("This mock cover letter"),
      "Mock mode should generate markdown cover letter placeholder."
    );

    log("Mock-flow verification passed");
  } finally {
    await stopProcess(apiProcess, "api-mock");
  }
}

async function main() {
  const envBase = {
    ...(await readEnvFile(path.join(apiDir, ".env.example"))),
    ...(await readEnvFile(path.join(apiDir, ".env"))),
  };

  assert(envBase.DATABASE_URL, "DATABASE_URL must be configured in apps/api/.env");
  assert(
    envBase.BACKEND_APP_SECRET,
    "BACKEND_APP_SECRET must be configured in apps/api/.env"
  );

  const postgresWasRunning = await isPostgresRunning();

  if (!postgresWasRunning) {
    log("Starting local Postgres container");
    await runCommand("docker", [
      "compose",
      "-f",
      composeFile,
      "up",
      "-d",
      "postgres",
    ]);
  } else {
    log("Using existing local Postgres container");
  }

  try {
    await verifyLiveFlow(apiBaseUrl, envBase);
    await verifyMockFlow(apiBaseUrl, envBase);
    log("All ticket flow checks passed");
  } finally {
    if (!postgresWasRunning) {
      log("Stopping Postgres container started by verification");
      await runCommand("docker", [
        "compose",
        "-f",
        composeFile,
        "stop",
        "postgres",
      ]);
    }
  }
}

main().catch((error) => {
  console.error(`[verify:ticket-flow] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});
