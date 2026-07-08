// ../jaato/jaato-sdk-ts/src/events.ts
var EventTypeValue = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  AGENT_CREATED: "agent.created",
  AGENT_OUTPUT: "agent.output",
  AGENT_STATUS_CHANGED: "agent.status_changed",
  AGENT_COMPLETED: "agent.completed",
  AGENT_ERROR: "agent.error",
  SESSION_TERMINATED: "session.terminated",
  SLOT_SETTLED: "slot.settled",
  SESSION_RESTORED: "session.restored",
  TOOL_CALL_START: "tool.call_start",
  TOOL_CALL_END: "tool.call_end",
  TOOL_OUTPUT: "tool.output",
  PERMISSION_REQUESTED: "permission.requested",
  PERMISSION_INPUT_MODE: "permission.input_mode",
  PERMISSION_RESOLVED: "permission.resolved",
  PERMISSION_RESPONSE: "permission.response",
  PERMISSION_STATUS: "permission.status",
  CLARIFICATION_REQUESTED: "clarification.requested",
  CLARIFICATION_INPUT_MODE: "clarification.input_mode",
  CLARIFICATION_QUESTION: "clarification.question",
  CLARIFICATION_RESOLVED: "clarification.resolved",
  CLARIFICATION_RESPONSE: "clarification.response",
  CLARIFICATION_BATCH: "clarification.batch",
  CLARIFICATION_BATCH_RESPONSE: "clarification.batch_response",
  REFERENCE_SELECTION_REQUESTED: "reference_selection.requested",
  REFERENCE_SELECTION_RESOLVED: "reference_selection.resolved",
  REFERENCE_SELECTION_RESPONSE: "reference_selection.response",
  WORKSPACE_MISMATCH_REQUESTED: "workspace_mismatch.requested",
  WORKSPACE_MISMATCH_RESOLVED: "workspace_mismatch.resolved",
  WORKSPACE_MISMATCH_RESPONSE: "workspace_mismatch.response",
  PLAN_UPDATED: "plan.updated",
  PLAN_STEP_UPDATED: "plan.step_updated",
  PLAN_CLEARED: "plan.cleared",
  CONTEXT_UPDATED: "context.updated",
  TURN_COMPLETED: "turn.completed",
  TURN_PROGRESS: "turn.progress",
  INSTRUCTION_BUDGET_UPDATED: "instruction_budget.updated",
  GC_CONFIG: "gc.config",
  INSTRUCTION_BUDGET_REQUEST: "instruction_budget.request",
  SYSTEM_MESSAGE: "system.message",
  HELP_TEXT: "help.text",
  ERROR: "error",
  INIT_PROGRESS: "init.progress",
  RETRY: "retry",
  SESSION_LIST: "session.list",
  SESSION_INFO: "session.info",
  SESSION_DESCRIPTION_UPDATED: "session.description_updated",
  MEMORY_LIST: "memory.list",
  SANDBOX_PATHS: "sandbox.paths",
  SERVICE_LIST: "service.list",
  SEND_MESSAGE: "message.send",
  STOP: "session.stop",
  COMMAND: "command.execute",
  COMMAND_LIST_REQUEST: "command.list_request",
  COMMAND_LIST: "command.list",
  COMMAND_LIST_REFRESH: "command.list_refresh",
  TOOL_STATUS: "tools.status",
  TOOL_ID_REGISTRY: "tools.id_registry",
  TOOL_DISABLE_REQUEST: "tools.disable",
  TOOLS_REGISTER_CLIENT: "tools.register_client",
  TOOL_EXECUTE_REQUEST: "tool.execute_request",
  TOOL_EXECUTE_RESULT: "tool.execute_result",
  HISTORY_REQUEST: "history.request",
  HISTORY: "history",
  CLIENT_CONFIG: "client.config",
  MID_TURN_PROMPT_QUEUED: "mid_turn_prompt.queued",
  MID_TURN_PROMPT_INJECTED: "mid_turn_prompt.injected",
  MID_TURN_INTERRUPT: "mid_turn_prompt.interrupt",
  INTERRUPTED_TURN_RECOVERED: "session.interrupted_turn_recovered",
  POST_AUTH_SETUP: "auth.setup",
  POST_AUTH_SETUP_RESPONSE: "auth.setup_response",
  WORKSPACE_LIST_REQUEST: "workspace.list",
  WORKSPACE_LIST: "workspace.list_response",
  WORKSPACE_CREATE_REQUEST: "workspace.create",
  WORKSPACE_CREATED: "workspace.created",
  WORKSPACE_SELECT_REQUEST: "workspace.select",
  CONFIG_STATUS: "config.status",
  CONFIG_UPDATE_REQUEST: "config.update",
  CONFIG_UPDATED: "config.updated",
  WORKSPACE_FILES_STAGE_REQUEST: "workspace.files.stage_request",
  WORKSPACE_FILES_STAGED: "workspace.files.staged",
  SESSION_PROFILES: "session.profiles",
  WORKSPACE_FILES_CHANGED: "workspace.files_changed",
  WORKSPACE_FILES_SNAPSHOT: "workspace.files_snapshot",
  EVENT_EXTERNAL: "event.external",
  INJECT_PROMPT_REQUEST: "inject_prompt.request",
  REPLAY_MESSAGES_REQUEST: "replay_messages.request",
  REPLAY_MESSAGES_RESULT: "replay_messages.result",
  RESOLVE_FORK_POINT_REQUEST: "resolve_fork_point.request",
  RESOLVE_FORK_POINT_RESULT: "resolve_fork_point.result",
  WAKE_BIND_RESULT: "session.wake_bind_result",
  SESSION_WOKEN: "session.woken",
  PERMISSION_ADD_WHITELIST_REQUEST: "permission.add_whitelist",
  PERMISSION_ADD_BLACKLIST_REQUEST: "permission.add_blacklist",
  PERMISSION_REMOVE_REQUEST: "permission.remove",
  PERMISSION_CLEAR_REQUEST: "permission.clear",
  PERMISSION_SET_DEFAULT_REQUEST: "permission.set_default",
  PERMISSION_POLICY_SNAPSHOT_REQUEST: "permission.policy_snapshot.request",
  PERMISSION_POLICY_SNAPSHOT: "permission.policy_snapshot",
  EVENTS_SUBSCRIBED: "events.subscribed",
  PEER_HEARTBEAT: "peer.heartbeat",
  PEER_SPAWN_REQUEST: "peer.spawn_request",
  PEER_SPAWN_ACCEPTED: "peer.spawn_accepted",
  PEER_SPAWN_REJECTED: "peer.spawn_rejected",
  PEER_AGENT_OUTPUT: "peer.agent_output",
  PEER_AGENT_COMPLETED: "peer.agent_completed",
  PEER_STOP_REQUEST: "peer.stop_request",
  PEER_STOP_ACKNOWLEDGED: "peer.stop_acknowledged",
  GATE_ANNOUNCED: "gate.announced",
  GATE_RELEASED: "gate.released",
  GATES_SNAPSHOT: "gates.snapshot"
};

