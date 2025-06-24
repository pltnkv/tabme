import HistoryItem = chrome.history.HistoryItem
import { faviconsStorage } from "./faviconUtils"
import { ActionDispatcher } from "../state/actions"
import { Action } from "../state/state"
import { getTempFavIconUrl } from "../state/actionHelpers"

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
    let res = ""

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

export type RecentItem = {
  id: number;
  isRecent: boolean;
  favIconUrl: string;
  title?: string;
  url?: string;
  lastVisitTime?: number;
  visitCount?: number;
}

export function getFilteredRecentItems(historyItems: RecentItem[], filters: IFilter[]): RecentItem[] {
  const res: RecentItem[] = []
  const deduplicatedHistoryItemsHashes = new Set<string>()
  historyItems.forEach((ri) => {
    const filter = filters.find(f => ri.url?.includes(f.pattern))
    if (filter && filter.enabled && ri.url && ri.title) {
      const hash = filter.getHash(ri.url)
      if (!deduplicatedHistoryItemsHashes.has(hash)) {
        deduplicatedHistoryItemsHashes.add(hash)
        ri.title = filter.cleanTitle(ri.title)
        res.push(ri)
      }
    }
  })

  return res
}

export function getBaseFilteredRecentItems(historyItems: RecentItem[]): RecentItem[] {
  const res: RecentItem[] = []
  const deduplicatedHistoryItemsHashesByTitle = new Map<string, Set<string>>()
  historyItems.forEach((ri) => {
    if (ri.url && ri.title) {
      const urlObj = new URL(ri.url)
      const hashesByPathName = deduplicatedHistoryItemsHashesByTitle.get(ri.title)
      if (!hashesByPathName) {
        deduplicatedHistoryItemsHashesByTitle.set(ri.title, new Set(urlObj.pathname))
        res.push(ri)
      } else {
        if (!hashesByPathName.has(urlObj.pathname)) {
          hashesByPathName.add(urlObj.pathname)
          res.push(ri)
        }
      }
    }
  })

  return res
}

let moreHistoryAlreadyLoaded = false

// TODO !!! update when user focus the tab
export function tryLoadMoreHistory(dispatch: ActionDispatcher) {
  if (moreHistoryAlreadyLoaded) {
    return
  }
  moreHistoryAlreadyLoaded = true

  getHistory(false).then(recentItems => {
    dispatch({
      type: Action.SetTabsOrHistory,
      recentItems: recentItems
    })
  })
}

export function getHistory(firstTime = true): Promise<RecentItem[]> {
  return new Promise((res) => {
    const offset = 1000 * 60 * 60 * 24 * 60 //1000ms * 60sec *  60min * 24h * 60d
    const startTime = Date.now() - offset
    chrome.history.search({ text: "", maxResults: firstTime ? 100 : 10000, startTime }, function(data) {
      res(mapHistoryToRecentAndFilterIrrelevant(data))
    })
  })
}

function mapHistoryToRecentAndFilterIrrelevant(
  list: HistoryItem[]
): RecentItem[] {
  const res: RecentItem[] = []
  list.forEach(item => {
    if (!item.url || !item.title) {
      return
    }

    if (item.url.includes("translate.google.") || item.url.includes("www.deepl.com")) {
      return
    }

    res.push({
      id: parseInt(item.id, 10),
      isRecent: true,
      favIconUrl: faviconsStorage.findInCache(item.url) ?? "",
      title: item.title,
      url: item.url,
      lastVisitTime: item.lastVisitTime,
      visitCount: item.visitCount
    })
  })
  return res
}