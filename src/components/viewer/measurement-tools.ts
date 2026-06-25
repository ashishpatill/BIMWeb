/** 3D measurement tools using three.js raycasting. */
import * as THREE from "three"

export interface MeasurementPoint {
  position: THREE.Vector3
  label: string
}

export interface Measurement {
  start: MeasurementPoint
  end: MeasurementPoint
  distance: number
}

export class MeasurementManager {
  private measurements: Measurement[] = []
  private scene: THREE.Scene
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private tempPoints: THREE.Vector3[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  onMouseClick(event: MouseEvent, camera: THREE.Camera, canvas: HTMLElement): Measurement | null {
    const rect = canvas.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, camera)
    const intersects = this.raycaster.intersectObjects(this.scene.children, true)

    if (intersects.length > 0) {
      const point = intersects[0].point
      this.tempPoints.push(point.clone())

      if (this.tempPoints.length === 2) {
        const start = this.tempPoints[0]
        const end = this.tempPoints[1]
        const distance = start.distanceTo(end)

        const measurement: Measurement = {
          start: { position: start, label: "A" },
          end: { position: end, label: "B" },
          distance,
        }
        this.measurements.push(measurement)
        this.tempPoints = []
        this.createMeasurementVisual(measurement)
        return measurement
      }
    }
    return null
  }

  private createMeasurementVisual(measurement: Measurement): void {
    const points = [
      measurement.start.position,
      measurement.end.position,
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 })
    const line = new THREE.Line(geometry, material)
    this.scene.add(line)
  }

  clear(): void {
    this.measurements = []
    this.tempPoints = []
  }

  getMeasurements(): Measurement[] {
    return [...this.measurements]
  }
}
