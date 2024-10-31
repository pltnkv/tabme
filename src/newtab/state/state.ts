import { ActionDispatcher } from "./actions"
import { ColorTheme, IFolder, IFolderItem, IFolderItemToCreate } from "../helpers/types"
import { ISavingAppState } from "./storage"
import { loadFromNetwork } from "../../api/api"
import Tab = chrome.tabs.Tab
import HistoryItem = chrome.history.HistoryItem

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

export type APICommand = {
  id: string
  status: string
  apiAction: string
  body: any
}

export type IAppState = {
  appLoaded: boolean
  folders: IFolder[];
  tabs: Tab[];
  currentWindowId: number | undefined
  historyItems: HistoryItem[];
  notification: {
    visible: boolean;
    message: string;
    isError?: boolean;
    button?: { onClick?: () => void; text: string };
  };
  lastActiveTabIds: number[]
  search: string;
  itemInEdit: undefined | number, //can be item or folder
  showArchived: boolean;
  showNotUsed: boolean;
  openBookmarksInNewTab: boolean;
  sidebarCollapsed: boolean; // stored
  colorTheme?: ColorTheme; // stored
  sidebarHovered: boolean; // for hover effects
  sidebarItemDragging: boolean // this flag is not used. But decided to not delete it in case need it in the future
  betaMode: boolean
  page: "default" | "import",
  stat: IAppStat | undefined
  achievements: IAppAchievements

  // API
  apiCommandsQueue: APICommandPayloadFull[],
  apiCommandId?: number
  apiLastError?: string

  // undo actions
  undoActions: ActionPayload[]
};

let initState: IAppState = {
  appLoaded: false, // prevents sidebar flickering during loading
  folders: [],
  historyItems: [],
  tabs: [],
  currentWindowId: undefined,
  notification: { visible: false, message: "" },
  lastActiveTabIds: [],
  search: "",
  itemInEdit: undefined,
  showArchived: false,
  showNotUsed: false,
  openBookmarksInNewTab: false,
  sidebarCollapsed: false, //should be named "sidebarCollapsable"
  sidebarHovered: false,
  sidebarItemDragging: false,
  betaMode: loadFromNetwork(),
  page: "default",
  stat: {
    sessionNumber: 0,
    firstSessionDate: 0,
    lastVersion: ""
  },
  apiCommandsQueue: [],
  undoActions: [],
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
  ToggleDarkMode = "toggle-dark-mode",
  UpdateShowArchivedItems = "update-show-hidden-items",
  UpdateShowNotUsedItems = "update-show-not-used-items",
  UpdateAppState = "update-app-state", // generic way to set simple value into AppState

  // CRUD OPERATIONS — causes saving on server
  CreateFolder = "create-folder",
  DeleteFolder = "delete-folder",
  UpdateFolder = "update-folder",
  MoveFolder = "move-folder",

  CreateFolderItem = "create-folder-item",
  DeleteFolderItems = "delete-folder-items",
  UpdateFolderItem = "update-folder-item",
  MoveFolderItems = "move-folder-items",

  // API HELPERS
  APICommandResolved = "api-command-resolved",
  APIConfirmEntityCreated = "api-confirm-entity-created",
}

export type APICommandPayload = (
  | { type: Action.CreateFolder; body: { folder: Partial<IFolder> } }
  | { type: Action.DeleteFolder; body: { folderId: number } }
  | { type: Action.UpdateFolder; body: { folderId: number, folder: Partial<IFolder> } }
  | { type: Action.MoveFolder; body: { folderId: number, position: string } }

  | { type: Action.CreateFolderItem; body: { folderId: number, item: IFolderItem } }
  | { type: Action.DeleteFolderItems; body: { folderItemIds: number[] } }
  | { type: Action.UpdateFolderItem; body: { folderItemId: number, item: Partial<IFolderItem> } }
  | { type: Action.MoveFolderItems; body: { folderId: number, items: { folderItemId: number, position: string }[] } }
  )

export type APICommandPayloadFull = APICommandPayload & { commandId: number, rollbackState: IAppState }

export type ActionPayload = (
  | { type: Action.Undo, dispatch: ActionDispatcher }
  | { type: Action.ShowNotification; message: string; button?: { onClick?: () => void; text: string }; isError?: boolean }
  | { type: Action.HideNotification }
  | { type: Action.UpdateSearch; value: string }
  | { type: Action.InitFolders; folders?: IFolder[], sidebarCollapsed?: boolean, ignoreSaving?: boolean, init?: boolean }
  | { type: Action.UpdateTab; tabId: number; opt: Tab; }
  | { type: Action.CloseTabs; tabIds: number[] }
  | { type: Action.SetTabsAndHistory; tabs?: Tab[]; history?: HistoryItem[] }
  | { type: Action.ToggleDarkMode }
  | { type: Action.UpdateShowArchivedItems; value: boolean }
  | { type: Action.UpdateShowNotUsedItems; value: boolean }
  | { type: Action.UpdateAppState; newState: Partial<IAppState> }

  | { type: Action.CreateFolder; newFolderId?: number; title?: string; items?: IFolderItemToCreate[]; color?: string; } // todo support items here
  | { type: Action.DeleteFolder; folderId: number; }
  | { type: Action.UpdateFolder; folderId: number; title?: string; color?: string; archived?: boolean; twoColumn?: boolean; }
  | { type: Action.MoveFolder; folderId: number; insertBeforeFolderId: number|undefined; }

  | { type: Action.CreateFolderItem; folderId: number; itemIdInsertBefore: number | undefined; item: IFolderItemToCreate; }
  | { type: Action.DeleteFolderItems; itemIds: number[] }
  | { type: Action.UpdateFolderItem; itemId: number; title?: string; archived?: boolean; url?: string }
  | { type: Action.MoveFolderItems; itemIds: number[]; targetFolderId: number; itemIdInsertBefore: number | undefined; }

  | { type: Action.APICommandResolved; commandId: number, }
  | { type: Action.APIConfirmEntityCreated; localId: number; remoteId: number; entityType: "folder" | "bookmark" }
  ) & { byUndo?: boolean };