import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Presentation } from "lucide-react";
import { fetchDocumentData } from "@/service/document";

const PresentationThumbnailCanvas = lazy(() => import("./PresentationThumbnailCanvas"));

function decodePptx(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export default function PresentationThumbnail({ id }: { id: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { data, isError } = useQuery({
    queryKey: ["document-thumbnail", id],
    queryFn: () => fetchDocumentData(id),
    enabled: visible,
  });
  const bytes = useMemo(() => data?.pptx ? decodePptx(data.pptx) : null, [data?.pptx]);

  useEffect(() => {
    const node = container.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={container} className="presentation-thumbnail-canvas">
    {isError ? <div className="flex h-full items-center justify-center text-muted-foreground"><Presentation size={28} /></div>
      : !visible ? <div className="flex h-full items-center justify-center text-muted-foreground"><Presentation size={28} /></div>
      : !data ? <div className="h-full animate-pulse bg-muted" />
      : !bytes ? <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground"><Presentation size={28} /><span className="text-[10px]">Empty presentation</span></div>
      : <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
        <PresentationThumbnailCanvas bytes={bytes} />
      </Suspense>}
  </div>;
}
