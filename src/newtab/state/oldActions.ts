import { getGlobalAppState } from "../components/App"
import { Action, ActionPayload, IAppState } from "./state"
import { unselectAll } from "../helpers/selectionUtils"
import { saveStateThrottled } from "./storage"
import { ColorTheme, IFolder, IFolderItem } from "../helpers/types"
import { applyTheme, findFolderById, findFolderByItemId, findItemById, genUniqId, getRandomHEXColor } from "../helpers/utils"
import { insertFolderItemFake, updateFolder, updateFolderItem } from "./actions"

let prevState: IAppState | undefined

export function wrapIntoTransaction(callback: () => void): void {
  let _prevState = { ...getGlobalAppState() }
  callback()
  prevState = _prevState
}

export function oldStateReducer(state: IAppState, action: ActionPayload): IAppState {
  unselectAll()
  const newState = stateReducer0(state, action)
  console.log("[old action]:", action, " [new state]:", newState)
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
  switch (action.type) {

    case Action.UpdateAppState: {
      return {
        ...state,
        ...action.newState
      }
    }

    case Action.Undo: {
      if (prevState) {
        let _prevState = prevState
        prevState = undefined
        return {
          ..._prevState,
          notification: stateReducer0(state, { type: Action.ShowNotification, message: "Undo" }).notification
        }
      } else {
        return stateReducer0(state, { type: Action.ShowNotification, message: "Nothing to undo" })
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
      console.log("Action.InitFolders  ... ", state)

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
      return { ...state, showArchived: action.value }
    }

    case Action.UpdateShowNotUsedItems: {
      return { ...state, showNotUsed: action.value }
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

    case Action.CreateFolder: {
      return {
        ...state,
        folders: [
          ...state.folders,
          {
            id: action.newFolderId ?? genUniqId(),
            title: action.title ?? "New folder",
            items: insertFolderItemFake(action.items ?? []),
            color: action.color ?? getRandomHEXColor()
          }
        ]
      }
    }

    case Action.DeleteFolder: {
      return {
        ...state,
        folders: state.folders.filter((f) => f.id !== action.folderId)
      }
    }

    case Action.MoveFolder: {
      const newFolders = [...state.folders]
      const targetFolderIndex = newFolders.findIndex(f => f.id === action.folderId)
      let newIndex: number
      if (action.insertBeforeFolderId === undefined) {
        newIndex = newFolders.length - 1
      } else {
        const insertBeforeFolderIndex = newFolders.findIndex(f => f.id === action.insertBeforeFolderId)
        newIndex = insertBeforeFolderIndex < targetFolderIndex ? insertBeforeFolderIndex : insertBeforeFolderIndex - 1
      }

      if (targetFolderIndex < 0 || targetFolderIndex >= newFolders.length || newIndex < 0 || newIndex >= newFolders.length) {
        throw new Error(`Invalid indexes when swap folders ${targetFolderIndex} ${newIndex}`)
      }

      // Swap elements using a temporary variable
      const temp = newFolders[targetFolderIndex]
      newFolders.splice(targetFolderIndex, 1) // remove from old position
      newFolders.splice(newIndex, 0, temp) // insert into new position

      return { ...state, folders: newFolders }
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

      return {
        ...state,
        folders: updateFolder(state.folders, action.folderId, newProps)
      }
    }

    case Action.UpdateFolderItem: {
      //todo change
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

      return {
        ...state,
        folders: updateFolderItem(
          state.folders,
          action.itemId,
          newProps,
          folderId
        )
      }
    }

    case Action.DeleteFolderItems: {
      //todo change
      const deleteItemsFromFolders = (_state: IAppState, itemId: number) => {
        const folder = findFolderByItemId(_state, itemId)
        if (folder) {
          return {
            ..._state,
            folders: updateFolder(_state.folders, folder.id, (folder) => {
              return {
                ...folder,
                items: folder.items.filter((i) => i.id !== itemId)
              }
            })
          }
        } else {
          return _state
        }
      }

      return action.itemIds.reduce(deleteItemsFromFolders, state)
    }

    case Action.CreateFolderItem: {
      return {
        ...state,
        folders: updateFolder(state.folders, action.folderId, (folder) => {
          if (action.itemIdInsertBefore === undefined) {
            return { //push last
              ...folder,
              items: insertFolderItemFake([...folder.items, action.item])
            }
          } else {
            const targetIndex = folder.items.findIndex(
              (item) => item.id === action.itemIdInsertBefore
            )
            return {
              ...folder,
              items: insertFolderItemFake([
                ...folder.items.slice(0, targetIndex),
                action.item,
                ...folder.items.slice(targetIndex)
              ])
            }
          }
        })
      }
    }

    case Action.MoveFolderItems: {
      return action.itemIds.reduce((_state, itemId) => {
        const targetItem = findItemById(_state, itemId)
        if (targetItem) {
          return pipeActions(_state,
            {
              type: Action.DeleteFolderItems,
              itemIds: [itemId]
            },
            {
              type: Action.CreateFolderItem,
              folderId: action.targetFolderId,
              itemIdInsertBefore: action.itemIdInsertBefore,
              item: targetItem
            })
        } else {
          return _state
        }
      }, state)

    }

    default:
      throw new Error("Unknown action")
  }
}

function pipeActions(state: IAppState, ...actions: ActionPayload[]): IAppState {
  return actions.reduce(stateReducer0, state)
}
