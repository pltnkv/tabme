import { createContext } from "react"
import { Action, ActionPayload, APICommandPayload, APICommandPayloadFull, HistoryActionPayload, IAppState, UndoStep } from "./state"
import { ColorTheme, IFolder, IFolderItem, ISpace, IWidget } from "../helpers/types"
import { applyTheme, saveStateThrottled, savingStateKeys } from "./storage"
import { addItemsToFolder, insertBetween, sortByPosition } from "../helpers/fractionalIndexes"
import { loadFromNetwork } from "../../api/api"
import {
  findFolderById,
  findFolderByItemId,
  findItemById,
  findSpaceByFolderId,
  findSpaceById,
  findWidgetById,
  genUniqLocalId,
  updateFolder,
  updateFolderItem,
  updateSpace
} from "./actionHelpers"
import { genNextRuntimeId, getRandomHEXColor, isArraysEqual } from "../helpers/utils"
import { defaultStickerColor, stickerSizeM } from "../components/canvas/WidgetsHorMenu"

type ObjectWithRemoteId = {
  remoteId: number
}

export const DispatchContext = createContext<ActionDispatcher>(null!)

export type ActionDispatcher = (action: ActionPayload) => void;

export function stateReducer(state: IAppState, action: ActionPayload): IAppState {
  // unselectAll()
  const newState = stateReducer0(state, action)
  console.log("[action]:", action, " [new state]:", newState)

  const haveSomethingToSave = savingStateKeys.some(key => state[key] !== newState[key])
  if (haveSomethingToSave) {
    if (action.type !== Action.InitDashboard || action.saveToLS) {
      saveStateThrottled(newState)
    }
  }
  return newState
}

