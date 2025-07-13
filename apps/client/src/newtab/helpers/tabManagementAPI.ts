import { IBookmarkItem, IFolder } from "./types"
import { isBookmarkItem } from "./utils"

export function openTabsWithoutGroup(groupItems: IBookmarkItem[]): void {
  const itemsWithURL = groupItems.filter(i => i.url)
  itemsWithURL.forEach((item, index) => {
    chrome.tabs.create({
      url: item.url,
      // active: index === 0 // First tab should be active
    }, (tab) => {})
  })
}


export function openTabsInGroup(groupItems: IBookmarkItem[], groupTitle: string = '', makeFirstTabActive = false): void {

  // Store created tab IDs
  const createdTabIds: number[] = []

  const itemsWithURL = groupItems.filter(i => i.url)
  itemsWithURL.forEach((item, index) => {
    chrome.tabs.create({
      url: item.url,
      active: makeFirstTabActive && index === 0 // First tab should be active
    }, (tab) => {
      if (tab?.id) {
        createdTabIds.push(tab.id)

        // After all tabs are created, group them
        if (createdTabIds.length === itemsWithURL.length) {
          // @ts-ignore
          chrome.tabs.group({ tabIds: createdTabIds }, (groupId) => {
            // @ts-ignore
            chrome.tabGroups.update(groupId, {
              title: groupTitle
            })
          })
        }
      }
    })
  })
}

export function openTabsInFolder(folder: IFolder, makeFirstTabActive = false): void {
  let isFirstTab = makeFirstTabActive

  // Process each item in order
  folder.items.forEach((item) => {
    if (isBookmarkItem(item)) {
      // Single bookmark - open directly
      if (item.url) {
        chrome.tabs.create({
          url: item.url,
          active: isFirstTab // First tab should be active
        })
        isFirstTab = false
      }
    } else {
      openTabsInGroup(item.groupItems, item.title, isFirstTab)
      isFirstTab = false
    }
  })
}