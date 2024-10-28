import { createContext } from "react"
import { Action, ActionPayload, APICommandPayload, APICommandPayloadFull, IAppState } from "./state"
import { unselectAll } from "../helpers/selectionUtils"
import { ColorTheme, IFolder, IFolderItem, IFolderItemToCreate } from "../helpers/types"
import { applyTheme, findFolderById, findFolderByItemId, findItemById, genNextRuntimeId, genUniqId, getRandomHEXColor } from "../helpers/utils"
import { saveStateThrottled } from "./storage"
import { insertBetween, sortByPosition } from "../helpers/fractionalIndexes"
import { loadFromNetwork } from "../../api/api"

export const DispatchContext = createContext<ActionDispatcher>(null!)

export type ActionDispatcher = (action: ActionPayload) => void;

//todo remove wrapIntoTransaction
export function wrapIntoTransaction(callback: () => void): void {
  callback()
}

export function stateReducer(state: IAppState, action: ActionPayload): IAppState {
  unselectAll()
  const newState = stateReducer0(state, action)
  console.log("[action]:", action, " [new state]:", newState)

  if (state.folders !== newState.folders
    || state.sidebarCollapsed !== newState.sidebarCollapsed
    || state.colorTheme !== newState.colorTheme
    || state.stat != newState.stat) {
    if (action.type !== Action.InitFolders || !action.ignoreSaving) {
      saveStateThrottled(newState)
    }
  }
  return newState
}

