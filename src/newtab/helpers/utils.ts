import Tab = chrome.tabs.Tab
import HistoryItem = chrome.history.HistoryItem
import { ColorTheme, IFolder, IFolderItem } from "./types"
import {IAppState } from "../state"
import React from "react"
import { isTabmeTab } from "./isTabmeTab"

export const DEFAULT_FOLDER_COLOR = "#f0f0f0"
export const EMPTY_FOLDER_COLOR = "transparent"

export const MAX_LAST_ACTIVE_TABS_COUNT = 3

const uselessWords = [
  "| Greenhouse",
  " - Google Sheets",
  " - Google Docs",
  ", Online Whiteboard for Visual Collaboration",
  " - Stash",
  " - Confluence",
  " - YouTube",
  ", Visual Workspace for Innovation"
]

export function removeUselessProductName(str: string | undefined): string {
  if (str === undefined) {
    return ""
  } else {
    uselessWords.forEach((uw) => {
      str = str!.replace(uw, "")
    })
    return str
  }
}

export function extractHostname(url: string | undefined): string {
  if (url === undefined) {
    return ""
  } else {
    try {
      return (new URL(url)).host
    } catch (e) {
      return ""
    }
  }
}

const important_urls = [
  "miro.com",
  "miro.atlassian.net",
  "code.devrtb.com",
  "docs.google.com",
  "app2.greenhouse.io",
  "miro.latticehq.com",
  "notion.so"
]

export function filterNonImportant(tab: Tab): boolean {
  return important_urls.some(
    (importantUrl) => tab.url && tab.url.includes(importantUrl)
  )
}

export function convertTabToItem(item: Tab): IFolderItem {
  return {
    id: genUniqId(),
    favIconUrl: item.favIconUrl || "",
    title: item.title || "",
    url: item.url || ""
  }
}

export function createNewFolderItem(url?: string, title?: string, favIconUrl?: string): IFolderItem {
  return {
    id: genUniqId(),
    favIconUrl: favIconUrl ?? "",
    title: title ?? "",
    url: url ?? ""
  }
}

