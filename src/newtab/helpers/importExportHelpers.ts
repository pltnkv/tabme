import { IFolder, ISpace } from "./types"
import { Action } from "../state/state"
import { ActionDispatcher } from "../state/actions"
import { createNewFolderItem, genUniqLocalId, getTempFavIconUrl } from "../state/actionHelpers"
import { showMessage } from "./actionsHelpersWithDOM"
import { getTopVisitedFromHistory } from "./utils"
import HistoryItem = chrome.history.HistoryItem
import { trackStat } from "./stats"
import { RecentItem } from "./recentHistoryUtils"

type IBackup = {
  isTabme: true,
  version: number,
  spaces: ISpace[]
}

function isLegacyImportJson(data: IFolder[]) {
  return Array.isArray(data) && data[0]?.title && data[0]?.items
}

function isImportJsonV2(data: IBackup) {
  return data.isTabme && Array.isArray(data.spaces) && data.version === 2
}

export function importFromJson(event: any, dispatch: ActionDispatcher) {
  function receivedText(e: any) {
    let lines = e.target.result
    try {
      const res = JSON.parse(lines)
      if (isLegacyImportJson(res)) {
        dispatch({ // clear existing folders
          type: Action.InitDashboard,
          spaces: [],
          saveToLS: true
        })

        const defaultSpaceId = genUniqLocalId()
        dispatch({ type: Action.CreateSpace, spaceId: defaultSpaceId, title: "Bookmarks" })
        dispatch({ type: Action.SelectSpace, spaceId: defaultSpaceId })

        const loadedFolders = res as IFolder[]
        loadedFolders.forEach(loadedFolder => {
          dispatch({
            type: Action.CreateFolder, // intentionally does not send additional stat here
            title: loadedFolder.title,
            items: loadedFolder.items,
            color: loadedFolder.color
          })
        })

        trackStat("importedTabmeBookmarks", { version: "v1" })
        showMessage("Backup has been imported", dispatch)
      } else if (isImportJsonV2(res)) {
        const data = res as IBackup
        dispatch({
          type: Action.InitDashboard,
          spaces: data.spaces,
          saveToLS: true
        })

        dispatch({
          type: Action.SelectSpace,
          spaceId: -1 //hack to force update
        })

        trackStat("importedTabmeBookmarks", { version: "v2" })
        showMessage("Backup has been imported", dispatch)
      } else {
        dispatch({ type: Action.ShowNotification, isError: true, message: "Unsupported JSON format" })
      }
    } catch (e) {
      console.error(e)
      dispatch({ type: Action.ShowNotification, isError: true, message: "Unsupported JSON format" })
    }
  }

  const file = event.target.files[0]
  const fr = new FileReader()
  fr.onload = receivedText
  fr.readAsText(file)
}

export function onExportJson(spaces: ISpace[]) {
  function downloadObjectAsJson(exportObj: any, exportName: string) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj))
    const downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", exportName + ".json")
    document.body.appendChild(downloadAnchorNode) // required for firefox
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const backup: IBackup = {
    spaces,
    isTabme: true,
    version: 2
  }
  downloadObjectAsJson(backup, "tabme_backup")
}

export function onImportFromToby(event: any, dispatch: ActionDispatcher, onReady?: () => void) {
  function receivedText(e: any) {
    let lines = e.target.result
    try {
      const tobyData = JSON.parse(lines) as ITobyJson
      const validFormat = Array.isArray(tobyData.lists)
      if (validFormat) {
        let count = 0
        tobyData.lists.forEach(tobyFolder => {
          dispatch({
            type: Action.CreateFolder, // intentionally does not send additional stat here
            title: tobyFolder.title,
            items: tobyFolder.cards.map(card => ({
              id: genUniqLocalId(),
              title: card.title,
              url: card.url,
              favIconUrl: getTempFavIconUrl(card.url)
            }))
          })
          count += tobyFolder.cards.length
        })
        trackStat("importedTobyBookmarks", { count })
        onReady && onReady()
      } else {
        dispatch({ type: Action.ShowNotification, isError: true, message: "Unsupported JSON format" })
      }
    } catch (e) {
      console.error(e)
      dispatch({ type: Action.ShowNotification, isError: true, message: "Unsupported JSON format" })
    }
  }

  const file = event.target.files[0]
  const fr = new FileReader()
  fr.onload = receivedText
  fr.readAsText(file)
}