function stateReducer0(state: IAppState, action: ActionPayload): IAppState {
  //todo add error icon prop
  const showNotificationReducer = (message: string, isError = false) => stateReducer0(state, { type: Action.ShowNotification, message, isError })

  const getCommandsQueue = (state: IAppState, command: APICommandPayload): APICommandPayloadFull[] => {
    return [...state.apiCommandsQueue, {
      type: command.type,
      body: command.body,
      rollbackState: state,
      commandId: genNextRuntimeId()
    } as APICommandPayloadFull]
  }

  const saveInCloud = loadFromNetwork()

  switch (action.type) {

    case Action.UpdateAppState: {
      return {
        ...state,
        ...action.newState
      }
    }

    case Action.Undo: {
      const undoAction = state.undoActions[state.undoActions.length - 1]
      if (undoAction) {
        const newState: IAppState = {
          ...showNotificationReducer("Undo"),
          undoActions: state.undoActions.filter(u => u !== undoAction)
        }
        return stateReducer0(newState, undoAction)
      } else {
        return showNotificationReducer("Nothing to undo")
      }
    }

    case Action.ShowNotification: {
      return {
        ...state,
        notification: {
          visible: true,
          message: action.message,
          button: action.button,
          isError: action.isError
        }
      }
    }

    case Action.HideNotification: {
      return {
        ...state,
        notification: { ...state.notification, visible: false }
      }
    }

    case Action.UpdateSearch: {
      return { ...state, search: action.value }
    }

    case Action.InitFolders: {
      // let stat = state.stat
      // if (action.init) {
      //   stat = {
      //     sessionNumber: state.stat.sessionNumber,
      //     firstSessionDate: state.stat.firstSessionDate // todo set value first time
      //   }
      // }

      return {
        ...state,
        folders: action.folders || state.folders,
        sidebarCollapsed: typeof action.sidebarCollapsed !== "undefined" ? action.sidebarCollapsed : state.sidebarCollapsed
        // stat
      }
    }

    case Action.ToggleDarkMode: {
      const curMode = state.colorTheme
      const options: ColorTheme[] = ["light", "dark"]
      const curModeIndex = options.indexOf(curMode)
      const nextMode = options[curModeIndex + 1 === 2 ? 0 : curModeIndex + 1]
      applyTheme(nextMode)
      return { ...state, colorTheme: nextMode }
    }

    case Action.UpdateShowArchivedItems: {
      return {
        ...state, showArchived: action.value
      }
    }

    case Action.UpdateShowNotUsedItems: {
      return {
        ...state, showNotUsed: action.value
      }
    }

    case Action.UpdateTab: {
      return {
        ...state,
        tabs: state.tabs.map((t) => {
          if (t.id === action.tabId) {
            return action.opt
          } else {
            return t
          }
        })
      }
    }

    case Action.CloseTabs: {
      chrome.tabs.remove(action.tabIds)
      return {
        ...state,
        tabs: state.tabs.filter(t => !action.tabIds.includes(t.id!))
      }
    }

    case Action.SetTabsAndHistory: {
      return {
        ...state,
        tabs: action.tabs ?? state.tabs,
        historyItems: action.history ?? state.historyItems
      }
    }

    /********************************************************
     * FOLDERS CRUD
     ********************************************************/

    case Action.CreateFolder: {
      const lastFolder = state.folders.at(-1)
      const newFolder: IFolder = {
        id: action.newFolderId ?? genUniqId(),
        title: action.title ?? "New folder",
        items: addItemsToFolder(action.items ?? [], []),
        color: action.color ?? getRandomHEXColor(),
        position: insertBetween(lastFolder?.position ?? "", "")
      }

      let apiCommandsQueue = state.apiCommandsQueue
      if (saveInCloud) {
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.CreateFolder,
          body: { folder: newFolder }
        })
      }

      const undoActions = getUndoAction(action.byUndo, state, () => ({
        type: Action.DeleteFolder,
        folderId: newFolder.id
      }))

      return {
        ...state,
        folders: [
          ...state.folders,
          newFolder
        ],
        apiCommandsQueue,
        undoActions
      }
    }

    case Action.DeleteFolder: {
      const deletingFolder = findFolderById(state, action.folderId)

      if (!deletingFolder) {
        throw new Error("Deleting folder not found")
      }

      let apiCommandsQueue = state.apiCommandsQueue
      if (saveInCloud) {
        if (!deletingFolder.remoteId) {
          return showNotificationReducer("Network operation not available", true)
        }
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.DeleteFolder,
          body: {
            folderId: deletingFolder.remoteId
          }
        })
      }

      const undoActions = getUndoAction(action.byUndo, state, () => ({
        type: Action.CreateFolder, //todo introduce (restore Action)
        ...deletingFolder
      }))

      return {
        ...state,
        folders: state.folders.filter((f) => f.id !== action.folderId),
        apiCommandsQueue,
        undoActions
      }
    }

    case Action.UpdateFolder: {
      const newProps: IFolder = {} as any
      if (typeof action.title !== "undefined") {
        newProps.title = action.title
      }
      if (typeof action.archived !== "undefined") {
        newProps.archived = action.archived
      }
      if (typeof action.color !== "undefined") {
        newProps.color = action.color
      }
      if (typeof action.twoColumn !== "undefined") {
        newProps.twoColumn = action.twoColumn
      }

      const targetFolder = findFolderById(state, action.folderId)

      if (!targetFolder) {
        throw new Error(`Updating folder not found`)
      }

      let apiCommandsQueue = state.apiCommandsQueue
      if (saveInCloud) {
        if (!targetFolder.remoteId) {
          return showNotificationReducer("Network operation not available", true)
        }
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.UpdateFolder,
          body: {
            folderId: targetFolder.remoteId,
            folder: newProps
          }
        })
      }

      const undoActions = getUndoAction(action.byUndo, state, () => ({
        type: Action.UpdateFolder,
        folderId: action.folderId,
        ...targetFolder
      }))

      return {
        ...state,
        folders: updateFolder(state.folders, action.folderId, newProps),
        apiCommandsQueue,
        undoActions
      }
    }

    case Action.MoveFolder: {
      const targetFolder = findFolderById(state, action.folderId)
      const insertBeforeFolderIndex = state.folders.findIndex(f => f.id === action.insertBeforeFolderId)
      const insertAfterFolderIndex = insertBeforeFolderIndex - 1 // if index===-1 it means we want to put targetFolder at the first position

      const position = insertBetween(state.folders[insertAfterFolderIndex]?.position ?? "", state.folders[insertBeforeFolderIndex]?.position ?? "") // confusing naming detected -_-

      const newFolders = sortByPosition(updateFolder(state.folders, action.folderId, { position }))

      let apiCommandsQueue = state.apiCommandsQueue
      if (saveInCloud) {
        if (!targetFolder?.remoteId) {
          return showNotificationReducer("Network operation not available", true)
        }
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.MoveFolder,
          body: {
            folderId: targetFolder.remoteId,
            position: position
          }
        })
      }

      //TODO: Undo for moving folders not supported yet",
      const undoActions = getUndoAction(action.byUndo, state, () => ({
        type: Action.UpdateAppState,
        newState: state
      }))

      return {
        ...state,
        folders: newFolders,
        apiCommandsQueue,
        undoActions
      }
    }

    /********************************************************
     * FOLDER ITEMS CRUD
     ********************************************************/

    case Action.CreateFolderItem: {

      const folders = updateFolder(state.folders, action.folderId, (folder) => {
        const items = addItemsToFolder([action.item], folder.items, action.itemIdInsertBefore)
        return {
          ...folder,
          items
        }
      })

      let createdItem: IFolderItem = findItemById({ folders }, action.item.id)!

      let apiCommandsQueue = state.apiCommandsQueue
      if (saveInCloud) {
        const targetFolder = findFolderById(state, action.folderId)
        if (!targetFolder?.remoteId) {
          return showNotificationReducer("Network operation not available", true)
        }
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.CreateFolderItem,
          body: {
            folderId: targetFolder.remoteId,
            item: createdItem
          }
        })
      }

      const undoActions = getUndoAction(action.byUndo, state, () => ({
        type: Action.DeleteFolderItems,
        itemIds: [action.item.id]
      }))

      return {
        ...state,
        folders,
        apiCommandsQueue,
        undoActions
      }
    }

    case Action.DeleteFolderItems: {

      let apiCommandsQueue = state.apiCommandsQueue
      if (saveInCloud) {
        const itemRemoteIds = action.itemIds.map(itemId => findItemById(state, itemId)?.remoteId!)
        if (itemRemoteIds.some(id => id === undefined)) {
          return showNotificationReducer("Network operation not available", true)
        }
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.DeleteFolderItems,
          body: {
            folderItemIds: itemRemoteIds
          }
        })
      }

      // const undoActions = getUndoAction(action.byUndo, state, () => ({
      //   type: Action.ShowNotification,
      //   message: "Undo for deleting items not supported yet", // todo fix it
      //   isError: true
      // }))

      //TODO: Undo for deleting folders not supported yet",
      const undoActions = getUndoAction(action.byUndo, state, () => ({
        type: Action.UpdateAppState,
        newState: state
      }))


      const deleteItemsFromFolders = (folders: IFolder[], itemId: number): IFolder[] => {
        const folder = findFolderByItemId({ folders }, itemId)
        if (folder) {
          return updateFolder(folders, folder.id, (folder) => {
            return {
              ...folder,
              items: folder.items.filter((i) => i.id !== itemId)
            }
          })
        } else {
          return folders
        }
      }

      return {
        ...state,
        folders: action.itemIds.reduce(deleteItemsFromFolders, state.folders),
        apiCommandsQueue,
        undoActions
      }
    }

    case Action.UpdateFolderItem: {
      const originalItem = findItemById(state, action.itemId)!

      const newProps: IFolderItem = {} as any
      if (typeof action.title !== "undefined") {
        newProps.title = action.title
      }
      if (typeof action.archived !== "undefined") {
        newProps.archived = action.archived
      }
      if (typeof action.url !== "undefined") {
        newProps.url = action.url
      }

      const folderId = findFolderByItemId(state, action.itemId)?.id
      if (!folderId) {
        console.error("Folder was not found for item:", action.itemId)
        return state
      }

      let apiCommandsQueue = state.apiCommandsQueue
      if (saveInCloud) {
        if (!originalItem?.remoteId) {
          return showNotificationReducer("Network operation not available", true)
        }

        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.UpdateFolderItem,
          body: {
            folderItemId: originalItem.remoteId,
            item: newProps
          }
        })
      }

      const undoActions = getUndoAction(action.byUndo, state, () => ({
        type: Action.UpdateFolderItem,
        itemId: originalItem.id,
        ...originalItem
      }))

      return {
        ...state,
        folders: updateFolderItem(
          state.folders,
          action.itemId,
          newProps,
          folderId
        ),
        apiCommandsQueue,
        undoActions
      }
    }

    case Action.MoveFolderItems: {
      const targetFolder = findFolderById(state, action.targetFolderId)
      const movingItems = action.itemIds.map(itemId => findItemById(state, itemId)!)

      // Store the original folder IDs and positions for undo purposes
      const originalPositions = movingItems.map(item => ({
        itemId: item.id,
        originalFolderId: findFolderByItemId(state, item.id)!.id,
        originalPosition: item.position
      }))

      const folderWithRemovedItems = movingItems.reduce((folders, movingItem) => {
        const folder = findFolderByItemId({folders}, movingItem.id)!
        return updateFolder(folders, folder.id, folder => ({
          ...folder,
          items: folder.items.filter(i => i.id !== movingItem.id)
        }))
      }, state.folders)


      const folders = updateFolder(folderWithRemovedItems, action.targetFolderId, folder => ({
        ...folder,
        items: addItemsToFolder(movingItems, folder.items, action.itemIdInsertBefore)
      }))

      let apiCommandsQueue = state.apiCommandsQueue
      if (saveInCloud) {
        if (!targetFolder?.remoteId || movingItems.some(item => !item.remoteId)) {
          return showNotificationReducer("Network operation not available", true)
        }

        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.MoveFolderItems,
          body: {
            folderId: targetFolder.remoteId,
            items: action.itemIds.map(itemId => {
              const item = findItemById({ folders }, itemId)!
              return {
                folderItemId: item.remoteId!,
                position: item.position
              }
            })
          }
        })
      }

      // Generate undo actions to restore each item to its original folder and position
      // const undoActions = getUndoAction(action.byUndo, state, () =>
      //   originalPositions.map(pos => ({
      //     type: Action.MoveFolderItems,
      //     targetFolderId: pos.originalFolderId,
      //     itemIds: [pos.itemId],
      //     itemIdInsertBefore: pos.originalPosition
      //   }))
      // )

      // const undoActions = getUndoAction(action.byUndo, state, () => ({
      //   type: Action.ShowNotification,
      //   message: "Undo for moving items not supported yet", // todo fix it
      //   isError: true
      // }))

      // todo: Undo for moving items to folder not ready - fix it
      const undoActions = getUndoAction(action.byUndo, state, () => ({
        type: Action.UpdateAppState,
        newState: {...state}
      }))

      return {
        ...state,
        folders,
        apiCommandsQueue,
        undoActions
      }
    }

    /********************************************************
     * API HELPERS
     ********************************************************/

    case Action.APICommandResolved: {
      return {
        ...state,
        apiCommandId: undefined,
        apiCommandsQueue: state.apiCommandsQueue.filter(cmd => cmd.commandId !== action.commandId)
      }
    }

    case Action.APIConfirmEntityCreated: {
      if (action.entityType === "bookmark") {
        return {
          ...state,
          folders: updateFolderItem(state.folders, action.localId, {
            remoteId: action.remoteId
          })
        }
      } else if (action.entityType === "folder") {
        return {
          ...state,
          folders: updateFolder(state.folders, action.localId, {
            remoteId: action.remoteId
          })
        }
      } else {
        throw new Error(`Unknown entityType in APIConfirmEntityCreated, ${action.entityType}`)
      }
    }

    default:
      throw new Error(`Unknown action ${action["type"]}`)
  }
}

