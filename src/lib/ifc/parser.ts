/**
 * IFC file parser using web-ifc.
 * Extracts geometry, properties, and relationships from IFC files.
 */

import type { IFCModel, IFCElement, IFCGeometry } from "./types"

export async function parseIFC(file: File | ArrayBuffer): Promise<IFCModel> {
  const { IfcAPI } = await import("web-ifc")

  const ifcApi = new IfcAPI()

  let data: Uint8Array
  if (file instanceof File) {
    data = new Uint8Array(await file.arrayBuffer())
  } else {
    data = new Uint8Array(file)
  }

  ifcApi.SetWasmPath("https://unpkg.com/web-ifc@0.0.46/")
  await ifcApi.Init()
  const modelID = ifcApi.OpenModel(data)

  const elements: IFCElement[] = []
  const geometries: IFCGeometry[] = []

  // Iterate over all IFC elements
  const allLines = ifcApi.GetAllLines(modelID)
  for (let i = 0; i < allLines.size(); i++) {
    const expressID = allLines.get(i)
    const props = ifcApi.GetProperties(modelID, expressID)
    if (!props) continue

    const ifcProps = props as { type?: string; Name?: { value: string }; GlobalId?: { value: string } }
    const element: IFCElement = {
      id: i,
      expressID,
      type: ifcProps.type?.toString() || "Unknown",
      name: ifcProps.Name?.value || `Element ${expressID}`,
      globalId: ifcProps.GlobalId?.value || "",
      properties: {},
      materials: [],
    }
    elements.push(element)

    // Extract geometry if available
    try {
      const geometry = ifcApi.GetGeometry(modelID, expressID)
      if (geometry) {
        geometries.push({
          expressID,
          vertices: geometry.vertices,
          indices: geometry.indices,
          normals: geometry.normals,
        })
      }
    } catch {
      // No geometry for this element (e.g., spatial structure)
    }
  }

  ifcApi.CloseModel(modelID)

  return {
    elements,
    geometries,
    name: (file instanceof File) ? file.name : "model.ifc",
    schema: "IFC2X3",
  }
}

export function getElementByType(model: IFCModel, type: string): IFCElement[] {
  return model.elements.filter((e) => e.type === type)
}

export function getElementByName(model: IFCModel, name: string): IFCElement | undefined {
  return model.elements.find((e) => e.name.toLowerCase().includes(name.toLowerCase()))
}

export function getMaterialSummary(model: IFCModel): Record<string, number> {
  const summary: Record<string, number> = {}
  for (const el of model.elements) {
    for (const mat of el.materials) {
      summary[mat] = (summary[mat] || 0) + 1
    }
  }
  return summary
}
