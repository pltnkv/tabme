import { ColorTheme, IFolder, IFolderItem } from "./helpers/types"
import { applyTheme, findFolderByItemId, findItemById, genUniqId, getRandomHEXColor, mergeObjects, throttle } from "./helpers/utils"
import HistoryItem = chrome.history.HistoryItem
import Tab = chrome.tabs.Tab
import { createContext } from "react"
import { unselectAll } from "./helpers/selectionUtils"
import { getGlobalAppState } from "./components/App"

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
  itemInEdit: undefined | number, //can be item or folder
  showArchived: boolean;
  showNotUsed: boolean;
  sidebarCollapsed: boolean; // stored
  colorTheme?: ColorTheme; // stored
  sidebarHovered: boolean; // for hover effects
  sidebarItemDragging: boolean // this flag is not used. But decided to not delete it in case need it in the future
  devMode: boolean
  page: "default" | "import",
  stat: IAppStat | undefined
  achievements: IAppAchievements
};

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

export function setInitAppState(savedState: ISavingAppState): void {
  initState = { ...initState, ...savedState }
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
  CloseTabs = "close-tab",
  SetTabsAndHistory = "set-tab-and-history",
  Reset = "reset",
  ToggleDarkMode = "toggle-dark-mode",
  UpdateShowArchivedItems = "update-show-hidden-items",
  UpdateShowNotUsedItems = "update-show-not-used-items",
  CreateFolder = "create-folder",
  DeleteFolder = "delete-folder",
  MoveFolder = "move-folder",
  UpdateFolderTitle = "update-folder-title",
  UpdateFolderColumnMode = "update-folder-column-mode",
  UpdateFolderColor = "update-folder-color",
  UpdateFolderArchived = "update-folder-archived",
  UpdateFolderItem = "update-folder-item",
  DeleteFolderItem = "delete-folder-item",
  AddNewBookmarkToFolder = "add-new-bookmark-to-folder",
  MoveBookmarkToFolder = "move-bookmark-to-folder",
  UpdateAppState = "update-app-state", // generic way to set simple value into AppState
}

export type FoldersAction =
  | { type: Action.Undo, dispatch: ActionDispatcher }
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
  | { type: Action.CloseTabs; tabIds: number[] }
  | { type: Action.SetTabsAndHistory; tabs?: Tab[]; history?: HistoryItem[] }
  | { type: Action.Reset }
  | { type: Action.ToggleDarkMode }
  | { type: Action.UpdateShowArchivedItems; value: boolean }
  | { type: Action.UpdateShowNotUsedItems; value: boolean }
  | { type: Action.CreateFolder; newFolderId?: number, title?: string, items?: IFolderItem[], color?: string }
  | { type: Action.DeleteFolder; folderId: number }
  | { type: Action.MoveFolder; folderId: number; insertBeforeFolderId: number }
  | { type: Action.UpdateFolderTitle; folderId: number; title: string }
  | { type: Action.UpdateFolderColor; folderId: number; color: string }
  | { type: Action.UpdateFolderArchived; folderId: number; archived: boolean }
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
  | { type: Action.DeleteFolderItem; itemIds: number[] }
  | {
  type: Action.AddNewBookmarkToFolder;
  folderId: number;
  itemIdInsertAfter: number | undefined;
  item: IFolderItem;
} | {
  type: Action.MoveBookmarkToFolder;
  targetItemId: number;
  targetFolderId: number;
  itemIdInsertAfter: number | undefined;
} | {
  type: Action.UpdateAppState
  newState: Partial<IAppState>
};

export type ActionDispatcher = (action: FoldersAction) => void;

let prevState: IAppState | undefined

export function wrapIntoTransaction(callback:() => void): void {
  let _prevState = {...getGlobalAppState()}
  callback()
  prevState = _prevState
}

export function stateReducer(state: IAppState, action: FoldersAction): IAppState {
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
        let _prevState = prevState
        prevState = undefined
        requestAnimationFrame(() => {
          action.dispatch({ type: Action.ShowNotification, message: "Undo", dispatch: action.dispatch })
        })
        return {..._prevState}
      } else {
        return stateReducer0(state, { type: Action.ShowNotification, message: "Nothing to undo", dispatch: action.dispatch })
      }
    }

    case Action.ShowNotification: {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout)
        notificationTimeout = undefined
      }
      notificationTimeout = window.setTimeout(() => {
        action.dispatch({ type: Action.HideNotification })
      }, 3500)
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

    case Action.ToggleDarkMode: {
      const curMode = state.colorTheme
      const options: ColorTheme[] = ["light", "dark", "system"]
      const curModeIndex = options.indexOf(curMode)
      const nextMode = options[curModeIndex + 1 === 3 ? 0 : curModeIndex + 1]
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
            return mergeObjects(t, action.opt)
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
      return mergeObjects(state, { tabs: action.tabs, historyItems: action.history })
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
      return {
        ...state,
        folders: updateFolder(state.folders, action.folderId, {
          title: action.title
        })
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

    case Action.UpdateFolderArchived: {
      return {
        ...state,
        folders: updateFolder(state.folders, action.folderId, {
          archived: action.archived
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

    case Action.AddNewBookmarkToFolder: {
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

    case Action.MoveBookmarkToFolder: {
      const targetItem = findItemById(state, action.targetItemId)
      if (targetItem) {
        return pipeActions(state,
          {
            type: Action.DeleteFolderItem,
            itemIds: [action.targetItemId]
          },
          {
            type: Action.AddNewBookmarkToFolder,
            folderId: action.targetFolderId,
            itemIdInsertAfter: action.itemIdInsertAfter,
            item: targetItem
          })
      } else {
        return state
      }
    }

    default:
      throw new Error("Unknown action")
  }
}

//////////////////////////////////////////////////////////////////////
// UTILS
//////////////////////////////////////////////////////////////////////

function pipeActions(state: IAppState, ...actions: FoldersAction[]): IAppState {
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

//////////////////////////////////////////////////////////////////////
// SAVING STATE AND BROADCASTING CHANGES
//////////////////////////////////////////////////////////////////////

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
  "colorTheme": "light", // todo I don't use system because it's not ready to used by default
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
