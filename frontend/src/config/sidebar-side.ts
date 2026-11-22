import { useEffect, useState } from "react";
type Side = "left" | "right";
const key = "drwriter.sidebarSide";
const readSide = (): Side => localStorage.getItem(key) === "right" ? "right" : "left";
export function useSidebarSide() {
  const [side, setSide] = useState<Side>(readSide);
  useEffect(() => {
    const update = () => setSide(readSide());
    window.addEventListener("sidebar-side-change", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("sidebar-side-change", update); window.removeEventListener("storage", update); };
  }, []);
  return side;
}
export function setSidebarSide(side: Side) {
  localStorage.setItem(key, side);
  window.dispatchEvent(new Event("sidebar-side-change"));
}
