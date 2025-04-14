import { IFolderItem } from "./types"
import { convertToURL, getTempFavIconUrl } from "../state/actionHelpers"

const STORAGE_KEY = "faviconsStorage"

type FaviconInfo = {
  faviconUrl: string,
  pathParts: string[],
}

// Load initial data from localStorage
let cache = new Map<string, FaviconInfo[]>()

let debounceTimer: number | null = null
const DEBOUNCE_DELAY = 200

function flushCache() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.error("Error saving faviconsStorage:", e)
  }
}

const MAX_SCORE = 2

function compareParts(infoParts: string[], siteParts: string[]): number {
  const len = Math.min(infoParts.length, siteParts.length, MAX_SCORE)
  let i
  for (i = 0; i < len; i++) {
    if (infoParts[i] !== siteParts[i]) {
      return i
    }
  }
  return i
}

function findInCache(siteUrl: string | URL, useFallback = true): string | undefined {
  const url = convertToURL(siteUrl)
  if (url?.host) {
    const infos = cache.get(url?.host)
    if (infos && infos.length > 0) {
      if (infos.length === 1) {
        return infos[0].faviconUrl
      } else {
        const siteUrlParts = url.pathname.split("/").filter(p => p !== "")
        let bestMatchedInfo = undefined
        let bestMatchedScore = 0
        for (let i = 0; i < infos.length; i++) {
          let score = compareParts(infos[i].pathParts, siteUrlParts)
          if (score > bestMatchedScore) {
            bestMatchedScore = score
            bestMatchedInfo = infos[i]
            if (score === MAX_SCORE) {
              break
            }
          }
        }
        return bestMatchedInfo?.faviconUrl ?? (useFallback ? getTempFavIconUrl(url) : undefined)
      }
    } else {
      return useFallback ? getTempFavIconUrl(url) : undefined
    }
  } else {
    return undefined
  }
}

function registerInCache(faviconUrl: string, siteUrl?: string | URL): void {
  const itemUrl = convertToURL(siteUrl)
  if (itemUrl?.host) {
    const infos = cache.get(itemUrl.host) ?? []
    if (!infos.some(info => info.faviconUrl === faviconUrl)) {
      const newInfo: FaviconInfo = {
        faviconUrl,
        pathParts: itemUrl.pathname.split("/").filter(p => p !== "")
      }
      infos?.push(newInfo)
      cache.set(itemUrl.host, infos)
    }
  }
}
registerInCache('https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_2.ico', 'https://calendar.google.com/calendar/')
registerInCache('https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', 'https://mail.google.com/mail/')
registerInCache('https://ssl.gstatic.com/docs/spreadsheets/forms/favicon_qp2.png', 'https://docs.google.com/forms/')
registerInCache('https://ssl.gstatic.com/docs/presentations/images/favicon-2023q4.ico', 'https://docs.google.com/presentation/')
registerInCache('https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico', 'https://docs.google.com/document/')

export const faviconsStorage = {
  findInCache,
  registerInCache
}

export async function loadFaviconUrl(bookmarkUrl: string, searchInCache = true): Promise<string> {

  return findInCache(bookmarkUrl, true) ?? ''

  // todo TEMP DISABLED
  //
  // if (searchInCache) {
  //   const res = findInCache(bookmarkUrl, false)
  //   if (res) {
  //     return res
  //   }
  // }
  //
  // try {
  //   const encodedUrl = encodeURIComponent(bookmarkUrl)
  //   const response = await fetch(`https://gettabme.com/app/?url=${encodedUrl}`)
  //   const data = await response.json()
  //   if (data?.favicon) {
  //     registerInCache(data.favicon, bookmarkUrl)
  //     return data.favicon
  //   }
  // } catch (error) {
  //   console.error("Error fetching favicon from gettabme.com:", error)
  // }
  //
  // return getTempFavIconUrl(bookmarkUrl)
}