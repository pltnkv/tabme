import { IFolderItem } from "./types"
import { convertToURL, getTempFavIconUrl } from "../state/actionHelpers"

const STORAGE_KEY = "faviconsStorage"

type FaviconInfo = {
  faviconUrl: string,
  pathParts: string[],
  folderItem: IFolderItem,
}

// Load initial data from localStorage
let cache = new Map<string, FaviconInfo[]>()

// try {
//   const stored = localStorage.getItem(STORAGE_KEY)
//   if (stored) {
//     cache = JSON.parse(stored) || {}
//   }
// } catch (e) {
//   console.error("Error parsing faviconsStorage:", e)
//   cache = {}
// }

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

function getBySiteURL(siteUrl: string | URL): string | undefined {
  const url = convertToURL(siteUrl)
  if (url?.host) {
    const infos = cache.get(url?.host)
    if (infos && infos.length > 0) {
      if (infos.length === 1) {
        return infos[0].faviconUrl
      } else {
        // Here we use smart strategy.
        // And return "faviconUrl" that matches them most number of parts in pathname of bookmarkUrl.
        const siteUrlParts = url.pathname.split("/").filter(p => p !== "")
        // console.log("AAA", siteUrl, siteUrlParts)
        let bestMatchedInfo = undefined
        let bestMatchedScore = 0
        for (let i = 0; i < infos.length; i++) {
          let score = compareParts(infos[i].pathParts, siteUrlParts)
          if (score > bestMatchedScore) {
            bestMatchedScore = score
            bestMatchedInfo = infos[i]
            if(score === MAX_SCORE) {
              break
            }
          }
        }
        // console.log('bestMatchedInfo', bestMatchedInfo, bestMatchedScore)
        return bestMatchedInfo?.faviconUrl ?? getTempFavIconUrl(url)
      }
    } else {
      return getTempFavIconUrl(url)
    }
  } else {
    return undefined
  }
}

function register(faviconUrl: string, folderItem: IFolderItem): void {
  const itemUrl = convertToURL(folderItem.url)
  if (itemUrl?.host) {
    const infos = cache.get(itemUrl.host) ?? []
    if (!infos.some(info => info.faviconUrl === faviconUrl)) {
      const newInfo: FaviconInfo = {
        faviconUrl,
        folderItem,
        pathParts: itemUrl.pathname.split("/").filter(p => p !== "")
      }
      infos?.push(newInfo)
      cache.set(itemUrl.host, infos)
    }
  }

  // Saving to LS is disabled for now

  // if (debounceTimer !== null) {
  //   clearTimeout(debounceTimer)
  // }
  // debounceTimer = window.setTimeout(() => {
  //   flushCache()
  //   debounceTimer = null
  // }, DEBOUNCE_DELAY)
}

export const faviconsStorage = {
  getByURL: getBySiteURL,
  register
}

/**
 * Returns the favicon URL for a given bookmark URL.
 * It fetches the HTML, looks for a <link rel="icon"> (or similar) element,
 * and resolves it to an absolute URL. If not found, it defaults to /favicon.ico.
 *
 * @param bookmarkUrl - The URL of the bookmarked website.
 * @returns A promise that resolves to the favicon URL.
 */
export async function loadFaviconUrl(bookmarkUrl: string): Promise<string> {
  // Create a URL object to extract the origin (protocol + host)
  const urlObj = new URL(bookmarkUrl)
  const origin = urlObj.origin

  try {
    // Fetch the HTML content of the page
    const response = await fetch(bookmarkUrl)
    const htmlText = await response.text()

    // Parse the HTML using DOMParser (available in browsers)
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlText, "text/html")

    // Look for a <link> element with a rel attribute that includes "icon"
    const iconLink = doc.querySelector("link[rel~=\"icon\"]")
    if (iconLink && iconLink.getAttribute("href")) {
      const href = iconLink.getAttribute("href")!

      // Resolve relative URLs to absolute URLs using the page origin as the base
      return new URL(href, origin).href
    }
  } catch (error) {
    console.error("Error fetching or parsing HTML:", error)
  }

  // Fallback: assume the default favicon location at the site’s root
  return `${origin}/favicon.ico`
}