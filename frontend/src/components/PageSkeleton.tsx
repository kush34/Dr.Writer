import { useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

function Loading({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div role="status" aria-label={label} aria-busy="true" className={className}><span className="sr-only">{label}</span><div aria-hidden="true" className="h-full">{children}</div></div>;
}

export function FileListSkeleton({ view = "card" }: { view?: "card" | "list" }) {
  return <Loading label="Loading documents">
    <div className={view === "card" ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "space-y-2"}>
      {Array.from({ length: 5 }, (_, i) => view === "card" ? <div key={i} className="overflow-hidden rounded-lg border bg-card"><Skeleton className="h-36 w-full rounded-none" /><div className="space-y-2 p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div> : <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3"><Skeleton className="h-5 w-5 shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3 w-28 max-w-full" /></div></div>)}
    </div>
  </Loading>;
}

export function EditorSkeleton() {
  return <Loading label="Loading document" className="h-full min-h-0 w-full overflow-hidden bg-background">
    <div className="flex h-full flex-col">
      <div className="m-2 flex items-center gap-2"><Skeleton className="h-7 max-w-60 flex-1" /><div className="flex flex-1 justify-end gap-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-9 w-10" />)}</div></div>
      <div className="flex h-11 shrink-0 items-center gap-3 overflow-hidden border-b px-3">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-7 w-7 shrink-0" />)}</div>
      <div className="mx-auto w-full max-w-[648px] space-y-4 px-6 pt-12 sm:px-12"><Skeleton className="h-7 w-2/3" /><div className="space-y-3 pt-4">{["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map((width, i) => <Skeleton key={i} className={`h-3 ${width}`} />)}</div></div>
    </div>
  </Loading>;
}

export function ChatMessagesSkeleton() {
  return <Loading label="Loading conversation" className="space-y-4 p-3"><div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="ml-auto h-20 w-4/5" /><Skeleton className="h-10 w-1/2" /><Skeleton className="ml-auto h-16 w-3/4" /></div></Loading>;
}

function SidebarSkeleton() {
  return <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar p-4 md:flex"><Skeleton className="my-5 h-6 w-28" /><div className="mt-4 space-y-4">{Array.from({ length: 5 }, (_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="h-5 w-5" /><Skeleton className="h-4 w-24" /></div>)}</div><div className="mt-auto space-y-4"><Skeleton className="h-9 w-9" /><Skeleton className="h-3 w-full" /><Skeleton className="h-2 w-full" /><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-28" /></div></div></aside>;
}

function HomeSkeleton() {
  const view = localStorage.getItem("drwriter.fileView") === "list" ? "list" : "card";
  return <div className={`flex min-h-svh bg-background text-foreground ${localStorage.getItem("drwriter.sidebarSide") === "right" ? "md:flex-row-reverse" : ""}`}><SidebarSkeleton /><main className="flex min-w-0 flex-1 flex-col"><div className="p-2"><Skeleton className="h-8 w-8" /></div><div className="space-y-5 p-4"><div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-3 w-16" /></div><div className="flex gap-2"><Skeleton className="h-9 w-9" /><Skeleton className="h-9 w-9" /></div></div><FileListSkeleton view={view} /></div><div className="mt-auto p-4"><Skeleton className="h-9 w-9" /></div></main></div>;
}

function SettingsSkeleton() {
  return <div className={`flex min-h-svh bg-background text-foreground ${localStorage.getItem("drwriter.sidebarSide") === "right" ? "md:flex-row-reverse" : ""}`}><SidebarSkeleton /><main className="min-w-0 flex-1"><div className="p-2"><Skeleton className="h-8 w-8" /></div><div className="mx-auto max-w-2xl space-y-8 px-5 pb-12 pt-6 sm:px-8"><div className="space-y-2"><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-72 max-w-full" /></div>{[0, 1].map(i => <div key={i} className="space-y-2 border-t pt-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-10 w-full" /></div>)}{[0, 1].map(i => <div key={i} className="flex items-center justify-between border-t pt-4"><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-52 max-w-full" /></div><Skeleton className="h-9 w-20" /></div>)}</div></main></div>;
}

function EditorPageSkeleton() {
  const right = localStorage.getItem("drwriter.sidebarSide") === "right";
  return <div className={`flex h-svh overflow-hidden bg-background ${right ? "md:flex-row-reverse" : ""}`}><div className="hidden h-full w-1/2 flex-col border-r bg-sidebar md:flex"><div className="border-b p-4"><Skeleton className="h-6 w-28" /></div><div className="flex-1"><ChatMessagesSkeleton /></div><div className="space-y-3 border-t p-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div></div><div className="hidden w-3 border-x md:block" /><main className="min-w-0 flex-1 p-3 pt-16 md:p-4"><EditorSkeleton /></main></div>;
}

function LoginSkeleton() {
  return <div className="flex min-h-svh"><div className="hidden w-1/2 flex-col items-center justify-center gap-5 bg-[#e6fdec] p-16 xl:flex"><Skeleton className="h-1/2 w-1/2" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-3/4" /></div><div className="flex flex-1 flex-col items-center gap-12 bg-slate-100 px-6 pt-16"><div className="space-y-3"><Skeleton className="mx-auto h-10 w-40" /><Skeleton className="h-4 w-48" /></div><div className="mt-16 w-full max-w-xs space-y-6">{[0, 1].map(i => <div key={i} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>)}<Skeleton className="mx-auto h-10 w-1/2" /><Skeleton className="mx-auto h-4 w-40" /></div></div></div>;
}

function LandingSkeleton() {
  return <div className="min-h-svh bg-[#fcfaf7] text-slate-950"><div className="border-b bg-white"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8"><Skeleton className="h-9 w-36" /><div className="hidden gap-8 md:flex">{[0, 1, 2].map(i => <Skeleton key={i} className="h-4 w-24" />)}</div><Skeleton className="h-9 w-28 rounded-full" /></div></div><div className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-2 lg:pt-16"><div className="space-y-6"><Skeleton className="h-7 w-56 rounded-full" /><div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-5/6" /><Skeleton className="h-12 w-2/3" /></div><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-3/4" /></div><div className="flex gap-3"><Skeleton className="h-12 flex-1 rounded-full" /><Skeleton className="h-12 w-36 rounded-full" /></div><Skeleton className="h-4 w-4/5" /></div><Skeleton className="h-80 w-full rounded-[2rem] lg:h-[32rem]" /></div></div>;
}

export function PageSkeleton() {
  const { pathname } = useLocation();
  const body = pathname === "/" ? <LandingSkeleton /> : pathname === "/login" ? <LoginSkeleton /> : pathname === "/settings" ? <SettingsSkeleton /> : /^\/home\/.+/.test(pathname) ? <EditorPageSkeleton /> : <HomeSkeleton />;
  return <Loading label="Loading page">{body}</Loading>;
}
