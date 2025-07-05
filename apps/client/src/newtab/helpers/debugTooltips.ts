import { IBookmarkItem, IGroupItem } from "./types"

const __useDebugHover = false

export function useDebugHover(): boolean {
  return __useDebugHover
}

export function getTooltipForGroup(item: IGroupItem): string {
  if (useDebugHover()) {
    return `${item.id} — ${item.position}`
  } else {
    return ""
  }
}

export function getTooltipForBookmark(item: IBookmarkItem): string {
  if (useDebugHover()) {
    return `${item.id} — ${item.position}`
  } else {
    return item.url
  }
}
