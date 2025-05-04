// import { type ISpace } from "./newtab/helpers/types"
// import { addItemsToFolder } from "./newtab/helpers/fractionalIndexes"
// import { createNewFolderItem, getFavIconUrl, updateFolder } from "./newtab/state/actionHelpers"

////////////////////////////////////////////////////////
// clicking on extension icon
////////////////////////////////////////////////////////

console.log("Background started")

const chromeAny: any = chrome // hotfix for "chrome.action"
chromeAny.action.onClicked.addListener(async function() {
  const viewTabUrl = chrome.runtime.getURL("newtab.html")
  chrome.tabs.create({ url: viewTabUrl })
})

////////////////////////////////////////////////////////
// watching last active tabs
////////////////////////////////////////////////////////
const MAX_LAST_ACTIVE_TABS_COUNT = 3

const bc = new BroadcastChannel("sync-state-channel")

let lastActiveTabIds: number[] = []

function addLastActiveTabId(tabId: number) {
  const newLastActiveTabs = [tabId, ...lastActiveTabIds]
  if (newLastActiveTabs.length > 3) {
    newLastActiveTabs.length = MAX_LAST_ACTIVE_TABS_COUNT
  }
  lastActiveTabIds = newLastActiveTabs
}

chrome.tabs.onActivated.addListener(((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (t) => {
    if (t.id !== undefined) {
      addLastActiveTabId(t.id)
      bc.postMessage({ type: "last-active-tabs-updated", tabs: lastActiveTabIds })
    }
  })
}))

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "get-last-active-tabs") {
      sendResponse({ type: "send-last-active-tabs", tabs: lastActiveTabIds })
    }
  }
)

////////////////////////////////////////////////////////
// opening tabme when extension was installed
////////////////////////////////////////////////////////

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") }, (tab) => {
      if(!__OVERRIDE_NEWTAB) {
        chrome.tabs.update(tab.id!, { pinned: true })
      }
    })
  }
})

////////////////////////////////////////////////////////
// opening feedback when uninstall extension
////////////////////////////////////////////////////////
let uninstallURL = __OVERRIDE_NEWTAB
  ? "https://docs.google.com/forms/d/e/1FAIpQLSevGfJekcHfb0WjnnuE9XMFYhPIRwtxGFFZH6WV0ve3aBbgwQ/viewform"
  : "https://docs.google.com/forms/d/e/1FAIpQLSc4f_Qfgd9jvL3kTk1puG_zAiobYPBYdKPEj7ug9YWsHU515Q/viewform?usp=header"

chrome.runtime.setUninstallURL(uninstallURL, () => {
  if (chrome.runtime.lastError) {
    console.error("Error setting uninstall URL:", chrome.runtime.lastError.message)
  }
})

////////////////////////////////////////////////////////
// building context menu for saving tabs
////////////////////////////////////////////////////////
/**
 function updateContextMenu() {
 chrome.contextMenus.removeAll(() => {
 createContextMenu()
 })
 }

 function createContextMenu() {
 chrome.storage.local.get("spaces", (data) => {
 const spaces: ISpace[] = data.spaces || []

 console.log('createContextMenu')

 if (spaces.length === 0) {
 return
 }

 chrome.contextMenus.create({
 id: "save_to",
 title: "Save to Tabme",
 contexts: ["page"]
 })

 spaces.forEach((space) => {
 if (space.folders.length > 0) {

 chrome.contextMenus.create({
 id: `space_${space.id}`,
 title: space.title,
 parentId: "save_to",
 contexts: ["page"]
 })

 space.folders.forEach((folder) => {
 chrome.contextMenus.create({
 id: `${folder.id}`,
 title: folder.title,
 parentId: `space_${space.id}`,
 contexts: ["page"]
 })
 })
 }
 })
 })
 }

 // Listen for storage changes and update the menu
 chrome.storage.onChanged.addListener((changes, area) => {
 if (area === "local" && changes.spaces) {
 updateContextMenu()
 }
 })

 // Rebuild menu when the extension starts
 chrome.runtime.onInstalled.addListener(updateContextMenu)
 chrome.runtime.onStartup.addListener(updateContextMenu)

 // Handle menu item clicks
 chrome.contextMenus.onClicked.addListener((info, tab) => {
 if (tab && tab.url) {
 handleSave(parseInt(info.menuItemId, 10), tab.url, tab.title || "Untitled Page")
 }
 })

 function handleSave(folderId: number, url: string, title: string) {
 console.log(`Saving URL: ${url} with title: '${title}' to folder: '${folderId}'`)

 //todo !!! add network
 chrome.storage.local.get("spaces", (data) => {
 const dataSpaces: ISpace[] = data.spaces || []
 const newFolderItem = createNewFolderItem(url, title, getFavIconUrl(url))
 const updatedSpaces = updateFolder(dataSpaces, folderId, (folder) => {
 const items  = addItemsToFolder([newFolderItem], folder.items)
 return {
 ...folder,
 items
 }
 })

 chrome.storage.local.set({
 spaces: updatedSpaces
 }, () => {
 bc.postMessage({ type: "folders-updated" })
 })
 })
 }
 */