/**
 * CAN NOT IMPORT REACT AS DEPENDENCY OR ANY DOM API
 */
import {
  IAllFolderItemProps,
  IBookmarkItem,
  IFolder,
  IFolderBookmarkToCreate,
  IFolderGroupToCreate,
  IFolderItem,
  IFolderItemToCreate,
  IGroupItem,
  ISpace,
  IWidget
} from "../helpers/types"
import { addItemsToParent, sortByPosition } from "../helpers/fractionalIndexes"
import { Action, type IAppState } from "./state"
import { isBookmarkItem, isGroupItem, SECTION_ICON_BASE64 } from "../helpers/utils"
import Tab = chrome.tabs.Tab
import { RecentItem } from "../helpers/recentHistoryUtils"
import { round10 } from "../helpers/mathUtils"
import { ActionDispatcher } from "./actions"

export function genUniqLocalId(): number {
  return (new Date()).valueOf() + Math.round(Math.random() * 10000000)
}

export type ITabOrRecentItem = (Tab | RecentItem)

export function isTabData(data: ITabOrRecentItem): data is Tab {
  return !(data as RecentItem).isRecent
}

export function convertTabToItem(item: Tab): IFolderBookmarkToCreate {
  return {
    id: genUniqLocalId(),
    type: "bookmark",
    favIconUrl: item.favIconUrl || "",
    title: item.title || "",
    url: item.url || ""
  }
}

export function convertRecentToItem(item: RecentItem): IFolderBookmarkToCreate {
  return {
    id: genUniqLocalId(),
    type: "bookmark",
    favIconUrl: item.favIconUrl ?? getTempFavIconUrl(item.url),
    title: item.title ?? "",
    url: item.url ?? ""
  }
}

export function convertTabOrRecentToItem(item: ITabOrRecentItem): IFolderBookmarkToCreate {
  if (isTabData(item)) {
    return convertTabToItem(item)
  } else {
    return convertRecentToItem(item)
  }
}

export function createNewFolderBookmark(url?: string, title?: string, favIconUrl?: string): IFolderBookmarkToCreate {
  return {
    id: genUniqLocalId(),
    type: "bookmark",
    favIconUrl: favIconUrl ?? getTempFavIconUrl(url),
    title: title ?? "",
    url: url ?? ""
  }
}

export function createNewStickerForOnboarding(dispatch: ActionDispatcher, spaceId: number, text: string, x: number, y: number) {
  const widgetId = genUniqLocalId()
  dispatch({
    type: Action.CreateWidget,
    spaceId,
    widgetId,
    content: {
      text: text
    },
    pos: {
      point: { x: round10(x), y: round10(y) }
    }
  })
}

export function createNewFolderGroup(title = "Group title", groupItemsToCreate?: IFolderBookmarkToCreate[]): IFolderGroupToCreate {
  return {
    id: genUniqLocalId(),
    type: "group",
    title,
    groupItems: addItemsToParent((groupItemsToCreate ?? []), [])
  }
}

export function findItemById(appState: Pick<IAppState, "spaces">, itemId: number): IFolderItem | undefined {
  let res: IFolderItem | undefined = undefined
  appState.spaces.some(s => {
    return s.folders.some(f => {
      for (let i = 0; i < f.items.length; i++) {
        const item = f.items[i]
        if (item.id === itemId) {
          res = item
          break
        } else if (isGroupItem(item)) {
          res = item.groupItems.find(itm => itm.id === itemId)
          if (res) {
            break
          }
        }
      }
      return !!res
    })
  })

  return res
}

export function findFolderById(state: Pick<IAppState, "spaces">, folderId: number): IFolder | undefined {
  let res: IFolder | undefined = undefined
  state.spaces.some(s => {
    res = s.folders.find(f => f.id === folderId)
    return !!res
  })

  return res
}

export function findSpaceByFolderId(state: Pick<IAppState, "spaces">, folderId: number): ISpace | undefined {
  return state.spaces.find(s => {
    return !!s.folders.find(f => f.id === folderId)
  })
}

export function findSpaceById(state: Pick<IAppState, "spaces">, spaceId: number | undefined): ISpace | undefined {
  return state.spaces.find(s => s.id === spaceId)
}

export function convertToURL(val?: string | URL): URL | undefined {
  if (typeof val === "object") {
    return val
  } else if (typeof val === "undefined") {
    return undefined
  } else if (URL.canParse(val)) { //todo !!! measure performance, maybe throw error is faster
    return new URL(val)
  } else {
    return undefined
  }
}

