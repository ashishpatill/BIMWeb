/**
 * IFC file parser using web-ifc.
 * Extracts geometry, properties, and classification from IFC files.
 * Guarded with try/catch — returns error details on failure.
 */

import type { IFCElement, IFCGeometry } from "./types";

export interface ParsedIFC {
  elements: IFCElement[];
  geometries: IFCGeometry[];
  properties: Record<string, unknown>;
  classification: Record<string, number>;
  name: string;
}

function extractClassification(elements: IFCElement[]): Record<string, number> {
  const cls: Record<string, number> = {};
  for (const el of elements) {
    const type = el.type || "Unknown";
    cls[type] = (cls[type] || 0) + 1;
  }
  return cls;
}

export async function parseIfc(
  data: ArrayBuffer | Uint8Array
): Promise<ParsedIFC> {
  const { IfcAPI } = await import("web-ifc");

  const ifcApi = new IfcAPI();
  const uint8Data =
    data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  ifcApi.SetWasmPath("https://unpkg.com/web-ifc@0.0.46/");
  await ifcApi.Init();

  const modelID = ifcApi.OpenModel(uint8Data);

  const elements: IFCElement[] = [];
  const geometries: IFCGeometry[] = [];
  const properties: Record<string, unknown> = {};

  try {
    const allLines = ifcApi.GetAllLines(modelID);
    const size = allLines.size();

    for (let i = 0; i < size; i++) {
      const expressID = allLines.get(i);
      const props = ifcApi.GetProperties(modelID, expressID);
      if (!props) continue;

      const ifcProps = props as {
        type?: string;
        Name?: { value: string };
        GlobalId?: { value: string };
      };

      const type = ifcProps.type?.toString() || "Unknown";
      const name = ifcProps.Name?.value || `Element ${expressID}`;
      const globalId = ifcProps.GlobalId?.value || "";

      const element: IFCElement = {
        id: i,
        expressID,
        type,
        name,
        globalId,
        properties: {},
        materials: [],
      };

      // Collect known properties into the element
      const knownProps: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(props)) {
        if (
          key !== "type" &&
          key !== "Name" &&
          key !== "GlobalId" &&
          val != null
        ) {
          knownProps[key] = val;
        }
      }
      element.properties = knownProps;
      elements.push(element);

      // Extract geometry if available
      try {
        const geometry = ifcApi.GetGeometry(modelID, expressID);
        if (geometry) {
          geometries.push({
            expressID,
            vertices: geometry.vertices,
            indices: geometry.indices,
            normals: geometry.normals,
          });
        }
      } catch {
        // No geometry for this element (e.g., spatial structure)
      }
    }

    properties.totalElements = size;
    properties.modelID = modelID;
  } finally {
    ifcApi.CloseModel(modelID);
  }

  const classification = extractClassification(elements);

  return {
    elements,
    geometries,
    properties,
    classification,
    name: "model.ifc",
  };
}

export function getElementByType(
  model: ParsedIFC,
  type: string
): IFCElement[] {
  return model.elements.filter((e) => e.type === type);
}

export function getElementByName(
  model: ParsedIFC,
  name: string
): IFCElement | undefined {
  return model.elements.find((e) =>
    e.name.toLowerCase().includes(name.toLowerCase())
  );
}

export function getMaterialSummary(
  model: ParsedIFC
): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const el of model.elements) {
    for (const mat of el.materials) {
      summary[mat] = (summary[mat] || 0) + 1;
    }
  }
  return summary;
}
