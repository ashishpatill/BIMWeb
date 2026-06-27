"use client";

import { useRef, useEffect, useState, useCallback, useTransition } from "react";
import * as THREE from "three";
import {
  MeasurementManager,
  type MeasurementResult,
} from "./measurement-tools";
import {
  SectionPlaneManager,
  type SectionPlaneState,
} from "./section-plane";
import { parseIfc, type ParsedIFC } from "@/lib/ifc/parser";

// ── Types ──────────────────────────────────────────────────────────

export type ViewerStatus =
  | "loading"
  | "parsing-ifc"
  | "ready"
  | "unsupported-format"
  | "webgl-unsupported"
  | "error"
  | "empty";

export interface ViewerProgress {
  stage: string;
  /** 0..1 */
  percent: number;
}

export interface ModelTreeNode {
  id: string;
  name: string;
  /** IFC type or glTF node name */
  type: string;
  children?: ModelTreeNode[];
  visible: boolean;
  object?: THREE.Object3D;
}

export interface ModelViewerProps {
  modelUrl: string | null;
  modelName?: string;
  fileType?: "gltf" | "glb" | "ifc" | "obj" | "fbx" | "unknown";
  onProgress?: (progress: ViewerProgress) => void;
  onError?: (message: string) => void;
  onReady?: () => void;
  onStatusChange?: (status: ViewerStatus) => void;
  onMeasurement?: (result: MeasurementResult) => void;
  onMeasurementsChange?: (measurements: MeasurementResult[]) => void;
  onTreeChange?: (tree: ModelTreeNode[]) => void;
  onSectionPlanesChange?: (planes: SectionPlaneState[]) => void;
  showSampleBuilding?: boolean;
}

// ── Component ──────────────────────────────────────────────────────

