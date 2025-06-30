import { Request, Response } from "express"
import folderService from "../services/folder.service"
import { validationResult } from "express-validator"
import { logError } from "../utils/logger"

class FolderController {
  async getSpaceFolders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const { spaceId } = req.params

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      if (!spaceId) {
        res.status(400).json({ error: "SpaceId should be provided" })
        return
      }

      const folders = await folderService.getSpaceFolders(spaceId, userId)
      res.json(folders)
    } catch (error) {
      logError(error, `Failed to get space folders: ${req.params.spaceId}`)
      if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to get folders" })
      }
    }
  }

  async getFolderById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const { folderId } = req.params

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      if (!folderId) {
        res.status(400).json({ error: "folderId should be provided" })
        return
      }

      const folder = await folderService.getFolderById(folderId, userId)
      if (!folder) {
        res.status(404).json({ error: "Folder not found or access denied" })
        return
      }

      res.json(folder)
    } catch (error) {
      logError(error, `Failed to get folder by ID: ${req.params.folderId}`)
      res.status(500).json({ error: "Failed to get folder" })
    }
  }

  async createFolder(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() })
        return
      }

      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      const { title, color, position, spaceId } = req.body
      const folder = await folderService.createFolder(userId, { title, color, position, spaceId })
      res.status(201).json(folder)
    } catch (error) {
      logError(error, "Failed to create folder")
      if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to create folder" })
      }
    }
  }

  async updateFolder(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() })
        return
      }

      const userId = req.user?.id
      const { folderId } = req.params

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      if (!folderId) {
        res.status(400).json({ error: "folderId should be provided" })
        return
      }

      const { title, color, position, spaceId } = req.body
      const folder = await folderService.updateFolder(folderId, userId, { title, color, position, spaceId })

      if (!folder) {
        res.status(404).json({ error: "Folder not found or access denied" })
        return
      }

      res.json(folder)
    } catch (error) {
      logError(error, `Failed to update folder: ${req.params.folderId}`)
      if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to update folder" })
      }
    }
  }

  async deleteFolder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const { folderId } = req.params

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      if (!folderId) {
        res.status(400).json({ error: "folderId should be provided" })
        return
      }

      await folderService.deleteFolder(folderId, userId)
      res.json({ message: "Folder deleted successfully" })
    } catch (error) {
      logError(error, `Failed to delete folder: ${req.params.folderId}`)
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message })
      } else if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to delete folder" })
      }
    }
  }

  // Sync-related endpoints
  async createSyncedCopy(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() })
        return
      }

      const userId = req.user?.id
      const { folderId } = req.params
      const { targetSpaceId, position } = req.body

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      if (!folderId) {
        res.status(400).json({ error: "folderId should be provided" })
        return
      }

      const syncedFolder = await folderService.createSyncedCopy(userId, folderId, targetSpaceId, position)
      res.status(201).json(syncedFolder)
    } catch (error) {
      logError(error, `Failed to create synced copy: ${req.params.folderId}`)
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message })
      } else if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to create synced copy" })
      }
    }
  }

  async createFolderSync(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() })
        return
      }

      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      const { sourceFolderId, targetFolderId, syncDirection, conflictStrategy } = req.body
      const sync = await folderService.createFolderSync(userId, {
        sourceFolderId,
        targetFolderId,
        syncDirection,
        conflictStrategy
      })
      res.status(201).json(sync)
    } catch (error) {
      logError(error, "Failed to create folder sync")
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message })
      } else if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to create folder sync" })
      }
    }
  }

  async getFolderSyncs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const { folderId } = req.params

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      if (!folderId) {
        res.status(400).json({ error: "folderId should be provided" })
        return
      }

      const syncs = await folderService.getFolderSyncs(folderId, userId)
      res.json(syncs)
    } catch (error) {
      logError(error, `Failed to get folder syncs: ${req.params.folderId}`)
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message })
      } else if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to get folder syncs" })
      }
    }
  }

  async pauseFolderSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const { syncId } = req.params

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }

      if (!syncId) {
        res.status(400).json({ error: "syncId should be provided" })
        return
      }

      const sync = await folderService.pauseFolderSync(syncId, userId)
      res.json(sync)
    } catch (error) {
      logError(error, `Failed to pause folder sync: ${req.params.syncId}`)
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message })
      } else if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to pause folder sync" })
      }
    }
  }

  async resumeFolderSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const { syncId } = req.params

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }
      if (!syncId) {
        res.status(400).json({ error: "syncId should be provided" })
        return
      }

      const sync = await folderService.resumeFolderSync(syncId, userId)
      res.json(sync)
    } catch (error) {
      logError(error, `Failed to resume folder sync: ${req.params.syncId}`)
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message })
      } else if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to resume folder sync" })
      }
    }
  }

  async removeFolderSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const { syncId } = req.params

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" })
        return
      }
      if (!syncId) {
        res.status(400).json({ error: "syncId should be provided" })
        return
      }

      await folderService.removeFolderSync(syncId, userId)
      res.json({ message: "Folder sync removed successfully" })
    } catch (error) {
      logError(error, `Failed to remove folder sync: ${req.params.syncId}`)
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message })
      } else if (error instanceof Error && error.message.includes("denied")) {
        res.status(403).json({ error: error.message })
      } else {
        res.status(500).json({ error: "Failed to remove folder sync" })
      }
    }
  }
}

export default new FolderController()