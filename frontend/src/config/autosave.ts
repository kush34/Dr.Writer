import { useEffect, useState } from "react";

const key = "drwriter.autosave";
const readAutosave = () => localStorage.getItem(key) === "true";

export function setAutosave(enabled: boolean) {
  localStorage.setItem(key, String(enabled));
  window.dispatchEvent(new Event("autosave-change"));
}

export function useAutosave() {
  const [enabled, setEnabled] = useState(readAutosave);
  useEffect(() => {
    const update = () => setEnabled(readAutosave());
    window.addEventListener("autosave-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("autosave-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return enabled;
}
