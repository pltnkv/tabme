/**
 * CAN NOT IMPORT REACT AS DEPENDENCY OR ANY DOM API
 */
import { IFolder, IFolderItem, IFolderItemToCreate, ISpace, IWidget } from "../helpers/types"
import { sortByPosition } from "../helpers/fractionalIndexes"
import { type IAppState } from "./state"
import { SECTION_ICON_BASE64 } from "../helpers/utils"
import Tab = chrome.tabs.Tab

export function genUniqLocalId(): number {
  return (new Date()).valueOf() + Math.round(Math.random() * 10000000)
}

export function convertTabToItem(item: Tab): IFolderItemToCreate {
  return {
    id: genUniqLocalId(),
    favIconUrl: item.favIconUrl || "",
    title: item.title || "",
    url: item.url || ""
  }
}

export function createNewSection(title = "Title"): IFolderItemToCreate {
  return {
    id: genUniqLocalId(),
    favIconUrl: SECTION_ICON_BASE64,
    title,
    url: "",
    isSection: true
  }
}

export function findItemById(appState: Pick<IAppState, "spaces">, itemId: number): IFolderItem | undefined {
  let res: IFolderItem | undefined = undefined
  appState.spaces.some(s => {
    return s.folders.some(f => {
      const item = f.items.find(i => i.id === itemId)
      res = item
      return !!item
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

export function createNewFolderItem(url?: string, title?: string, favIconUrl?: string): IFolderItemToCreate {
  return {
    id: genUniqLocalId(),
    favIconUrl: favIconUrl ?? getFavIconUrl(url),
    title: title ?? "",
    url: url ?? ""
  }
}

export function getFavIconUrl(val?: string): string {
  if (val) {
    try {
      return (new URL(val)).origin + "/favicon.ico"
    } catch (e) {
      return ""
    }
  } else {
    return ""
  }
}

export function findFolderByItemId(appState: Pick<IAppState, "spaces">, itemId: number): IFolder | undefined {
  let res: IFolder | undefined = undefined
  appState.spaces.some(s => {
    const folder = s.folders.find(f => {
      return f.items.find(i => i.id === itemId)
    })
    res = folder
    return !!folder
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

export function updateFolderItem(
  spaces: ISpace[],
  itemId: number,
  newItemProps: Partial<IFolderItem>,
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
  return item?.url.includes("tabme://") ?? false
}