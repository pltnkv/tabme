import { IFolder, IFolderItem } from "./helpers/types"
import { findFolderByItemId, genUniqId, getRandomHEXColor, throttle } from "./helpers/utils"
import HistoryItem = chrome.history.HistoryItem
import Tab = chrome.tabs.Tab
import { createContext } from "react"

export const DispatchContext = createContext<{ dispatch: ActionDispatcher }>(null!)

export type IAppStat = {
  sessionNumber: number
  firstSessionDate: number
  lastVersion: string // need to update
}

export type IAppAchievements = {
  // folders
  folderCreated: number
  folderRenamed: number
  folderColorChanged: number
  folderDeleted: number
  folderDragged: number

  // bookmark items
  itemDraggedFromSidebar: number
  itemRenamed: number
  itemCopiedUrl: number
  itemEditedUrl: number
  itemArchived: number
  itemUnarchived: number

  // sections
  sectionAddedFromSidebar: number
  sectionAddedFromFolder: number

  // cleanup
  cleanupUsed: number

  // showArchived
  archivedItemsShowed: number

  // todo add more
}

export type IAppState = {
  folders: IFolder[];
  tabs: Tab[];
  historyItems: HistoryItem[];
  notification: {
    visible: boolean;
    message: string;
    button?: { onClick?: () => void; text: string };
  };
  lastActiveTabIds: number[]
  search: string;
  itemInEdit: undefined | number,
  showArchived: boolean;
  showNotUsed: boolean;
  sidebarCollapsed: boolean; // stored
  sidebarHovered: boolean; // for hover effects
  sidebarItemDragging: boolean // this flag is not used. But decided to not delete it in case need it in the future
  devMode: boolean
  page: "default" | "import",
  stat: IAppStat | undefined
  achievements: IAppAchievements
};

export function setInitAppState(savedState: ISavingAppState): void {
  initState = { ...initState, ...savedState }
}

let initState: IAppState = {
  folders: [],
  historyItems: [],
  tabs: [],
  notification: { visible: false, message: "" },
  lastActiveTabIds: [],
  search: "",
  itemInEdit: undefined,
  showArchived: false,
  showNotUsed: false,
  sidebarCollapsed: false, //should be named "sidebarCollapsable"
  sidebarHovered: false,
  sidebarItemDragging: false,
  devMode: false, //process.env.NODE_ENV === "development",
  page: "default",
  stat: {
    sessionNumber: 0,
    firstSessionDate: 0,
    lastVersion: ""
  },
  achievements: {
    folderCreated: 0,
    folderRenamed: 0,
    folderColorChanged: 0,
    folderDeleted: 0,
    folderDragged: 0,

    // bookmark items
    itemDraggedFromSidebar: 0,
    itemRenamed: 0,
    itemCopiedUrl: 0,
    itemEditedUrl: 0,
    itemArchived: 0,
    itemUnarchived: 0,

    // sections
    sectionAddedFromSidebar: 0,
    sectionAddedFromFolder: 0,

    // cleanup
    cleanupUsed: 0,

    // showArchived
    archivedItemsShowed: 0
  }
}

export function getInitAppState(): IAppState {
  return initState
}

export enum Action {
  InitFolders = "init-folders",
  Undo = "undo",
  ShowNotification = "show-notification",
  HideNotification = "hide-notification",
  UpdateSearch = "update-search",
  UpdateTab = "tab-update",
  CloseTab = "close-tab",
  SetTabsAndHistory = "set-tab-and-history",
  Reset = "reset",
  UpdateShowArchivedItems = "update-show-hidden-items",
  UpdateShowNotUsedItems = "update-show-not-used-items",
  CreateFolder = "create-folder",
  DeleteFolder = "delete-folder",
  MoveFolder = "move-folder",
  UpdateFolderTitle = "update-folder-title",
  UpdateFolderColumnMode = "update-folder-column-mode",
  UpdateFolderColor = "update-folder-color",
  UpdateFolderItem = "update-folder-item",
  DeleteFolderItem = "delete-folder-item",
  AddBookmarkToFolder = "add-bookmark-to-folder",
  UpdateAppState = "update-app-state", // generic way to set simple value into AppState
}

