import { createNewFolderItem, genUniqId } from "./utils"
import { IFolderItemToCreate } from "./types"
import { Action, IAppState } from "../state/state"
import { ActionDispatcher } from "../state/actions"
import HistoryItem = chrome.history.HistoryItem

export function tryToCreateWelcomeFolder(appState: IAppState, history: HistoryItem[], dispatch: ActionDispatcher) {
  if (appState.stat?.sessionNumber === 1 && appState.folders.length === 0) {
    const items: IFolderItemToCreate[] = []
    const favIconUrl = chrome.runtime.getURL("icon_32.png")
    items.push(createNewFolderItem("tabme://import-bookmarks", "Import Existing Bookmarks", favIconUrl))
    items.push(createNewFolderItem("https://gettabme.com/guide.html?utm_source=extention", "How to Use Tabme", favIconUrl))

    // @NOTE: disabled adding Top 5 most visiting site as misleading UX
    // items.push(createNewSection("Top 5 visited sites"))
    // items.push(...getTopVisitedFromHistory(history, 5).map(i => createNewFolderItem(i.url, i.title, getFavIconUrl(i.url))))

    const newFolderId = genUniqId()
    dispatch({ type: Action.CreateFolder, newFolderId, title: "Welcome to Tabme", items, color: "#c4ffbd" })
  }
}
