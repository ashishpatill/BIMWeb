import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Shared mock API instance — reassigned in beforeEach. The `vi.mock`
 *  factory captures the *reference*, so `new IfcAPI()` always returns
 *  whatever object `mockIfcApi` currently points to. */
let mockIfcApi: {
  SetWasmPath: Mock;
  Init: Mock;
  OpenModel: Mock;
  CloseModel: Mock;
  GetAllLines: Mock;
  GetProperties: Mock;
  GetGeometry: Mock;
};

vi.mock("web-ifc", () => ({
  IfcAPI: vi.fn(function () {
    return mockIfcApi;
  }),
}));

vi.mock("server-only", () => ({}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockApiDefaults(): void {
  mockIfcApi = {
    SetWasmPath: vi.fn(),
    Init: vi.fn().mockResolvedValue(undefined),
    OpenModel: vi.fn().mockReturnValue(42),
    CloseModel: vi.fn(),
    GetAllLines: vi.fn().mockReturnValue({
      size: () => 0,
      get: () => 0,
    }),
    GetProperties: vi.fn().mockReturnValue(null),
    GetGeometry: vi.fn().mockReturnValue(null),
  };
}

const emptyBuf = new ArrayBuffer(0);

async function parseIfc(data: ArrayBuffer = emptyBuf) {
  const { parseIfc: parse } = await import("../../src/lib/ifc/parser");
  return parse(data);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ifc/parser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiDefaults();
  });

  describe("parseIfc", () => {
    it("returns the expected shape (elements, geometries, properties, classification, name)", async () => {
      // Two lines, one with geometry
      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 2,
        get: (i: number) => [101, 102][i],
      });
      mockIfcApi.GetProperties.mockImplementation(
        (_modelId: number, expressID: number) => {
          if (expressID === 101)
            return {
              type: "IfcWall",
              Name: { value: "Wall A" },
              GlobalId: { value: "abc-123" },
              Height: { value: 300 },
            };
          if (expressID === 102)
            return {
              type: "IfcSlab",
              Name: { value: "Slab 1" },
              GlobalId: { value: "def-456" },
              Thickness: { value: 200 },
            };
          return null;
        },
      );
      mockIfcApi.GetGeometry.mockImplementation(
        (_modelId: number, expressID: number) => {
          if (expressID === 101)
            return {
              vertices: new Float32Array([0, 0, 0, 1, 0, 0]),
              indices: new Uint32Array([0, 1]),
              normals: new Float32Array([0, 0, 1]),
            };
          return null;
        },
      );

      const result = await parseIfc();

      expect(result).toHaveProperty("elements");
      expect(result).toHaveProperty("geometries");
      expect(result).toHaveProperty("properties");
      expect(result).toHaveProperty("classification");
      expect(result).toHaveProperty("name");

      // Core data
      expect(result.elements).toHaveLength(2);
      expect(result.geometries).toHaveLength(1);
      expect(result.classification).toEqual({ IfcWall: 1, IfcSlab: 1 });
      expect(result.name).toBe("model.ifc");

      // properties bag
      expect(result.properties.totalElements).toBe(2);
      expect(result.properties.modelID).toBe(42);
    });

    it("extracts element fields: type, name, expressID, globalId, properties", async () => {
      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 1,
        get: () => 201,
      });
      mockIfcApi.GetProperties.mockReturnValue({
        type: "IfcDoor",
        Name: { value: "Main Door" },
        GlobalId: { value: "door-1" },
        Height: { value: 210 },
        Width: { value: 90 },
      });

      const result = await parseIfc();
      const [el] = result.elements;

      expect(el.id).toBe(0);
      expect(el.expressID).toBe(201);
      expect(el.type).toBe("IfcDoor");
      expect(el.name).toBe("Main Door");
      expect(el.globalId).toBe("door-1");
      expect(el.properties).toHaveProperty("Height");
      expect(el.properties.Height).toEqual({ value: 210 });
      expect(el.properties).toHaveProperty("Width");
    });

    it("handles elements without Name or GlobalId", async () => {
      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 1,
        get: () => 301,
      });
      mockIfcApi.GetProperties.mockReturnValue({
        type: "IfcBuilding",
      });

      const result = await parseIfc();
      const [el] = result.elements;

      expect(el.name).toBe("Element 301");
      expect(el.globalId).toBe("");
    });

    it("uses fallback type 'Unknown' when type is missing", async () => {
      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 1,
        get: () => 401,
      });
      mockIfcApi.GetProperties.mockReturnValue({
        Name: { value: "Mystery" },
      });

      const result = await parseIfc();
      expect(result.elements[0].type).toBe("Unknown");
    });

    it("extracts geometry when available", async () => {
      const vertices = new Float32Array([0, 1, 2, 3, 4, 5]);
      const indices = new Uint32Array([0, 1, 2]);
      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 1,
        get: () => 501,
      });
      mockIfcApi.GetProperties.mockReturnValue({
        type: "IfcWall",
        Name: { value: "Geo Wall" },
      });
      mockIfcApi.GetGeometry.mockReturnValue({ vertices, indices });

      const result = await parseIfc();
      expect(result.geometries).toHaveLength(1);
      expect(result.geometries[0].expressID).toBe(501);
      expect(result.geometries[0].vertices).toBe(vertices);
      expect(result.geometries[0].indices).toBe(indices);
    });

    it("handles empty model (no elements)", async () => {
      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 0,
        get: () => 0,
      });

      const result = await parseIfc();
      expect(result.elements).toHaveLength(0);
      expect(result.geometries).toHaveLength(0);
      expect(result.classification).toEqual({});
      expect(result.properties.totalElements).toBe(0);
    });

    it("propagates errors from web-ifc (Init rejects)", async () => {
      mockIfcApi.Init.mockRejectedValue(new Error("WASM load failed"));

      await expect(parseIfc()).rejects.toThrow("WASM load failed");
    });

    it("propagates errors from web-ifc (OpenModel throws)", async () => {
      mockIfcApi.OpenModel.mockImplementation(() => {
        throw new Error("Corrupt IFC file");
      });

      await expect(parseIfc()).rejects.toThrow("Corrupt IFC file");
    });

    it("calls SetWasmPath and Init before opening model", async () => {
      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 0,
        get: () => 0,
      });

      await parseIfc();

      expect(mockIfcApi.SetWasmPath).toHaveBeenCalledOnce();
      expect(mockIfcApi.Init).toHaveBeenCalledOnce();
      expect(mockIfcApi.OpenModel).toHaveBeenCalledOnce();
      expect(mockIfcApi.CloseModel).toHaveBeenCalledOnce();
    });
  });

  // -----------------------------------------------------------------------
  // Helper exports
  // -----------------------------------------------------------------------

  describe("getElementByType", () => {
    it("filters elements by IFC type", async () => {
      const { parseIfc, getElementByType } = await import(
        "../../src/lib/ifc/parser"
      );

      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 3,
        get: (i: number) => [10, 20, 30][i],
      });
      mockIfcApi.GetProperties.mockImplementation(
        (_modelId: number, expressID: number) => {
          const map: Record<number, Record<string, unknown>> = {
            10: { type: "IfcWall", Name: { value: "W1" } },
            20: { type: "IfcSlab", Name: { value: "S1" } },
            30: { type: "IfcWall", Name: { value: "W2" } },
          };
          return map[expressID] ?? null;
        },
      );

      const model = await parseIfc(emptyBuf);
      const walls = getElementByType(model, "IfcWall");
      expect(walls).toHaveLength(2);
      expect(walls[0].name).toBe("W1");
      expect(walls[1].name).toBe("W2");

      const slabs = getElementByType(model, "IfcSlab");
      expect(slabs).toHaveLength(1);
    });
  });

  describe("getElementByName", () => {
    it("finds element by case-insensitive partial name match", async () => {
      const { parseIfc, getElementByName } = await import(
        "../../src/lib/ifc/parser"
      );

      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 2,
        get: (i: number) => [10, 20][i],
      });
      mockIfcApi.GetProperties.mockImplementation(
        (_modelId: number, expressID: number) => {
          const map: Record<number, Record<string, unknown>> = {
            10: { type: "IfcWall", Name: { value: "LOAD-BEARING WALL" } },
            20: { type: "IfcSlab", Name: { value: "Floor Slab 01" } },
          };
          return map[expressID] ?? null;
        },
      );

      const model = await parseIfc(emptyBuf);
      const found = getElementByName(model, "bearing");
      expect(found).toBeDefined();
      expect(found!.name).toBe("LOAD-BEARING WALL");

      expect(getElementByName(model, "NONEXIST")).toBeUndefined();
    });
  });

  describe("getMaterialSummary", () => {
    it("returns material counts across elements", async () => {
      const { parseIfc, getMaterialSummary } = await import(
        "../../src/lib/ifc/parser"
      );

      mockIfcApi.GetAllLines.mockReturnValue({
        size: () => 2,
        get: (i: number) => [10, 20][i],
      });
      mockIfcApi.GetProperties.mockImplementation(
        (_modelId: number, expressID: number) => {
          const map: Record<number, Record<string, unknown>> = {
            10: { type: "IfcWall", Name: { value: "W1" } },
            20: { type: "IfcSlab", Name: { value: "S1" } },
          };
          return map[expressID] ?? null;
        },
      );

      const model = await parseIfc(emptyBuf);
      // The parser sets empty materials arrays by default
      const summary = getMaterialSummary(model);
      expect(summary).toEqual({});
    });

    it("aggregates custom materials if set", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model: any = {
        elements: [
          { materials: ["Concrete", "Steel"] },
          { materials: ["Concrete"] },
          { materials: ["Wood"] },
        ],
      };

      const { getMaterialSummary: summary } = await import(
        "../../src/lib/ifc/parser"
      );
      expect(summary(model)).toEqual({
        Concrete: 2,
        Steel: 1,
        Wood: 1,
      });
    });
  });

  describe("module exports", () => {
    it("exports all public functions", async () => {
      const mod = await import("../../src/lib/ifc/parser");
      expect(typeof mod.parseIfc).toBe("function");
      expect(typeof mod.getElementByType).toBe("function");
      expect(typeof mod.getElementByName).toBe("function");
      expect(typeof mod.getMaterialSummary).toBe("function");
    });
  });
});