// ../jaato/jaato-sdk-ts/src/helpers.ts
function computeCacheHitPercent(event) {
  const usage = event.usage;
  if (usage == null || usage.cache_read_tokens == null) {
    return null;
  }
  const promptTokens = usage.prompt_tokens ?? 0;
  const total = usage.cache_read_tokens + promptTokens;
  if (total === 0) {
    return 0;
  }
  return usage.cache_read_tokens / total * 100;
}

// ../jaato/jaato-sdk-ts/src/errors.ts
var ConnectionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ConnectionError";
  }
};
var ReconnectingError = class extends Error {
  constructor(message = "Client is reconnecting") {
    super(message);
    this.name = "ReconnectingError";
  }
};
var ConnectionClosedError = class extends Error {
  constructor(message = "Connection is closed") {
    super(message);
    this.name = "ConnectionClosedError";
  }
};
var IncompatibleServerError = class extends Error {
  /** Wire-protocol version reported by the daemon. */
  serverProtocol;
  /** Minimum protocol version this client requires. */
  minProtocol;
  /**
   * Daemon package version (from ``server_info.server_version``).
   * Diagnostics only — not used by the compat check.
   */
  serverVersion;
  constructor(serverProtocol, minProtocol, serverVersion) {
    const sv = serverVersion ?? "unknown";
    const sParts = serverProtocol.split(".").map((p) => parseInt(p, 10));
    const cParts = minProtocol.split(".").map((p) => parseInt(p, 10));
    let hint = "version mismatch";
    if (!Number.isNaN(sParts[0]) && !Number.isNaN(cParts[0]) && sParts[0] !== cParts[0]) {
      hint = `major-version mismatch (server speaks ${sParts[0]}.x, client needs ${cParts[0]}.x) \u2014 wire shapes are incompatible`;
    } else if (!Number.isNaN(sParts[1]) && !Number.isNaN(cParts[1]) && sParts[1] < cParts[1]) {
      hint = `server minor ${sParts[1]} is below client's required minor ${cParts[1]} \u2014 daemon is missing fields the client depends on`;
    }
    super(
      `Server protocol ${serverProtocol} is not supported by this client (requires >= ${minProtocol}): ${hint}. Daemon package: ${sv}.`
    );
    this.name = "IncompatibleServerError";
    this.serverProtocol = serverProtocol;
    this.minProtocol = minProtocol;
    this.serverVersion = sv;
  }
  /** Alias for {@link minProtocol} (pre-1.0 compatibility). */
  get minVersion() {
    return this.minProtocol;
  }
};
var AgentError = class extends Error {
  errorType;
  errorSummary;
  constructor(errorType, errorSummary) {
    super(`${errorType ?? "AgentError"}: ${errorSummary ?? ""}`.replace(/: $/, ""));
    this.name = "AgentError";
    this.errorType = errorType;
    this.errorSummary = errorSummary;
  }
};
var PermissionUnhandled = class extends Error {
  toolName;
  constructor(toolName) {
    super(
      `tool ${JSON.stringify(toolName)} requested permission but no onPermission callback was set \u2014 pass onPermission to session(...) or use the low-level subscribe(PERMISSION_REQUESTED) API via s.client`
    );
    this.name = "PermissionUnhandled";
    this.toolName = toolName;
  }
};

// ../jaato/jaato-sdk-ts/src/state.ts
var ConnectionState = /* @__PURE__ */ ((ConnectionState2) => {
  ConnectionState2["DISCONNECTED"] = "disconnected";
  ConnectionState2["CONNECTED"] = "connected";
  ConnectionState2["RECONNECTING"] = "reconnecting";
  ConnectionState2["CLOSED"] = "closed";
  return ConnectionState2;
})(ConnectionState || {});
var DEFAULT_RECOVERY_CONFIG = {
  autoReconnect: true,
  maxReconnectAttempts: null,
  initialBackoffSeconds: 1,
  maxBackoffSeconds: 30,
  jitterFactor: 0.1,
  autoReattachSessionId: false
};

// ../jaato/jaato-sdk-ts/src/transport.ts
function _resolveAuthUrl(options) {
  if (options.headers) {
    return options.url;
  }
  if (options.token == null) {
    return options.url;
  }
  const url = new URL(options.url);
  url.searchParams.set("token", options.token);
  return url.toString();
}
function openTransport(options) {
  const openTimeoutMs = options.openTimeoutMs ?? 5e3;
  const url = _resolveAuthUrl(options);
  const ctor = globalThis.WebSocket;
  if (ctor == null) {
    return Promise.reject(
      new ConnectionError(
        "No WebSocket implementation available.  Ensure Node 21+ or a browser environment."
      )
    );
  }
  let ws;
  try {
    if (options.headers) {
      ws = new ctor(url, void 0, { headers: options.headers });
    } else {
      ws = new ctor(url);
    }
  } catch (e) {
    return Promise.reject(
      new ConnectionError(`WebSocket constructor failed: ${e.message}`)
    );
  }
  ws.binaryType = "arraybuffer";
  const incoming = [];
  const waiters = [];
  let closed = false;
  let closeInfo = null;
  const closeHandlers = [];
  const _drainOnClose = () => {
    closed = true;
    while (waiters.length) {
      const w = waiters.shift();
      w(null);
    }
  };
  return new Promise((resolve, reject) => {
    let openTimer = setTimeout(() => {
      try {
        ws.close();
      } catch {
      }
      reject(new ConnectionError(`WebSocket open timed out after ${openTimeoutMs}ms`));
    }, openTimeoutMs);
    ws.onopen = () => {
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      const transport = {
        sendEvent(event) {
          if (closed) {
            throw new ConnectionError("Transport is closed");
          }
          ws.send(JSON.stringify(event));
        },
        sendRawEvent(event) {
          if (closed) {
            throw new ConnectionError("Transport is closed");
          }
          ws.send(JSON.stringify(event));
        },
        sendBinary(data) {
          if (closed) {
            throw new ConnectionError("Transport is closed");
          }
          ws.send(data);
        },
        async *events() {
          while (true) {
            if (incoming.length > 0) {
              yield incoming.shift();
              continue;
            }
            if (closed) {
              return;
            }
            const next = await new Promise((res) => {
              waiters.push(res);
            });
            if (next == null) {
              return;
            }
            yield next;
          }
        },
        close(code, reason) {
          try {
            ws.close(code ?? 1e3, reason ?? "");
          } catch {
          }
        },
        onClose(handler) {
          if (closeInfo) {
            handler(closeInfo);
          } else {
            closeHandlers.push(handler);
          }
        },
        get isOpen() {
          return !closed;
        }
      };
      resolve(transport);
    };
    ws.onerror = () => {
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
        reject(new ConnectionError("WebSocket error during open"));
      }
    };
    ws.onmessage = (msg) => {
      let payload;
      if (typeof msg.data === "string") {
        payload = msg.data;
      } else if (msg.data instanceof ArrayBuffer) {
        payload = new TextDecoder().decode(msg.data);
      } else if (msg.data?.text) {
        msg.data.text().then((text) => {
          _dispatch(text);
        });
        return;
      } else {
        try {
          ws.close(1003, "unsupported frame type");
        } catch {
        }
        return;
      }
      _dispatch(payload);
    };
    ws.onclose = (event) => {
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
        reject(
          new ConnectionError(
            `WebSocket closed before open (code=${event.code}, reason=${event.reason || "<empty>"})`
          )
        );
        return;
      }
      closeInfo = { code: event.code, reason: event.reason || "" };
      _drainOnClose();
      for (const h of closeHandlers) {
        try {
          h(closeInfo);
        } catch {
        }
      }
    };
    function _dispatch(text) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        try {
          ws.close(1003, "invalid JSON frame");
        } catch {
        }
        return;
      }
      if (waiters.length > 0) {
        const w = waiters.shift();
        w(parsed);
      } else {
        incoming.push(parsed);
      }
    }
  });
}