function stateReducer0(state: IAppState, action: ActionPayload): IAppState {
  //todo add error icon prop
  const showNotificationReducer = (message: string) => stateReducer0(state, { type: Action.ShowNotification, message, isError: false })
  const showErrorReducer = (message: string) => stateReducer0(state, { type: Action.ShowNotification, message, isError: true })

  const getCommandsQueue = (state: IAppState, command: APICommandPayload): APICommandPayloadFull[] => {
    return [...state.apiCommandsQueue, {
      type: command.type,
      body: command.body,
      rollbackState: state,
      commandId: genNextRuntimeId()
    } as APICommandPayloadFull]
  }

  function isNetworkAvailable(object?: { remoteId?: number }): object is ObjectWithRemoteId {
    return loadFromNetwork()
    // todo with it something. So optimistic updates works, and batching works, and no user data looses
    // if (object && !object.remoteId) {
    //   showNotificationReducer("Network operation not available", true)
    //   return false
    // }
  }

  switch (action.type) {
    case Action.UpdateAppState: {
      return {
        ...state,
        ...action.newState
      }
    }

    case Action.Undo: {
      const undoStep = state.undoSteps.at(-1)
      if (undoStep) {
        const newState: IAppState = {
          ...state,
          undoSteps: state.undoSteps.filter(u => u !== undoStep)
        }
        return undoStep.subSteps.reduce((state, subStepAction) => stateReducer0(state, subStepAction), newState)
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
          isError: action.isError,
          isLoading: action.isLoading,
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

    case Action.InitDashboard: {
      return {
        ...state,
        spaces: action.spaces || state.spaces,
        sidebarCollapsed: typeof action.sidebarCollapsed !== "undefined" ? action.sidebarCollapsed : state.sidebarCollapsed
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

    case Action.SetTabsOrHistory: {
      return {
        ...state,
        tabs: action.tabs ?? state.tabs,
        recentItems: action.recentItems ?? state.recentItems
      }
    }

    case Action.SelectSpace: {
      const targetSpace = action.spaceIndex
        ? state.spaces[action.spaceIndex]
        : findSpaceById(state, action.spaceId)
      return {
        ...state,
        currentSpaceId: targetSpace?.id ?? state.spaces.at(0)?.id ?? -1
      }
    }

    case Action.SwipeSpace: {
      const currentIndex = state.spaces.findIndex(space => space.id === state.currentSpaceId)

      if (currentIndex === -1) {
        return showErrorReducer("Current space not found")
      }

      let newIndex = currentIndex

      if (action.direction === "left") {
        newIndex = currentIndex === 0 ? state.spaces.length - 1 : currentIndex - 1
      } else if (action.direction === "right") {
        newIndex = currentIndex === state.spaces.length - 1 ? 0 : currentIndex + 1
      } else {
        return state // Invalid direction, no change
      }

      return {
        ...state,
        currentSpaceId: state.spaces[newIndex].id
      }
    }

    /********************************************************
     * SPACES CRUD
     ********************************************************/

    case Action.CreateSpace: {
      const lastSpace = state.spaces.at(-1)
      // todo add network later !!!

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.DeleteSpace,
        spaceId: action.spaceId
      }))

      const newSpace = {
        id: action.spaceId,
        title: action.title,
        position: action?.position ?? insertBetween(lastSpace?.position ?? "", ""),
        folders: []
      }

      return {
        ...state,
        spaces: sortByPosition([
          ...state.spaces,
          newSpace
        ]),
        undoSteps
      }
    }

    case Action.DeleteSpace: {
      // todo add network later !!!

      const deletingSpace = findSpaceById(state, action.spaceId)
      if (!deletingSpace) {
        return showErrorReducer("Deleting space not found")
      }

      // todo can be different when network supported
      // const undoSteps = getUndoSteps(action, state, () => ({
      //   type: Action.CreateSpace,
      //   spaceId: deletingSpace.id,
      //   ...deletingSpace // todo !!! support restoring folders with UNDO in space
      // }))

      return {
        ...state,
        currentSpaceId: state.currentSpaceId !== action.spaceId ? state.currentSpaceId : state.spaces[0].id,
        spaces: state.spaces.filter((s) => s.id !== action.spaceId)
        // undoSteps
      }
    }

    case Action.UpdateSpace: {
      // todo add network later !!!
      const newProps: ISpace = {} as any
      if (typeof action.title !== "undefined") {
        newProps.title = action.title
      }
      if (typeof action.position !== "undefined") {
        newProps.position = action.position
      }

      const targetSpace = findSpaceById(state, action.spaceId)

      if (!targetSpace) {
        return showErrorReducer("Updating space not found")
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateSpace,
        spaceId: action.spaceId,
        title: targetSpace.title,
        position: targetSpace.position
      }))

      return {
        ...state,
        spaces: updateSpace(state.spaces, action.spaceId, newProps),
        undoSteps
      }
    }

    case Action.MoveSpace: {
      const movingSpace = findSpaceById(state, action.spaceId)
      if (!movingSpace) {
        return showErrorReducer(`Moving space not found`)
      }

      const insertBeforeSpaceIndex = state.spaces.findIndex(s => s.id === action.insertBeforeSpaceId)
      const insertAfterSpaceIndex = insertBeforeSpaceIndex === -1 ? state.spaces.length - 1 : insertBeforeSpaceIndex - 1

      // confusing naming detected
      const newPosition = insertBetween(state.spaces[insertAfterSpaceIndex]?.position ?? "", state.spaces[insertBeforeSpaceIndex]?.position ?? "")

      const spaces = updateSpace(state.spaces, action.spaceId, { position: newPosition })

      let apiCommandsQueue = state.apiCommandsQueue
      if (isNetworkAvailable()) {
        // todo !!! impl later
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateSpace,
        spaceId: movingSpace.id,
        position: movingSpace.position
      }))

      return {
        ...state,
        spaces: spaces,
        apiCommandsQueue,
        undoSteps
      }
    }

    /********************************************************
     * FOLDERS CRUD
     ********************************************************/

    case Action.CreateFolder: {
      const currentSpace = findSpaceById(state, action.spaceId ?? state.currentSpaceId)
      if (!currentSpace) {
        return showErrorReducer(`Space not found`)
      }

      const lastFolder = currentSpace.folders.at(-1)
      const newFolder: IFolder = {
        id: action.newFolderId ?? genUniqLocalId(),
        title: action.title ?? "New folder",
        items: addItemsToFolder(action.items ?? [], []),
        color: action.color ?? getRandomHEXColor(),
        position: action.position ?? insertBetween(lastFolder?.position ?? "", "")
      }

      let apiCommandsQueue = state.apiCommandsQueue
      if (isNetworkAvailable()) {
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.CreateFolder,
          body: { folder: newFolder }
        })
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.DeleteFolder,
        folderId: newFolder.id
      }))

      return {
        ...state,
        spaces: updateSpace(state.spaces, currentSpace.id, {
          folders: sortByPosition([
            ...currentSpace.folders,
            newFolder
          ])
        }),
        apiCommandsQueue,
        undoSteps
      }
    }

    case Action.DeleteFolder: {
      const deletingFolder = findFolderById(state, action.folderId)
      const parentSpace = findSpaceByFolderId(state, action.folderId)

      if (!deletingFolder || !parentSpace) {
        return showErrorReducer(`Deleting folder or space not found`)
      }

      let apiCommandsQueue = state.apiCommandsQueue

      if (isNetworkAvailable(deletingFolder)) {
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.DeleteFolder,
          body: {
            folderId: deletingFolder.remoteId
          }
        })
      }

      //todo can be different when network supported
      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.CreateFolder,
        ...deletingFolder
      }))

      return {
        ...state,
        spaces: updateSpace(state.spaces, parentSpace.id, (space) => {
          return {
            ...space,
            folders: space.folders.filter((f) => f.id !== action.folderId)
          }
        }),
        apiCommandsQueue,
        undoSteps
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
      if (typeof action.position !== "undefined") {
        newProps.position = action.position
      }

      const targetFolder = findFolderById(state, action.folderId)

      if (!targetFolder) {
        return showErrorReducer(`Updating folder not found`)
      }

      let apiCommandsQueue = state.apiCommandsQueue
      if (isNetworkAvailable(targetFolder)) {
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.UpdateFolder,
          body: {
            folderId: targetFolder.remoteId,
            folder: newProps
          }
        })
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateFolder,
        folderId: action.folderId,
        title: targetFolder.title,
        archived: targetFolder.archived,
        color: targetFolder.color,
        position: targetFolder.position
      }))

      return {
        ...state,
        spaces: updateFolder(state.spaces, action.folderId, newProps, !!newProps.position),
        apiCommandsQueue,
        undoSteps
      }
    }

    case Action.MoveFolder: {
      const targetFolderSpace = findSpaceById(state, action.targetSpaceId)
      const prevFolderSpace = findSpaceByFolderId(state, action.folderId)
      const movingFolder = findFolderById(state, action.folderId)
      if (!targetFolderSpace || !movingFolder || !prevFolderSpace) {
        return showErrorReducer(`Space or folder not found`)
      }

      const insertBeforeFolderIndex = targetFolderSpace.folders.findIndex(f => f.id === action.insertBeforeFolderId)
      const insertAfterFolderIndex = insertBeforeFolderIndex === -1 ? targetFolderSpace.folders.length - 1 : insertBeforeFolderIndex - 1

      // confusing naming detected
      const position = insertBetween(targetFolderSpace.folders[insertAfterFolderIndex]?.position ?? "", targetFolderSpace.folders[insertBeforeFolderIndex]?.position ?? "")

      let spaces: ISpace[]
      if (prevFolderSpace.id === targetFolderSpace.id) {
        spaces = updateFolder(state.spaces, action.folderId, { position }, true)
      } else {
        spaces = state.spaces.map(s => {
          if (s.id === prevFolderSpace.id) {
            return {
              ...s,
              folders: s.folders.filter((f) => f.id !== action.folderId)
            }
          } else if (s.id === targetFolderSpace.id) {
            return {
              ...s,
              folders: sortByPosition([...s.folders, {
                ...movingFolder,
                position
              }])
            }
          } else {
            return s
          }
        })
      }

      let apiCommandsQueue = state.apiCommandsQueue
      if (isNetworkAvailable(movingFolder)) {
        //todo !!!
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateFolder,
        folderId: movingFolder.id,
        position: movingFolder.position
      }))

      return {
        ...state,
        spaces,
        apiCommandsQueue,
        undoSteps
      }
    }

    /********************************************************
     * FOLDER ITEMS CRUD
     ********************************************************/

    case Action.CreateFolderItem: {
      const spaces = updateFolder(state.spaces, action.folderId, (folder) => {
        const items = addItemsToFolder([action.item], folder.items, action.insertBeforeItemId)
        return {
          ...folder,
          items
        }
      })

      let createdItem: IFolderItem = findItemById({ spaces }, action.item.id)!
      const targetFolder = findFolderById(state, action.folderId)
      let apiCommandsQueue = state.apiCommandsQueue
      if (isNetworkAvailable(targetFolder)) {
        //todo maybe we should not check presence of removeId at all here. and just let it be resolved async?
        // otherwise how I create folder with items in several actions?
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.CreateFolderItem, // TODO USE DIFFERENT ACTION TYPES !!!
          body: {
            folderId: targetFolder.remoteId,
            item: createdItem
          }
        })
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.DeleteFolderItems,
        itemIds: [action.item.id]
      }))

      return {
        ...state,
        spaces: spaces,
        apiCommandsQueue,
        undoSteps
      }
    }

    case Action.DeleteFolderItems: {
      let apiCommandsQueue = state.apiCommandsQueue
      let removingItems = action.itemIds.map(itemId => findItemById(state, itemId)!)
      if (isNetworkAvailable()) { // also decide what to do with validation of remoteId
        const itemRemoteIds = removingItems.map(item => item.remoteId!)
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.DeleteFolderItems,
          body: {
            folderItemIds: itemRemoteIds
          }
        })
      }

      // TODO: Undo for deleting folders for network should be different
      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.InitDashboard,
        spaces: state.spaces
      }))

      const deleteItemsFromFolders = (spaces: ISpace[], itemId: number): ISpace[] => {
        const folder = findFolderByItemId({ spaces }, itemId)
        if (folder) {
          return updateFolder(spaces, folder.id, (folder) => {
            return {
              ...folder,
              items: folder.items.filter((i) => i.id !== itemId)
            }
          })
        } else {
          return spaces
        }
      }

      return {
        ...state,
        spaces: action.itemIds.reduce(deleteItemsFromFolders, state.spaces),
        apiCommandsQueue,
        undoSteps
      }
    }

    case Action.UpdateFolderItem: {
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
      if (typeof action.favIconUrl !== "undefined") {
        newProps.favIconUrl = action.favIconUrl
      }

      const originalItem = findItemById(state, action.itemId)
      if (!originalItem) {
        console.error("Item was not found for item:", action.itemId)
        return showErrorReducer("Item was not found")
      }
      const folderId = findFolderByItemId(state, action.itemId)?.id
      if (!folderId) {
        console.error("Folder was not found for item:", action.itemId)
        return showErrorReducer("Folder was not found")
      }

      let apiCommandsQueue = state.apiCommandsQueue
      if (isNetworkAvailable(originalItem)) {
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.UpdateFolderItem,
          body: {
            folderItemId: originalItem.remoteId,
            item: newProps
          }
        })
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateFolderItem,
        itemId: originalItem.id,
        ...originalItem
      }))

      return {
        ...state,
        spaces: updateFolderItem(
          state.spaces,
          action.itemId,
          newProps,
          folderId
        ),
        apiCommandsQueue,
        undoSteps
      }
    }

    case Action.MoveFolderItems: {
      const targetFolder = findFolderById(state, action.targetFolderId)
      const movingItems = action.itemIds.map(itemId => findItemById(state, itemId)!)

      // Store the original folder IDs and positions for undo purposes
      // const originalPositions = movingItems.map(item => ({
      //   itemId: item.id,
      //   originalFolderId: findFolderByItemId(state, item.id)!.id,
      //   originalPosition: item.position
      // }))

      const spaceWithFolderWithRemovedItems: ISpace[] = movingItems.reduce((spaces, movingItem) => {
        const folder = findFolderByItemId({ spaces }, movingItem.id)!
        return updateFolder(spaces, folder.id, folder => ({
          ...folder,
          items: folder.items.filter(i => i.id !== movingItem.id)
        }))
      }, state.spaces)

      const spaces = updateFolder(spaceWithFolderWithRemovedItems, action.targetFolderId, folder => ({
        ...folder,
        items: addItemsToFolder(movingItems, folder.items, action.insertBeforeItemId)
      }))

      let apiCommandsQueue = state.apiCommandsQueue
      //todo decide what to do here

      if (isNetworkAvailable()) {
        if (!targetFolder?.remoteId || movingItems.some(item => !item.remoteId)) {
          return showErrorReducer("Network operation not available")
        }
        apiCommandsQueue = getCommandsQueue(state, {
          type: Action.MoveFolderItems,
          body: {
            folderId: targetFolder.remoteId,
            items: action.itemIds.map(itemId => {
              const item = findItemById({ spaces }, itemId)!
              return {
                folderItemId: item.remoteId!,
                position: item.position
              }
            })
          }
        })
      }

      //todo Generate undo actions to restore each item to its original folder and position
      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.InitDashboard,
        spaces: state.spaces
      }))

      return {
        ...state,
        spaces: spaces,
        apiCommandsQueue,
        undoSteps
      }
    }


    /********************************************************
     * WIDGETS CRUD
     ********************************************************/

    case Action.CreateWidget: {
      const currentSpace = findSpaceById(state, action.spaceId)
      if (!currentSpace) {
        return showErrorReducer(`Space not found`)
      }

      let topWidget = currentSpace.widgets?.at(-1)

      const newWidget: IWidget = {
        id: action.widgetId ?? genUniqLocalId(),
        widgetType: "Sticker",
        position: action.position ?? insertBetween(topWidget?.position ?? "", ""),
        pos: action.pos,
        content: Object.assign({
          contentType: "Sticker",
          text: "Sticky note",
          color: defaultStickerColor,
          fontSize: stickerSizeM
        }, action.content)
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.DeleteWidgets,
        widgetIds: [newWidget.id]
      }))

      return {
        ...state,
        spaces: state.spaces.map(space =>
          space.id === action.spaceId
            ? { ...space, widgets: sortByPosition([...(space.widgets || []), newWidget]) }
            : space
        ),
        undoSteps
      }
    }

    case Action.UpdateWidget: {
      const originalWidget = findWidgetById(state, action.widgetId)
      if (!originalWidget) {
        return showErrorReducer("Widget was not found")
      }

      const doSorting = !!action.position
      const updatedSpaces = state.spaces.map(space => ({
        ...space,
        widgets: sortByPosition(space.widgets?.map(widget =>
          widget.id === action.widgetId
            ? {
              ...widget,
              pos: action.pos !== undefined ? action.pos : widget.pos,
              position: action.position !== undefined ? action.position : widget.position,
              content: action.content ? {
                ...widget.content,
                ...action.content
              } : widget.content
            }
            : widget
        ) || [], doSorting)
      }))

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateWidget,
        widgetId: action.widgetId,
        position: originalWidget.position,
        pos: originalWidget.pos, // todo optimize
        content: originalWidget.content
      }))

      return {
        ...state,
        spaces: updatedSpaces,
        undoSteps
      }
    }

    case Action.DeleteWidgets: {
      // Capture the deleted widgets along with their original space IDs
      const deletedWidgetsBySpace: Array<{ spaceId: number, widget: IWidget }> = []
      const updatedSpaces = state.spaces.map(space => {
        const remainingWidgets = (space.widgets || []).filter(widget => {
          if (action.widgetIds.includes(widget.id)) {
            deletedWidgetsBySpace.push({ spaceId: space.id, widget })
            return false
          }
          return true
        })
        return { ...space, widgets: remainingWidgets }
      })

      console.log("deletedWidgetsBySpace", deletedWidgetsBySpace)

      // Register an undo action that will restore the deleted widgets
      const undoSteps = getUndoSteps(action, state, () => {
        return deletedWidgetsBySpace.map(deletedWidgetBySpace => ({
          type: Action.CreateWidget,
          spaceId: deletedWidgetBySpace.spaceId,
          widgetId: deletedWidgetBySpace.widget.id,
          ...deletedWidgetBySpace.widget
        }))
      })

      return {
        ...state,
        selectedWidgetIds: state.selectedWidgetIds.filter(id => !action.widgetIds.includes(id)),
        spaces: updatedSpaces,
        undoSteps
      }
    }

    case Action.BringToFront: {
      const currentSpace = findSpaceById(state, state.currentSpaceId)
      if (!currentSpace) {
        return showErrorReducer("Current space not found")
      }
      if (!currentSpace.widgets || currentSpace.widgets.length === 0) {
        return state
      }

      // Record original positions for undo
      const originalPositions = currentSpace.widgets
        .filter(widget => action.widgetIds.includes(widget.id))
        .map(widget => ({ widgetId: widget.id, position: widget.position }))

      let maxWidgetPosition = currentSpace.widgets.at(-1)?.position ?? ""
      const updatedWidgets = currentSpace.widgets.map(widget => {
        if (action.widgetIds.includes(widget.id)) {
          maxWidgetPosition = insertBetween(maxWidgetPosition, "") // compute a new position higher than current newPos
          return { ...widget, position: maxWidgetPosition }
        }
        return widget
      })

      // Register undo steps to revert the widget positions
      const undoSteps = getUndoSteps(action, state, () =>
        originalPositions.map(item => ({
          type: Action.UpdateWidget,
          widgetId: item.widgetId,
          position: item.position
        }))
      )

      return {
        ...state,
        spaces: updateSpace(state.spaces, currentSpace.id, {
          widgets: sortByPosition(updatedWidgets)
        }),
        undoSteps
      }
    }

    case Action.SendToBack: {
      const currentSpace = findSpaceById(state, state.currentSpaceId)
      if (!currentSpace) {
        return showErrorReducer("Current space not found")
      }
      if (!currentSpace.widgets || currentSpace.widgets.length === 0) {
        return state
      }

      // Record original positions for undo
      const originalPositions = currentSpace.widgets
        .filter(widget => action.widgetIds.includes(widget.id))
        .map(widget => ({ widgetId: widget.id, position: widget.position }))

      let minWidgetPosition = currentSpace.widgets.at(0)?.position ?? ""
      const updatedWidgets = currentSpace.widgets.map(widget => {
        if (action.widgetIds.includes(widget.id)) {
          minWidgetPosition = insertBetween("", minWidgetPosition) // compute a new position lower than current newPos
          return { ...widget, position: minWidgetPosition }
        }
        return widget
      })

      // Register undo steps to revert the widget positions
      const undoSteps = getUndoSteps(action, state, () =>
        originalPositions.map(item => ({
          type: Action.UpdateWidget,
          widgetId: item.widgetId,
          position: item.position
        }))
      )

      return {
        ...state,
        spaces: updateSpace(state.spaces, currentSpace.id, {
          widgets: sortByPosition(updatedWidgets)
        }),
        undoSteps
      }
    }

    case Action.DuplicateWidgets: {
      const newWidgets = action.widgetIds.map((widgetId) => {
        const currentSpace = findSpaceById(state, state.currentSpaceId)!
        const originalWidget = (currentSpace.widgets ?? [])
          .find((widget) => widget.id === widgetId)

        if (!originalWidget) {
          return null
        }

        return {
          ...originalWidget,
          id: genUniqLocalId(), // Generate a new unique ID
          pos: {
            point: {
              x: originalWidget.pos.point.x + 20, // Offset slightly to avoid overlap
              y: originalWidget.pos.point.y + 20
            }
          }
        }
      }).filter(Boolean) as IWidget[]

      if (newWidgets.length === 0) {
        return showErrorReducer("No valid widgets found to duplicate")
      }

      const spaces = updateSpace(state.spaces, state.currentSpaceId, (space) => ({
        ...space,
        widgets: [...space.widgets ?? [], ...newWidgets]
      }))

      // Create an undo action to remove the duplicated widgets
      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.DeleteWidgets,
        widgetIds: newWidgets.map(widget => widget.id)
      }))

      return {
        ...state,
        spaces,
        selectedWidgetIds: newWidgets.map(widget => widget.id), // Select new widgets
        undoSteps
      }
    }

    /********************************************************
     * Canvas API (dont send updates to server)
     ********************************************************/

    case Action.SelectWidgets: {

      let selectedWidgetIds = state.selectedWidgetIds
      if (!isArraysEqual(state.selectedWidgetIds, action.widgetIds)) {
        selectedWidgetIds = action.widgetIds
      }

      return {
        ...state,
        selectedWidgetIds,
        editingWidgetId: undefined
      }
    }

    case Action.SetEditingWidget: {
      return {
        ...state,
        editingWidgetId: action.widgetId,
        selectedWidgetIds: action.widgetId ? [action.widgetId] : state.selectedWidgetIds
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
          spaces: updateFolderItem(state.spaces, action.localId, {
            remoteId: action.remoteId
          })
        }
      } else if (action.entityType === "folder") {
        return {
          ...state,
          spaces: updateFolder(state.spaces, action.localId, {
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

// There is no need in callback. I added only for better readability.
export function mergeStepsInHistory(callback: (historyStepId: number) => void): void {
  callback(genNextRuntimeId())
}

function getUndoSteps(currentAction: HistoryActionPayload, state: IAppState, callback: () => ActionPayload | ActionPayload[]): UndoStep[] {
  const MAX_HISTORY_LENGTH = 50

  if (currentAction.byUndo) {
    // In that case no need to add new step in history, just return current undo actions
    return state.undoSteps
  } else {

    let actionOrActions = callback()
    if (!Array.isArray(actionOrActions)) {
      actionOrActions = [actionOrActions]
    }
    actionOrActions.forEach(a => a.byUndo = true)

    const existingStep = state.undoSteps.find(step => step.id === currentAction.historyStepId)
    if (existingStep) {
      existingStep.subSteps.push(...actionOrActions)
      // we return the same instance of array, but it should work because it is not used in ReactComponents
      return state.undoSteps
    } else {
      const newUndoStep = {
        id: currentAction.historyStepId ?? genNextRuntimeId(),
        subSteps: actionOrActions
      }
      const updatedUndoActions = [...state.undoSteps, newUndoStep]
      return updatedUndoActions.length > MAX_HISTORY_LENGTH ? updatedUndoActions.slice(-MAX_HISTORY_LENGTH) : updatedUndoActions
    }
  }
}

