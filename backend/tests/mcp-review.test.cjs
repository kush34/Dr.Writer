const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { connectMcpServers } = require("../dist/service/mcpClient");
const { openRouterWithTools } = require("../dist/service/openrouter");
const User = require("../dist/Models/userModel").default;
const { getMcpConfig, updateMcpConfig } = require("../dist/service/mcpConfig");
const { AppError } = require("../dist/utils/appError");

test("tool rounds reserve a final answer and account for every response", async () => {
  const originalFetch = global.fetch;
  const requests = [];
  let calls = 0;
  let charged = 0;
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    const final = request.tool_choice === "none";
    const message = final ? { content: "Done" } : { content: null, tool_calls: [{ id: `call${requests.length}`, function: { name: "mcp_0", arguments: "{}" } }] };
    return Response.json({ choices: [{ message }], usage: { total_tokens: 120, completion_tokens: 10 } });
  };
  try {
    const tools = [{ modelName: "mcp_0", server: "test", tool: { name: "run", inputSchema: {} }, client: { callTool: async () => { calls++; return { content: [] }; } } }];
    const result = await openRouterWithTools("test", "model", tools, () => {}, (tokens) => { charged += tokens; }, async () => {});
    assert.equal(result.text, "Done");
    assert.equal(calls, 7);
    assert.equal(result.count, 7);
    assert.equal(charged, 8 * 120);
    assert.equal(requests[7].tool_choice, "none");
    assert.ok(requests.every((request) => request.max_tokens > 0));
  } finally { global.fetch = originalFetch; }
});

test("a final-round tool call is rejected before execution", async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => Response.json({ choices: [{ message: { content: null, tool_calls: [{ id: `call${calls}`, function: { name: "mcp_0", arguments: "{}" } }] } }], usage: { total_tokens: 20, completion_tokens: 1 } });
  try {
    const tools = [{ modelName: "mcp_0", server: "test", tool: { name: "run", inputSchema: {} }, client: { callTool: async () => { calls++; return { content: [] }; } } }];
    await assert.rejects(openRouterWithTools("test", "model", tools, () => {}, () => {}, async () => {}), /tool call limit/);
    assert.equal(calls, 7);
  } finally { global.fetch = originalFetch; }
});

test("missing provider usage is conservatively charged and output is bounded", async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  let charged = 0;
  const limits = [];
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    limits.push(request.max_tokens);
    const message = request.tool_choice === "none" ? { content: "Done" } : { content: null, tool_calls: [{ id: `call${calls}`, function: { name: "mcp_0", arguments: "{}" } }] };
    return Response.json({ choices: [{ message }] });
  };
  try {
    const tools = [{ modelName: "mcp_0", server: "test", tool: { name: "run", inputSchema: {} }, client: { callTool: async () => { calls++; return { content: [] }; } } }];
    await openRouterWithTools("test", "model", tools, () => {}, (tokens) => { charged += tokens; }, async () => {});
    assert.equal(limits.reduce((total, limit) => total + limit, 0), 20000);
    assert.ok(charged > 20000);
  } finally { global.fetch = originalFetch; }
});

test("allows enough output for a model to answer after using a tool", async () => {
  const originalFetch = global.fetch;
  const limits = [];
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    limits.push(request.max_tokens);
    const message = limits.length === 1
      ? { content: null, tool_calls: [{ id: "one", function: { name: "mcp_0", arguments: "{}" } }] }
      : { content: request.max_tokens > 200 ? "Answer" : "" };
    return Response.json({ choices: [{ message }], usage: { total_tokens: 300, completion_tokens: 100 } });
  };
  try {
    const tools = [{ modelName: "mcp_0", server: "test", tool: { name: "search", inputSchema: {} }, client: { callTool: async () => ({ content: [] }) } }];
    const result = await openRouterWithTools("test", "model", tools, () => {}, () => {}, async () => {});
    assert.equal(result.text, "Answer");
    assert.deepEqual(limits, [1000, 18900]);
  } finally { global.fetch = originalFetch; }
});

test("the free router can select another model if the selected model is rate limited", async () => {
  const originalFetch = global.fetch;
  const models = [];
  global.fetch = async (_url, options) => {
    models.push(JSON.parse(options.body).model);
    if (models.length === 2) return new Response(null, { status: 429 });
    const message = models.length === 1 ? { content: null, tool_calls: [{ id: "one", function: { name: "mcp_0", arguments: "{}" } }] } : { content: "Answer" };
    return Response.json({ model: "provider/first:free", choices: [{ message }], usage: { total_tokens: 100, completion_tokens: 10 } });
  };
  try {
    const tools = [{ modelName: "mcp_0", server: "test", tool: { name: "search", inputSchema: {} }, client: { callTool: async () => ({ content: [] }) } }];
    const result = await openRouterWithTools("test", "openrouter/free", tools, () => {}, () => {}, async () => {});
    assert.equal(result.text, "Answer");
    assert.deepEqual(models, ["openrouter/free", "provider/first:free", "openrouter/free"]);
  } finally { global.fetch = originalFetch; }
});

test("recovers from an empty model response after a tool without executing it again", async () => {
  const originalFetch = global.fetch;
  const requests = [];
  let calls = 0;
  global.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const message = requests.length === 1 ? { content: null, tool_calls: [{ id: "one", function: { name: "mcp_0", arguments: "{}" } }] } : { content: requests.length === 2 ? "" : "Recovered answer" };
    return Response.json({ choices: [{ message }], usage: { total_tokens: 100, completion_tokens: 10 } });
  };
  try {
    const tools = [{ modelName: "mcp_0", server: "test", tool: { name: "search", inputSchema: {} }, client: { callTool: async () => { calls++; return { content: [] }; } } }];
    const result = await openRouterWithTools("test", "model", tools, () => {}, () => {}, async () => {});
    assert.equal(result.text, "Recovered answer");
    assert.equal(calls, 1);
    assert.equal(requests[2].tools, undefined);
  } finally { global.fetch = originalFetch; }
});