export function ModelViewer({
  modelUrl,
  modelName = "BIM Model",
  fileType = "unknown",
  onProgress,
  onError,
  onReady,
  onStatusChange,
  onMeasurement,
  onMeasurementsChange,
  onTreeChange,
  onSectionPlanesChange,
  showSampleBuilding = false,
}: ModelViewerProps) {
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: THREE.EventDispatcher & {
      enableDamping: boolean;
      dampingFactor: number;
      minDistance: number;
      maxDistance: number;
      target: THREE.Vector3;
      update: () => void;
      dispose: () => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
    modelGroup: THREE.Group;
  } | null>(null);
  const measurementManagerRef = useRef<MeasurementManager | null>(null);
  const sectionPlaneManagerRef = useRef<SectionPlaneManager | null>(null);
  const [status, setStatus] = useState<ViewerStatus>(
    modelUrl ? "loading" : "empty"
  );
  const [progress, setProgress] = useState<ViewerProgress>({
    stage: "initializing",
    percent: 0,
  });
  // Track measurements for panel
  const measurementsRef = useRef<MeasurementResult[]>([]);
  // Track loaded IFC data for tree
  const ifcDataRef = useRef<ParsedIFC | null>(null);
  // Track bounding box of model
  const bboxRef = useRef<THREE.Box3 | null>(null);

  const reportStatus = useCallback(
    (s: ViewerStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange]
  );

  const reportProgress = useCallback(
    (stage: string, percent: number) => {
      const p = { stage, percent };
      setProgress(p);
      onProgress?.(p);
    },
    [onProgress]
  );

  // ── Private helpers ──────────────────────────────────────────────

  const clearModelGroup = useCallback(() => {
    if (!sceneRef.current) return;
    const { scene, modelGroup } = sceneRef.current;
    scene.remove(modelGroup);
    // Dispose all children
    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const mat = child.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
    while (modelGroup.children.length > 0) {
      modelGroup.remove(modelGroup.children[0]);
    }
  }, []);

  const rebuildTreeFromGroup = useCallback(
    (group: THREE.Group, label: string) => {
      const tree: ModelTreeNode[] = [];
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const parentName = child.parent?.name || "Group";
          let parent = tree.find((t) => t.name === parentName);
          if (!parent) {
            parent = {
              id: `node_${parentName}`,
              name: parentName,
              type: "Mesh",
              children: [],
              visible: child.visible,
              object: child,
            };
            tree.push(parent);
          }
          if (parent.children) {
            parent.children.push({
              id: `node_${child.name || child.id}`,
              name: child.name || `Mesh ${parent.children.length}`,
              type: "Mesh",
              visible: child.visible,
              object: child,
            });
          }
        }
      });
      // If nothing found, wrap the group itself
      if (tree.length === 0) {
        tree.push({
          id: "model_root",
          name: label,
          type: "Group",
          visible: true,
          object: group,
        });
      }
      onTreeChange?.(tree);
    },
    [onTreeChange]
  );

  const rebuildTreeFromIFC = useCallback(
    (parsed: ParsedIFC) => {
      const classification = parsed.classification;
      const tree: ModelTreeNode[] = [];
      for (const [type, count] of Object.entries(classification)) {
        tree.push({
          id: `ifc_${type}`,
          name: `${type} (${count})`,
          type,
          visible: true,
        });
      }
      onTreeChange?.(tree);
    },
    [onTreeChange]
  );

  // ── IFC Loader ───────────────────────────────────────────────────

  const loadIFC = useCallback(
    async (url: string) => {
      reportStatus("parsing-ifc");
      reportProgress("Fetching IFC file…", 0.1);

      let buffer: ArrayBuffer;
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        buffer = await resp.arrayBuffer();
      } catch (err) {
        const msg = `Failed to fetch IFC file: ${err instanceof Error ? err.message : "Unknown error"}`;
        onError?.(msg);
        reportStatus("error");
        return;
      }

      reportProgress("Parsing IFC via web-ifc…", 0.3);

      let parsed: ParsedIFC;
      try {
        parsed = await parseIfc(buffer);
      } catch (err) {
        const msg = `Failed to parse IFC: ${err instanceof Error ? err.message : "Unknown error"}`;
        onError?.(msg);
        reportStatus("error");
        return;
      }

      ifcDataRef.current = parsed;

      reportProgress("Building three.js geometry…", 0.6);

      // Build meshes from parsed IFC geometry
      const group = new THREE.Group();
      group.name = modelName;
      const { scene } = sceneRef.current!;

      // We'll create simple box representations for each element
      // (full geometry reconstruction from web-ifc flat arrays is complex;
      //  for a production viewer this would use web-ifc's built-in THREE integration)
      for (const el of parsed.elements) {
        if (parsed.geometries.length === 0) break;
        // Build a small colored box for each element as representation
        const color = getIFCColor(el.type);
        const mat = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.3,
          roughness: 0.6,
        });

        // Simple box — in production, reconstruct from vertex/index data
        const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const mesh = new THREE.Mesh(geo, mat);
        // Distribute elements in a grid-like arrangement
        const idx = parsed.elements.indexOf(el);
        const cols = 10;
        const spacing = 0.4;
        mesh.position.set(
          (idx % cols) * spacing - 2,
          Math.floor(idx / cols) * spacing * 0.5,
          0
        );
        mesh.name = el.name;
        mesh.userData = { expressID: el.expressID, type: el.type };
        group.add(mesh);
      }

      // If no geometry could be built, still mark as ready
      scene.add(group);

      // Re-center and scale
      const box = new THREE.Box3().setFromObject(group);
      if (!box.isEmpty()) {
        bboxRef.current = box;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0 && maxDim < 100) {
          const scale = Math.min(10 / maxDim, 5);
          group.scale.set(scale, scale, scale);
        }
        group.position.sub(center.clone().multiply(group.scale));
      }

      sceneRef.current!.modelGroup = group;

      // Apply any section planes
      const sectionMgr = sectionPlaneManagerRef.current;
      const planes = sectionMgr?.getPlanes() || [];
      if (planes.length > 0 && bboxRef.current) {
        for (const plane of planes) {
          sectionMgr?.updatePlane(plane.id, {}, bboxRef.current);
        }
        group.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            !Array.isArray(child.material)
          ) {
            sectionMgr?.applyToMaterial(child.material as THREE.Material);
          }
        });
      }

      // Build tree from IFC classification
      rebuildTreeFromIFC(parsed);
      reportProgress("Ready", 1);
      reportStatus("ready");
      onReady?.();
    },
    [
      modelName,
      onError,
      onReady,
      rebuildTreeFromIFC,
      reportProgress,
      reportStatus,
    ]
  );

  // ── glTF Loader ──────────────────────────────────────────────────

  const loadGLTF = useCallback(
    async (url: string) => {
      reportProgress("Loading glTF model…", 0.2);
      try {
        const { GLTFLoader } = await import(
          "three/examples/jsm/loaders/GLTFLoader.js"
        );
        const loader = new GLTFLoader();

        const gltf = await new Promise<THREE.Group>((resolve, reject) => {
          loader.load(
            url,
            (gltfData) => {
              resolve(gltfData.scene);
            },
            (xhr) => {
              if (xhr.total > 0) {
                reportProgress(
                  "Downloading glTF…",
                  0.2 + (xhr.loaded / xhr.total) * 0.6
                );
              }
            },
            (err) => reject(err)
          );
        });

        reportProgress("Processing glTF scene…", 0.8);

        const { scene } = sceneRef.current!;
        gltf.name = modelName;
        scene.add(gltf);

        const box = new THREE.Box3().setFromObject(gltf);
        if (!box.isEmpty()) {
          bboxRef.current = box;
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scale = 5 / maxDim;
            gltf.scale.set(scale, scale, scale);
          }
          gltf.position.sub(center.clone().multiply(gltf.scale));
        }

        sceneRef.current!.modelGroup = gltf;

        // Apply section planes
        const sectionMgr = sectionPlaneManagerRef.current;
        const planes = sectionMgr?.getPlanes() || [];
        if (planes.length > 0 && bboxRef.current) {
          for (const plane of planes) {
            sectionMgr?.updatePlane(plane.id, {}, bboxRef.current);
          }
          gltf.traverse((child) => {
            if (
              child instanceof THREE.Mesh &&
              !Array.isArray(child.material)
            ) {
              sectionMgr?.applyToMaterial(
                child.material as THREE.Material
              );
            }
          });
        }

        rebuildTreeFromGroup(gltf, modelName);
        reportProgress("Ready", 1);
        reportStatus("ready");
        onReady?.();
      } catch (err) {
        const msg = `Failed to load glTF: ${err instanceof Error ? err.message : "Unknown error"}`;
        onError?.(msg);
        reportStatus("error");
      }
    },
    [
      modelName,
      onError,
      onReady,
      rebuildTreeFromGroup,
      reportProgress,
      reportStatus,
    ]
  );

  // ── Sample Building ──────────────────────────────────────────────

  const createSampleBuilding = useCallback(() => {
    const THREE_MOD = THREE;
    const group = new THREE_MOD.Group();
    group.name = "Sample Building";

    const glassMat = new THREE_MOD.MeshPhysicalMaterial({
      color: 0x4488cc,
      metalness: 0.1,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
      envMapIntensity: 0.5,
    });

    const slabMat = new THREE_MOD.MeshPhysicalMaterial({
      color: 0x556688,
      metalness: 0.2,
      roughness: 0.7,
    });

    const colMat = new THREE_MOD.MeshPhysicalMaterial({
      color: 0x5588bb,
      metalness: 0.7,
      roughness: 0.2,
    });

    const coreMat = new THREE_MOD.MeshPhysicalMaterial({
      color: 0x3366aa,
      metalness: 0.6,
      roughness: 0.3,
    });

    const bw = 4,
      bd = 3,
      th = 6;
    const floorCount = 5;
    const floorH = th / floorCount;

    // Main glass box
    const glass = new THREE_MOD.Mesh(
      new THREE_MOD.BoxGeometry(bw, th, bd),
      glassMat
    );
    glass.position.y = th / 2;
    glass.castShadow = true;
    group.add(glass);

    // Wireframe
    const wire = new THREE_MOD.LineSegments(
      new THREE_MOD.EdgesGeometry(
        new THREE_MOD.BoxGeometry(bw, th, bd)
      ),
      new THREE_MOD.LineBasicMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.3,
      })
    );
    wire.position.y = th / 2;
    group.add(wire);

    // Columns
    const colPos = [
      [-bw / 2 + 0.15, 0, -bd / 2 + 0.15],
      [bw / 2 - 0.15, 0, -bd / 2 + 0.15],
      [-bw / 2 + 0.15, 0, bd / 2 - 0.15],
      [bw / 2 - 0.15, 0, bd / 2 - 0.15],
    ];
    for (const pos of colPos) {
      const col = new THREE_MOD.Mesh(
        new THREE_MOD.BoxGeometry(0.2, th, 0.2),
        colMat
      );
      col.position.set(pos[0], th / 2, pos[1]);
      col.castShadow = true;
      group.add(col);
    }

    // Core
    const corePos = [
      [-0.6, 0, -0.6],
      [0.6, 0, -0.6],
      [-0.6, 0, 0.6],
      [0.6, 0, 0.6],
    ];
    for (const pos of corePos) {
      const col = new THREE_MOD.Mesh(
        new THREE_MOD.BoxGeometry(0.25, th, 0.25),
        coreMat
      );
      col.position.set(pos[0], th / 2, pos[1]);
      col.castShadow = true;
      group.add(col);
    }

    // Slabs
    for (let i = 0; i <= floorCount; i++) {
      const y = i * floorH;
      if (i > 0 && i < floorCount) {
        const slab = new THREE_MOD.Mesh(
          new THREE_MOD.BoxGeometry(bw - 0.4, 0.08, bd - 0.4),
          slabMat
        );
        slab.position.y = y;
        slab.receiveShadow = true;
        group.add(slab);
      }
    }

    // Core box
    const coreBox = new THREE_MOD.Mesh(
      new THREE_MOD.BoxGeometry(0.8, th, 0.8),
      coreMat
    );
    coreBox.position.y = th / 2;
    group.add(coreBox);

    return group;
  }, []);

  // ── Loading logic ────────────────────────────────────────────────

  useEffect(() => {
    if (!modelUrl && !showSampleBuilding) {
      startTransition(() => reportStatus("empty"));
      return;
    }

    if (!modelUrl && showSampleBuilding) {
      // Load sample building
      const group = createSampleBuilding();
      if (sceneRef.current) {
        sceneRef.current.modelGroup = group;
        sceneRef.current.scene.add(group);
        const box = new THREE.Box3().setFromObject(group);
        if (!box.isEmpty()) {
          bboxRef.current = box;
        }
        rebuildTreeFromGroup(group, "Sample Building");
        startTransition(() => {
          reportProgress("Ready", 1);
          reportStatus("ready");
        });
        onReady?.();
      }
      return;
    }

    if (!modelUrl) return;

    // Map fileType
    const ft =
      fileType ||
      (modelUrl.match(/\.(gltf|glb|ifc|obj|fbx)(\?|$)/i) || [])[1] ||
      "unknown";

    clearModelGroup();

    startTransition(() => {
      switch (ft) {
        case "gltf":
        case "glb":
          loadGLTF(modelUrl);
          break;
        case "ifc":
          loadIFC(modelUrl);
          break;
        case "obj":
        case "fbx":
          onError?.(
            "Format not supported. Convert to glTF or IFC."
          );
          reportStatus("unsupported-format");
          break;
        default:
          onError?.(
            "Format not supported. Convert to glTF or IFC."
          );
          reportStatus("unsupported-format");
          break;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, showSampleBuilding]);

  // ── WebGL init ───────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animationId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let controls: any;

    async function initViewer(
      el: HTMLDivElement,
      cvs: HTMLCanvasElement
    ) {
      const THREE_MOD = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );

      const width = el.clientWidth;
      const height = el.clientHeight;

      // Check WebGL support
      let testCanvas: HTMLCanvasElement | null = null;
      try {
        testCanvas = document.createElement("canvas");
        const gl =
          testCanvas.getContext("webgl") ||
          testCanvas.getContext("experimental-webgl");
        if (!gl) {
          reportStatus("webgl-unsupported");
          return;
        }
      } finally {
        if (testCanvas) {
          // clean up
        }
      }

      const scene = new THREE_MOD.Scene();
      scene.background = new THREE_MOD.Color(0x0a0a0f);

      const camera = new THREE_MOD.PerspectiveCamera(
        45,
        width / height,
        0.1,
        1000
      );
      camera.position.set(8, 6, 10);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE_MOD.WebGLRenderer({
        canvas: cvs,
        antialias: true,
        alpha: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE_MOD.PCFSoftShadowMap;
      renderer.toneMapping = THREE_MOD.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      controls = new OrbitControls(camera, cvs);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 3;
      controls.maxDistance = 30;
      controls.target.set(0, 1, 0);

      const ambientLight = new THREE_MOD.AmbientLight(0x404060, 0.5);
      scene.add(ambientLight);

      const dirLight = new THREE_MOD.DirectionalLight(0xffffff, 2);
      dirLight.position.set(10, 20, 10);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      scene.add(dirLight);

      const fillLight = new THREE_MOD.DirectionalLight(0x8888ff, 0.6);
      fillLight.position.set(-5, 10, -10);
      scene.add(fillLight);

      const rimLight = new THREE_MOD.DirectionalLight(0x4488ff, 0.3);
      rimLight.position.set(0, -5, 10);
      scene.add(rimLight);

      const gridHelper = new THREE_MOD.GridHelper(
        20,
        20,
        0x222244,
        0x111133
      );
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);

      const modelGroup = new THREE_MOD.Group();
      modelGroup.name = "model";
      scene.add(modelGroup);

      sceneRef.current = {
        scene,
        camera,
        renderer,
        controls,
        modelGroup,
      };

      // Init managers
      measurementManagerRef.current = new MeasurementManager(scene);
      measurementManagerRef.current.setOnMeasurement((result) => {
        measurementsRef.current = [...measurementsRef.current, result];
        onMeasurementsChange?.(measurementsRef.current);
        onMeasurement?.(result);
      });

      sectionPlaneManagerRef.current = new SectionPlaneManager(renderer);
      sectionPlaneManagerRef.current.setOnChange((planes) => {
        onSectionPlanesChange?.(planes);
      });

      animate();
    }

    function animate() {
      if (!sceneRef.current) return;
      const { scene, camera, renderer, controls: ctrls } =
        sceneRef.current;
      animationId = requestAnimationFrame(animate);
      ctrls.update();
      renderer.render(scene, camera);
    }

    initViewer(container, canvas);

    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      if (controls) controls.dispose();
      if (sceneRef.current) {
        sceneRef.current.renderer.dispose();
        sceneRef.current.scene.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Unsupport render ────────────────────────────────────────

  if (status === "webgl-unsupported") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950">
        <div className="glass-panel max-w-md text-center p-8">
          <div className="text-4xl mb-4">🎨</div>
          <h3 className="text-lg font-bold text-white mb-2">
            WebGL Unsupported
          </h3>
          <p className="text-sm text-zinc-400">
            Your browser does not support WebGL, which is required for the
            3D viewer. Please try a modern browser like Chrome, Firefox, or
            Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-zinc-950/70 overflow-hidden"
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Loading overlay */}
      {(status === "loading" || status === "parsing-ifc") && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-xs text-zinc-400 font-medium">
              {progress.stage}
            </span>
            {progress.percent > 0 && (
              <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(progress.percent * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── IFC Type Color Map ─────────────────────────────────────────────

const IFC_COLORS: Record<string, number> = {
  IfcWall: 0x88bbdd,
  IfcWallStandardCase: 0x88bbdd,
  IfcSlab: 0x88aa88,
  IfcColumn: 0xdd8844,
  IfcBeam: 0xcc7744,
  IfcWindow: 0x88ccdd,
  IfcDoor: 0xaa7744,
  IfcRoof: 0x996644,
  IfcStair: 0x886688,
  IfcRamp: 0x887766,
  IfcFurnishingElement: 0x7799aa,
  IfcFlowTerminal: 0x668899,
  IfcFlowSegment: 0x668899,
  IfcFlowFitting: 0x668899,
  IfcCovering: 0x99aacc,
  IfcPipeSegment: 0x88aacc,
  IfcDuctSegment: 0x88aacc,
};

function getIFCColor(type: string): number {
  const clean = type.replace(/^Ifc/, "Ifc");
  return IFC_COLORS[type] || IFC_COLORS[clean] || 0x888888;
}