export function getTempFavIconUrl(val?: string | URL): string {
  const url = convertToURL(val)
  if (url) {
    return url.origin + "/favicon.ico#by-tabme"
  } else {
    return ""
  }
}

export function findFolderByItemId(appState: Pick<IAppState, "spaces">, itemId: number): IFolder | undefined {
  let res: IFolder | undefined = undefined
  appState.spaces.some(s => {
    const folder = s.folders.find(f => {
      let containsTargetItem = false
      for (let i = 0; i < f.items.length; i++) {
        const item = f.items[i]
        if (item.id === itemId) {
          containsTargetItem = true
          break
        } else if (isGroupItem(item)) {
          if (item.groupItems.some(itm => itm.id === itemId)) {
            containsTargetItem = true
            break
          }
        }
      }
      return containsTargetItem
    })
    res = folder
    return !!folder
  })

  return res
}

export function findGroupByChildItemId(appState: Pick<IAppState, "spaces">, itemId: number): IGroupItem | undefined {
  let res: IGroupItem | undefined = undefined
  appState.spaces.some(s => {
    return s.folders.some(f => {
      return f.items.some(item => {
        if (isGroupItem(item)) {
          if (item.groupItems.some(gi => gi.id === itemId)) {
            res = item
            return true
          }else{
            return false
          }
        } else {
          return false
        }
      })
    })
  })

  return res
}

export function findWidgetById(appState: Pick<IAppState, "spaces">, widgetId: number): IWidget | undefined {
  let res: IWidget | undefined = undefined
  appState.spaces.some(s => {
    const widget = (s.widgets ?? []).find(w => w.id === widgetId)
    res = widget
    return !!widget
  })

  return res
}

export function updateSpace(
  spaces: ISpace[],
  spaceId: number,
  newSpace: Partial<ISpace> | ((space: ISpace) => ISpace)
): ISpace[] {
  return sortByPosition(spaces.map((s) => {
    if (s.id === spaceId) {
      if (typeof newSpace === "function") {
        return newSpace(s)
      } else {
        return { ...s, ...newSpace }
      }
    } else {
      return s
    }
  }))
}

export function updateFolder(
  spaces: ISpace[],
  folderId: number,
  newFolder: Partial<IFolder> | ((folder: IFolder) => IFolder),
  sortFolders = false
): ISpace[] {
  return spaces.map((space) => {
    const hasTargetFolder = space.folders.find(f => f.id === folderId)
    if (hasTargetFolder) {

      const newFolders = space.folders.map((f) => {
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

      if (sortFolders) {
        sortByPosition(newFolders) // why dont always sort folders?
      }

      return {
        ...space,
        folders: newFolders
      }
    } else {
      return space
    }
  })
}

export function updateFolderGroup(
  spaces: ISpace[],
  folderId: number,
  groupId: number,
  newGroup: Partial<IGroupItem> | ((group: IGroupItem) => IGroupItem)
): ISpace[] {
  return updateFolder(spaces, folderId, (folder) => {
    return {
      ...folder,
      items: folder.items.map((item) => {
        if (item.id === groupId && isGroupItem(item)) {
          if (typeof newGroup === "function") {
            return newGroup(item)
          } else {
            return { ...item, ...newGroup }
          }
        } else {
          return item
        }

      })
    }
  })
}

export function updateFolderItem(
  spaces: ISpace[],
  itemId: number,
  newItemProps: Partial<IAllFolderItemProps>,
  folderId?: number //just optimization
): ISpace[] {
  if (!folderId) {
    const folder = findFolderByItemId({ spaces }, itemId)
    if (!folder) {
      console.error("updateFolderItem can not find folder item")
      return spaces
    }
    folderId = folder.id
  }
  return updateFolder(spaces, folderId, (folder) => {
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

export function isCustomActionItem(item: IFolderItem | undefined): boolean {
  return (isBookmarkItem(item) && item?.url.includes("tabme://")) ?? false
}

export function getFolderBookmarksFlatList(folder: IFolder): IBookmarkItem[] {
  const res: IBookmarkItem[] = []
  folder.items.forEach(i => {
    if (isBookmarkItem(i)) {
      res.push(i)
    } else {
      res.push(...i.groupItems)
    }
  })
  return res
}