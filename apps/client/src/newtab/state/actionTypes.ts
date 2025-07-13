import { ISpace, IFolder, IBookmarkItem, IGroupItem } from "../helpers/types"
import { IAppState } from "./state"
import Tab = chrome.tabs.Tab
import TabGroup = chrome.tabGroups.TabGroup
import { RecentItem } from "../helpers/recentHistoryUtils"

export type ActionPayload =
  | { type: "init-dashboard", spaces?: ISpace[], sidebarCollapsed?: boolean, saveToLS?: boolean }
  | { type: "undo" }
  | { type: "show-notification", message: string, isError?: boolean, isLoading?: boolean }
  | { type: "hide-notification" }
  | { type: "update-search", value: string }
  | { type: "update-tab", tabId: number, opt: Tab }
  | { type: "update-tab-group", groupId: number, opt: TabGroup }
  | { type: "close-tabs", tabIds: number[] }
  | { type: "set-tabs-or-history", tabs?: Tab[], tabGroups?: TabGroup[], recentItems?: RecentItem[] }
  | { type: "toggle-dark-mode" }
  | { type: "update-show-not-used-items", value: boolean }
  | { type: "select-space", spaceId?: number, spaceIndex?: number }
  | { type: "update-app-state", newState: Partial<IAppState> }
  | { type: "update-folder-item", itemId: number, props: Partial<IBookmarkItem | IGroupItem> }
  | { type: "update-folder", folderId: number, props: Partial<IFolder> }
  | { type: "update-space", spaceId: number, props: Partial<ISpace> }
  | { type: "delete-folder", folderId: number }
  | { type: "delete-folder-item", itemId: number }
  | { type: "delete-space", spaceId: number }
  | { type: "create-folder", folder: IFolder }
  | { type: "create-folder-item", item: IBookmarkItem | IGroupItem }
  | { type: "create-space", space: ISpace }
  | { type: "api-command-started", commandId: string }
  | { type: "api-command-resolved" }
  | { type: "api-confirm-entity-created", entityId: number } 