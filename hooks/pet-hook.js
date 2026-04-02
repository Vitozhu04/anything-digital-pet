#!/usr/bin/env node
// hooks/pet-hook.js
// Claude Code hook → HTTP POST to desktop pet on port 23334
//
// Reads hook payload from stdin, maps to pet state, sends event.
// Silently fails if pet app isn't running (no error output).
//
// Usage in ~/.claude/settings.json:
// {
//   "hooks": {
//     "PreToolUse": [{ "command": "node /path/to/hooks/pet-hook.js" }],
//     "PostToolUse": [{ "command": "node /path/to/hooks/pet-hook.js" }],
//     "Stop": [{ "command": "node /path/to/hooks/pet-hook.js" }]
//   }
// }

const http = require("http");

const HOOK_TYPE = process.env.CLAUDE_HOOK_TYPE; // PreToolUse, PostToolUse, Stop

async function main() {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    return; // Not JSON, ignore
  }

  let state = "idle";
  let summary = "";

  if (HOOK_TYPE === "PreToolUse") {
    state = "thinking";
    summary = `Using ${payload.tool_name || "tool"}...`;
  } else if (HOOK_TYPE === "PostToolUse") {
    if (payload.tool_error) {
      state = "error";
      summary = `Error: ${String(payload.tool_error).slice(0, 40)}`;
    } else {
      state = "happy";
      summary = `Done: ${payload.tool_name || "tool"}`;
    }
  } else if (HOOK_TYPE === "Stop") {
    state = "idle";
    summary = "Session ended";
  }

  const body = JSON.stringify({
    type: "state_change",
    state,
    data: { summary },
  });

  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 23334,
        path: "/event",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 1000,
      },
      () => resolve()
    );

    req.on("error", () => resolve()); // Silently ignore if pet app isn't running
    req.on("timeout", () => {
      req.destroy();
      resolve();
    });
    req.write(body);
    req.end();
  });
}

main();