// ../jaato/jaato-sdk-ts/src/convenience.ts
Symbol.asyncDispose ??= /* @__PURE__ */ Symbol.for(
  "Symbol.asyncDispose"
);
var DEFAULT_SOURCES = ["model"];
var Session = class {
  #client;
  #onPermission;
  #unhandledPerm = null;
  #toolHandlers;
  constructor(client, onPermission, toolHandlers) {
    this.#client = client;
    this.#onPermission = onPermission;
    client.subscribe(EventTypeValue.PERMISSION_REQUESTED, (event) => {
      void this.#onPerm(event);
    });
    if (toolHandlers && toolHandlers.size > 0) {
      this.#toolHandlers = toolHandlers;
      client.subscribe(EventTypeValue.TOOL_EXECUTE_REQUEST, (event) => {
        void this.#onToolExecute(event);
      });
    }
  }
  /** The underlying low-level client — mix facade + raw event API freely. */
  get client() {
    return this.#client;
  }
  /** The daemon-side session id (null until created). */
  get sessionId() {
    return this.#client.sessionId;
  }
  async #onPerm(event) {
    const ev = event;
    const requestId = ev?.request_id ?? "";
    if (this.#onPermission) {
      const resp = await this.#onPermission(event);
      await this.#client.respondToPermission(requestId, resp || "n");
    } else {
      this.#unhandledPerm = ev?.tool_name ?? "?";
      await this.#client.respondToPermission(requestId, "n");
    }
  }
  async #onToolExecute(event) {
    const ev = event;
    const callId = ev?.call_id ?? "";
    const handler = ev?.tool_name ? this.#toolHandlers?.get(ev.tool_name) : void 0;
    if (!handler) {
      await this.#client.respondToToolExecution(
        callId,
        "",
        `no handler for host tool ${JSON.stringify(ev?.tool_name)}`
      );
      return;
    }
    try {
      const out = await handler(ev?.tool_args ?? {});
      const result = typeof out === "string" ? out : JSON.stringify(out);
      await this.#client.respondToToolExecution(callId, result);
    } catch (err) {
      await this.#client.respondToToolExecution(
        callId,
        "",
        err instanceof Error ? err.message : String(err)
      );
    }
  }
  #raiseIfNeeded(box) {
    if (this.#unhandledPerm !== null) {
      const tool = this.#unhandledPerm;
      this.#unhandledPerm = null;
      throw new PermissionUnhandled(tool);
    }
    if (box.reason === "error") {
      throw new AgentError(box.errorType, box.errorSummary);
    }
  }
  #noteTerminal(box, event) {
    const ev = event;
    box.reason ??= ev?.reason ?? "natural";
    if (ev?.error_type) box.errorType = ev.error_type;
    if (ev?.error_summary) box.errorSummary = ev.error_summary;
  }
  /**
   * Send ``prompt``, wait for the turn to finish, return collected text.
   * Waits on first-of ``{TURN_COMPLETED, SESSION_TERMINATED}`` (never hangs).
   * Throws {@link AgentError} on an error terminal / {@link PermissionUnhandled}
   * on an unanswered gated tool.
   */
  async ask(prompt, opts = {}) {
    const sources = opts.sources === void 0 ? DEFAULT_SOURCES : opts.sources;
    const chunks = [];
    const box = {};
    let resolveDone;
    const done = new Promise((resolve) => {
      resolveDone = resolve;
    });
    const onOutput = (event) => {
      const ev = event;
      if (sources === null || ev?.source != null && sources.includes(ev.source)) {
        if (ev?.text) chunks.push(ev.text);
      }
    };
    const onTerminal = (event) => {
      this.#noteTerminal(box, event);
      resolveDone();
    };
    const unsubOutput = this.#client.subscribe(EventTypeValue.AGENT_OUTPUT, onOutput);
    const unsubTerm = this.#client.subscribeOnce(EventTypeValue.SESSION_TERMINATED, onTerminal);
    const unsubTurn = this.#client.subscribeOnce(EventTypeValue.TURN_COMPLETED, onTerminal);
    try {
      await this.#client.sendMessage(prompt, opts.attachments, opts.parallelTools);
      await done;
    } finally {
      unsubOutput();
      unsubTerm();
      unsubTurn();
    }
    this.#raiseIfNeeded(box);
    return chunks.join("");
  }
  /**
   * Send ``prompt`` and return the typed completion payload (or null when the
   * profile declared no schema / the model didn't complete). For
   * completion-gated profiles. Throws {@link AgentError} on an error terminal.
   */
  async complete(prompt, opts = {}) {
    const box = {};
    let payload = null;
    let resolveDone;
    const done = new Promise((resolve) => {
      resolveDone = resolve;
    });
    const onCompleted = (event) => {
      payload = event?.payload ?? null;
    };
    const onTerminal = (event) => {
      this.#noteTerminal(box, event);
      resolveDone();
    };
    const unsubComp = this.#client.subscribeOnce(EventTypeValue.AGENT_COMPLETED, onCompleted);
    const unsubTerm = this.#client.subscribeOnce(EventTypeValue.SESSION_TERMINATED, onTerminal);
    const unsubTurn = this.#client.subscribeOnce(EventTypeValue.TURN_COMPLETED, onTerminal);
    try {
      await this.#client.sendMessage(prompt, opts.attachments, opts.parallelTools);
      await done;
    } finally {
      unsubComp();
      unsubTerm();
      unsubTurn();
    }
    this.#raiseIfNeeded(box);
    return payload;
  }
  /**
   * Send ``prompt`` and yield text chunks live as they arrive, stopping at the
   * terminal. ``TURN_COMPLETED`` fires after all output, so no chunk is
   * dropped. Throws {@link AgentError} / {@link PermissionUnhandled} after the
   * stream drains.
   */
  async *stream(prompt, opts = {}) {
    const sources = opts.sources === void 0 ? DEFAULT_SOURCES : opts.sources;
    const queue = [];
    const box = {};
    let terminated = false;
    let wake = null;
    const bump = () => {
      if (wake) {
        const w = wake;
        wake = null;
        w();
      }
    };
    const onOutput = (event) => {
      const ev = event;
      if (sources === null || ev?.source != null && sources.includes(ev.source)) {
        if (ev?.text) {
          queue.push(ev.text);
          bump();
        }
      }
    };
    const onTerminal = (event) => {
      this.#noteTerminal(box, event);
      terminated = true;
      bump();
    };
    const unsubOutput = this.#client.subscribe(EventTypeValue.AGENT_OUTPUT, onOutput);
    const unsubTerm = this.#client.subscribeOnce(EventTypeValue.SESSION_TERMINATED, onTerminal);
    const unsubTurn = this.#client.subscribeOnce(EventTypeValue.TURN_COMPLETED, onTerminal);
    try {
      await this.#client.sendMessage(prompt, opts.attachments, opts.parallelTools);
      for (; ; ) {
        if (queue.length > 0) {
          yield queue.shift();
          continue;
        }
        if (terminated) break;
        await new Promise((resolve) => {
          wake = resolve;
        });
      }
    } finally {
      unsubOutput();
      unsubTerm();
      unsubTurn();
    }
    this.#raiseIfNeeded(box);
  }
  /** Disconnect the underlying client (idempotent). */
  async close() {
    await this.#client.close();
  }
  async [Symbol.asyncDispose]() {
    await this.close();
  }
};
function waitForSessionId(client, timeoutMs) {
  if (client.sessionId) return Promise.resolve(client.sessionId);
  return new Promise((resolve) => {
    let timer;
    const unsub = client.subscribe(EventTypeValue.SESSION_INFO, () => {
      clearTimeout(timer);
      unsub();
      resolve(client.sessionId);
    });
    timer = setTimeout(() => {
      unsub();
      resolve(null);
    }, timeoutMs);
  });
}
async function openSession(opts) {
  const presentation = {
    ...opts.presentation ?? {},
    client_type: opts.clientType ?? "api"
  };
  const clientConfig = { presentation };
  if (opts.workspacePath !== void 0) clientConfig.working_dir = opts.workspacePath;
  if (opts.envFile !== void 0) clientConfig.env_file = opts.envFile;
  if (opts.configRoot !== void 0) clientConfig.config_root = opts.configRoot;
  if (opts.apparmor !== void 0) clientConfig.apparmor = opts.apparmor;
  const clientOptions = {
    url: opts.url,
    token: opts.token,
    headers: opts.headers,
    minProtocolVersion: opts.minProtocolVersion,
    recovery: opts.recovery,
    openTimeoutMs: opts.openTimeoutMs,
    clientConfig
  };
  const client = new JaatoClient(clientOptions);
  if (opts.onStatusChange) client.onStatus(opts.onStatusChange);
  await client.connect();
  const toolHandlers = /* @__PURE__ */ new Map();
  if (opts.clientTools && opts.clientTools.length > 0) {
    const wireSpecs = opts.clientTools.map((spec) => {
      const { handler, ...rest } = spec;
      if (handler && typeof spec.name === "string") {
        toolHandlers.set(spec.name, handler);
      }
      return rest;
    });
    await client.registerClientTools(wireSpecs);
  }
  const sessionTimeoutMs = opts.sessionTimeoutMs ?? 6e4;
  const sessionIdReady = waitForSessionId(client, sessionTimeoutMs);
  await client.createSession({
    profile: opts.profile,
    agent: opts.agent,
    agentParams: opts.agentParams,
    cascadeDriverId: opts.cascadeDriverId
  });
  const sessionId = await sessionIdReady;
  if (!sessionId) {
    await client.close();
    throw new Error(
      `session.new did not produce a session id within ${sessionTimeoutMs}ms \u2014 check provider auth / the daemon log`
    );
  }
  return new Session(client, opts.onPermission, toolHandlers);
}
async function ask(prompt, opts) {
  const session = await openSession(opts);
  try {
    return await session.ask(prompt, {
      sources: opts.sources,
      parallelTools: opts.parallelTools,
      attachments: opts.attachments
    });
  } finally {
    await session.close();
  }
}

