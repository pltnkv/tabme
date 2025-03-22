import HistoryItem = chrome.history.HistoryItem
import { faviconsStorage } from "./faviconUtils"

export const miroHashRegExp = /\/board\/([^/?]+)/

export const jiraHashRegExp = /\/browse\/([^/?]+)/
export const confluenceHashRegExp = /\/pages\/([^/?]+)/

export const googleDocHashRegExp = /\/document\/d\/([^/]+)/
export const googlePresentationHashRegExp = /\/presentation\/d\/([^/]+)/
export const googleFormsHashRegExp = /\/forms\/d\/([^/]+)/
export const googleSpreadsheetsHashRegExp = /\/spreadsheets\/d\/([^/]+)/

export const figmaDesignHashRegExp = /\/design\/([^/]+)/
export const figmaSlidesRegExp = /\/slides\/([^/]+)/
export const figmaBoardRegExp = /\/board\/([^/]+)/
export const youtubeHashRegExp = /[?&]v=([^&]+)/
export const githubPRHashRegExp = /\/pull\/(\d+)/
export const loomHashRegExp = /\/share\/([^/?]+)/

export function hashGetterFactory(regexes: RegExp[]): (url: string) => string {
  return (url: string) => {
    let res = ''

    regexes.some(regex => {
      const match = url.match(regex)
      if (match && match[1]) {
        res = match[1]
        return true
      }
      return false
    })

    return res
  }
}

export function getCleanMiroTitle(title: string): string {
  if (title.endsWith("- Miro")) {
    return title.slice(0, -7)
  } else {
    return title
  }
}

export function getCleanTitle(title: string): string {
  return title
}

export type IFilter = {
  title: string
  icon?: string
  pattern: string
  getHash: (url: string) => string
  cleanTitle: (title: string) => string
  enabled?: boolean
}

export type FilteredHistoryItem = {
  favIconUrl: string
} & HistoryItem

export function getFilteredHistoryItems(historyItems: HistoryItem[], filters: IFilter[]): FilteredHistoryItem[] {
  const res: FilteredHistoryItem[] = []
  const deduplicatedHistoryItemsHashes = new Set<string>()
  historyItems.forEach((item) => {
    const filter = filters.find(f => item.url?.includes(f.pattern))
    if (filter && filter.enabled && item.url && item.title) {
      const hash = filter.getHash(item.url)
      if (!deduplicatedHistoryItemsHashes.has(hash)) {
        deduplicatedHistoryItemsHashes.add(hash)
        item.title = filter.cleanTitle(item.title);
        (item as FilteredHistoryItem).favIconUrl = faviconsStorage.getByURL(item.url) ?? "" // todo draw default rect
        res.push(item as FilteredHistoryItem)
      }
    }
  })

  return res
}

export function getBaseFilteredHistoryItems(historyItems: HistoryItem[]): FilteredHistoryItem[] {
  const res: FilteredHistoryItem[] = []
  const deduplicatedHistoryItemsHashesByTitle = new Map<string, Set<string>>();
  (historyItems as FilteredHistoryItem[]).forEach((item) => {
    if (item.url && item.title) {
      const hashesByPathName = deduplicatedHistoryItemsHashesByTitle.get(item.title)
      if (!hashesByPathName) {
        const urlObj = new URL(item.url)
        deduplicatedHistoryItemsHashesByTitle.set(item.title, new Set(urlObj.pathname))
        item.favIconUrl = faviconsStorage.getByURL(urlObj) ?? ""
        res.push(item)
      } else {
        const urlObj = new URL(item.url)
        if (!hashesByPathName.has(urlObj.pathname)) {
          hashesByPathName.add(urlObj.pathname)
          item.favIconUrl = faviconsStorage.getByURL(urlObj) ?? ""
          res.push(item)
        }
      }
    }
  })

  return res
}