"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ModelViewer,
  type ViewerStatus,
  type ModelTreeNode,
} from "@/components/viewer/model-viewer";
import type { MeasurementResult } from "@/components/viewer/measurement-tools";
import type { SectionPlaneState } from "@/components/viewer/section-plane";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

import {
  ArrowLeft,
  Orbit,
  Move,
  Ruler,
  Scissors,
  TreePine,
  Layers,
  RotateCcw,
  Maximize2,
  Minimize2,
  Camera,
  HelpCircle,
  X,
  Trash2,
  FlipHorizontal,
  Eye,
  EyeOff,
  AlertTriangle,
  Box,
  Grid3X3,
} from "lucide-react";

interface ViewerClientProps {
  projectId: number;
  projectName: string;
  modelId: number;
  modelName: string;
  modelUrl: string | null;
  fileType: string;
}

type ToolMode = "orbit" | "pan" | "measure" | "section" | "none";
type RightPanelTab = "measurements" | "tree" | "layers" | "none";

interface SectionPlaneUI {
  id: string;
  axis: "x" | "y" | "z";
  position: number;
  flipped: boolean;
}

export function ViewerClient({
  projectId,
  projectName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  modelId,
  modelName,
  modelUrl,
  fileType,
}: ViewerClientProps) {
  const searchParams = useSearchParams();
  const highlightElementId = searchParams.get("element");
  const [, startTransition] = useTransition();

  // Status
  const [status, setStatus] = useState<ViewerStatus>(
    modelUrl ? "loading" : "empty"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>("orbit");
  const [rightPanel, setRightPanel] = useState<RightPanelTab>("none");
  const [showHelp, setShowHelp] = useState(false);

  // Measurements
  const [measurements, setMeasurements] = useState<MeasurementResult[]>(
    []
  );

  // Model Tree
  const [treeData, setTreeData] = useState<ModelTreeNode[]>([]);

  // Section Planes
  const [sectionPlanes, setSectionPlanes] = useState<SectionPlaneUI[]>(
    []
  );

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleStatusChange = useCallback((s: ViewerStatus) => {
    setStatus(s);
  }, []);

  const handleError = useCallback((msg: string) => {
    setErrorMessage(msg);
  }, []);

  const handleMeasurement = useCallback((result: MeasurementResult) => {
    setMeasurements((prev) => [...prev, result]);
    // Auto-show measurements panel
    setRightPanel((prev) => (prev === "none" ? "measurements" : prev));
  }, []);

  const handleTreeChange = useCallback((tree: ModelTreeNode[]) => {
    setTreeData(tree);
  }, []);

  const handleSectionPlanesChange = useCallback(
    (planes: SectionPlaneState[]) => {
      setSectionPlanes(
        planes.map((p) => ({
          id: p.id,
          axis: p.axis,
          position: p.position,
          flipped: p.flipped,
        }))
      );
    },
    []
  );

  // ── Fullscreen helpers ─────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key.toLowerCase()) {
        case "o":
          setToolMode("orbit");
          break;
        case "p":
          setToolMode("pan");
          break;
        case "m":
          setToolMode((prev) => (prev === "measure" ? "orbit" : "measure"));
          break;
        case "s":
          setToolMode((prev) => (prev === "section" ? "orbit" : "section"));
          break;
        case "t":
          setRightPanel((prev) => (prev === "tree" ? "none" : "tree"));
          break;
        case "r":
          document.dispatchEvent(new CustomEvent("viewer-reset"));
          break;
        case "f":
          toggleFullscreen();
          break;
        case "escape":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          setToolMode("orbit");
          setShowHelp(false);
          break;
        case "h":
          setShowHelp((prev) => !prev);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleFullscreen]);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  // ── Screenshot ──────────────────────────────────────────────────

  const takeScreenshot = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${modelName.replace(/\s+/g, "_")}_screenshot.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [modelName]);

  // ── Measurement actions ────────────────────────────────────────

  const clearMeasurement = useCallback((id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearAllMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  // ── Panel / tool mode ──────────────────────────────────────────

  const togglePanel = useCallback(
    (tab: RightPanelTab) => {
      setRightPanel((prev) => (prev === tab ? "none" : tab));
    },
    []
  );

  const setTool = useCallback((mode: ToolMode) => {
    setToolMode(mode);
  }, []);

  // ── Section plane operations ────────────────────────────────────

  const removeSectionPlane = useCallback(
    (id: string) => {
      document.dispatchEvent(
        new CustomEvent("section-remove", { detail: { id } })
      );
      setSectionPlanes((prev) => prev.filter((p) => p.id !== id));
    },
    []
  );

  const flipSectionPlane = useCallback((id: string) => {
    document.dispatchEvent(
      new CustomEvent("section-flip", { detail: { id } })
    );
    setSectionPlanes((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, flipped: !p.flipped } : p
      )
    );
  }, []);

  const updateSectionPlanePosition = useCallback(
    (id: string, position: number) => {
      document.dispatchEvent(
        new CustomEvent("section-update", {
          detail: { id, position },
        })
      );
      setSectionPlanes((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, position } : p
        )
      );
    },
    []
  );

  // ── Onboarding check ───────────────────────────────────────────

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(
        "bimweb_viewer_onboarding_dismissed"
      );
      if (!dismissed && status === "ready") {
        startTransition(() => {
          setShowOnboarding(true);
        });
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [status, startTransition]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(
        "bimweb_viewer_onboarding_dismissed",
        "true"
      );
    } catch {
      // ignore
    }
  }, []);

  // Determine status label
  const statusLabel =
    status === "ready"
      ? "Ready"
      : status === "loading"
        ? "Loading…"
        : status === "parsing-ifc"
          ? "Parsing IFC…"
          : status === "unsupported-format"
            ? "Unsupported format"
            : status === "webgl-unsupported"
              ? "WebGL unavailable"
              : status === "error"
                ? "Error"
                : "No model";

  const statusColor =
    status === "ready"
      ? "bg-emerald-500"
      : status === "loading" || status === "parsing-ifc"
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-2 bg-zinc-900/90 border-b border-white/5 z-30 shrink-0">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
          aria-label="Back to project"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/projects">
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                href={`/dashboard/projects/${projectId}`}
              >
                {projectName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{modelName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span
              className={`w-1.5 h-1.5 rounded-full ${statusColor}`}
            />
            <span>{statusLabel}</span>
          </div>
        </div>
      </header>

      {/* ── Main Area ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Left Dock (tools) ────────────────────────────────── */}
        <nav className="flex flex-col gap-1 p-2 bg-zinc-900/50 border-r border-white/5 z-20 shrink-0">
          <ToolButton
            icon={<Orbit className="w-4 h-4" />}
            label="Orbit"
            shortcut="O"
            active={toolMode === "orbit"}
            onClick={() => setTool("orbit")}
          />
          <ToolButton
            icon={<Move className="w-4 h-4" />}
            label="Pan"
            shortcut="P"
            active={toolMode === "pan"}
            onClick={() => setTool("pan")}
          />
          <ToolButton
            icon={<Ruler className="w-4 h-4" />}
            label="Measure"
            shortcut="M"
            active={toolMode === "measure"}
            onClick={() => setTool("measure")}
          />
          <ToolButton
            icon={<Scissors className="w-4 h-4" />}
            label="Section"
            shortcut="S"
            active={toolMode === "section"}
            onClick={() => setTool("section")}
          />
          <Separator className="my-1 bg-white/5" />
          <ToolButton
            icon={<TreePine className="w-4 h-4" />}
            label="Model Tree"
            shortcut="T"
            active={rightPanel === "tree"}
            onClick={() => togglePanel("tree")}
          />
          <ToolButton
            icon={<Layers className="w-4 h-4" />}
            label="Layers"
            shortcut=""
            active={rightPanel === "layers"}
            onClick={() => togglePanel("layers")}
          />
          <Separator className="my-1 bg-white/5" />
          <ToolButton
            icon={<RotateCcw className="w-4 h-4" />}
            label="Reset View"
            shortcut="R"
            active={false}
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent("viewer-reset")
              )
            }
          />
          <ToolButton
            icon={
              isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )
            }
            label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            shortcut="F"
            active={false}
            onClick={toggleFullscreen}
          />
          <ToolButton
            icon={<Camera className="w-4 h-4" />}
            label="Screenshot"
            shortcut=""
            active={false}
            onClick={takeScreenshot}
          />
          <Separator className="my-1 bg-white/5" />
          <ToolButton
            icon={<HelpCircle className="w-4 h-4" />}
            label="Help"
            shortcut="H"
            active={showHelp}
            onClick={() => setShowHelp((prev) => !prev)}
          />
        </nav>

        {/* ── Viewport ─────────────────────────────────────────── */}
        <div className="flex-1 relative">
          {/* Error panel */}
          {status === "unsupported-format" && errorMessage && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/90">
              <div className="glass-panel max-w-md text-center p-8">
                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">
                  Format Not Supported
                </h3>
                <p className="text-sm text-zinc-400 mb-4">
                  {errorMessage}
                </p>
                <p className="text-xs text-zinc-500">
                  Supported formats:{" "}
                  <span className="text-zinc-300">.glTF</span>,{" "}
                  <span className="text-zinc-300">.glb</span>,{" "}
                  <span className="text-zinc-300">.IFC</span>
                </p>
                <div className="mt-6 flex gap-3 justify-center">
                  <Link
                    href={`/dashboard/projects/${projectId}`}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white transition-colors"
                  >
                    Back to Project
                  </Link>
                  <button
                    onClick={() => {
                      setErrorMessage(null);
                      document.dispatchEvent(
                        new CustomEvent("viewer-load-sample")
                      );
                    }}
                    className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-sm text-primary transition-colors"
                  >
                    Load Sample Model
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {status === "error" && errorMessage && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/90">
              <div className="glass-panel max-w-md text-center p-8">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">
                  Failed to Load Model
                </h3>
                <p className="text-sm text-zinc-400 mb-4">
                  {errorMessage}
                </p>
                <Link
                  href={`/dashboard/projects/${projectId}`}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white transition-colors inline-block"
                >
                  Back to Project
                </Link>
              </div>
            </div>
          )}

          {/* Empty / no model */}
          {status === "empty" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/90">
              <div className="glass-panel max-w-md text-center p-8">
                <Box className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">
                  No Model Loaded
                </h3>
                <p className="text-sm text-zinc-400 mb-6">
                  Upload an IFC or glTF model to get started, or load a
                  sample building to explore the viewer.
                </p>
                <button
                  onClick={() =>
                    document.dispatchEvent(
                      new CustomEvent("viewer-load-sample")
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-sm text-primary transition-colors"
                >
                  Load Sample Model
                </button>
              </div>
            </div>
          )}

          {/* WebGL unsupported */}
          {status === "webgl-unsupported" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/90">
              <div className="glass-panel max-w-md text-center p-8">
                <Grid3X3 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">
                  WebGL Unsupported
                </h3>
                <p className="text-sm text-zinc-400">
                  Your browser does not support WebGL. Try a modern
                  browser like Chrome, Firefox, or Edge.
                </p>
              </div>
            </div>
          )}

          {/* The 3D viewer */}
          <ModelViewer
            modelUrl={modelUrl}
            modelName={modelName}
            fileType={
              fileType as
                | "gltf"
                | "glb"
                | "ifc"
                | "obj"
                | "fbx"
                | "unknown"
            }
            onStatusChange={handleStatusChange}
            onError={handleError}
            onMeasurement={handleMeasurement}
            onMeasurementsChange={setMeasurements}
            onTreeChange={handleTreeChange}
            onSectionPlanesChange={handleSectionPlanesChange}
            highlightElementId={highlightElementId}
          />

          {/* Section plane slider bar (bottom) */}
          {sectionPlanes.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap gap-3 pointer-events-none">
              {sectionPlanes.map((plane) => (
                <div
                  key={plane.id}
                  className="pointer-events-auto bg-zinc-900/90 backdrop-blur-md border border-white/5 rounded-xl p-3 min-w-[200px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-300 uppercase">
                      Section {plane.axis.toUpperCase()}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => flipSectionPlane(plane.id)}
                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        aria-label={`Flip section ${plane.axis}`}
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeSectionPlane(plane.id)}
                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-red-400 transition-colors"
                        aria-label={`Remove section ${plane.axis}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={plane.position}
                    onChange={(e) =>
                      updateSectionPlanePosition(
                        plane.id,
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-full accent-primary"
                    aria-label={`Section ${plane.axis} position`}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                    <span>0%</span>
                    <span>{Math.round(plane.position * 100)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Panel ──────────────────────────────────────── */}
        {rightPanel !== "none" && (
          <aside className="w-72 bg-zinc-900/90 border-l border-white/5 z-20 flex flex-col overflow-hidden shrink-0">
            {/* Panel tabs */}
            <div className="flex border-b border-white/5">
              <button
                onClick={() => togglePanel("measurements")}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                  rightPanel === "measurements"
                    ? "text-primary border-b-2 border-primary"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Measurements
              </button>
              <button
                onClick={() => togglePanel("tree")}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                  rightPanel === "tree"
                    ? "text-primary border-b-2 border-primary"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Model Tree
              </button>
              <button
                onClick={() => togglePanel("layers")}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                  rightPanel === "layers"
                    ? "text-primary border-b-2 border-primary"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Layers
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {/* Measurements */}
              {rightPanel === "measurements" && (
                <div>
                  {measurements.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-8">
                      No measurements yet. Click the Measure tool (M) and
                      click two points on the model.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-400">
                          {measurements.length} measurement
                          {measurements.length !== 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={clearAllMeasurements}
                          className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear all
                        </button>
                      </div>
                      {measurements.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                        >
                          <div>
                            <span className="text-sm font-mono text-white">
                              {m.distanceMeters.toFixed(3)} m
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              From ({m.from.x.toFixed(2)},{" "}
                              {m.from.y.toFixed(2)},{" "}
                              {m.from.z.toFixed(2)})
                            </span>
                          </div>
                          <button
                            onClick={() => clearMeasurement(m.id)}
                            className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors"
                            aria-label="Clear measurement"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Model Tree */}
              {rightPanel === "tree" && (
                <div>
                  {treeData.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-8">
                      No model loaded. The model tree will show scene
                      hierarchy once a model is loaded.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {treeData.map((node) => (
                        <div key={node.id}>
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs">
                            <button
                              className="text-zinc-500 hover:text-white transition-colors"
                              aria-label={
                                node.visible
                                  ? `Hide ${node.name}`
                                  : `Show ${node.name}`
                              }
                            >
                              {node.visible ? (
                                <Eye className="w-3 h-3" />
                              ) : (
                                <EyeOff className="w-3 h-3" />
                              )}
                            </button>
                            <span className="text-zinc-300 truncate flex-1">
                              {node.name}
                            </span>
                            <span className="text-zinc-600 text-[10px]">
                              {node.type}
                            </span>
                          </div>
                          {node.children && node.children.length > 0 && (
                            <div className="ml-4 space-y-1">
                              {node.children.map((child) => (
                                <div
                                  key={child.id}
                                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 text-[11px]"
                                >
                                  <button
                                    className="text-zinc-500 hover:text-white transition-colors"
                                    aria-label={
                                      child.visible
                                        ? `Hide ${child.name}`
                                        : `Show ${child.name}`
                                    }
                                  >
                                    {child.visible ? (
                                      <Eye className="w-2.5 h-2.5" />
                                    ) : (
                                      <EyeOff className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                  <span className="text-zinc-400 truncate flex-1">
                                    {child.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Layers */}
              {rightPanel === "layers" && (
                <div>
                  {treeData.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-8">
                      No layers available. Load a model to see its layers
                      grouped by IFC class or scene nodes.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {treeData.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs"
                        >
                          <div
                            className="w-3 h-3 rounded"
                            style={{
                              backgroundColor: `hsl(${
                                node.type
                                  .split("")
                                  .reduce(
                                    (acc, c) => acc + c.charCodeAt(0),
                                    0
                                  ) % 360
                              }, 50%, 50%)`,
                            }}
                          />
                          <span className="text-zinc-300 truncate flex-1">
                            {node.name}
                          </span>
                          <span className="text-zinc-500 text-[10px]">
                            {node.children?.length || 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── Onboarding Overlay ──────────────────────────────── */}
        {showOnboarding && (
          <div className="absolute inset-0 z-40 bg-zinc-950/80 flex items-center justify-center">
            <div className="glass-panel max-w-lg p-8">
              <h2 className="text-xl font-bold text-white mb-2">
                Welcome to the 3D Viewer
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                Here&apos;s a quick tour of what you can do:
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-sm text-white font-semibold">
                      Orbit &amp; Navigate
                    </p>
                    <p className="text-xs text-zinc-400">
                      Click and drag to orbit. Scroll to zoom. Press{" "}
                      <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">
                        O
                      </kbd>{" "}
                      for orbit mode,{" "}
                      <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">
                        P
                      </kbd>{" "}
                      for pan.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm text-white font-semibold">
                      Measure Distances
                    </p>
                    <p className="text-xs text-zinc-400">
                      Press{" "}
                      <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">
                        M
                      </kbd>{" "}
                      then click two points on the model to measure
                      distance. Results appear in the Measurements panel.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm text-white font-semibold">
                      Section Planes
                    </p>
                    <p className="text-xs text-zinc-400">
                      Press{" "}
                      <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">
                        S
                      </kbd>{" "}
                      then choose an axis. Drag the slider to move the
                      cut plane. Multiple planes can be added.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={dismissOnboarding}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Got it, let&apos;s go!
              </button>
            </div>
          </div>
        )}

        {/* ── Help Popover ─────────────────────────────────────── */}
        {showHelp && (
          <div className="absolute top-16 right-4 z-50 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl p-5 w-72 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                aria-label="Close help"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ["O", "Orbit mode"],
                ["P", "Pan mode"],
                ["M", "Measure tool"],
                ["S", "Section tool"],
                ["T", "Toggle model tree"],
                ["R", "Reset view"],
                ["F", "Toggle fullscreen"],
                ["Esc", "Exit tool / fullscreen"],
                ["H", "Toggle help"],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between"
                >
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono min-w-[32px] text-center">
                    {key}
                  </kbd>
                  <span className="text-zinc-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tool Button component ──────────────────────────────────────────

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active: boolean;
  onClick: () => void;
}

function ToolButton({
  icon,
  label,
  shortcut,
  active,
  onClick,
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        data-active={active || undefined}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full
          ${
            active
              ? "bg-primary/20 text-primary border border-primary/20 shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        aria-label={`${label}${shortcut ? ` (${shortcut})` : ""}`}
        aria-pressed={active}
      >
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
        {shortcut && (
          <span className="ml-1 text-zinc-400">({shortcut})</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