test("insufficient reservation prevents a model request", async () => {
  const originalFetch = global.fetch;
  let requested = false;
  global.fetch = async () => { requested = true; throw new Error("should not be called"); };
  try {
    await assert.rejects(openRouterWithTools("test", "model", [], () => {}, () => {}, async () => { throw new Error("insufficient balance"); }), /insufficient balance/);
    assert.equal(requested, false);
  } finally { global.fetch = originalFetch; }
});

test("shrinks tool context to fit the balance without repeating the tool call", async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  let spent = 0;
  let requests = 0;
  let lastRequest;
  global.fetch = async (_url, options) => {
    lastRequest = JSON.parse(options.body);
    requests++;
    const message = requests === 1 ? { content: null, tool_calls: [{ id: "one", function: { name: "mcp_0", arguments: "{}" } }] } : { content: "Done" };
    return Response.json({ choices: [{ message }], usage: { total_tokens: 300, completion_tokens: 10 } });
  };
  try {
    const tools = [{ modelName: "mcp_0", server: "test", tool: { name: "search", inputSchema: {} }, client: { callTool: async () => { calls++; return { content: "x".repeat(5000) }; } } }];
    const result = await openRouterWithTools("test", "model", tools, () => {}, (tokens) => { spent += tokens; }, async (estimate) => { if (spent + estimate > 3000) throw new AppError(402, "Insufficient balance"); });
    assert.equal(result.text, "Done");
    assert.equal(calls, 1);
    assert.match(lastRequest.messages.find((message) => message.role === "tool").content, /truncated to fit token balance/);
  } finally { global.fetch = originalFetch; }
});

test("finishes with gathered results when another tool-enabled round cannot be reserved", async () => {
  const originalFetch = global.fetch;
  const requests = [];
  let calls = 0;
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    const message = requests.length === 1
      ? { content: null, tool_calls: [{ id: "one", function: { name: "mcp_0", arguments: "{}" } }] }
      : { content: "Answer based on search" };
    return Response.json({ model: "provider/selected:free", choices: [{ message }], usage: { total_tokens: 100, completion_tokens: 10 } });
  };
  try {
    const tools = [{ modelName: "mcp_0", server: "test", tool: { name: "search", description: "x".repeat(1024), inputSchema: { description: "x".repeat(4000) } }, client: { callTool: async () => { calls++; return { content: "result" }; } } }];
    const result = await openRouterWithTools("test", "openrouter/free", tools, () => {}, () => {}, async (estimate) => {
      if (calls && estimate > 4000) throw new AppError(402, "Insufficient balance");
    });
    assert.equal(result.text, "Answer based on search");
    assert.equal(calls, 1);
    assert.equal(requests[1].tools, undefined);
    assert.equal(requests[1].model, "provider/selected:free");
    assert.ok(requests[1].messages.some((message) => message.role === "tool"));
  } finally { global.fetch = originalFetch; }
});

test("discovery follows cursors and keeps healthy servers when another fails", async () => {
  const original = { connect: Client.prototype.connect, listTools: Client.prototype.listTools, close: Client.prototype.close };
  let created = 0;
  Client.prototype.connect = async function () { this.testServer = created++; if (this.testServer === 0) throw new Error("offline"); };
  Client.prototype.listTools = async function (params) {
    return params?.cursor ? { tools: [{ name: "second", inputSchema: { type: "object" } }] } : { tools: [{ name: "first", inputSchema: { type: "object" } }], nextCursor: "page2" };
  };
  Client.prototype.close = async function () {};
  try {
    const result = await connectMcpServers({ mcpServers: { offline: { url: "https://offline.example/mcp" }, healthy: { url: "https://healthy.example/mcp" } } });
    assert.deepEqual(result.unavailable, ["offline"]);
    assert.deepEqual(result.tools.map((entry) => entry.tool.name), ["first", "second"]);
    await result.close();
  } finally { Object.assign(Client.prototype, original); }
});

test("simultaneous server updates preserve both encrypted configurations", async () => {
  const originalFind = User.findById;
  const originalUpdate = User.updateOne;
  const originalKey = process.env.MCP_ENCRYPTION_KEY;
  process.env.MCP_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
  let stored;
  User.findById = () => ({ select: async () => ({ mcp_config: stored }) });
  User.updateOne = async (filter, change) => {
    await new Promise((resolve) => setImmediate(resolve));
    const expected = filter.mcp_config;
    if (typeof expected === "object" ? stored !== undefined : stored !== expected) return { matchedCount: 0 };
    stored = change.$set.mcp_config;
    return { matchedCount: 1 };
  };
  try {
    const add = (name) => updateMcpConfig("user-1", (config) => ({ mcpServers: { ...config.mcpServers, [name]: { url: `https://${name}.example/mcp`, headers: { Authorization: "secret" } } } }));
    await Promise.all([add("one"), add("two")]);
    const result = await getMcpConfig("user-1");
    assert.deepEqual(Object.keys(result.mcpServers).sort(), ["one", "two"]);
    assert.ok(!stored.includes("secret"));
  } finally {
    User.findById = originalFind;
    User.updateOne = originalUpdate;
    if (originalKey === undefined) delete process.env.MCP_ENCRYPTION_KEY; else process.env.MCP_ENCRYPTION_KEY = originalKey;
  }
});
