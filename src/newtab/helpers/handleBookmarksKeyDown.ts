import React from "react"
import { clickFolderItem } from "./actionsHelpers"
import { findFolderByItemId } from "./utils"
import { IAppState } from "../state/state"
import { ActionDispatcher } from "../state/actions"

const FOLDER_ITEM_SELECTOR = "a.folder-item__inner"

function focusNextItem(folderItems: Element[], currentElement: Element, offset: number) {
  if (folderItems.length === 0) {
    return
  }
  const currentIndex = Array.from(folderItems).indexOf(currentElement)
  let nextIndex = currentIndex + offset
  if (nextIndex === -1) {
    nextIndex = folderItems.length - 1
  } else if (nextIndex === folderItems.length) {
    nextIndex = 0
  }

  (folderItems[nextIndex] as HTMLDivElement).focus()
}

function focusVerticalItem(offset: number) {
  if (document.activeElement) {
    const folderItems = convertItemsIntoVerticalList()
    focusNextItem(folderItems, document.activeElement, offset)
  }
}

function focusHorizontalItem(offset: number, appState: IAppState) {
  if (document.activeElement) {
    const folderItems = convertItemsIntoHorizontalList(document.activeElement as HTMLElement, appState)
    focusNextItem(folderItems, document.activeElement, offset)
  }
}

function openFocusedItem(event: React.KeyboardEvent, appState: IAppState, dispatch: ActionDispatcher) {
  const link = event.target as HTMLLinkElement
  if (link && link.href) {
    const itemId = Number(link.dataset.id)
    if (itemId) {
      const inNewTab = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      clickFolderItem(itemId, appState, dispatch, inNewTab)
    }
  }
}

export function handleBookmarksKeyDown(event: React.KeyboardEvent, appState: IAppState, dispatch: ActionDispatcher) {
  const activeElement = document.activeElement as HTMLElement
  const isActiveLink = activeElement && activeElement.classList.contains("folder-item__inner")
  if (!isActiveLink) {
    return
  }

  switch (event.code) {
    case "ArrowUp":
      focusVerticalItem(-1)
      event.preventDefault()
      break
    case "ArrowDown":
      focusVerticalItem(1)
      event.preventDefault()
      break
    case "ArrowLeft":
      focusHorizontalItem(-1, appState)
      event.preventDefault()
      break
    case "ArrowRight":
      focusHorizontalItem(1, appState)
      event.preventDefault()
      break
    case "Space":
    case "Enter":
      openFocusedItem(event, appState, dispatch)
      event.preventDefault()
    default:
      break
  }
}

type FolderPosition = {
  row: number
  col: number
  element: HTMLElement
  id: number
}

function getFolderPositions(): FolderPosition[] {
  const folderElements = document.querySelectorAll(".folder[data-folder-id]") as unknown as HTMLElement[]
  const results: FolderPosition[] = []
  let prevRes: FolderPosition | undefined
  let prevFolderBounds: DOMRect | undefined = undefined
  folderElements.forEach(f => {
    const bounds = f.getBoundingClientRect()
    const res: FolderPosition = {
      row: 0,
      col: 0,
      element: f,
      id: parseInt(f.dataset.folderId || "", 10)
    }
    if (prevFolderBounds && prevRes) {
      if (bounds.y !== prevFolderBounds.y) { // the next row started
        res.row = prevRes.row + 1
        res.col = 0
      } else { // the next col started
        res.row = prevRes.row
        res.col = prevRes.col + 1
      }
    }
    results.push(res)
    prevRes = res
    prevFolderBounds = bounds
  })

  return results
}

function convertItemsIntoVerticalList(): Element[] {
  const folderPositions = getFolderPositions()
  folderPositions.sort((a, b) => {
    // Sort by column first
    if (a.col !== b.col) {
      return a.col - b.col // Ascending order of columns (left to right)
    }
    // If columns are equal, sort by row
    return a.row - b.row // Ascending order of rows (top to bottom)
  })
  const resItems: Element[] = []
  folderPositions.forEach(folder => {
    resItems.push(...folder.element.querySelectorAll(FOLDER_ITEM_SELECTOR))
  })
  return resItems
}

function convertItemsIntoHorizontalList(currentItem: HTMLElement, appState: IAppState): Element[] {
  const currentFolder = findFolderByItemId(appState, parseInt(currentItem.dataset.id || "", 10))
  if (!currentFolder) {
    return []
  }
  const foldersPositions = getFolderPositions()
  const currentFoldersPos = foldersPositions.find(f => f.id === currentFolder.id)
  if (!currentFoldersPos) {
    return []
  }
  const allFoldersInRow = foldersPositions.filter(f => f.row === currentFoldersPos.row)
  const allItemsInCurrentFolder = Array.from(currentFoldersPos.element.querySelectorAll<HTMLElement>(FOLDER_ITEM_SELECTOR))
  const currentItemIndexInFolder = allItemsInCurrentFolder.findIndex(item => item.dataset.id === currentItem.dataset.id)
  const resItems: Element[] = []
  allFoldersInRow.forEach(folder => {
    const items = Array.from(folder.element.querySelectorAll<HTMLElement>(FOLDER_ITEM_SELECTOR))
    if (items.length > currentItemIndexInFolder) {
      resItems.push(items[currentItemIndexInFolder])
    } else if (items.length > 0) {
      resItems.push(items[items.length - 1])
    }
  })
  return resItems
}

export function handleSearchKeyDown(event: React.KeyboardEvent) {
  if (event.code === "ArrowDown") {
    const firstFolderItem = document.querySelector(FOLDER_ITEM_SELECTOR) as HTMLElement
    if (firstFolderItem) {
      firstFolderItem.focus()
      event.preventDefault()
    }
  }
}