import { lookup } from "dns";
import { isIP } from "net";
import ipaddr from "ipaddr.js";
import { Agent } from "undici";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpConfig } from "./mcpConfig";

function publicAddress(address: string) {
  const parsed = ipaddr.parse(address);
  const ip = parsed.kind() === "ipv6" && (parsed as ipaddr.IPv6).isIPv4MappedAddress()
    ? (parsed as ipaddr.IPv6).toIPv4Address() : parsed;
  return ip.range() === "unicast";
}

// Resolve and check addresses at connection time, rather than trusting a prior DNS lookup.
const agent = new Agent({ connect: { lookup: (hostname: string, options: any, callback: any) => {
  lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error || !addresses.length || addresses.some(({ address }) => !publicAddress(address))) {
      return callback(error || new Error("MCP server must resolve to public addresses"));
    }
    if (options.all) return callback(null, addresses);
    const address = addresses.find((entry) => !options.family || entry.family === options.family);
    if (!address) return callback(new Error("No public address available"));
    callback(null, address.address, address.family);
  });
} } });

async function safeFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, { ...init, redirect: "error", signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(30000)]), dispatcher: agent } as RequestInit);
  if (!response.body) return response;
  let size = 0;
  const body = response.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > 4 * 1024 * 1024) throw new Error("MCP response exceeds size limit");
      controller.enqueue(chunk);
    },
  }));
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

type Tool = { name: string; description?: string; inputSchema: Record<string, unknown> };
export type ConnectedTool = { modelName: string; server: string; tool: Tool; client: Client };

export async function connectMcpServers(config: McpConfig) {
  const tools: ConnectedTool[] = [];
  const clients: Client[] = [];
  const unavailable: string[] = [];
  const results = await Promise.all(Object.entries(config.mcpServers).map(async ([server, settings]) => {
    let client: Client | undefined;
    try {
      const url = new URL(settings.url);
      const host = url.hostname.replace(/^\[|\]$/g, "");
      if (url.protocol !== "https:" || (isIP(host) && !publicAddress(host))) throw new Error("Invalid MCP server address");
      const headers = new Headers(settings.headers);
      for (const name of ["host", "content-length", "transfer-encoding", "connection"]) {
        if (headers.has(name)) throw new Error("Invalid MCP request header");
      }
      client = new Client({ name: "dr-writer", version: "1.0.0" });
      const transport = new StreamableHTTPClientTransport(url, {
        requestInit: { headers, redirect: "error" },
        fetch: safeFetch,
      });
      await client.connect(transport, { timeout: 30000 });
      const listedTools: Tool[] = [];
      const seen = new Set<string>();
      let cursor: string | undefined;
      do {
        if (seen.size >= 100) throw new Error("Too many MCP tool pages");
        const page = await client.listTools(cursor ? { cursor } : undefined, { timeout: 30000 });
        listedTools.push(...page.tools as Tool[]);
        if (listedTools.length > 100 || (page.nextCursor && seen.has(page.nextCursor))) throw new Error("Invalid or excessive MCP tool pages");
        cursor = page.nextCursor;
        if (cursor) seen.add(cursor);
      } while (cursor);
      return { server, client, listedTools };
    } catch {
      if (client) await client.close().catch(() => {});
      return { server, client: undefined, listedTools: [] as Tool[] };
    }
  }));
  for (const result of results) {
    if (!result.client) { unavailable.push(result.server); continue; }
    if (tools.length + result.listedTools.length > 100) {
      unavailable.push(result.server);
      await result.client.close().catch(() => {});
      continue;
    }
    clients.push(result.client);
    for (const tool of result.listedTools) tools.push({ modelName: `mcp_${tools.length}`, server: result.server, tool, client: result.client });
  }
  return { tools, unavailable, close: async () => { await Promise.allSettled(clients.map((client) => client.close())); } };
}
