/**
 * GitDigital Solana KYC Demo — Command Terminal
 * Talks to Python backend (server.py) for Makefile commands.
 * Falls back to local simulation when backend is offline.
 */

(function () {
  const API_BASE = window.location.origin;
  const output = () => document.getElementById("termOutput");
  const input = () => document.getElementById("termInput");
  const statusEl = () => document.getElementById("termStatus");
  const body = () => document.getElementById("termBody");

  let history = [];
  let histIdx = -1;
  let busy = false;
  let online = false;

  // Local simulation when server is down (GitHub Pages static mode)
  const LOCAL_SIM = {
    help: `GitDigital Solana KYC Compliance SDK
====================================

Available targets:
  make help          Show this help
  make status        Show project status
  make build         Build on-chain program + SDK
  make anchor-build  Build Anchor program only
  make sdk-build     Build TypeScript SDK only
  make test          Run test suite
  make lint          Run linters
  make check         Full health check
  make registry      Query Compliance Registry (simulated)
  make verify        Simulate verification flow
  make deploy        Deploy to devnet (dry-run)
  make clean         Clean build artifacts
`,
    status: `┌─────────────────────────────────────────┐
│  GitDigital Solana KYC SDK — Status     │
├─────────────────────────────────────────┤
│  Version:     v1.0.0                    │
│  Tier:        Production-Ready (80%)    │
│  Network:     Devnet                    │
│  Program:     Transfer Hook + Registry  │
│  SDK:         TypeScript ready          │
│  Demo:        GitHub Pages active       │
│  Backend:     offline (local sim)       │
└─────────────────────────────────────────┘
`,
    build: `→ Building Anchor program (kyc-compliance)...
  Compiling programs/kyc-compliance...
  Linking Transfer Hook interface...
✓ anchor build finished (simulated)
  IDL written to target/idl/kyc_compliance.json
→ Building TypeScript SDK...
  tsc --project sdk/tsconfig.json
✓ SDK build finished (simulated)
  Output: sdk/dist/

✓ Full build complete
`,
    "anchor-build": `→ Building Anchor program (kyc-compliance)...
  Compiling programs/kyc-compliance...
  Linking Transfer Hook interface...
✓ anchor build finished (simulated)
  IDL written to target/idl/kyc_compliance.json
`,
    "sdk-build": `→ Building TypeScript SDK...
  tsc --project sdk/tsconfig.json
✓ SDK build finished (simulated)
  Output: sdk/dist/
`,
    test: `→ Running test suite...
  ✓ transfer_hook_approve
  ✓ transfer_hook_reject_unverified
  ✓ registry_write_proof
  ✓ registry_revoke
  ✓ jurisdiction_bitmask

5 passed, 0 failed (simulated)
`,
    lint: `→ Running linters...
  cargo clippy — ok
  eslint sdk/ — ok
✓ Lint clean
`,
    check: null, // composed
    registry: `→ Querying Compliance Registry (simulated)...

  Wallet                                    Status      Tier
  ────────────────────────────────────────  ──────────  ─────────
  GitD1111...1111                           verified    Enterprise
  RWA22222...2222                           verified    Enhanced
  DeFi3333...3333                           pending     Basic

3 entries · Network: devnet
`,
    verify: `→ Starting verification flow (simulated)...
  [1/4] Identity check...
  [2/4] Sanctions screening (OFAC/UN/EU)...
  [3/4] Age verification...
  [4/4] Writing on-chain attestation...

✓ Verification complete — proof written to registry
`,
    deploy: `→ Deploy to devnet (dry-run)...
  Program ID: KYC1111111111111111111111111111111111111
  Cluster:    devnet
  Mode:       dry-run (no real deploy)

✓ Dry-run complete — use 'solana program deploy' for real deploy
`,
    clean: `→ Cleaning build artifacts...
  removed target/
  removed sdk/dist/
✓ Clean complete
`,
  };

  LOCAL_SIM.check =
    LOCAL_SIM.status + "\n" + LOCAL_SIM.lint + "\n" + LOCAL_SIM.test + "\n✓ Health check passed\n";

  function setStatus(text, cls) {
    const el = statusEl();
    if (!el) return;
    el.textContent = text;
    el.className = "terminal-status " + (cls || "");
  }

  function append(html) {
    const out = output();
    if (!out) return;
    out.insertAdjacentHTML("beforeend", html);
    const b = body();
    if (b) b.scrollTop = b.scrollHeight;
  }

  function appendText(text, cls) {
    const span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text;
    output().appendChild(span);
    body().scrollTop = body().scrollHeight;
  }

  function writeCmd(cmd) {
    append(
      `<div class="cmd-line"><span class="ps">$</span>${escapeHtml(cmd)}</div>`
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function checkHealth() {
    try {
      const r = await fetch(API_BASE + "/api/health", { cache: "no-store" });
      if (r.ok) {
        online = true;
        setStatus("online", "online");
        return true;
      }
    } catch (_) {}
    online = false;
    setStatus("offline · local sim", "offline");
    return false;
  }

  function parseTarget(cmd) {
    const m = cmd.trim().match(/^(?:make\s+)?([a-z0-9_-]+)\s*$/i);
    return m ? m[1].toLowerCase() : null;
  }

  async function runLocal(cmd) {
    const lower = cmd.trim().toLowerCase();

    if (lower === "info" || lower === "uname" || lower === "whoami") {
      return {
        ok: true,
        stdout:
          "Machine: local simulation (backend offline)\n" +
          "Mode: GitHub Pages / static demo\n" +
          "Type 'make help' for available targets.\n" +
          "Start the Python server for real Makefile execution:\n" +
          "  python3 server.py\n",
        stderr: "",
      };
    }

    if (lower === "clear" || lower === "cls") {
      output().innerHTML = "";
      return { ok: true, stdout: "", stderr: "" };
    }

    const target = parseTarget(cmd);
    if (!target) {
      return {
        ok: false,
        stdout: "",
        stderr: `command not found: ${cmd}\nTry: make help | make status | info | clear\n`,
      };
    }

    if (!(target in LOCAL_SIM)) {
      return {
        ok: false,
        stdout: "",
        stderr: `error: target '${target}' is not allowed.\nRun 'make help' for the list.\n`,
      };
    }

    // Small delay so it feels real
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 400));
    return {
      ok: true,
      stdout: LOCAL_SIM[target] || "",
      stderr: "",
    };
  }

  async function runRemote(cmd) {
    const lower = cmd.trim().toLowerCase();

    if (lower === "info") {
      const r = await fetch(API_BASE + "/api/info");
      const data = await r.json();
      return {
        ok: true,
        stdout:
          `Host: ${data.hostname} · ${data.platform} ${data.release}\n` +
          `Python ${data.python}\n` +
          `cwd: ${data.cwd}\n` +
          `Makefile: ${data.makefile ? "found" : "missing"}\n` +
          `Targets: ${data.allowed_targets.join(", ")}\n`,
        stderr: "",
      };
    }

    if (lower === "clear" || lower === "cls") {
      output().innerHTML = "";
      return { ok: true, stdout: "", stderr: "" };
    }

    // Free-form chat to machine
    if (lower.startsWith("say ") || lower.startsWith("echo ")) {
      const msg = cmd.replace(/^(say|echo)\s+/i, "");
      const r = await fetch(API_BASE + "/api/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      return r.json();
    }

    const r = await fetch(API_BASE + "/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: cmd }),
    });
    return r.json();
  }

  async function execute(cmd) {
    cmd = cmd.trim();
    if (!cmd || busy) return;

    busy = true;
    setStatus("running…", "busy");
    writeCmd(cmd);
    history.push(cmd);
    histIdx = history.length;

    try {
      const result = online ? await runRemote(cmd) : await runLocal(cmd);

      if (result.stdout) {
        appendText(result.stdout, result.ok ? "out-ok" : "out-info");
        if (!result.stdout.endsWith("\n")) appendText("\n");
      }
      if (result.stderr) {
        appendText(result.stderr, "out-err");
        if (!result.stderr.endsWith("\n")) appendText("\n");
      }
    } catch (err) {
      appendText(`error: ${err.message}\n`, "out-err");
      // Fall back to local for this session
      online = false;
      setStatus("offline · local sim", "offline");
    }

    busy = false;
    setStatus(online ? "online" : "offline · local sim", online ? "online" : "offline");
    input().focus();
  }

  function onKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = input().value;
      input().value = "";
      execute(v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histIdx > 0) {
        histIdx--;
        input().value = history[histIdx] || "";
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < history.length - 1) {
        histIdx++;
        input().value = history[histIdx] || "";
      } else {
        histIdx = history.length;
        input().value = "";
      }
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      output().innerHTML = "";
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const inp = input();
    if (!inp) return;

    inp.addEventListener("keydown", onKey);

    body().addEventListener("click", () => inp.focus());

    document.querySelectorAll(".hint").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-cmd");
        if (cmd) execute(cmd);
      });
    });

    appendText(
      "GitDigital Solana KYC — command terminal\n",
      "out-info"
    );
    appendText(
      "Type make help · make status · make build · make test\n",
      "out-dim"
    );
    appendText(
      "Or: info · clear · (with server) say hello\n\n",
      "out-dim"
    );

    await checkHealth();
    if (online) {
      appendText("Backend online — Makefile commands execute on the machine.\n", "out-ok");
    } else {
      appendText(
        "Backend offline — using local simulation.\nStart with: python3 server.py\n",
        "out-dim"
      );
    }
  });
})();
