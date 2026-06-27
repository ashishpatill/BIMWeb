"use client";

import { useEffect, useRef } from "react";

/**
 * Scalar API Reference page.
 *
 * Uses `@scalar/api-reference` (Vue-based) via client-side dynamic import
 * to render the BIMWeb OpenAPI 3.1 spec as an interactive reference.
 */
export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const init = async () => {
      const [openApiDocument, { createApiReference }] = await Promise.all([
        import("@/lib/openapi").then((m) => m.openApiDocument),
        import("@scalar/api-reference"),
      ]);

      if (cancelled || !containerRef.current) return;

      instanceRef.current = createApiReference(containerRef.current, {
        spec: { content: openApiDocument },
        darkMode: true,
        showSidebar: true,
        hideDownloadButton: false,
        theme: "default",
        _integration: "nextjs",
      });
    };

    init();

    return () => {
      cancelled = true;
      instanceRef.current?.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div ref={containerRef} />
    </div>
  );
}
