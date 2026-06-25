/** TypeScript types for IFC elements. */

export interface IFCElement {
  id: number
  expressID: number
  type: string
  name: string
  globalId: string
  properties: Record<string, unknown>
  materials: string[]
  dimensions?: { length?: number; width?: number; height?: number }
  classification?: string
}

export interface IFCGeometry {
  expressID: number
  vertices: Float32Array
  indices: Uint32Array
  normals?: Float32Array
}

export interface IFCModel {
  elements: IFCElement[]
  geometries: IFCGeometry[]
  name: string
  schema: string
}
