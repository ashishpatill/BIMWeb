/**
 * BIMWeb Public REST API — OpenAPI 3.1 Specification
 *
 * Hand-written spec covering every v1 endpoint and /api/upload.
 * Reflects the exact request/response shapes from the route implementations.
 *
 * @see T-API-2
 */

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Serialise the OpenAPI document to a JSON string (pretty-printed). */
export function json(): string {
  return JSON.stringify(openApiDocument, null, 2);
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "BIMWeb Public REST API",
    version: "1.0.0",
    description:
      "BIMWeb API for programmatic access to projects, models, team management, search, documents, and audit logs.\n\n" +
      "Authentication is via Bearer API key (`Authorization: Bearer <key>`). " +
      "Keys are created in the BIMWeb dashboard and carry granular scopes. " +
      "The `/api/upload` endpoint uses Kinde session-based authentication instead of an API key.\n\n" +
      "Scopes required per operation are noted in each endpoint description.\n\n" +
      "All v1 endpoints live under `/api/v1/`.",
  },
  servers: [
    { url: "", description: "Same origin (relative to BIMWeb host)" },
  ],
  security: [{ ApiKeyAuth: [] }],

  // -----------------------------------------------------------------------
  // Paths
  // -----------------------------------------------------------------------
  paths: {
    // ── Projects ───────────────────────────────────────────────────────
    "/api/v1/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects",
        description:
          "Returns all projects owned by the API key user. " +
          "Scope required: **projects:read**.",
        operationId: "listProjects",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Maximum number of results (1–100, default 20).",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "offset",
            in: "query",
            description: "Number of results to skip (default 0).",
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of projects.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        description:
          "Creates a new project owned by the API key user. " +
          "Scope required: **projects:write**.",
        operationId: "createProject",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProjectRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Project created successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },

    "/api/v1/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get a project by ID",
        description:
          "Returns details for a single project owned by the API key user. " +
          "Scope required: **projects:read**.",
        operationId: "getProject",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Project ID (integer).",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Project details.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      patch: {
        tags: ["Projects"],
        summary: "Update a project",
        description:
          "Updates the name and/or description of a project owned by the API key user. " +
          "Scope required: **projects:write**.",
        operationId: "updateProject",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Project ID (integer).",
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProjectRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated project.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a project",
        description:
          "Permanently deletes a project and all associated models/team members. " +
          "Only the project owner can delete. " +
          "Scope required: **projects:write**.",
        operationId: "deleteProject",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Project ID (integer).",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Deletion confirmation.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeleteResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },

    // ── Models ──────────────────────────────────────────────────────────
    "/api/v1/models": {
      get: {
        tags: ["Models"],
        summary: "List models",
        description:
          "Returns models belonging to projects owned by the API key user. " +
          "Optionally filtered by `projectId`. " +
          "Scope required: **models:read**.",
        operationId: "listModels",
        parameters: [
          {
            name: "projectId",
            in: "query",
            description: "Filter by project ID.",
            schema: { type: "integer" },
          },
          {
            name: "limit",
            in: "query",
            description: "Maximum number of results (1–100, default 20).",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "offset",
            in: "query",
            description: "Number of results to skip (default 0).",
            schema: { type: "integer", minimum: 0, default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of models.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ModelListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      post: {
        tags: ["Models"],
        summary: "Create a model",
        description:
          "Creates a new model record within a project owned by the API key user. " +
          "Scope required: **models:write**.",
        operationId: "createModel",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateModelRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Model created successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ModelResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },

    "/api/v1/models/{id}": {
      get: {
        tags: ["Models"],
        summary: "Get a model by ID",
        description:
          "Returns details for a single model whose parent project is owned by the API key user. " +
          "Scope required: **models:read**.",
        operationId: "getModel",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Model ID (integer).",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Model details.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ModelResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      delete: {
        tags: ["Models"],
        summary: "Delete a model",
        description:
          "Permanently deletes a model whose parent project is owned by the API key user. " +
          "Scope required: **models:write**.",
        operationId: "deleteModel",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Model ID (integer).",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Deletion confirmation.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeleteResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },

    // ── Team ────────────────────────────────────────────────────────────
    "/api/v1/team": {
      get: {
        tags: ["Team"],
        summary: "List team members",
        description:
          "Returns team members across all projects owned by the API key user. " +
          "Optionally filtered by `projectId`. " +
          "Scope required: **projects:read**.",
        operationId: "listTeamMembers",
        parameters: [
          {
            name: "projectId",
            in: "query",
            description: "Filter by project ID.",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "List of team members.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TeamMemberListResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      post: {
        tags: ["Team"],
        summary: "Invite a team member",
        description:
          "Invites a user by email to a project owned by the API key user. " +
          "Scope required: **projects:write**.",
        operationId: "inviteTeamMember",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InviteTeamMemberRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Team member invited successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TeamMemberResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },

    "/api/v1/team/{id}": {
      delete: {
        tags: ["Team"],
        summary: "Remove a team member",
        description:
          "Removes a team member from a project owned by the API key user. " +
          "Scope required: **projects:write**.",
        operationId: "removeTeamMember",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Team member ID (integer).",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Removal confirmation.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeleteResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      patch: {
        tags: ["Team"],
        summary: "Update team member role",
        description:
          "Changes the role of a team member within a project owned by the API key user. " +
          "Valid roles: `admin`, `editor`, `viewer`. " +
          "Scope required: **projects:write**.",
        operationId: "updateTeamMemberRole",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Team member ID (integer).",
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTeamMemberRoleRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated team member.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TeamMemberResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },

    // ── Search ─────────────────────────────────────────────────────────
    "/api/v1/search": {
      post: {
        tags: ["Search"],
        summary: "Execute a search query",
        description:
          "Sends a query to the BIMAgent (smart mode) or BIMIndex (keyword/semantic/relationships). " +
          "Scope required: **search:read**.",
        operationId: "search",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SearchRequest" },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Search results. Shape depends on mode:\n" +
              "- `smart` (BIMAgent): returns `response` (string) and `trace` (object).\n" +
              "- `keyword`, `semantic`, `relationships` (BIMIndex): returns `hits` (array).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SearchResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "502": { $ref: "#/components/responses/BadGateway" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },

    // ── Documents ───────────────────────────────────────────────────────
    "/api/v1/documents": {
      get: {
        tags: ["Documents"],
        summary: "List documents",
        description:
          "Returns indexed documents across projects owned by the API key user. " +
          "Optionally filtered by `projectId`. " +
          "Scope required: **projects:read**.",
        operationId: "listDocuments",
        parameters: [
          {
            name: "projectId",
            in: "query",
            description: "Filter by project ID.",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "List of documents.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentListResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Create / ingest a document",
        description:
          "Creates a document record linked to a project owned by the API key user. " +
          "Scope required: **documents:write** (falls back to **projects:write**).",
        operationId: "createDocument",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDocumentRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Document created successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocumentResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },

    // ── Audit ───────────────────────────────────────────────────────────
    "/api/v1/audit": {
      get: {
        tags: ["Audit"],
        summary: "List audit logs",
        description:
          "Returns audit log entries for the API key user's account. " +
          "Scope required: **audit:read**.",
        operationId: "listAuditLogs",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Maximum number of results (1–200, default 50).",
            schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
          },
          {
            name: "offset",
            in: "query",
            description: "Number of results to skip (default 0).",
            schema: { type: "integer", minimum: 0, default: 0 },
          },
          {
            name: "action",
            in: "query",
            description: "Filter by action type (e.g. `api_create_project`).",
            schema: { type: "string" },
          },
          {
            name: "targetType",
            in: "query",
            description: "Filter by target type (e.g. `project`, `model`).",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of audit log entries.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuditLogListResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ── Upload ─────────────────────────────────────────────────────────
    "/api/upload": {
      post: {
        tags: ["Upload"],
        summary: "Upload a file",
        description:
          "Uploads a file (PDF, PNG, JPEG, WebP, glTF, IFC). " +
          "**Note:** This endpoint uses Kinde session-based authentication (not an API key). " +
          "Requires a valid user session. Max file size: 100 MB.",
        operationId: "uploadFile",
        security: [{ KindeSessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description:
                      "File to upload. Accepted types: PDF, PNG, JPEG, WebP, " +
                      "glTF (model/gltf+json, model/gltf-binary), IFC (application/octet-stream).",
                  },
                },
                required: ["file"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "File uploaded successfully. Returns the URL and metadata.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UploadResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },

  // -----------------------------------------------------------------------
  // Components
  // -----------------------------------------------------------------------
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "API key authentication. Create and manage keys in the BIMWeb " +
          "dashboard under API Keys. Each key carries one or more scopes " +
          "that control which endpoints it can access.",
      },
      KindeSessionAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Kinde session-based authentication (cookie). Used only by " +
          "`/api/upload`. Not available for API key authentication.",
      },
    },

    // ── Schemas ─────────────────────────────────────────────────────────
    schemas: {
      // --- Error response shapes ---
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "string",
            description: "Human-readable error message.",
          },
        },
      },

      // --- Pagination ---
      Pagination: {
        type: "object",
        required: ["limit", "offset"],
        properties: {
          limit: {
            type: "integer",
            description: "Maximum results returned.",
          },
          offset: {
            type: "integer",
            description: "Number of results skipped.",
          },
        },
      },

      PaginationWithTotal: {
        allOf: [
          { $ref: "#/components/schemas/Pagination" },
          {
            type: "object",
            required: ["total"],
            properties: {
              total: {
                type: "integer",
                description: "Total number of results matching the filter.",
              },
            },
          },
        ],
      },

      // --- Delete response ---
      DeleteResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "object",
            required: ["id", "deleted"],
            properties: {
              id: { type: "integer" },
              deleted: { type: "boolean", enum: [true] },
            },
          },
        },
      },

      // --- Project ---
      Project: {
        type: "object",
        required: ["id", "name", "ownerId", "createdAt"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          ownerId: { type: "string", description: "Kinde user ID of the owner." },
          workspaceId: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },

      ProjectResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { $ref: "#/components/schemas/Project" },
        },
      },

      ProjectListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Project" },
          },
          pagination: { $ref: "#/components/schemas/PaginationWithTotal" },
        },
      },

      CreateProjectRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "string",
            description: "Project name (max 256 chars).",
            maxLength: 256,
          },
          description: {
            type: "string",
            description: "Optional project description (max 2048 chars).",
            maxLength: 2048,
          },
        },
      },

      UpdateProjectRequest: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "New project name (max 256 chars, non-empty).",
            maxLength: 256,
          },
          description: {
            type: "string",
            nullable: true,
            description: "New description, or null to clear (max 2048 chars).",
            maxLength: 2048,
          },
        },
      },

      // --- Model ---
      Model: {
        type: "object",
        required: ["id", "name", "projectId", "fileSize", "status", "createdAt"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          projectId: { type: "integer" },
          fileSize: { type: "string", description: "File size as a string (e.g. '1048576')." },
          fileUrl: { type: "string", nullable: true, format: "uri" },
          status: {
            type: "string",
            description: "Processing status (e.g. 'processing', 'ready').",
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },

      ModelResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { $ref: "#/components/schemas/Model" },
        },
      },

      ModelListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Model" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },

      CreateModelRequest: {
        type: "object",
        required: ["name", "projectId"],
        properties: {
          name: {
            type: "string",
            description: "Model name (max 256 chars).",
            maxLength: 256,
          },
          description: {
            type: "string",
            description: "Optional description.",
          },
          projectId: {
            type: "integer",
            description: "ID of the parent project (must be owned by the API key user).",
          },
          fileSize: {
            type: "number",
            description: "File size in bytes.",
          },
          fileUrl: {
            type: "string",
            format: "uri",
            description: "URL to the model file.",
          },
        },
      },

      // --- Team Member ---
      TeamMember: {
        type: "object",
        required: ["id", "projectId", "email", "role"],
        properties: {
          id: { type: "integer" },
          projectId: { type: "integer" },
          workspaceId: { type: "integer", nullable: true },
          email: { type: "string", format: "email" },
          role: {
            type: "string",
            enum: ["admin", "editor", "viewer"],
            description: "Member role within the project.",
          },
          inviteToken: { type: "string", nullable: true },
          joinedAt: { type: "string", format: "date-time" },
        },
      },

      TeamMemberResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { $ref: "#/components/schemas/TeamMember" },
        },
      },

      TeamMemberListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/TeamMember" },
          },
        },
      },

      InviteTeamMemberRequest: {
        type: "object",
        required: ["email", "projectId"],
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "Email address of the person to invite.",
          },
          projectId: {
            type: "integer",
            description: "ID of the project to add the member to.",
          },
          role: {
            type: "string",
            enum: ["admin", "editor", "viewer"],
            description: "Role to assign (default: viewer).",
            default: "viewer",
          },
        },
      },

      UpdateTeamMemberRoleRequest: {
        type: "object",
        required: ["role"],
        properties: {
          role: {
            type: "string",
            enum: ["admin", "editor", "viewer"],
            description: "New role for the team member.",
          },
        },
      },

      // --- Search ---
      SearchRequest: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            description: "Search query text.",
          },
          mode: {
            type: "string",
            enum: ["smart", "keyword", "semantic", "relationships"],
            description:
              "Search mode:\n" +
              "- `smart` (default): BIMAgent synthesized answer.\n" +
              "- `keyword`: BIMIndex vectorless search.\n" +
              "- `semantic`: BIMIndex dense retrieval.\n" +
              "- `relationships`: BIMIndex graph search.",
            default: "smart",
          },
        },
      },

      SearchResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "object",
            description:
              "Result object. For `smart` mode contains `response` (string), `trace` (object), " +
              "`mode`, and `backend` (\"BIMAgent\"). For other modes contains `hits` (array), " +
              "`mode`, and `backend` (\"BIMIndex\").",
            properties: {
              response: {
                type: "string",
                description: "Synthesized answer (BIMAgent smart mode only).",
              },
              trace: {
                type: "object",
                description: "Trace metadata (BIMAgent smart mode only).",
              },
              hits: {
                type: "array",
                description: "Search hits (BIMIndex modes only).",
                items: {
                  type: "object",
                  description: "Search hit with source metadata.",
                },
              },
              mode: { type: "string" },
              backend: {
                type: "string",
                enum: ["BIMAgent", "BIMIndex"],
              },
            },
          },
        },
      },

      // --- Document ---
      Document: {
        type: "object",
        required: ["id", "workspaceId", "name", "fileUrl", "status", "createdAt"],
        properties: {
          id: { type: "integer" },
          workspaceId: { type: "integer" },
          projectId: { type: "integer", nullable: true },
          name: { type: "string" },
          fileUrl: { type: "string", format: "uri" },
          mimeType: { type: "string", nullable: true },
          status: {
            type: "string",
            description:
              "Processing status: `pending`, `processing`, `parsing`, `indexing`, `ready`, `failed`.",
          },
          chunks: { type: "integer", nullable: true },
          indexedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },

      DocumentResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: { $ref: "#/components/schemas/Document" },
        },
      },

      DocumentListResponse: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Document" },
          },
        },
      },

      CreateDocumentRequest: {
        type: "object",
        required: ["name", "fileUrl", "projectId"],
        properties: {
          name: {
            type: "string",
            description: "Document name.",
          },
          fileUrl: {
            type: "string",
            format: "uri",
            description: "URL to the document file.",
          },
          projectId: {
            type: "integer",
            description: "ID of the project to associate the document with.",
          },
          mimeType: {
            type: "string",
            description: "Optional MIME type of the document.",
          },
        },
      },

      // --- Audit Log ---
      AuditLog: {
        type: "object",
        required: ["id", "action", "actorId", "targetType", "targetId", "createdAt"],
        properties: {
          id: { type: "integer" },
          action: { type: "string", description: "Action identifier (e.g. `api_create_project`)." },
          actorId: { type: "string", description: "Kinde user ID who performed the action." },
          targetType: { type: "string", description: "Type of target (e.g. `project`, `model`)." },
          targetId: { type: "string", description: "ID of the target resource." },
          metadata: {
            type: "object",
            description: "Additional action-specific metadata.",
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },

      AuditLogListResponse: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/AuditLog" },
          },
          pagination: { $ref: "#/components/schemas/PaginationWithTotal" },
        },
      },

      // --- Upload ---
      UploadResponse: {
        type: "object",
        required: ["url", "fileSize", "name", "mimeType"],
        properties: {
          url: {
            type: "string",
            description: "Relative URL to the uploaded file (e.g. `/uploads/1234567890-file.glb`).",
          },
          fileSize: {
            type: "string",
            description: "Human-readable file size (e.g. `5.2 MB`).",
          },
          name: {
            type: "string",
            description: "Original file name.",
          },
          mimeType: {
            type: "string",
            description: "MIME type of the uploaded file.",
          },
        },
      },
    },

    // ── Responses (shared) ──────────────────────────────────────────────
    responses: {
      BadRequest: {
        description: "Bad request — invalid body, missing required fields, or validation failure.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Unauthorized: {
        description: "Missing or invalid API key / session.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Forbidden: {
        description:
          "Insufficient permissions. The API key is valid but lacks the required scope for this operation.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "The requested resource was not found or access was denied.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Conflict: {
        description: "Conflict — the resource already exists or the operation cannot be completed.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      RateLimited: {
        description:
          "Rate limit exceeded. The `Retry-After` header indicates seconds until the limit resets.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
        headers: {
          "Retry-After": {
            schema: { type: "integer", description: "Seconds until rate limit resets." },
          },
        },
      },
      BadGateway: {
        description: "Backend search service returned an error.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      InternalError: {
        description: "An unexpected internal server error occurred.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },

  // -----------------------------------------------------------------------
  // Tags
  // -----------------------------------------------------------------------
  tags: [
    { name: "Projects", description: "Create, read, update, and delete BIM projects." },
    { name: "Models", description: "Manage 3D BIM models within projects." },
    { name: "Team", description: "Invite and manage team members." },
    { name: "Search", description: "Execute queries against the BIM knowledge base." },
    { name: "Documents", description: "Manage indexed documents." },
    { name: "Audit", description: "Review audit log entries." },
    { name: "Upload", description: "Upload files (session-authenticated)." },
  ],
} as const;
