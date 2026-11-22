import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import apiClient from "@/service/axiosConfig";
import axios from "axios";
import { toast } from "sonner";

const example = '{\n  "url": "https://example.com/mcp",\n  "headers": {\n    "Authorization": "Bearer YOUR_API_KEY"\n  }\n}';

export function McpSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [servers, setServers] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [config, setConfig] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    apiClient.get<{ servers: string[] }>("/mcp")
      .then(({ data }) => { if (active) setServers(data.servers); })
      .catch(() => { if (active) setError("Could not load MCP servers. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);

  const close = (next: boolean) => {
    if (!next) { setName(""); setConfig(""); setError(""); setNotice(""); }
    onOpenChange(next);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    let parsed: unknown;
    try { parsed = JSON.parse(config); } catch { setError("Enter valid JSON for the server configuration."); return; }
    if (!name.trim()) { setError("Enter a server name."); return; }
    setBusy(true);
    const serverName = name.trim();
    const existed = servers.includes(serverName);
    setServers((current) => current.includes(serverName) ? current : [...current, serverName]);
    try {
      await apiClient.put(`/mcp/${encodeURIComponent(serverName)}`, parsed);
      setServers((current) => current.includes(serverName) ? current : [...current, serverName]);
      setName("");
      setConfig("");
      setNotice(`Saved ${serverName}.`);
      toast.success(`Saved ${serverName}`);
    } catch (err) {
      if (!existed) setServers((current) => current.filter((server) => server !== serverName));
      setError(axios.isAxiosError(err) && err.response?.data?.message || "Could not save this server. Please try again.");
      toast.error("Could not save server");
    } finally { setBusy(false); }
  };

  const remove = async (serverName: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    setServers((current) => current.filter((server) => server !== serverName));
    try {
      await apiClient.delete(`/mcp/${encodeURIComponent(serverName)}`);
      setServers((current) => current.filter((server) => server !== serverName));
      setNotice(`Removed ${serverName}.`);
      toast.success(`Removed ${serverName}`);
    } catch (err) {
      setServers((current) => current.includes(serverName) ? current : [...current, serverName]);
      setError(axios.isAxiosError(err) && err.response?.data?.message || "Could not remove this server. Please try again.");
      toast.error("Could not remove server");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>MCP servers</DialogTitle>
          <DialogDescription>Configure remote HTTPS servers for your account. The assistant can use their tools when answering in Discuss mode.</DialogDescription>
        </DialogHeader>
        <section aria-label="Saved MCP servers" className="space-y-2">
          <h3 className="text-sm font-semibold">Saved servers</h3>
          {loading ? <div role="status" aria-label="Loading servers" className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : servers.length === 0 ? <p className="text-sm text-muted-foreground">No servers configured.</p> : (
            <ul className="space-y-2">
              {servers.map((server) => <li key={server} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <span className="min-w-0 break-all text-sm">{server}</span>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setName(server); setConfig(""); setNotice("Enter the complete replacement configuration, including any credentials."); }}>Replace</Button>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => remove(server)}>Remove</Button>
                </div>
              </li>)}
            </ul>
          )}
        </section>
        <form onSubmit={save} className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">Add or replace a server</h3>
          <div className="space-y-1"><Label htmlFor="mcp-name">Server name</Label><Input id="mcp-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="My server" autoComplete="off" /></div>
          <div className="space-y-1"><Label htmlFor="mcp-config">Server JSON</Label><textarea id="mcp-config" value={config} onChange={(event) => setConfig(event.target.value)} placeholder={example} spellCheck={false} autoComplete="off" rows={6} className="w-full rounded-md border border-input bg-background p-3 font-mono text-sm" /></div>
          <p className="text-xs text-muted-foreground">Credentials are encrypted on the server and cannot be viewed again. To change a server, enter its full configuration including credentials.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
          <Button type="submit" disabled={busy || loading}> {busy ? "Saving…" : "Save server"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