export type FoldersAction =
  | { type: Action.Undo }
  | {
  type: Action.ShowNotification;
  message: string;
  button?: { onClick?: () => void; text: string };
  dispatch: ActionDispatcher;
}
  | { type: Action.HideNotification }
  | { type: Action.UpdateSearch; value: string }
  | { type: Action.InitFolders; folders?: IFolder[], sidebarCollapsed?: boolean, ignoreSaving?: boolean, init?: boolean }
  | {
  type: Action.UpdateTab;
  tabId: number;
  opt: { url?: string; favIconUrl?: string; title?: string };
}
  | { type: Action.CloseTab; tabId: number }
  | { type: Action.SetTabsAndHistory; tabs: Tab[]; history: HistoryItem[] }
  | { type: Action.Reset }
  | { type: Action.UpdateShowArchivedItems; value: boolean }
  | { type: Action.UpdateShowNotUsedItems; value: boolean }
  | { type: Action.CreateFolder; newFolderId?: number, title?: string, items?: IFolderItem[], color?: string }
  | { type: Action.DeleteFolder; folderId: number }
  | { type: Action.MoveFolder; folderId: number; insertBeforeFolderId: number }
  | { type: Action.UpdateFolderTitle; folderId: number; }
  | { type: Action.UpdateFolderColor; folderId: number; color: string }
  | {
  type: Action.UpdateFolderColumnMode;
  folderId: number;
  twoColumn: boolean;
} | {
  type: Action.UpdateFolderItem;
  folderId: number;
  itemId: number;
  newTitle?: string;
  archived?: boolean;
  url?: string
}
  | { type: Action.DeleteFolderItem; itemId: number }
  | {
  type: Action.AddBookmarkToFolder;
  folderId: number;
  itemIdInsertAfter: number | undefined;
  item: IFolderItem;
} | {
  type: Action.UpdateAppState
  newState: Partial<IAppState>
};

export type ActionDispatcher = (action: FoldersAction) => void;

let prevState: IAppState | undefined

export function stateReducer(state: IAppState, action: FoldersAction): IAppState {
  const newState = stateReducer0(state, action)
  console.log("action and newState:", action, newState)
  if (state.folders !== newState.folders
    || state.sidebarCollapsed !== newState.sidebarCollapsed
    || state.stat != newState.stat) {
    prevState = state
    if (action.type !== Action.InitFolders || !action.ignoreSaving) {
      saveStateThrottled(newState)
    }
  }
  return newState
}

const bc = new BroadcastChannel("sync-state-channel")

export function getBC() {
  return bc
}

function saveState(appState: IAppState): void {
  const savingState: any = {}
  savingStateKeys.forEach(key => {
    savingState[key] = appState[key as SavingStateKeys]
  })

  chrome.storage.local.set(savingState, () => {
    console.log("SAVED")
    bc.postMessage({ type: "folders-updated" })
  })
}

let notificationTimeout: number | undefined
export const saveStateThrottled = throttle(saveState, 1000)

const savingStateDefaultValues = {
  "folders": [],
  "sidebarCollapsed": false,
  "stat": undefined
}
type SavingStateKeys = keyof typeof savingStateDefaultValues
const savingStateKeys = Object.keys(savingStateDefaultValues)

export type ISavingAppState = {
  [key in SavingStateKeys]: IAppState[key]
}

export function getStateFromLS(callback: (state: ISavingAppState) => void): void {
  chrome.storage.local.get(savingStateKeys, (res) => {
    for (const resKey in res) {
      if (typeof res[resKey] === "undefined" && savingStateKeys.includes(resKey)) {
        res[resKey] = savingStateDefaultValues[resKey as SavingStateKeys]
      }
    }
    callback(res as ISavingAppState)
  })
}

