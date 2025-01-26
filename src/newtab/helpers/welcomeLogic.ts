import { createNewFolderItem, createNewSection, genUniqLocalId } from "./utils"
import { IFolderItemToCreate } from "./types"
import { Action, IAppState } from "../state/state"
import { ActionDispatcher } from "../state/actions"

export function tryToCreateWelcomeFolder(appState: IAppState, dispatch: ActionDispatcher) {
  if (appState.stat?.sessionNumber === 1 && appState.spaces.length === 0) {
    const items: IFolderItemToCreate[] = []
    const favIconUrl = chrome.runtime.getURL("icon_32.png")
    items.push(createNewSection("Step 1 — Import bookmarks"))
    items.push(createNewFolderItem("tabme://import-bookmarks", "Import your existing Chrome bookmarks", favIconUrl))
    items.push(createNewSection("Step 2 — Build your own space"))
    items.push(createNewFolderItem("https://gettabme.com/guide.html?utm_source=extention", "Drag and drop Tabs from the sidebar<br> into a Folder to save", favIconUrl))
    items.push(createNewFolderItem("https://gettabme.com/guide.html?utm_source=extention", "Drag and drop Folders by header<br> to customize your space", favIconUrl))
    items.push(createNewFolderItem("https://gettabme.com/guide.html?utm_source=extention", "Click and drag to select several items", favIconUrl))

    // @NOTE: disabled adding Top 5 most visiting site as misleading UX
    // items.push(createNewSection("Top 5 visited sites"))
    // items.push(...getTopVisitedFromHistory(history, 5).map(i => createNewFolderItem(i.url, i.title, getFavIconUrl(i.url))))

    const defaultSpaceId = genUniqLocalId()
    dispatch({ type: Action.CreateSpace, spaceId: defaultSpaceId, title: "Personal" })
    dispatch({ type: Action.SelectSpace, spaceId: defaultSpaceId })
    dispatch({ type: Action.CreateFolder, newFolderId: genUniqLocalId(), title: "Welcome to Tabme", items, color: "#A0F3A2" })

    // todo maybe create some banner here, just to show that this is DEMO space
    // maybe share it for VIEW
    dispatch({ type: Action.CreateSpace, spaceId: genUniqLocalId(), title: "Work" })
  }
}