export const SECTION_ICON_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmZiIgLz4KPC9zdmc+Cg==`

export function createNewSection(title = "Header"): IFolderItem {
  return {
    id: genUniqId(),
    favIconUrl: SECTION_ICON_BASE64,
    title,
    url: "",
    isSection: true
  }
}

export function filterTabsBySearch(
  list: Tab[],
  searchValue: string
): Tab[] {
  const searchValueLC = searchValue.toLowerCase()
  return list.filter(item => {
    if (searchValue === "") {
      return canDisplayTabInSidebar(item)
    } else {
      return canDisplayTabInSidebar(item) && isContainsSearch(item, searchValueLC)
    }
  })
}

export function hasArchivedItems(folders: IFolder[]): boolean {
  return folders.some(f => f.archived || f.items.some(i => i.archived))
}

export function hasItemsToHighlight(folders: IFolder[], historyItems: HistoryItem[]): boolean {
  return folders.some(f => f.items.some(i => isFolderItemNotUsed(i, historyItems)))
}

export function filterItemsBySearch<T extends { title?: string, url?: string }>(
  list: T[],
  searchValue: string
): T[] {
  if (searchValue === "") {
    return list
  } else {
    const searchValueLC = searchValue.toLowerCase()
    return list.filter(item => isContainsSearch(item, searchValueLC))
  }
}

export function isContainsSearch<T extends { title?: string, url?: string }>(
  item: T,
  searchValue: string
): boolean {
  return item.title!.toLowerCase().includes(searchValue)
    || item.url!.toLowerCase().includes(searchValue)
}

// const irrelecantHosts = [
//   "translate.google.ru",
//   "zoom.us",
//   "miro.zoom.us",
//   "9gag.com",
//   "calendar.google.com",
//   "www.facebook.com",
//   "www.google.com",
//   "accounts.google.com",
//   "vk.com",
//   "coub.com",
//   "mail.google.com",
//   "twitter.com",
//   "code.devrtb.com",
//   "www.youtube.com",
//   "yandex.ru",
//   "www.instagram.com",
//   "2gis.ru"
// ]
//
// const hostWithIgnoredSearchAndHash = [
//   "miro.com",
//   "docs.google.com",
//   "www.figma.com"
// ]
// function isRelevantURL(url: URL): boolean {
//   return !irrelecantHosts.some(h => h === url.host)
// }
//
// function isDistinctURL(url: URL): boolean {
//   return hostWithIgnoredSearchAndHash.some(h => h === url.host)
// }

export function filterIrrelevantHistory(
  list: HistoryItem[]
): HistoryItem[] {
  const res: HistoryItem[] = []
  list.forEach(item => {
    if (!item.url) {
      return
    }

    const url = new URL(item.url)
    if (url.host === "translate.google.ru" || url.host === "translate.google.com" || url.host === "www.deepl.com") {
      return
    }

    res.push(item)
  })
  return res
}

export const colors = [
  "#ffcdd2",
  "#f8bbd0",
  "#e1bee7",
  "#d1c4e9",
  "#c5cae9",
  "#bbdefb",
  "#b3e5fc",
  "#b2ebf2",
  "#b2dfdb",
  "#c8e6c9",
  "#dcedc8",
  "#f0f4c3",
  "#fff9c4",
  "#ffecb3",
  "#ffe0b2",
  "#ffccbc",
  "#d7ccc8",
  "#cfd8dc"
]

export function getRandomHEXColor(): string {
  return colors[Math.round(Math.random() * (colors.length - 1))]
}

//does not work
export function genUniqId(): number {
  return (new Date()).valueOf() + Math.round(Math.random() * 10000000)
}

export function filterOpenedTabsFromHistory(
  tabs: Tab[],
  historyItems: HistoryItem[]
): HistoryItem[] {
  return historyItems.filter((hi) => !tabs.some((tab) => hi.url === tab.url))
}

export function canDisplayTabInSidebar(t: Tab): boolean {
  return !isTabmeTab(t) && !t.pinned
}

export function findTabsByURL(url: string | undefined, tabs: Tab[]): Tab[] {
  if (!url || url === "") {
    return []
  }
  return tabs.filter(t => t.url === url || t.pendingUrl === url)
}

export function isFolderItemNotUsed(item: IFolderItem, historyItems: HistoryItem[]): boolean {
  if (item.isSection) {
    return false
  }
  const historyItem = historyItems.find(hi => hi.url === item.url)
  return !historyItem
}

//todo impl regexp with camel cases insensitevness
export function hlSearch(str: string, search: string): { __html: string } {
  if (search) {
    const searchRE = new RegExp(escapeRegex(search), "i")
    return { __html: sanitizeHTML(str.replace(searchRE, `<span class="searched">${search}</span>`)) }
  } else {
    return { __html: sanitizeHTML(str) }
  }
}

export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/on\w+=".*?"/gi, "")
    .replace(/javascript:/gi, "")
}

function escapeRegex(s: string): string {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")
}

export function findItemById(appState: IAppState, itemId: number): IFolderItem | undefined {
  let res: IFolderItem | undefined = undefined
  appState.folders.some(f => {
    const item = f.items.find(i => i.id === itemId)
    res = item
    return !!item
  })
  return res
}

export function findItemsByIds(appState: IAppState, itemsIds: number[]): IFolderItem[] {
  return itemsIds.map(id => findItemById(appState, id)!).filter(item => !!item)
}

export function findFolderByItemId(appState: IAppState, itemId: number): IFolder | undefined {
  return appState.folders.find(f => {
    return f.items.find(i => i.id === itemId)
  })
}

export function blurSearch(e: React.MouseEvent) {
  e.preventDefault()
  if (document.activeElement) {
    (document.activeElement as HTMLElement).blur()
  }
}

export function debounce(f: any, ms: number): (...attrs: any[]) => void {

  let isCooldown = false

  return function() {
    if (isCooldown) {
      return
    }

    //[!]does not save context
    // should be 'this' instead of 'null'
    f.apply(null, arguments)

    isCooldown = true

    setTimeout(() => isCooldown = false, ms)
  }

}

//[!]does not save context
// should be 'this' instead of 'null'
export function throttle(func: any, ms: number): (...attrs: any[]) => void {

  let isThrottled = false,
    savedArgs: any,
    savedThis: any

  function wrapper() {
    savedArgs = arguments
    savedThis = null
    if (isThrottled) { // (2)
      return
    }

    //func.apply(null, arguments); // (1)

    isThrottled = true

    setTimeout(function() {
      isThrottled = false // (3)
      if (savedArgs) {
        func.apply(savedThis, savedArgs)
        savedArgs = savedThis = null
      }
    }, ms)
  }

  return wrapper
}

export function getTopVisitedFromHistory(history: HistoryItem[], limit = 20) {
  const sortedHistory = Array.from(history)
  sortedHistory.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
  return sortedHistory.slice(0, limit)
}

export function getFavIconUrl(val?: string): string {
  if (val) {
    return (new URL(val)).origin + "/favicon.ico"
  } else {
    return ""
  }
}
export function isCustomActionItem(item: IFolderItem | undefined): boolean {
  return item?.url.includes("tabme://") ?? false
}

const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)")
let canUseSystemTheme = false

darkThemeMq.addEventListener("change", () => {
  if (canUseSystemTheme) {
    setThemeStyle(darkThemeMq.matches)
  }
})

export function applyTheme(theme: ColorTheme) {
  canUseSystemTheme = false
  switch (theme) {
    case "light":
      setThemeStyle(false)
      break
    case "dark":
      setThemeStyle(true)
      break
    default:
      setThemeStyle(false)
      // who need system color?
      // canUseSystemTheme = true
      // setThemeStyle(darkThemeMq.matches)
      break
  }
}

function setThemeStyle(useDarkMode: boolean) {
  if (useDarkMode) {
    document.body.classList.add("dark-theme")
  } else {
    document.body.classList.remove("dark-theme")
  }
}

export function getCurrentData() {
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, "0")
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const mm = months[today.getMonth()]
  const min = String(today.getMinutes()).padStart(2, "0")
  const hours = String(today.getHours()).padStart(2, "0")
  return `${dd} ${mm} at ${hours}:${min}`
}

/**
 * o1: original object
 * o2: object to merge with — undefined values as ignored
 * Return new objects
 */
export function mergeObjects<T>(o1: T, o2: Partial<T>): T {
  const merged = { ...o1 } as T
  for (let key in o2) {
    if (o2[key] !== undefined) {
      // @ts-ignore
      merged[key] = o2[key]
    }
  }

  return merged
}
