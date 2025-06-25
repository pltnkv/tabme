// import { type ISpace } from "./newtab/helpers/types"
// import { addItemsToFolder } from "./newtab/helpers/fractionalIndexes"
// import { createNewFolderItem, getFavIconUrl, updateFolder } from "./newtab/state/actionHelpers"

////////////////////////////////////////////////////////
// building context menu for saving tabs
////////////////////////////////////////////////////////
export function initBgContextMenu() {

}
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