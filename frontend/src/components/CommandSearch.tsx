import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";
import { setSidebarSide } from "@/config/sidebar-side";
import apiClient from "@/service/axiosConfig";

export const openCommandSearch = () => window.dispatchEvent(new Event("drwriter:search"));

type SearchResult = { _id: string; title: string; excerpt: string };

export function CommandSearch() {
  const { user } = useUser();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const show = () => setOpen(true);
    if (user) { window.addEventListener("keydown", shortcut); window.addEventListener("drwriter:search", show); }
    return () => { window.removeEventListener("keydown", shortcut); window.removeEventListener("drwriter:search", show); };
  }, [user]);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query.trim()), 250); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { setSelected(0); }, [query, open]);

  const { data, isFetching, isError } = useQuery<{ documents: SearchResult[] }>({
    queryKey: ["documentSearch", user?.email, debounced],
    queryFn: async () => (await apiClient.get("/document/search", { params: { q: debounced } })).data,
    enabled: open && !!user && debounced.length >= 2 && debounced.length <= 200,
    staleTime: 0,
  });
  const go = (path: string) => () => navigate(path);
  const changeTheme = (theme: "light" | "dark" | "system") => () => { setTheme(theme); toast.success(`${theme[0].toUpperCase() + theme.slice(1)} theme selected`); };
  const changeSide = (side: "left" | "right") => () => { setSidebarSide(side); toast.success(`Sidebar moved to the ${side}`); };
  const actions = [
    { label: "Create a document", keywords: "new file add", run: go("/home?create=1") },
    { label: "Home", keywords: "documents files", run: go("/home") },
    { label: "Settings", keywords: "preferences", run: go("/settings") },
    { label: "Default model settings", keywords: "ai model", run: go("/settings?section=model") },
    { label: "MCP server settings", keywords: "tools integrations", run: go("/settings?section=mcp") },
    { label: "Use light theme", keywords: "appearance mode", run: changeTheme("light") },
    { label: "Use dark theme", keywords: "appearance mode", run: changeTheme("dark") },
    { label: "Use system theme", keywords: "appearance mode", run: changeTheme("system") },
    { label: "Move sidebar left", keywords: "position settings", run: changeSide("left") },
    { label: "Move sidebar right", keywords: "position settings", run: changeSide("right") },
  ];
  const search = query.trim().toLocaleLowerCase();
  const matchingActions = actions.filter((action) => `${action.label} ${action.keywords}`.toLocaleLowerCase().includes(search));
  const documents = search.length >= 2 && debounced === query.trim() && !isFetching && !isError ? data?.documents ?? [] : [];
  const entries = [...matchingActions.map((action) => ({ ...action, description: "Action" })), ...documents.map((doc) => ({ label: doc.title, description: doc.excerpt, run: go(`/home/${doc._id}`) }))];
  useEffect(() => {
    if (selected >= entries.length) setSelected(Math.max(0, entries.length - 1));
    else document.getElementById(`command-result-${selected}`)?.scrollIntoView({ block: "nearest" });
  }, [selected, entries.length]);
  const run = (index: number) => { const entry = entries[index]; if (!entry) return; setOpen(false); setQuery(""); entry.run(); };

  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setQuery(""); }}>
    <DialogContent className="max-h-[80vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogTitle className="sr-only">Search documents and actions</DialogTitle>
      <DialogDescription className="sr-only">Search document text, settings, and actions. Use arrow keys and Enter to select.</DialogDescription>
      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} placeholder="Search documents and actions…" aria-label="Search documents and actions" aria-controls="command-results" aria-activedescendant={entries[selected] ? `command-result-${selected}` : undefined} role="combobox" aria-expanded="true" onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setSelected((index) => Math.max(0, Math.min(index + 1, entries.length - 1))); }
        if (event.key === "ArrowUp") { event.preventDefault(); setSelected((index) => Math.max(index - 1, 0)); }
        if (event.key === "Enter") { event.preventDefault(); run(selected); }
      }} className="h-14 w-full border-b bg-transparent px-4 pr-12 text-sm outline-none placeholder:text-muted-foreground" />
      <div id="command-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
        {entries.map((entry, index) => <button key={`${entry.description}-${entry.label}-${index}`} id={`command-result-${index}`} role="option" aria-selected={index === selected} type="button" onMouseEnter={() => setSelected(index)} onClick={() => run(index)} className={`block w-full rounded-md px-3 py-2 text-left ${index === selected ? "bg-accent text-accent-foreground" : ""}`}><span className="block truncate text-sm font-medium">{entry.label}</span><span className="block truncate text-xs text-muted-foreground">{entry.description}</span></button>)}
        {search.length === 1 && <p className="px-3 py-2 text-xs text-muted-foreground">Type at least two characters to search documents.</p>}
        {search.length >= 2 && (isFetching || debounced !== query.trim()) && <p role="status" className="px-3 py-2 text-xs text-muted-foreground">Searching documents…</p>}
        {search.length >= 2 && isError && debounced === query.trim() && <p role="alert" className="px-3 py-2 text-xs text-destructive">Could not search documents. Try again.</p>}
        {search.length >= 2 && !isFetching && !isError && debounced === query.trim() && documents.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No matching documents.</p>}
      </div>
    </DialogContent>
  </Dialog>;
}
