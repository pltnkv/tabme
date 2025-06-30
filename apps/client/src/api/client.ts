import createClient from "openapi-fetch"
import type { paths } from "./schema"
import { components } from "./schema"
import type { FolderWithItems } from "@tabme/shared-types"

const baseUrl = process.env.NODE_ENV === "development"
  ? "http://localhost:3000"
  : "https://api.tabme.app" // Update with your production URL

// Create the API client with proper typing
const clientSdk = createClient<paths>({ baseUrl })

// Extract request/response types from OpenAPI schema instead of duplicating them
type SyncChange = Omit<components["schemas"]["SyncChange"], "data"> & {
  data?: any
}

// Extract types from OpenAPI paths for type safety
export type CreateFolderPayload = paths["/api/folders"]["post"]["requestBody"]["content"]["application/json"]
export type UpdateFolderPayload = paths["/api/folders/{folderId}"]["put"]["requestBody"]["content"]["application/json"]
export type CreateItemPayload = paths["/api/items"]["post"]["requestBody"]["content"]["application/json"]
export type CreateSpacePayload = paths["/api/spaces"]["post"]["requestBody"]["content"]["application/json"]

// Use schema types directly for responses
type FolderResponse = components["schemas"]["Folder"]
type ItemResponse = components["schemas"]["BookmarkItem"]
type SpaceResponse = components["schemas"]["Space"]
type UserResponse = components["schemas"]["User"]

// Helper function to set the auth token
export function setAuthTokenToContext(token: string) {
  clientSdk.use({
    onRequest({ request }) {
      request.headers.set("Authorization", `Bearer ${token}`)
    }
  })
}

export function writeAuthTokenToLS(token: string) {
  localStorage.setItem("authToken", token)
}

export function clearAuthTokenInLS() {
  localStorage.removeItem("authToken")
}


export function getAuthToken(): string | null {
  return localStorage.getItem("authToken")
}

// Helper function to remove auth token
export function clearAuthToken() {
  // Create a new client instance without auth
  Object.assign(clientSdk, createClient<paths>({ baseUrl }))
}

// Authentication endpoints
const auth = {
  async login(email: string, password: string) {
    const { data, error } = await clientSdk.POST("/api/auth/login", {
      body: {
        email,
        password
      }
    })

    if (error) {
      throw new Error("Login failed: " + (error || "Unknown error"))
    }

    return data
  },

  async register(email: string, password: string, name?: string) {
    const { data, error } = await clientSdk.POST("/api/auth/register", {
      body: {
        email,
        password,
        name
      }
    })

    if (error) {
      throw new Error("Registration failed: " + (error || "Unknown error"))
    }

    return data
  },

  async logout() {
    const { data, error } = await clientSdk.POST("/api/auth/logout")

    if (error) {
      throw new Error("Logout failed: " + (error || "Unknown error"))
    }

    return data
  },

  async getMe() {
    const { data, error } = await clientSdk.GET("/api/auth/me")

    if (error) {
      throw new Error("Get user failed: " + (error || "Unknown error"))
    }

    return data
  },

  async refreshToken() {
    const { data, error } = await clientSdk.POST("/api/auth/refresh-token")

    if (error) {
      throw new Error("Token refresh failed: " + (error || "Unknown error"))
    }

    return data
  }
}

// Spaces endpoints
const spaces = {
  async getAll() {
    const { data, error } = await clientSdk.GET("/api/spaces")

    if (error) {
      throw new Error("Get spaces failed: " + (error || "Unknown error"))
    }

    return data
  },

  async getById(spaceId: string) {
    const { data, error } = await clientSdk.GET("/api/spaces/{spaceId}", {
      params: {
        path: { spaceId }
      }
    })

    if (error) {
      throw new Error("Get space failed: " + (error || "Unknown error"))
    }

    return data
  },

  async create(title: string, position: string) {
    const { data, error } = await clientSdk.POST("/api/spaces", {
      body: {
        title,
        position
      }
    })

    if (error) {
      throw new Error("Create space failed: " + (error || "Unknown error"))
    }

    return data
  },

  async update(spaceId: string, updates: { title?: string }) {
    const { data, error } = await clientSdk.PUT("/api/spaces/{spaceId}", {
      params: {
        path: { spaceId }
      },
      body: updates
    })

    if (error) {
      throw new Error("Update space failed: " + (error || "Unknown error"))
    }

    return data
  },

  async delete(spaceId: string) {
    const { data, error } = await clientSdk.DELETE("/api/spaces/{spaceId}", {
      params: {
        path: { spaceId }
      }
    })

    if (error) {
      throw new Error("Delete space failed: " + (error || "Unknown error"))
    }

    return data
  }
}

