import { useEffect, useRef } from "react";

export default function HTMLContent({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (isStreaming) {
      // During streaming: show raw HTML as code
      containerRef.current.textContent = content;
    } else {
      // After streaming: render as actual HTML
      containerRef.current.innerHTML = content;
    }
  }, [content, isStreaming]);

  if (isStreaming) {
    return (
      <div>
        <div className="mb-2 text-xs text-gray-500 italic">Loading data...</div>
      </div>
    );
  }

  return <div ref={containerRef} className="overflow-x-auto" />;
}
