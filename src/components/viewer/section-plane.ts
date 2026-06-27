/** Section plane controls for cross-section views. */
import * as THREE from "three";

export interface SectionPlaneState {
  id: string;
  axis: "x" | "y" | "z";
  /** Normalised position 0..1 along bounding box extent for chosen axis */
  position: number;
  /** Whether the plane normal is flipped */
  flipped: boolean;
  /** Lock to axis only */
  axisLocked: boolean;
}

export class SectionPlaneManager {
  private planes: Map<string, SectionPlaneState> = new Map();
  private clipPlanes: THREE.Plane[] = [];
  private renderer: THREE.WebGLRenderer;
  private onPlanesChanged:
    | ((planes: SectionPlaneState[]) => void)
    | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.renderer.localClippingEnabled = true;
  }

  setOnChange(callback: (planes: SectionPlaneState[]) => void): void {
    this.onPlanesChanged = callback;
  }

  /** Recalculate THREE.Plane constants from all plane states + bounding box */
  private rebuildClipPlanes(bbox?: THREE.Box3): void {
    this.clipPlanes = [];
    const allStates = Array.from(this.planes.values());
    for (const state of allStates) {
      const normal = new THREE.Vector3(
        state.axis === "x" ? (state.flipped ? -1 : 1) : 0,
        state.axis === "y" ? (state.flipped ? -1 : 1) : 0,
        state.axis === "z" ? (state.flipped ? -1 : 1) : 0
      );

      let constant = 0;
      if (bbox) {
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());
        const extent =
          state.axis === "x"
            ? size.x / 2
            : state.axis === "y"
              ? size.y / 2
              : size.z / 2;
        const axisCenter =
          state.axis === "x"
            ? center.x
            : state.axis === "y"
              ? center.y
              : center.z;
        // position 0 → one face, 1 → opposite face
        constant = -(axisCenter - extent + state.position * extent * 2);
        if (state.flipped) constant = -constant;
      }

      const plane = new THREE.Plane(normal, constant);
      this.clipPlanes.push(plane);
    }
  }

  addPlane(
    axis: "x" | "y" | "z",
    position: number = 0.5,
    bbox?: THREE.Box3
  ): string {
    const id = `section_${axis}_${Date.now()}_${this.planes.size}`;
    const state: SectionPlaneState = {
      id,
      axis,
      position,
      flipped: false,
      axisLocked: true,
    };
    this.planes.set(id, state);
    this.rebuildClipPlanes(bbox);
    this.notify();
    return id;
  }

  removePlane(id: string): void {
    this.planes.delete(id);
    this.rebuildClipPlanes();
    this.notify();
  }

  updatePlane(
    id: string,
    updates: Partial<SectionPlaneState>,
    bbox?: THREE.Box3
  ): void {
    const state = this.planes.get(id);
    if (!state) return;
    Object.assign(state, updates);
    this.rebuildClipPlanes(bbox);
    this.notify();
  }

  /** Flip the normal of a plane */
  flipPlane(id: string, bbox?: THREE.Box3): void {
    const state = this.planes.get(id);
    if (!state) return;
    state.flipped = !state.flipped;
    this.rebuildClipPlanes(bbox);
    this.notify();
  }

  getPlanes(): SectionPlaneState[] {
    return Array.from(this.planes.values());
  }

  clearPlanes(): void {
    this.planes.clear();
    this.clipPlanes = [];
    this.notify();
  }

  getClipPlanes(): THREE.Plane[] {
    return this.clipPlanes;
  }

  applyToMaterial(material: THREE.Material): void {
    material.clippingPlanes = this.clipPlanes;
    material.clipShadows = true;
  }

  private notify(): void {
    if (this.onPlanesChanged) {
      this.onPlanesChanged(this.getPlanes());
    }
  }
}
