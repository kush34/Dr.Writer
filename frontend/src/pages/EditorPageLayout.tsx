import { type ReactNode, useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GeminiChatBar } from "@/components/GeminiChatBar";
import { useParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebarSide } from "@/config/sidebar-side";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import "./printer.css";

const DEFAULT_DESKTOP_SPLIT = 50;
const MIN_PANEL_WIDTH = 320;
const SPLIT_STORAGE_KEY = "editor-chat-split";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const EditorPageLayout = ({ children }: { children: ReactNode }) => {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const side = useSidebarSide();
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_DESKTOP_SPLIT);
  const [isDragging, setIsDragging] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    const savedWidth = window.localStorage.getItem(SPLIT_STORAGE_KEY);
    if (!savedWidth) return;

    const parsedWidth = Number(savedWidth);
    if (Number.isFinite(parsedWidth)) {
      setSidebarWidth(parsedWidth);
    }
  }, []);

  useEffect(() => {
    if (isMobile) return;
    window.localStorage.setItem(SPLIT_STORAGE_KEY, String(sidebarWidth));
  }, [isMobile, sidebarWidth]);

  useEffect(() => {
    if (!isDragging || isMobile) return;

    const updateSidebarWidth = (clientX: number) => {
      const layout = layoutRef.current;
      if (!layout) return;

      const bounds = layout.getBoundingClientRect();
      const minPercent = (MIN_PANEL_WIDTH / bounds.width) * 100;
      const maxPercent = 100 - minPercent;
      const nextWidth = (side === "left" ? clientX - bounds.left : bounds.right - clientX) / bounds.width * 100;

      setSidebarWidth(clamp(nextWidth, minPercent, maxPercent));
    };

    const handlePointerMove = (event: PointerEvent) => {
      updateSidebarWidth(event.clientX);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, isMobile, side]);

  if (!id) return null;

  if (isMobile) {
    return (
      <SidebarProvider defaultOpen className="relative h-screen">
        <div className="relative flex h-screen w-full overflow-hidden">
          <GeminiChatBar documentId={id} mode="mobile" side={side} />
          <main className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
            <SidebarTrigger className={`absolute ${side === "right" ? "right-4" : "left-4"} top-4 z-20 md:hidden`} />
            <div className="flex h-full min-h-0 w-full min-w-0 justify-center px-3 pb-3 pt-16">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </SidebarProvider>
    );
  }

  return (
    <div
      ref={layoutRef}
      className={`relative flex h-screen w-full overflow-hidden ${side === "right" ? "flex-row-reverse" : ""}`}
    >
      <div
        id="editor-chat-panel"
        hidden={!chatOpen}
        className="relative h-full min-h-0 shrink-0"
        style={{ width: `${sidebarWidth}%`, minWidth: `${MIN_PANEL_WIDTH}px` }}
      >
        <GeminiChatBar documentId={id} mode="desktop" />
      </div>

      {chatOpen && <button
        type="button"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat and editor panels"
        aria-valuenow={Math.round(sidebarWidth)}
        aria-valuemin={0}
        aria-valuemax={100}
        onPointerDown={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        className="relative z-30 w-3 shrink-0 cursor-col-resize border-x border-border/60 bg-background/70 transition-colors hover:bg-accent/50"
      >
        <span className="m-auto block h-14 w-1 rounded-full bg-border" />
      </button>}

      <main className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
        <button
          type="button"
          aria-label={chatOpen ? "Collapse chat sidebar" : "Expand chat sidebar"}
          aria-expanded={chatOpen}
          aria-controls="editor-chat-panel"
          title={chatOpen ? "Collapse chat sidebar" : "Expand chat sidebar"}
          onClick={() => setChatOpen((open) => !open)}
          className={`absolute top-5 z-20 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${side === "right" ? "right-1" : "left-1"}`}
        >
          {side === "left" ? (chatOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />) : (chatOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />)}
        </button>
        <div className={`flex h-full min-h-0 w-full min-w-0 justify-center overflow-hidden px-4 py-4 md:px-6 ${side === "right" ? "pr-12 md:pr-12" : "pl-12 md:pl-12"}`}>
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
};

export default EditorPageLayout;
