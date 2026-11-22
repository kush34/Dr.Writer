import { auth } from "@/firebaseAuth/firebaseConfig";

type EditResult = { operations?: unknown[]; updatedContent?: unknown; question?: string };

export async function requestEdit(documentId: string, body: object, onProgress: (status: string) => void, onPreview: (text: string) => void = () => {}): Promise<EditResult> {
  await auth.authStateReady();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const response = await fetch(`${import.meta.env.VITE_Backend_URL}/document/actions/${encodeURIComponent(documentId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "text/event-stream", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(response.status === 401 ? "Your session has expired. Please sign in again." : error?.message || error?.error || "Could not prepare edits.");
  }
  if (!response.body) throw new Error("Could not start the edit request.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) throw new Error("The edit request was interrupted.");
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";
    for (const event of events) {
      const data = event.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
      if (!data) continue;
      const payload = JSON.parse(data);
      if (payload.type === "progress" && typeof payload.status === "string") onProgress(payload.status);
      if (payload.type === "preview" && typeof payload.text === "string") onPreview(payload.text);
      if (payload.type === "error") throw new Error(payload.message || "Could not prepare edits.");
      if (payload.type === "result") return payload.result;
    }
  }
}
