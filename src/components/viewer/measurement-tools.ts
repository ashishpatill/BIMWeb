/** 3D measurement tools using three.js raycasting. */
import * as THREE from "three";

export interface MeasurementPoint {
  position: THREE.Vector3;
  label: string;
}

export interface Measurement {
  id: string;
  start: MeasurementPoint;
  end: MeasurementPoint;
  distanceMeters: number;
}

export interface MeasurementResult {
  id: string;
  from: THREE.Vector3;
  to: THREE.Vector3;
  distanceMeters: number;
}

export class MeasurementManager {
  private measurements: Measurement[] = [];
  private scene: THREE.Scene;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private tempPoints: THREE.Vector3[] = [];
  private visualLines: THREE.Line[] = [];
  private sphereMarkers: THREE.Mesh[] = [];
  private onNewMeasurement: ((result: MeasurementResult) => void) | null =
    null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setOnMeasurement(callback: (result: MeasurementResult) => void): void {
    this.onNewMeasurement = callback;
  }

  onMouseClick(
    event: MouseEvent,
    camera: THREE.Camera,
    canvas: HTMLElement
  ): MeasurementResult | null {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.tempPoints.push(point.clone());

      // Place a small sphere marker
      const sphereGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(point);
      this.scene.add(sphere);
      this.sphereMarkers.push(sphere);

      if (this.tempPoints.length === 2) {
        const start = this.tempPoints[0];
        const end = this.tempPoints[1];
        const distance = start.distanceTo(end);
        const id = `measurement_${Date.now()}_${this.measurements.length}`;

        const measurement: Measurement = {
          id,
          start: { position: start.clone(), label: "A" },
          end: { position: end.clone(), label: "B" },
          distanceMeters: distance,
        };
        this.measurements.push(measurement);
        this.tempPoints = [];
        this.createMeasurementVisual(measurement);

        const result: MeasurementResult = {
          id,
          from: start.clone(),
          to: end.clone(),
          distanceMeters: distance,
        };

        if (this.onNewMeasurement) {
          this.onNewMeasurement(result);
        }

        return result;
      }
    }
    return null;
  }

  private createMeasurementVisual(measurement: Measurement): void {
    const points = [
      measurement.start.position,
      measurement.end.position,
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      linewidth: 2,
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.visualLines.push(line);

    // Dashed helper line along each axis for clarity
    const dir = new THREE.Vector3().copy(measurement.end.position).sub(
      measurement.start.position
    );
    const mid = new THREE.Vector3()
      .copy(measurement.start.position)
      .add(dir.clone().multiplyScalar(0.5));

    // Small dot at midpoint (for CSS2D label positioning by host)
    const dotGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(mid);
    this.scene.add(dot);
    this.sphereMarkers.push(dot);
  }

  clearMeasurement(id: string): void {
    const idx = this.measurements.findIndex((m) => m.id === id);
    if (idx === -1) return;
    this.measurements.splice(idx, 1);

    // Remove visuals (hack: clear all and rebuild)
    this.clearAllVisuals();
    for (const m of this.measurements) {
      this.createMeasurementVisual(m);
    }
  }

  clearAll(): void {
    this.measurements = [];
    this.tempPoints = [];
    this.clearAllVisuals();
  }

  private clearAllVisuals(): void {
    for (const line of this.visualLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      const mat = line.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) {
        mat.forEach((m: THREE.Material) => m.dispose());
      } else if (mat) {
        mat.dispose();
      }
    }
    this.visualLines = [];

    for (const sphere of this.sphereMarkers) {
      this.scene.remove(sphere);
      sphere.geometry.dispose();
      const sphereMat = sphere.material as THREE.Material;
      sphereMat.dispose();
    }
    this.sphereMarkers = [];
  }

  getMeasurements(): Measurement[] {
    return [...this.measurements];
  }
}