// ../jaato/jaato-sdk-ts/src/client.ts
var MIN_PROTOCOL_VERSION = "1.0";
function _parseProtocolVersion(v) {
  const parts = v.split(".");
  if (parts.length < 2) return null;
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  if (Number.isNaN(major) || Number.isNaN(minor)) return null;
  return [major, minor];
}
function isProtocolCompatible(serverProtocol, clientMin) {
  const s = _parseProtocolVersion(serverProtocol);
  const c = _parseProtocolVersion(clientMin);
  if (s == null || c == null) return false;
  if (s[0] !== c[0]) return false;
  return s[1] >= c[1];
}
var JaatoClient = class {
  _options;
  _recovery;
  _transport = null;
  _state = "disconnected" /* DISCONNECTED */;
  _serverVersion = null;
  _serverProtocolVersion = null;
  _clientId = null;
  _sessionId = null;
  _statusHandlers = [];
  // Typed handler buckets keyed by EventType string.  Catchall handlers
  // live in `_catchallHandlers`.  Mutated and dispatched on the JS event
  // loop only — no thread safety guarantees because there is no other
  // thread.  `_dispatchEvent` snapshots both buckets before iterating
  // so subscribe/unsubscribe calls inside a handler only take effect
  // for the next event.
  _typedHandlers = /* @__PURE__ */ new Map();
  _catchallHandlers = [];
  _handlerIdCounter = 0;
  _bufferedEvents = [];
  _eventLoopActive = false;
  _reconnectAttempts = 0;
  _reconnectTimer = null;
  _explicitClose = false;
  constructor(options) {
    this._options = options;
    this._recovery = { ...DEFAULT_RECOVERY_CONFIG, ...options.recovery ?? {} };
    if (this._recovery.autoReattachSessionId) {
      let sawReconnecting = false;
      this.onStatus((status) => {
        if (status.state === "reconnecting" /* RECONNECTING */) {
          sawReconnecting = true;
          return;
        }
        if (status.state === "connected" /* CONNECTED */ && sawReconnecting && this._sessionId) {
          sawReconnecting = false;
          void this.attachSession(this._sessionId);
        }
      });
    }
  }
  // ──── Status / state ─────────────────────────────────────────────
  /** Current connection state. */
  get state() {
    return this._state;
  }
  /** True iff the WebSocket is open and the handshake completed. */
  get isConnected() {
    return this._state === "connected" /* CONNECTED */;
  }
  /**
   * Server's package version reported in {@link ConnectedEvent}, after
   * handshake.  **Diagnostics only** — compat is checked against
   * {@link serverProtocolVersion}.
   */
  get serverVersion() {
    return this._serverVersion;
  }
  /**
   * Server's wire-protocol version from {@link ConnectedEvent}, after
   * handshake.  This is what the compat check ran against — distinct
   * from {@link serverVersion} (the daemon's package version).
   */
  get serverProtocolVersion() {
    return this._serverProtocolVersion;
  }
  /** Client ID assigned by the server in {@link ConnectedEvent}. */
  get clientId() {
    return this._clientId;
  }
  /** Last observed session ID (set by SessionInfoEvent). */
  get sessionId() {
    return this._sessionId;
  }
  /** Subscribe to connection-state transitions. */
  onStatus(handler) {
    this._statusHandlers.push(handler);
    return () => {
      const i = this._statusHandlers.indexOf(handler);
      if (i >= 0) this._statusHandlers.splice(i, 1);
    };
  }
  // ──── Connect / disconnect ───────────────────────────────────────
  /**
   * Open the WebSocket and complete the handshake.
   *
   * Resolves once {@link ConnectedEvent} arrives and the server
   * version passes the {@link MIN_SERVER_VERSION} check.  Throws
   * {@link IncompatibleServerError} on version mismatch (no retry —
   * an old server won't become newer); {@link ConnectionError} on
   * other failures.
   */
  async connect() {
    if (this._state === "connected" /* CONNECTED */) {
      return;
    }
    if (this._state === "closed" /* CLOSED */) {
      throw new ConnectionClosedError("Client was closed; construct a new instance");
    }
    this._explicitClose = false;
    await this._openOnce();
    this._startEventLoop();
  }
  /**
   * Close the WebSocket and cancel any in-flight reconnect.
   *
   * After close, the client is permanently in the CLOSED state —
   * call sites that need to reconnect must construct a new
   * {@link JaatoClient}.
   */
  async close() {
    this._explicitClose = true;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._transport) {
      this._transport.close(1e3, "client close");
      this._transport = null;
    }
    this._transition("closed" /* CLOSED */);
  }
  // ──── Event subscription API ─────────────────────────────────────
  /**
   * Subscribe to events of a specific type.
   *
   * The handler receives only events whose `type` field equals
   * `eventType`. Sync handlers run inline; async handlers are
   * dispatched fire-and-forget — order of *delivery* is FIFO, but
   * order of *completion* of async handlers is not guaranteed.
   *
   * Throwing inside a handler (or rejecting an async handler) is
   * logged and swallowed — it never breaks the event loop or affects
   * other subscribers.
   *
   * @returns Idempotent unsubscribe function.
   */
  subscribe(eventType, handler) {
    return this._addTypedHandler(eventType, handler, false);
  }
  /**
   * Subscribe to a single event of `eventType`, then auto-unsubscribe.
   *
   * The handler fires exactly once when the next matching event
   * arrives. The returned unsubscribe can be called early to cancel.
   */
  subscribeOnce(eventType, handler) {
    return this._addTypedHandler(eventType, handler, true);
  }
  /**
   * Subscribe to every event regardless of type (catchall firehose).
   *
   * Use sparingly — typed `subscribe` is preferred when you only care
   * about a specific event family.
   */
  subscribeAll(handler) {
    return this._addCatchallHandler(handler, false);
  }
  /**
   * Register multiple typed handlers in one call.
   *
   * Returns a single unsubscribe that removes all of them atomically —
   * useful for "set up my client" call sites that want a single cleanup
   * point.
   */
  subscribeMany(map) {
    const unsubs = [];
    for (const key of Object.keys(map)) {
      const handler = map[key];
      if (handler) {
        unsubs.push(
          this._addTypedHandler(key, handler, false)
        );
      }
    }
    return () => {
      for (const u of unsubs) u();
    };
  }
  _addTypedHandler(type, handler, once) {
    const id = ++this._handlerIdCounter;
    const entry = { handler, once, id };
    let bucket = this._typedHandlers.get(type);
    if (!bucket) {
      bucket = [];
      this._typedHandlers.set(type, bucket);
    }
    bucket.push(entry);
    return () => this._removeTypedHandlerId(type, id);
  }
  _addCatchallHandler(handler, once) {
    const id = ++this._handlerIdCounter;
    const entry = { handler, once, id };
    this._catchallHandlers.push(entry);
    return () => this._removeCatchallHandlerId(id);
  }
  _removeTypedHandlerId(type, id) {
    const bucket = this._typedHandlers.get(type);
    if (!bucket) return;
    const i = bucket.findIndex((e) => e.id === id);
    if (i >= 0) bucket.splice(i, 1);
  }
  _removeCatchallHandlerId(id) {
    const i = this._catchallHandlers.findIndex((e) => e.id === id);
    if (i >= 0) this._catchallHandlers.splice(i, 1);
  }
  // ──── Typed methods (parity with Python IPCClient) ───────────────
  async sendMessage(text, attachments, parallelTools) {
    await this._sendEvent({
      type: EventTypeValue.SEND_MESSAGE,
      text,
      attachments: attachments ?? [],
      parallel_tools: parallelTools ?? null
    });
  }
  async stop(agentId) {
    await this._sendEvent({
      type: EventTypeValue.STOP,
      agent_id: agentId ?? null
    });
  }
  async respondToPermission(requestId, response, editedArguments) {
    await this._sendEvent({
      type: EventTypeValue.PERMISSION_RESPONSE,
      request_id: requestId,
      response,
      edited_arguments: editedArguments ?? null
    });
  }
  async respondToClarification(requestId, response, questionIndex = 0) {
    await this._sendEvent({
      type: EventTypeValue.CLARIFICATION_RESPONSE,
      request_id: requestId,
      question_index: questionIndex,
      response
    });
  }
  async respondToReferenceSelection(requestId, response) {
    await this._sendEvent({
      type: EventTypeValue.REFERENCE_SELECTION_RESPONSE,
      request_id: requestId,
      response
    });
  }
  /**
   * Return the result of a client-side tool execution.
   *
   * Sends ``ToolExecuteResultEvent`` so the server can resume the
   * model loop with the tool's result.  Caller-side counterpart of
   * the ``ToolExecuteRequestEvent`` the server emits when the model
   * invokes a client-registered tool (see {@link registerClientTools}).
   *
   * Mirror of Python ``IPCClient.respond_to_tool_execution``.
   *
   * @param callId The ``call_id`` from the originating
   *   ``ToolExecuteRequestEvent``.  Server uses this to correlate
   *   the response with the in-flight tool call.
   * @param result JSON-encoded tool result.  Empty string when
   *   ``error`` is set.
   * @param error Error message when execution failed.  Empty when
   *   ``result`` is set.  Setting both is undefined.
   */
  async respondToToolExecution(callId, result = "", error = "") {
    await this._sendEvent({
      type: EventTypeValue.TOOL_EXECUTE_RESULT,
      call_id: callId,
      result,
      error
    });
  }
  // ──── Session management (mirror of Python IPCClient) ────────────
  /**
   * Create a new session on the server.
   *
   * Fire-and-forget: the resulting ``SessionInfoEvent`` arrives
   * via the event stream and updates {@link sessionId}.  Subscribe
   * via {@link subscribe} to react to session creation.
   *
   * Mirror of Python ``IPCClient.create_session``.
   *
   * @param options Session-creation parameters.  When omitted the
   *   server uses its defaults.
   */
  async createSession(options = {}) {
    const args = options.name ? [options.name] : [];
    let payload;
    if (typeof options.profile === "string") {
      args.push("--profile", options.profile);
    } else if (options.profile !== void 0 && options.profile !== null && typeof options.profile === "object") {
      payload = { spec: options.profile };
    } else if (options.profile !== void 0 && options.profile !== null) {
      throw new TypeError(
        `createSession: 'profile' must be string (name) or object (inline spec), got ${typeof options.profile}`
      );
    }
    if (options.agent) {
      args.push("--agent", options.agent);
    }
    if (options.agentParams) {
      for (const [k, v] of Object.entries(options.agentParams)) {
        args.push(`${k}=${v}`);
      }
    }
    if (options.cascadeDriverId) {
      args.push("--cascade-driver-id", options.cascadeDriverId);
    }
    await this._sendEvent({
      type: EventTypeValue.COMMAND,
      command: "session.new",
      args,
      payload
    });
  }
  /**
   * Open a session with the high-level convenience facade.
   *
   * Connects, registers any host tools, and creates the session, then
   * returns a {@link Session} that bundles the send-and-wait recipe so the
   * common path never reproduces the ``SESSION_TERMINATED``-only hang.
   * ``Session`` is an ``AsyncDisposable`` — use ``await using`` for
   * automatic teardown, or call ``await s.close()`` explicitly:
   *
   * ```ts
   * await using s = await JaatoClient.session({
   *   url: "wss://host:8089", profile: "researcher",
   * });
   * console.log(await s.ask("Who are you?"));
   * ```
   *
   * Additive — every low-level method stays; reach the underlying client
   * via {@link Session.client}.  See ``convenience.ts``.
   */
  static session(options) {
    return openSession(options);
  }
  /**
   * Attach to an existing session.
   *
   * After successful attach, the server replays buffered events
   * from the session journal (per the WS reconnect contract) so
   * the client picks up where it left off.  Combined with the
   * reconnect state-machine, this is the building block for
   * "survive a network blip" workflows.
   *
   * Mirror of Python ``IPCClient.attach_session``.
   *
   * @param sessionId The session to attach to.
   */
  async attachSession(sessionId) {
    await this._sendEvent({
      type: EventTypeValue.COMMAND,
      command: "session.attach",
      args: [sessionId]
    });
    this._sessionId = sessionId;
  }
  /**
   * Get or create the default session.
   *
   * Fire-and-forget: response arrives via the event stream as a
   * ``SessionInfoEvent``.  Mirror of Python
   * ``IPCClient.get_default_session``.
   */
  async getDefaultSession() {
    await this._sendEvent({
      type: EventTypeValue.COMMAND,
      command: "session.default",
      args: []
    });
  }
  /**
   * Request the list of sessions on the server.
   *
   * Response arrives via the event stream.  Mirror of Python
   * ``IPCClient.list_sessions``.
   */
  async listSessions() {
    await this._sendEvent({
      type: EventTypeValue.COMMAND,
      command: "session.list",
      args: []
    });
  }
  /**
   * Request the list of available agent profiles.
   *
   * Response arrives via the event stream as a
   * ``SessionProfilesEvent``.  Mirror of Python
   * ``IPCClient.list_profiles``.
   */
  async listProfiles() {
    await this._sendEvent({
      type: EventTypeValue.COMMAND,
      command: "session.profiles",
      args: []
    });
  }
  /**
   * Terminate the currently-attached session.
   *
   * Sends ``session.end`` — the server stops the session's
   * in-flight activity and emits a ``[SESSION_TERMINATED]``
   * marker so attached clients know the session is no longer
   * active.  The session record itself stays on disk; use
   * {@link deleteSession} to purge it.  Mirror of Python
   * ``IPCClient.end_session``.
   */
  async endSession() {
    await this._sendEvent({
      type: EventTypeValue.COMMAND,
      command: "session.end",
      args: []
    });
  }
  /**
   * Permanently delete a session by ID.
   *
   * Sends ``session.delete`` — the server removes both
   * in-memory state and the on-disk journal for the named
   * session.  Response arrives via the event stream as a
   * ``SystemMessageEvent`` ("Session 'X' deleted." on success;
   * "Session 'X' not found." otherwise).  Mirror of Python
   * ``IPCClient.delete_session``.
   *
   * @param sessionId The session to delete.  Must be a known
   *   session ID (visible in {@link listSessions}).
   */
  async deleteSession(sessionId) {
    await this._sendEvent({
      type: EventTypeValue.COMMAND,
      command: "session.delete",
      args: [sessionId]
    });
  }
  async executeCommand(command, args) {
    await this._sendEvent({
      type: EventTypeValue.COMMAND,
      command,
      args: args ?? []
    });
  }
  /**
   * Send an arbitrary event-shaped object over the wire — escape
   * hatch for daemon-extension verbs that aren't in the public
   * {@link JaatoEvent} union.
   *
   * Use cases:
   * - premium's ``reconnect.list`` / ``reconnect.delete`` /
   *   ``auth.token`` verbs from ``session_reconnect.extension``
   * - premium's ``assets.list`` from ``asset_picker``
   * - any third-party daemon extension that registers its own WS
   *   message handlers (typed envelopes, not wrapped in
   *   ``command.execute``)
   *
   * The envelope must include a ``type`` string that the server's
   * dispatcher recognises.  No validation is performed on the
   * client side — the caller owns shape correctness.
   *
   * Responses (if any) arrive via the regular event stream and
   * surface in {@link subscribe} / {@link events} as
   * ``JaatoEvent``-typed values that won't narrow against the
   * public union; the caller filters by ``event.type``.
   *
   * Prefer {@link executeCommand} when the verb is dispatched via
   * ``command.execute`` (the stringly-typed escape hatch for
   * command-router verbs).  This method is for verbs that
   * register their OWN top-level message type.
   */
  async sendRawEvent(event) {
    if (this._state === "reconnecting" /* RECONNECTING */) {
      throw new ReconnectingError();
    }
    if (this._state === "closed" /* CLOSED */) {
      throw new ConnectionClosedError();
    }
    if (this._transport == null) {
      throw new ConnectionError("No active transport \u2014 call connect() first");
    }
    this._transport.sendRawEvent(event);
  }
  async disableTool(toolName) {
    await this._sendEvent({
      type: EventTypeValue.TOOL_DISABLE_REQUEST,
      tool_name: toolName
    });
  }
  async requestCommandList() {
    await this._sendEvent({
      type: EventTypeValue.COMMAND_LIST_REQUEST
    });
  }
  async requestHistory(agentId = "main") {
    await this._sendEvent({
      type: EventTypeValue.HISTORY_REQUEST,
      agent_id: agentId
    });
  }
  async registerClientTools(tools, categories) {
    await this._sendEvent({
      type: EventTypeValue.TOOLS_REGISTER_CLIENT,
      tools,
      categories: categories ?? {}
    });
  }
  // ──── SDK feature parity — session-primitive verbs ───────────────
  async injectPrompt(text, sourceType = "user", sourceId) {
    await this._sendEvent({
      type: EventTypeValue.INJECT_PROMPT_REQUEST,
      text,
      source_type: sourceType,
      source_id: sourceId ?? null
    });
  }
  async replayMessages(requestId, messages, timeoutSeconds = 120) {
    await this._sendEvent({
      type: EventTypeValue.REPLAY_MESSAGES_REQUEST,
      request_id: requestId,
      messages: messages ?? null,
      timeout_seconds: timeoutSeconds
    });
  }
  async resolveForkPoint(requestId, options = {}) {
    await this._sendEvent({
      type: EventTypeValue.RESOLVE_FORK_POINT_REQUEST,
      request_id: requestId,
      after_message: options.afterMessage ?? null,
      after_tool_call: options.afterToolCall ?? null,
      after_timestamp: options.afterTimestamp ?? null
    });
  }
  // ──── SDK feature parity — permission policy verbs ───────────────
  async addWhitelistTools(tools, patterns) {
    await this._sendEvent({
      type: EventTypeValue.PERMISSION_ADD_WHITELIST_REQUEST,
      tools: tools ?? [],
      patterns: patterns ?? []
    });
  }
  async addBlacklistTools(tools, patterns) {
    await this._sendEvent({
      type: EventTypeValue.PERMISSION_ADD_BLACKLIST_REQUEST,
      tools: tools ?? [],
      patterns: patterns ?? []
    });
  }
  async removePermissionRules(target, tools, patterns) {
    await this._sendEvent({
      type: EventTypeValue.PERMISSION_REMOVE_REQUEST,
      target,
      tools: tools ?? [],
      patterns: patterns ?? []
    });
  }
  async clearPermissionRules(target = "all") {
    await this._sendEvent({
      type: EventTypeValue.PERMISSION_CLEAR_REQUEST,
      target
    });
  }
  async setDefaultPolicy(policy) {
    await this._sendEvent({
      type: EventTypeValue.PERMISSION_SET_DEFAULT_REQUEST,
      policy
    });
  }
  async requestPolicySnapshot(requestId = "") {
    await this._sendEvent({
      type: EventTypeValue.PERMISSION_POLICY_SNAPSHOT_REQUEST,
      request_id: requestId
    });
  }
  // ──── File staging (multi-frame WS protocol) ─────────────────────
  /**
   * Stage files into a workspace via the multi-frame WS protocol.
   *
   * Wire shape (per the server-side handler in
   * ``websocket.py:_handle_stage_files_request``):
   *
   * 1. Client sends ``StageFilesRequest`` as a TEXT WS frame
   *    declaring the file names + sizes.
   * 2. Client immediately sends N raw BINARY frames in the same
   *    order as ``files``.  Each frame's byte length must equal
   *    the corresponding ``size`` value.
   * 3. Server responds with a TEXT ``StageFilesEvent`` listing
   *    what was written / what failed.
   *
   * This method handles all three steps and returns the resulting
   * ``StageFilesEvent`` so the caller can inspect successes /
   * failures per-file.  The response is correlated to this call
   * by ordering: WebSocket preserves frame order per-connection
   * and the server reads the binaries inline before producing the
   * response, so the next ``StageFilesEvent`` arriving after this
   * call is the response to it.  Concurrent stageFiles calls on
   * the same client will interleave incorrectly — serialise them
   * caller-side.
   *
   * @param workspaceId Target workspace.  Empty targets the
   *   connection's currently-selected workspace.
   * @param files Each entry needs ``name`` (workspace-relative
   *   path) and ``data`` (the bytes).  ``contentType`` and ``mode``
   *   are optional informational hints.
   * @returns The server's ``StageFilesEvent`` reporting per-file
   *   success / failure.
   */
  async stageFiles(workspaceId, files) {
    if (this._state !== "connected" /* CONNECTED */) {
      throw this._state === "reconnecting" /* RECONNECTING */ ? new ReconnectingError() : new ConnectionClosedError();
    }
    if (this._transport == null) {
      throw new ConnectionError("No active transport \u2014 call connect() first");
    }
    const transport = this._transport;
    const specs = files.map((f) => ({
      name: f.name,
      size: f.data instanceof ArrayBuffer ? f.data.byteLength : f.data.byteLength,
      content_type: f.contentType ?? null,
      mode: f.mode ?? null
    }));
    const responsePromise = this._waitForNextEvent(
      (e) => e.type === EventTypeValue.WORKSPACE_FILES_STAGED
    );
    transport.sendEvent({
      type: EventTypeValue.WORKSPACE_FILES_STAGE_REQUEST,
      workspace_id: workspaceId,
      files: specs
    });
    for (const f of files) {
      transport.sendBinary(f.data);
    }
    return responsePromise;
  }
  /**
   * Internal: resolve with the next event matching ``predicate``.
   *
   * One-shot subscription used by request/response methods like
   * {@link stageFiles}.  Auto-unsubscribes after the first match.
   */
  _waitForNextEvent(predicate) {
    return new Promise((resolve) => {
      const unsub = this.subscribeAll((event) => {
        if (predicate(event)) {
          unsub();
          resolve(event);
        }
      });
    });
  }
  // ──── Internals ──────────────────────────────────────────────────
  async _sendEvent(event) {
    if (this._state === "reconnecting" /* RECONNECTING */) {
      throw new ReconnectingError();
    }
    if (this._state === "closed" /* CLOSED */) {
      throw new ConnectionClosedError();
    }
    if (this._transport == null) {
      throw new ConnectionError("No active transport \u2014 call connect() first");
    }
    this._transport.sendEvent(event);
  }
  async _openOnce() {
    const transport = await openTransport({
      url: this._options.url,
      token: this._options.token,
      headers: this._options.headers,
      openTimeoutMs: this._options.openTimeoutMs
    });
    this._transport = transport;
    transport.onClose((info) => this._handleClose(info));
    const iter = transport.events();
    const firstFrame = await iter.next();
    if (firstFrame.done) {
      this._transport = null;
      throw new ConnectionError("Server closed connection before sending ConnectedEvent");
    }
    const first = firstFrame.value;
    if (first.type !== EventTypeValue.CONNECTED) {
      this._transport = null;
      transport.close();
      throw new ConnectionError(
        `Expected ConnectedEvent from server, got ${first.type}`
      );
    }
    const connected = first;
    const serverInfo = connected.server_info ?? {};
    this._serverVersion = serverInfo.server_version ?? null;
    this._clientId = serverInfo.client_id ?? null;
    this._serverProtocolVersion = connected.protocol_version ?? null;
    const minRequired = this._options.minProtocolVersion ?? MIN_PROTOCOL_VERSION;
    if (this._serverProtocolVersion == null || !isProtocolCompatible(this._serverProtocolVersion, minRequired)) {
      this._transport = null;
      transport.close(1002, "incompatible protocol version");
      throw new IncompatibleServerError(
        this._serverProtocolVersion ?? "unknown",
        minRequired,
        this._serverVersion ?? void 0
      );
    }
    if (this._options.clientConfig) {
      const cfg = {
        type: EventTypeValue.CLIENT_CONFIG,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        ...this._options.clientConfig
      };
      transport.sendEvent(cfg);
    }
    this._reconnectAttempts = 0;
    this._transition("connected" /* CONNECTED */, {
      serverVersion: this._serverVersion ?? void 0,
      clientId: this._clientId ?? void 0
    });
    this._dispatchEvent(connected);
    void this._pumpFromIterator(iter);
  }
  async _pumpFromIterator(iter) {
    try {
      while (true) {
        const next = await iter.next();
        if (next.done) {
          return;
        }
        this._dispatchEvent(next.value);
      }
    } catch (e) {
    }
  }
  _startEventLoop() {
    if (this._eventLoopActive) return;
    this._eventLoopActive = true;
    while (this._bufferedEvents.length > 0) {
      const e = this._bufferedEvents.shift();
      this._dispatchEvent(e);
    }
  }
  _dispatchEvent(event) {
    const maybeSession = event.session_id;
    if (maybeSession && event.type === EventTypeValue.SESSION_INFO) {
      this._sessionId = maybeSession;
    }
    const typedSnapshot = this._typedHandlers.get(event.type);
    const typedEntries = typedSnapshot ? typedSnapshot.slice() : [];
    const catchallEntries = this._catchallHandlers.slice();
    for (const entry of typedEntries) {
      if (entry.once) {
        this._removeTypedHandlerId(event.type, entry.id);
      }
      this._invokeHandler(entry.handler, event);
    }
    for (const entry of catchallEntries) {
      if (entry.once) {
        this._removeCatchallHandlerId(entry.id);
      }
      this._invokeHandler(entry.handler, event);
    }
  }
  _invokeHandler(handler, event) {
    let result;
    try {
      result = handler(event);
    } catch (err) {
      console.error("[JaatoClient] subscriber threw:", err);
      return;
    }
    if (result && typeof result.then === "function") {
      result.catch((err) => {
        console.error("[JaatoClient] async subscriber rejected:", err);
      });
    }
  }
  _handleClose(info) {
    this._transport = null;
    if (this._explicitClose || this._state === "closed" /* CLOSED */) {
      this._transition("closed" /* CLOSED */, {
        reason: info.reason || `code ${info.code}`
      });
      return;
    }
    if (!this._recovery.autoReconnect) {
      this._transition("closed" /* CLOSED */, {
        reason: `connection lost (code ${info.code})`
      });
      return;
    }
    this._scheduleReconnect();
  }
  _scheduleReconnect() {
    this._reconnectAttempts += 1;
    if (this._recovery.maxReconnectAttempts != null && this._reconnectAttempts > this._recovery.maxReconnectAttempts) {
      this._transition("closed" /* CLOSED */, {
        reason: `max reconnect attempts (${this._recovery.maxReconnectAttempts}) exceeded`
      });
      return;
    }
    const baseDelay = Math.min(
      this._recovery.initialBackoffSeconds * Math.pow(2, this._reconnectAttempts - 1),
      this._recovery.maxBackoffSeconds
    );
    const jitter = baseDelay * this._recovery.jitterFactor * (Math.random() * 2 - 1);
    const delaySeconds = Math.max(0, baseDelay + jitter);
    this._transition("reconnecting" /* RECONNECTING */, {
      reconnectAttempt: this._reconnectAttempts,
      reconnectDelaySeconds: delaySeconds
    });
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._attemptReconnect().catch(() => {
      });
    }, delaySeconds * 1e3);
  }
  async _attemptReconnect() {
    try {
      await this._openOnce();
    } catch (e) {
      if (e instanceof IncompatibleServerError) {
        this._transition("closed" /* CLOSED */, { reason: e.message });
        return;
      }
      this._scheduleReconnect();
    }
  }
  _transition(next, extra = {}) {
    if (next === this._state && next !== "reconnecting" /* RECONNECTING */) {
      return;
    }
    this._state = next;
    const status = { state: next, ...extra };
    for (const h of this._statusHandlers) {
      try {
        h(status);
      } catch (err) {
        console.error("[JaatoClient] status handler threw:", err);
      }
    }
  }
};
export {
  AgentError,
  ConnectionClosedError,
  ConnectionError,
  ConnectionState,
  DEFAULT_RECOVERY_CONFIG,
  EventTypeValue,
  IncompatibleServerError,
  JaatoClient,
  MIN_PROTOCOL_VERSION,
  PermissionUnhandled,
  ReconnectingError,
  Session,
  ask,
  computeCacheHitPercent,
  isProtocolCompatible,
  openSession
};