function stateReducer0(state: IAppState, action: FoldersAction): IAppState {
  switch (action.type) {

    case Action.UpdateAppState: {
      return {
        ...state,
        ...action.newState
      }
    }

    case Action.Undo: {
      if (prevState) {
        return prevState
      } else {
        alert("Undo not available yet")
        return state
      }
    }

    case Action.ShowNotification: {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout)
        notificationTimeout = undefined
      }
      notificationTimeout = window.setTimeout(() => {
        action.dispatch({ type: Action.HideNotification })
      }, 4000)
      return {
        ...state,
        notification: {
          visible: true,
          message: action.message,
          button: action.button
        }
      }
    }

    case Action.HideNotification: {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout)
        notificationTimeout = undefined
      }
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

    case Action.Reset: {
      return { ...state, folders: [] }
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
            return {
              ...t,
              ...action.opt
            }
          } else {
            return t
          }
        })
      }
    }

    case Action.CloseTab: {
      chrome.tabs.remove(action.tabId)
      return {
        ...state,
        tabs: state.tabs.filter(t => t.id !== action.tabId)
      }
    }

    case Action.SetTabsAndHistory: {
      return { ...state, tabs: action.tabs, historyItems: action.history }
    }

    case Action.CreateFolder: {
      return {
        ...state,
        folders: [
          ...state.folders,
          {
            id: action.newFolderId ?? genUniqId(),
            title: action.title ?? "New folder",
            items: action.items ?? [],
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
      const insertBeforeFolderIndex = newFolders.findIndex(f => f.id === action.insertBeforeFolderId)
      const newIndex = insertBeforeFolderIndex < targetFolderIndex ? insertBeforeFolderIndex : insertBeforeFolderIndex - 1

      if (targetFolderIndex < 0 || targetFolderIndex >= newFolders.length || newIndex < 0 || newIndex >= newFolders.length) {
        throw new Error(`Invalid indexes when swap folders ${targetFolderIndex} ${newIndex}`)
      }

      // Swap elements using a temporary variable
      const temp = newFolders[targetFolderIndex]
      newFolders.splice(targetFolderIndex, 1) // remove from old position
      newFolders.splice(newIndex, 0, temp) // insert into new position

      return { ...state, folders: newFolders }
    }

    case Action.UpdateFolderTitle: {
      const currentFolderTitle = state.folders.find(f => f.id === action.folderId)?.title
      const newTitle = prompt("Enter new title", currentFolderTitle)
      if (newTitle) {
        return {
          ...state,
          folders: updateFolder(state.folders, action.folderId, {
            title: newTitle
          })
        }
      } else {
        return state
      }
    }

    case Action.UpdateFolderColor: {
      return {
        ...state,
        folders: updateFolder(state.folders, action.folderId, {
          color: action.color
        })
      }
    }

    case Action.UpdateFolderColumnMode: {
      return {
        ...state,
        folders: updateFolder(state.folders, action.folderId, {
          twoColumn: action.twoColumn
        })
      }
    }

    case Action.UpdateFolderItem: {
      const newProps: IFolderItem = {} as any
      if (typeof action.newTitle !== "undefined") {
        newProps.title = action.newTitle
      }
      if (typeof action.archived !== "undefined") {
        newProps.archived = action.archived
      }
      if (typeof action.url !== "undefined") {
        newProps.url = action.url
      }
      return {
        ...state,
        folders: updateFolderItem(
          state.folders,
          action.folderId,
          action.itemId,
          newProps
        )
      }
    }

    case Action.DeleteFolderItem: {
      const folder = findFolderByItemId(state, action.itemId)
      if (folder) {
        return {
          ...state,
          folders: updateFolder(state.folders, folder.id, (folder) => {
            return {
              ...folder,
              items: folder.items.filter((i) => i.id !== action.itemId)
            }
          })
        }
      } else {
        return state
      }
    }

    case Action.AddBookmarkToFolder: {
      return {
        ...state,
        folders: updateFolder(state.folders, action.folderId, (folder) => {
          if (action.itemIdInsertAfter === undefined) {
            return { //push last
              ...folder,
              items: [...folder.items, action.item]
            }
          } else {
            const targetIndex = folder.items.findIndex(
              (item) => item.id === action.itemIdInsertAfter
            )
            return {
              ...folder,
              items: [
                ...folder.items.slice(0, targetIndex),
                action.item,
                ...folder.items.slice(targetIndex)
              ]
            }
          }
        })
      }
    }

    default:
      throw new Error("Unknown action")
  }
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
  folderId: number,
  itemId: number,
  newItemProps: Partial<IFolderItem>
): IFolder[] {
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

// UTILS

export function getFolderById(state: IAppState, folderId: number): IFolder | undefined {
  return state.folders.find(f => f.id === folderId)
}

export function canShowArchived(appState: IAppState) {
  return appState.showArchived || appState.search.length > 0
}

export function executeCustomAction(actionUrl: string, dispatch: ActionDispatcher): void {
  const cAction: string = actionUrl.split("//")[1] || ""
  if (cAction === "import-bookmarks") {
    // open bookmarks importing
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } })
  }
}