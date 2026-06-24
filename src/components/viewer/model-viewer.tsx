"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Compass, RotateCcw } from "lucide-react";
import type * as THREE from "three";

interface ModelViewerProps {
  modelName?: string;
  modelUrl?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrbitControlsRef = any;

interface ViewerRef {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControlsRef;
  buildingGroup: THREE.Group;
}

export function ModelViewer({ modelName = "BIM Model", modelUrl = null }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ViewerRef | null>(null);
  const [activeLayer, setActiveLayer] = useState("all");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animationId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let controls: any;

    async function initViewer(el: HTMLDivElement, cvs: HTMLCanvasElement) {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      const width = el.clientWidth;
      const height = el.clientHeight;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(8, 6, 10);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: false });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      controls = new OrbitControls(camera, cvs);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 3;
      controls.maxDistance = 30;
      controls.target.set(0, 1, 0);

      const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 2);
      dirLight.position.set(10, 20, 10);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight(0x8888ff, 0.6);
      fillLight.position.set(-5, 10, -10);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
      rimLight.position.set(0, -5, 10);
      scene.add(rimLight);

      const gridHelper = new THREE.GridHelper(20, 20, 0x222244, 0x111133);
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);

      let buildingGroup = createBuilding(THREE);
      scene.add(buildingGroup);

      if (modelUrl) {
        try {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const loader = new GLTFLoader();
          const gltf = await loader.loadAsync(modelUrl);
          scene.remove(buildingGroup);
          buildingGroup = gltf.scene;
          scene.add(buildingGroup);

          const box = new THREE.Box3().setFromObject(buildingGroup);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scale = 5 / maxDim;
            buildingGroup.scale.set(scale, scale, scale);
          }
          buildingGroup.position.sub(center.clone().multiply(buildingGroup.scale));
          camera.position.set(6, 4, 8);
          controls.target.set(0, 1, 0);
          controls.update();
        } catch {
          // Fall back to procedural model if loading fails
        }
      }

      sceneRef.current = { scene, camera, renderer, controls, buildingGroup };

      animate();
      setIsLoaded(true);
    }

    function createBuilding(THREE: typeof import("three")): THREE.Group {
      const group = new THREE.Group();

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x4488cc,
        metalness: 0.1,
        roughness: 0.2,
        transparent: true,
        opacity: 0.35,
        envMapIntensity: 0.5,
      });

      const coreMat = new THREE.MeshPhysicalMaterial({
        color: 0x334466,
        metalness: 0.5,
        roughness: 0.4,
      });

      const floorMat = new THREE.MeshPhysicalMaterial({
        color: 0x445577,
        metalness: 0.3,
        roughness: 0.6,
        transparent: true,
        opacity: 0.5,
      });

      const slabMat = new THREE.MeshPhysicalMaterial({
        color: 0x556688,
        metalness: 0.2,
        roughness: 0.7,
      });

      const buildingWidth = 4;
      const buildingDepth = 3;
      const totalHeight = 6;
      const floorCount = 5;
      const floorHeight = totalHeight / floorCount;

      // Main glass box
      const glassBox = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth, totalHeight, buildingDepth),
        glassMat
      );
      glassBox.position.y = totalHeight / 2;
      glassBox.castShadow = true;
      glassBox.layers.set(0);
      group.add(glassBox);

      // Wireframe outline
      const wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(buildingWidth, totalHeight, buildingDepth)),
        new THREE.LineBasicMaterial({ color: 0x4488cc, transparent: true, opacity: 0.3 })
      );
      wireframe.position.y = totalHeight / 2;
      group.add(wireframe);

      // Structural columns (corners)
      const colMat = new THREE.MeshPhysicalMaterial({
        color: 0x5588bb,
        metalness: 0.7,
        roughness: 0.2,
      });

      const columnPositions = [
        [-buildingWidth / 2 + 0.15, 0, -buildingDepth / 2 + 0.15],
        [buildingWidth / 2 - 0.15, 0, -buildingDepth / 2 + 0.15],
        [-buildingWidth / 2 + 0.15, 0, buildingDepth / 2 - 0.15],
        [buildingWidth / 2 - 0.15, 0, buildingDepth / 2 - 0.15],
      ];

      for (const pos of columnPositions) {
        const col = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, totalHeight, 0.2),
          colMat
        );
        col.position.set(pos[0], totalHeight / 2, pos[1]);
        col.castShadow = true;
        col.layers.set(1);
        group.add(col);
      }

      // Core columns (inner)
      const coreColMat = new THREE.MeshPhysicalMaterial({
        color: 0x3366aa,
        metalness: 0.6,
        roughness: 0.3,
        emissive: 0x112244,
        emissiveIntensity: 0.1,
      });

      const corePositions = [
        [-0.6, 0, -0.6],
        [0.6, 0, -0.6],
        [-0.6, 0, 0.6],
        [0.6, 0, 0.6],
      ];

      for (const pos of corePositions) {
        const col = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, totalHeight, 0.25),
          coreColMat
        );
        col.position.set(pos[0], totalHeight / 2, pos[1]);
        col.castShadow = true;
        col.layers.set(1);
        group.add(col);
      }

      // Floors / slabs
      for (let i = 0; i <= floorCount; i++) {
        const y = i * floorHeight;
        if (i > 0 && i < floorCount) {
          const slab = new THREE.Mesh(
            new THREE.BoxGeometry(buildingWidth - 0.4, 0.08, buildingDepth - 0.4),
            slabMat
          );
          slab.position.y = y;
          slab.receiveShadow = true;
          slab.layers.set(2);
          group.add(slab);
        }

        // Floor plane (glass floor accent)
        const floorPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(buildingWidth - 0.6, buildingDepth - 0.6),
          floorMat
        );
        floorPlane.rotation.x = -Math.PI / 2;
        floorPlane.position.y = i * floorHeight + 0.02;
        floorPlane.layers.set(2);
        group.add(floorPlane);
      }

      // Inner MEP/services box (core)
      const coreBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, totalHeight, 0.8),
        coreMat
      );
      coreBox.position.y = totalHeight / 2;
      coreBox.layers.set(3);
      group.add(coreBox);

      // Glass panel grid lines on front face
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.15,
      });

      for (let i = 1; i < floorCount; i++) {
        const y = i * floorHeight;
        const points = [
          new THREE.Vector3(-buildingWidth / 2, y, buildingDepth / 2),
          new THREE.Vector3(buildingWidth / 2, y, buildingDepth / 2),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, lineMat);
        group.add(line);
      }

      // Grid ground below
      const groundMat = new THREE.MeshPhysicalMaterial({
        color: 0x0a0a14,
        roughness: 0.9,
        metalness: 0,
        transparent: true,
        opacity: 0.6,
      });
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        groundMat
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.01;
      ground.receiveShadow = true;
      group.add(ground);

      return group;
    }

    function animate() {
      if (!sceneRef.current) return;
      const { scene, camera, renderer, controls: ctrls } = sceneRef.current;
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

  const resetView = useCallback(() => {
    if (!sceneRef.current) return;
    const { camera, controls } = sceneRef.current;
    camera.position.set(8, 6, 10);
    controls.target.set(0, 1, 0);
    controls.update();
  }, []);

  const zoomIn = useCallback(() => {
    if (!sceneRef.current) return;
    const { camera, controls } = sceneRef.current;
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = camera.position.distanceTo(controls.target);
    const newDist = Math.max(3, dist * 0.85);
    camera.position.copy(controls.target).add(dir.multiplyScalar(newDist));
    controls.update();
  }, []);

  const zoomOut = useCallback(() => {
    if (!sceneRef.current) return;
    const { camera, controls } = sceneRef.current;
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = camera.position.distanceTo(controls.target);
    const newDist = Math.min(30, dist * 1.15);
    camera.position.copy(controls.target).add(dir.multiplyScalar(newDist));
    controls.update();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-zinc-950/70 border border-white/5 rounded-2xl overflow-hidden group shadow-2xl"
    >
      {/* Top Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 pointer-events-none">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          WebGL — three.js
        </span>
        <h4 className="text-sm font-bold text-white tracking-wide truncate max-w-[200px]">
          {modelName}
        </h4>
        {isLoaded && (
          <span className="text-[10px] text-zinc-500 font-mono">Click & drag to orbit</span>
        )}
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={resetView}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={zoomIn}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-zinc-400 hover:text-white font-mono text-xs font-bold w-8 h-8 flex items-center justify-center"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-zinc-400 hover:text-white font-mono text-xs font-bold w-8 h-8 flex items-center justify-center"
          title="Zoom Out"
        >
          -
        </button>
      </div>

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-xs text-zinc-400 font-medium">Initializing WebGL...</span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950/80 to-transparent flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Compass className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400">Orbit Controls</span>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setActiveLayer("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeLayer === "all"
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            All Layers
          </button>
          <button
            onClick={() => setActiveLayer("structure")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeLayer === "structure"
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Structure
          </button>
        </div>
      </div>
    </div>
  );
}
