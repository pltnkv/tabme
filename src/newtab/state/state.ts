import { ActionDispatcher } from "./actions"
import { ColorTheme, IFolder, IFolderItem, IFolderItemToCreate, ISpace } from "../helpers/types"
import { ISavingAppState } from "./storage"
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

export type UndoStep = {
  id: number,
  subSteps: ActionPayload[]
}

export type IAppState = {
  spaces: ISpace[], // Stored in LS
  currentSpaceId: number // Stored in LS

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
  itemInEdit: undefined | number, //can be item or folder or space
  showArchived: boolean; // Stored in LS
  showNotUsed: boolean; // Stored in LS
  openBookmarksInNewTab: boolean;
  sidebarCollapsed: boolean; // Stored in LS
  colorTheme?: ColorTheme; // Stored in LS
  sidebarHovered: boolean; // for hover effects
  betaMode: boolean // IT MEANS SPACES & NETWORK ARE ENABLED
  page: "default" | "import" | "welcome",
  stat: IAppStat | undefined // Stored in LS
  achievements: IAppAchievements  // Stored in LS
  loaded: boolean

  // API
  apiCommandsQueue: APICommandPayloadFull[],
  apiCommandId?: number
  apiLastError?: string

  // undo actions (some single actions can be reverted only by set of actions)
  undoSteps: UndoStep[]

  // saved data format version
  version: number

  /**
   * depracated. DONT USE
   */
  folders: IFolder[]
  hiddenFeatureIsEnabled: boolean
};

let initState: IAppState = {
  version: 2,
  folders: [],
  spaces: [],
  currentSpaceId: -1,
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
  betaMode: false,
  loaded: false,
  page: "default",
  stat: {
    sessionNumber: 0,
    firstSessionDate: 0,
    lastVersion: ""
  },
  hiddenFeatureIsEnabled: false,
  apiCommandsQueue: [],
  undoSteps: [],
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
  InitDashboard = "init-dashboard",
  Undo = "undo",
  ShowNotification = "show-notification", // todo !!!! fix. error can be overriding by next normal message. not clear for user
  HideNotification = "hide-notification",
  UpdateSearch = "update-search",
  UpdateTab = "tab-update",
  CloseTabs = "close-tab",
  SetTabsOrHistory = "set-tab-or-history",
  ToggleDarkMode = "toggle-dark-mode",
  UpdateShowArchivedItems = "update-show-hidden-items",
  UpdateShowNotUsedItems = "update-show-not-used-items",
  SelectSpace = "select-space",
  SwipeSpace = "swipe-space",
  FixBrokenIcons = "fix-broken-icons",
  UpdateAppState = "update-app-state", // generic way to set simple value into AppState

  // CRUD OPERATIONS — causes saving on server
  CreateSpace = "create-space",
  DeleteSpace = "delete-space",
  UpdateSpace = "update-space",
  MoveSpace = "move-space",

  /**
   * Use only with helper createFolder()
   */
  CreateFolder = "create-folder",
  DeleteFolder = "delete-folder",
  UpdateFolder = "update-folder",
  MoveFolder = "move-folder",

  CreateFolderItem = "create-folder-item",
  CreateFolderItems = "create-folder-items",
  DeleteFolderItems = "delete-folder-items",
  UpdateFolderItem = "update-folder-item",
  MoveFolderItems = "move-folder-items",

  SaveBookmarksToCloud = "save-bookmarks-to-cloud",

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
export type HistoryActionPayload = { byUndo?: boolean, historyStepId?: number }
export type ActionPayload = (
  | { type: Action.Undo, dispatch: ActionDispatcher }
  | { type: Action.ShowNotification; message: string; button?: { onClick?: () => void; text: string }; isError?: boolean }
  | { type: Action.HideNotification }
  | { type: Action.UpdateSearch; value: string }
  | { type: Action.InitDashboard; spaces?: ISpace[], sidebarCollapsed?: boolean, saveToLS?: boolean, init?: boolean }
  | { type: Action.UpdateTab; tabId: number; opt: Tab; }
  | { type: Action.CloseTabs; tabIds: number[] }
  | { type: Action.SetTabsOrHistory; tabs?: Tab[]; history?: HistoryItem[] }
  | { type: Action.ToggleDarkMode }
  | { type: Action.UpdateShowArchivedItems; value: boolean }
  | { type: Action.UpdateShowNotUsedItems; value: boolean }
  | { type: Action.FixBrokenIcons }
  | { type: Action.SelectSpace; spaceId?: number, spaceIndex?: number }
  | { type: Action.SwipeSpace; direction: "left" | "right" }
  | { type: Action.UpdateAppState; newState: Partial<IAppState> }

  | { type: Action.CreateSpace; spaceId: number; title: string; position?: string }
  | { type: Action.DeleteSpace; spaceId: number; }
  | { type: Action.MoveSpace; spaceId: number; insertBeforeSpaceId: number | undefined; }
  | { type: Action.UpdateSpace; spaceId: number; title?: string; position?: string; }

  | { type: Action.CreateFolder; newFolderId?: number; title?: string; color?: string; position?: string; items?: IFolderItemToCreate[]; spaceId?: number }
  | { type: Action.DeleteFolder; folderId: number; }
  | { type: Action.UpdateFolder; folderId: number; title?: string; color?: string; archived?: boolean; twoColumn?: boolean; position?: string }
  | { type: Action.MoveFolder; folderId: number; targetSpaceId: number, insertBeforeFolderId: number | undefined; }

  | { type: Action.CreateFolderItem; folderId: number; insertBeforeItemId: number | undefined; item: IFolderItemToCreate; }
  | { type: Action.CreateFolderItems; folderId: number; items: IFolderItemToCreate[]; }
  | { type: Action.DeleteFolderItems; itemIds: number[] }
  | { type: Action.UpdateFolderItem; itemId: number; title?: string; archived?: boolean; url?: string }
  | { type: Action.MoveFolderItems; itemIds: number[]; targetFolderId: number; insertBeforeItemId: number | undefined; }

  | { type: Action.SaveBookmarksToCloud; }

  | { type: Action.APICommandResolved; commandId: number, }
  | { type: Action.APIConfirmEntityCreated; localId: number; remoteId: number; entityType: "folder" | "bookmark" }
  ) & HistoryActionPayload;