type ITobyItem = {
  "title": string,
  "url": string,
}
type ITobyFolder = {
  title: string
  cards: ITobyItem[]
}
type ITobyJson = {
  lists: ITobyFolder[]
}

//////////////////////////////////////////////////////////////////////
// IMPORT BROWSER BOOKMARKS HELPERS
//////////////////////////////////////////////////////////////////////

// copy-paste Chrome types
export type CustomBookmarkTreeNode = {
  checked?: boolean
  mostVisited?: boolean

  /** Optional. The 0-based position of this node within its parent folder.  */
  index?: number;
  /** Optional. When this node was created, in milliseconds since the epoch (new Date(dateAdded)).  */
  dateAdded?: number;
  /** The text displayed for the node. */
  title: string;
  /** Optional. The URL navigated to when a user clicks the bookmark. Omitted for folders.   */
  url?: string;
  /** Optional. When the contents of this folder last changed, in milliseconds since the epoch.   */
  dateGroupModified?: number;
  /** The unique identifier for the node. IDs are unique within the current profile, and they remain valid even after the browser is restarted.  */
  id: string;
  /** Optional. The id of the parent folder. Omitted for the root node.   */
  parentId?: string;
  /** Optional. An ordered list of children of this node.  */
  children?: CustomBookmarkTreeNode[];
  /**
   * Optional.
   * Since Chrome 37.
   * Indicates the reason why this node is unmodifiable. The managed value indicates that this node was configured by the system administrator or by the custodian of a supervised
   * user. Omitted if the node can be modified by the user and the extension (default).
   */
  unmodifiable?: any;
}

export type PlainListRecord = {
  breadcrumbs: CustomBookmarkTreeNode[]
  folder: CustomBookmarkTreeNode
}
export type BookmarksAsPlainList = PlainListRecord[]

export function getBrowserBookmarks(onReady: (res: BookmarksAsPlainList) => void, recentItems: RecentItem[], dispatch: ActionDispatcher): void {
  const history = getTopVisitedFromHistory(recentItems, 1000)

  // Fetch bookmark folders from Chrome API
  chrome.bookmarks.getTree((bookmarks) => {
    const root = bookmarks[0]
    if (root.children) {
      const plain: BookmarksAsPlainList = []
      traverseTree(root.children, plain, [], history)
      onReady(plain)
    } else {
      dispatch({
        type: Action.ShowNotification,
        message: "No browser bookmarks found",
        isError: true
      })
    }
  })
}

function traverseTree(nodes: CustomBookmarkTreeNode[], plainList: BookmarksAsPlainList, breadcrumbs: CustomBookmarkTreeNode[], history: RecentItem[]) {
  nodes.forEach(node => {
    if (node.children && node.children.length > 0) {
      plainList.push({
        breadcrumbs,
        folder: node
      })
      traverseTree(node.children, plainList, [...breadcrumbs, node], history)
    } else {
      node.mostVisited = history.some(hItem => node.url && hItem.url?.includes(node.url))
    }
  })
}

export function importBrowserBookmarks(records: BookmarksAsPlainList, dispatch: ActionDispatcher, skipChecked: boolean) {
  let count = 0
  records.forEach(rec => {
    if (skipChecked || rec.folder.checked) {
      const items = rec.folder.children
        ?.filter(item => (skipChecked || item.checked) && item.url)
        .map(item => createNewFolderItem(item.url, item.title, getTempFavIconUrl(item.url)))
      count += items?.length ?? 0

      const newFolderId = genUniqLocalId()
      dispatch({ type: Action.CreateFolder, newFolderId, title: rec.folder.title, items }) // intentionally does not send additional stat here
    }
  })
  trackStat("importedBrowserBookmarks", { count })
}