//////////////////////////////////////////////////////////////////////
// UTILS
//////////////////////////////////////////////////////////////////////

function pipeActionsForStateOnly(state: IAppState, ...actions: ActionPayload[]): IAppState {
  return actions.reduce(stateReducer0, state)
}

function updateFolder(
  folders: IFolder[],
  folderId: number,
  newFolder: Partial<IFolder> | ((folder: IFolder) => IFolder)
): IFolder[] {
  return folders.map((f) => {
    if (f.id === folderId) {
      if (typeof newFolder === "function") {
        return newFolder(f)
      } else {
        return { ...f, ...newFolder }
      }
    } else {
      return f
    }
  })
}

function updateFolderItem(
  folders: IFolder[],
  itemId: number,
  newItemProps: Partial<IFolderItem>,
  folderId?: number
): IFolder[] {
  if (!folderId) {
    const folder = findFolderByItemId({ folders }, itemId)
    if (!folder) {
      console.error("updateFolderItem can not find folder item")
      return folders
    }
    folderId = folder.id
  }
  return updateFolder(folders, folderId, (folder) => {
    const items = folder.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, ...newItemProps }
      } else {
        return item
      }
    })

    return { ...folder, items }
  })
}

export function canShowArchived(appState: Pick<IAppState, "search" | "showArchived">) {
  return appState.showArchived || appState.search.length > 0
}