// Sync endpoints
const sync = {
  async getFullData() {
    const { data, error } = await clientSdk.GET("/api/sync/full")

    if (error) {
      throw new Error("Get full sync data failed: " + (error || "Unknown error"))
    }

    return data
  }
}

// Folders endpoints
const folders = {
  async getBySpaceId(spaceId: string) {
    const { data, error } = await clientSdk.GET("/api/folders/space/{spaceId}", {
      params: {
        path: { spaceId }
      }
    })

    if (error) {
      throw new Error("Get folders failed: " + (error || "Unknown error"))
    }

    return data
  },

  async create(payload: CreateFolderPayload): Promise<FolderWithItems> {
    const { data, error } = await clientSdk.POST("/api/folders", {
      body: payload
    })

    if (error) {
      throw new Error("Create folder failed: " + (error || "Unknown error"))
    }

    return data as unknown as FolderWithItems
  },

  async update(folderId: string, updates: UpdateFolderPayload) {
    const { data, error } = await clientSdk.PUT("/api/folders/{folderId}", {
      params: {
        path: { folderId }
      },
      body: updates
    })

    if (error) {
      throw new Error("Update folder failed: " + (error || "Unknown error"))
    }

    return data
  },

  async delete(folderId: string) {
    const { data, error } = await clientSdk.DELETE("/api/folders/{folderId}", {
      params: {
        path: { folderId }
      }
    })

    if (error) {
      throw new Error("Delete folder failed: " + (error || "Unknown error"))
    }

    return data
  },

  async createSync(sourceFolderId: string, targetFolderId: string, syncDirection: "BIDIRECTIONAL" | "ONE_WAY" = "BIDIRECTIONAL") {
    const { data, error } = await clientSdk.POST("/api/folders/sync", {
      body: {
        sourceFolderId,
        targetFolderId,
        syncDirection
      }
    })

    if (error) {
      throw new Error("Create folder sync failed: " + (error || "Unknown error"))
    }

    return data
  }
}

// Items endpoints
const items = {
  async create(payload: CreateItemPayload) {
    const { data, error } = await clientSdk.POST("/api/items", {
      body: payload
    })

    if (error) {
      throw new Error("Create item failed: " + (error || "Unknown error"))
    }

    return data
  },

  async update(itemId: string, updates: Partial<CreateItemPayload>) {
    const { data, error } = await clientSdk.PUT("/api/items/{itemId}", {
      params: {
        path: { itemId }
      },
      body: updates
    })

    if (error) {
      throw new Error("Update item failed: " + (error || "Unknown error"))
    }

    return data
  },

  async delete(itemId: string) {
    const { data, error } = await clientSdk.DELETE("/api/items/{itemId}", {
      params: {
        path: { itemId }
      }
    })

    if (error) {
      throw new Error("Delete item failed: " + (error || "Unknown error"))
    }

    return data
  },

  async bulkUpdatePositions(updates: Array<{ id: string, position: string }>) {
    const { data, error } = await clientSdk.PUT("/api/items/bulk-positions", {
      body: { updates }
    })

    if (error) {
      throw new Error("Bulk update positions failed: " + (error || "Unknown error"))
    }

    return data
  }
}

const sdk = {
  auth,
  sync,
  spaces,
  folders,
  items
}
export { clientSdk, sdk }