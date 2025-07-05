import { IFolder, ISpace } from "./types"
import { Action } from "../state/state"
import { ActionDispatcher } from "../state/actions"
import { createNewFolderBookmark, genUniqLocalId, getTempFavIconUrl } from "../state/actionHelpers"
import { showMessage } from "./actionsHelpersWithDOM"
import { getTopVisitedFromHistory } from "./utils"
import { trackStat } from "./stats"
import { RecentItem } from "./recentHistoryUtils"
import { migrateFromFoldersToSpaces, migrateSectionsToGroups } from "./migrations"

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

function isImportJsonV3(data: IBackup) {
  return data.isTabme && Array.isArray(data.spaces) && data.version === 3
}

export function importFromJson(event: any, dispatch: ActionDispatcher) {
  function receivedText(e: any) {
    let lines = e.target.result
    try {

      const importSpacesData = (backupSpaces: ISpace[], ver: string) => {
        dispatch({
          type: Action.InitDashboard,
          spaces: backupSpaces,
          saveToLS: true
        })

        dispatch({
          type: Action.SelectSpace,
          spaceId: -1 //hack to force update
        })

        trackStat("importedTabmeBookmarks", { version: ver })
        showMessage("Backup has been imported", dispatch)
      }
      const res = JSON.parse(lines)
      if (isLegacyImportJson(res)) { // V1
        // no need to do "migrateSectionsToGroups" because in V1 was no groups yet
        importSpacesData(migrateFromFoldersToSpaces(res as IFolder[]), 'v1')
      } else if (isImportJsonV2(res)) { // V2
        importSpacesData(migrateSectionsToGroups(res.spaces), "v2")
      } else if (isImportJsonV3(res)) { // V3
        importSpacesData(res.spaces, "v3")
      } else {
        trackStat("importFromFileFailed", { type: "wrong-format", error: "" })
        dispatch({ type: Action.ShowNotification, isError: true, message: "Unsupported JSON format" })
      }
    } catch (e: any) {
      console.error(e)
      trackStat("importFromFileFailed", { type: "error", error: e.message })
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
    version: 3
  }
  downloadObjectAsJson(backup, "tabme_backup")
}

function isTobyFormat(data: any): data is ITobyJson {
  return data && Array.isArray(data.lists)
}

export function onImportFromToby(event: any, dispatch: ActionDispatcher, onReady?: () => void) {
  function receivedText(e: any) {
    let lines = e.target.result
    try {
      const tobyData = JSON.parse(lines)
      if (isTobyFormat(tobyData)) {
        let count = 0
        tobyData.lists.forEach(tobyFolder => {
          dispatch({
            type: Action.CreateFolder, // intentionally does not send additional stat here
            title: tobyFolder.title,
            items: tobyFolder.cards.map(card => ({
              id: genUniqLocalId(),
              type: "bookmark",
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
        trackStat("importFromTobyFailed", { type: "wrong-format", error: "" })
        dispatch({ type: Action.ShowNotification, isError: true, message: "Unsupported JSON format" })
      }
    } catch (e: any) {
      console.error(e)
      trackStat("importFromTobyFailed", { type: "error", error: e.message })
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
      const items = (rec.folder.children ?? [])
        .filter(item => (skipChecked || item.checked) && item.url)
        .map(item => createNewFolderBookmark(item.url, item.title, getTempFavIconUrl(item.url)))
      count += items.length

      if (!skipChecked || items.length !== 0) {
        const newFolderId = genUniqLocalId()
        dispatch({ type: Action.CreateFolder, newFolderId, title: rec.folder.title, items }) // intentionally does not send additional stat here
      }
    }
  })
  trackStat("importedBrowserBookmarks", { count })
}