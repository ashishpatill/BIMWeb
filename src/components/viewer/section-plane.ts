/** Section plane controls for cross-section views. */
import * as THREE from "three"

export class SectionPlaneManager {
  private clipPlanes: THREE.Plane[] = []
  private renderer: THREE.WebGLRenderer

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
    this.renderer.localClippingEnabled = true
  }

  addPlane(axis: "x" | "y" | "z", position: number = 0): void {
    const normal = new THREE.Vector3(
      axis === "x" ? 1 : 0,
      axis === "y" ? 1 : 0,
      axis === "z" ? 1 : 0
    )
    const plane = new THREE.Plane(normal, -position)
    this.clipPlanes.push(plane)
  }

  clearPlanes(): void {
    this.clipPlanes = []
  }

  getClipPlanes(): THREE.Plane[] {
    return this.clipPlanes
  }

  applyToMaterial(material: THREE.Material): void {
    material.clippingPlanes = this.clipPlanes
    material.clipShadows = true
  }
}
