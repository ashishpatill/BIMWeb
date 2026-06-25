declare module "web-ifc" {
  export class IfcAPI {
    SetWasmPath(path: string): void
    Init(): Promise<void>
    OpenModel(data: Uint8Array): number
    CloseModel(modelID: number): void
    GetAllLines(modelID: number): { size(): number; get(index: number): number }
    GetProperties(modelID: number, expressID: number): Record<string, unknown> | null
    GetGeometry(
      modelID: number,
      expressID: number
    ): { vertices: Float32Array; indices: Uint32Array; normals?: Float32Array } | null
  }
}