export function executeCustomAction(actionUrl: string, dispatch: ActionDispatcher): void {
  const cAction: string = actionUrl.split("//")[1] || ""
  if (cAction === "import-bookmarks") {
    // open bookmarks importing
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } })
  }
}

function getUndoAction(byUndo: boolean | undefined, state: IAppState, callback: () => ActionPayload): ActionPayload[] {
  // todo support nested steps for moving several items (or maybe better to move items by a single command.... to think)
  const MAX_HISTORY_LENGTH = 1 // for last step for now

  if (byUndo) {
    // No need to add new step in history, just return current undo actions
    return state.undoActions
  } else {
    const undoAction = callback()
    undoAction.byUndo = true

    const updatedUndoActions = [...state.undoActions, undoAction]
    return updatedUndoActions.length > MAX_HISTORY_LENGTH ? updatedUndoActions.slice(-MAX_HISTORY_LENGTH) : updatedUndoActions
  }
}

function addItemsToFolder(insertingItems: IFolderItemToCreate[], existingItems: IFolderItem[], itemIdInsertBefore?: number): IFolderItem[] {
  const insertBeforeItemIndex = existingItems.findIndex((item) => item.id === itemIdInsertBefore)
  // if insertBeforeItem not found — it means add to the end
  const insertAfterItemIndex = insertBeforeItemIndex !== -1 ? insertBeforeItemIndex - 1 : existingItems.length - 1

  let insertAfterItem = existingItems[insertAfterItemIndex]
  let insertBeforeItem = existingItems[insertBeforeItemIndex]

  const newItems: IFolderItem[] = []
  insertingItems.forEach((insertingItem, index) => {
    const item = insertFolderItem(insertingItem, insertAfterItem, insertBeforeItem)
    insertAfterItem = item
    newItems.push(item)
  })

  return sortByPosition([...existingItems, ...newItems])
}

function insertFolderItem(newItem: IFolderItemToCreate, insertAfterItem: IFolderItem | undefined, insertBeforeItem: IFolderItem | undefined): IFolderItem {
  return {
    ...newItem,
    position: insertBetween(insertAfterItem?.position ?? "", insertBeforeItem?.position ?? "")
  }
}