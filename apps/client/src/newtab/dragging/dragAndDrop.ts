import { getSelectedItemsElements, unselectAllItems } from "../helpers/selectionUtils"
import { findParentWithClass, isSomeParentHaveClass, isTargetInputOrTextArea } from "../helpers/utils"
import { IPoint } from "../helpers/MathTypes"
import { processMultiselection } from "./processMultiselection"
import { processWidgetsDragAndDrop } from "./processWidgetsDragAndDrop"
import { processFolderDragAndDrop } from "./processFolderDragAndDrop"
import { processItemDragAndDrop } from "./processItemDragAndDrop"
import { processSpacesDragAndDrop } from "./processSpacesDragAndDrop"

export type ItemRect = { objectId: number, thresholdY: number, itemTop: number, itemHeight: number }
export type DropArea = { objectId: number, element: HTMLElement, rect: DOMRect, itemRects: ItemRect[] }

export type PConfigItem = {
  isFolderItem: boolean, // otherwise we drag-and-drop from sidebar
  onDrop: (folderId: number, groupId: number | undefined, insertBeforeItemId: number | undefined, targetsIds: number[]) => void,
  onCancel: () => void,
  onClick: (targetId: number) => void,
  onDragStarted: () => boolean // return false to prevent action. Previously was named canDrag()
}

export type PConfigFolder = {
  onDrop: (draggedFolderId: number, targetSpaceId: number | undefined, insertBeforeFolderId: number | undefined) => void,
  onCancel: () => void,
  onClick?: (targetId: number) => void,
  onDragStarted: () => boolean // return false to prevent action. Previously was named canDrag()
}

export type PConfigWidgets = {
  canvasEl: HTMLCanvasElement
  onWidgetsSelected: (widgetIds: number[]) => void,
  onWidgetsMoved: (positions: { id: number, pos: IPoint }[]) => void,
  onSetEditingWidget: (widgetId: number | undefined) => void,
  onCanvasDoubleClick: (pos: IPoint) => void,
  onWidgetsRightClick: (pos: IPoint, widgetId: number) => void,
  onCanvasRightClick: (pos: IPoint) => void,
}

export type PConfigSpaces = {
  onChangeSpacePosition: (spaceId: number, newPosition: string) => void,
  canSortSpaces: () => boolean,
}

export function bindDADItemEffect(
  mouseDownEvent: React.MouseEvent,
  onChangeSpace: (spaceId: number) => void,
  itemConfig: PConfigItem,
  folderConfig?: PConfigFolder,
  widgetsConfig?: PConfigWidgets,
  spacesConfig?: PConfigSpaces
) {
  const target = mouseDownEvent.target as HTMLElement
  const targetRootElements = findRootOfDraggableItem(target)
  const clickOnUIElement = isSomeParentHaveClass(target, ["widgets-hor-menu", "dropdown-menu", "modal-wrapper", "toolbar"])
  const targetFolderHeader = findRootOfDraggableFolder(target)

  if (isTargetInputOrTextArea(target) || clickOnUIElement) {
    return
  }

  if (mouseDownEvent.button === 0) { // LEFT_CLICK
    if (targetRootElements) {
      // checking if we start d&d one of selected item
      let targetRoots = [targetRootElements]
      if (getSelectedItemsElements().includes(targetRootElements)) {
        targetRoots = getSelectedItemsElements()
      }
      //todo it's not a root element, it 'folder_item_inner'. to rename
      return processItemDragAndDrop(mouseDownEvent, itemConfig, onChangeSpace, targetRoots)
    } else if (targetFolderHeader && folderConfig) {
      unselectAllItems()
      return processFolderDragAndDrop(mouseDownEvent, folderConfig, onChangeSpace, targetFolderHeader.parentElement!)
    } else if (spacesConfig && isSomeParentHaveClass(target, "spaces-list__item")) {
      if (!isSomeParentHaveClass(target, "spaces-list__delete-button") && spacesConfig.canSortSpaces()) {
        processSpacesDragAndDrop(mouseDownEvent, spacesConfig)
      }
    } else if (widgetsConfig) {
      if (isSomeParentHaveClass(target, "widget")) {
        return processWidgetsDragAndDrop(mouseDownEvent, widgetsConfig)
      } else { // click empty canvas
        return processMultiselection(mouseDownEvent, widgetsConfig)
      }
    }
  } else if (widgetsConfig && mouseDownEvent.button === 2) { // RIGHT_CLICK
    //todo subscribe mouse up
    const IGNORE_ELEMENTS = ["draggable-folder", "folder-item", "folder-group"]
    if (isSomeParentHaveClass(target, "bookmarks") && !isSomeParentHaveClass(target, IGNORE_ELEMENTS)) {
      const onContextMenu = (e: MouseEvent) => {
        const targetWidget = findParentWithClass(mouseDownEvent.target, "widget")
        if (targetWidget) {
          const targetWidgetId = getFolderItemId(targetWidget)
          widgetsConfig.onWidgetsRightClick({
            x: mouseDownEvent.clientX,
            y: mouseDownEvent.clientY
          }, targetWidgetId)
          mouseDownEvent.preventDefault()
          e.preventDefault()
        } else {
          widgetsConfig.onCanvasRightClick({
            x: mouseDownEvent.clientX,
            y: mouseDownEvent.clientY
          })
          mouseDownEvent.preventDefault()
          e.preventDefault()
        }
      }
      document.addEventListener("contextmenu", onContextMenu)

      return () => {
        document.removeEventListener("contextmenu", onContextMenu)
      }
    }
  }
}

export function initSpacesSwitcher(onChangeSpace: (spaceId: number) => void) {
  let dropSpacesAreas = calculateSpacesDropAreas()
  let prevSpaceDropArea: DropArea | undefined = undefined
  let lastSelectedSpaceId: number | undefined

  return {
    test: (e: MouseEvent): boolean => {
      const spaceDropArea = getOverlappedDropArea(dropSpacesAreas, e)
      if (spaceDropArea) {
        if (spaceDropArea !== prevSpaceDropArea) {
          prevSpaceDropArea = spaceDropArea
          onChangeSpace(spaceDropArea.objectId)
          lastSelectedSpaceId = spaceDropArea.objectId
          return true
        }
        return false
      } else {
        prevSpaceDropArea = undefined
      }
      return false
    },
    getLastSelectedSpaceId: () => {
      return lastSelectedSpaceId
    }
  }
}

const FOLDER_TOP_OFFSET = 50
const FOLDER_BOTTOM_OFFSET = 20

export function getOverlappedFolderDropArea(dropAreas: DropArea[], e: MouseEvent): DropArea | undefined {
  return dropAreas.find((da) => {
    return (
      da.rect.left < e.clientX &&
      e.clientX < da.rect.right &&
      da.rect.top - FOLDER_TOP_OFFSET < e.clientY &&
      e.clientY < da.rect.bottom + FOLDER_BOTTOM_OFFSET
    )
  })
}

export function getOverlappedDropArea(dropAreas: DropArea[], e: MouseEvent): DropArea | undefined {
  return dropAreas.find((da) => {
    return (
      da.rect.left < e.clientX &&
      e.clientX < da.rect.right &&
      da.rect.top < e.clientY &&
      e.clientY < da.rect.bottom
    )
  })
}

export function getNewPlacementForItem(dropArea: DropArea, currentGroupArea: DropArea | undefined, e: MouseEvent): { placeholderY: number, itemRect?: ItemRect, index: number } {
  const deltaY = e.clientY - dropArea.rect.y

  const itemRects = currentGroupArea?.itemRects ?? dropArea.itemRects

  const index = itemRects.findIndex(r => deltaY < r.thresholdY)
  if (index === -1) {
    const len = itemRects.length
    return {
      index: len,
      itemRect: undefined,
      placeholderY: len > 0 ? itemRects[len - 1].itemTop + itemRects[len - 1].itemHeight : 0
    }
  } else {
    return {
      index: index,
      itemRect: itemRects[index],
      placeholderY: itemRects[index].itemTop
    }
  }
}

/**
 * "undefined" result means we should insert Folder to the very end
 */
export function calculateTargetInsertBeforeFolderId(dropAreas: DropArea[], dropArea: DropArea, insertBefore: boolean): number | undefined {
  if (insertBefore) {
    return dropArea.objectId
  } else {
    const indexOfNextDropArea = dropAreas.indexOf(dropArea) + 1
    return indexOfNextDropArea < dropAreas.length ? dropAreas[indexOfNextDropArea].objectId : undefined
  }
}

function findRootOfDraggableFolder(targetElement: HTMLElement): HTMLElement | null {
  if (doStopPropagation(targetElement)) {
    return null
  }

  if (isDraggableFolderHeader(targetElement)) {
    return targetElement
  }

  if (isDraggableFolderHeader(targetElement.parentElement)) {
    return targetElement.parentElement
  }

  return null
}

function findRootOfDraggableItem(targetElement: HTMLElement): HTMLElement | null {
  if (doStopPropagation(targetElement)) {
    return null
  }

  if (isDraggableItemRoot(targetElement)) {
    return targetElement
  }
  if (isDraggableItemRoot(targetElement.parentElement)) {
    return targetElement.parentElement
  }
  if (
    targetElement.parentElement &&
    isDraggableItemRoot(targetElement.parentElement.parentElement)
  ) {
    return targetElement.parentElement.parentElement
  }
  return null
}

function isDraggableItemRoot(targetElement: HTMLElement | null): boolean {
  return targetElement ? targetElement.classList.contains("draggable-item") : false
}

export function isDraggableFolderHeader(targetElement: HTMLElement | null): boolean {
  return targetElement ? targetElement.classList.contains("draggable-folder") : false
}

export function doStopPropagation(targetElement: HTMLElement | null): boolean {
  return isSomeParentHaveClass(targetElement, "stop-dad-propagation")
}

export function getFolderId(dropAreaElement: HTMLElement): number {
  return parseInt(dropAreaElement.dataset.folderId!)
}

export function getSpaceId(dropAreaElement: HTMLElement): number {
  return parseInt(dropAreaElement.dataset.spaceId!)
}

export function getFolderItemId(target: HTMLElement): number {
  return parseInt(target.dataset.id!, 10)
}

export function getWidgetId(target: HTMLElement): number {
  return parseInt(target.dataset.id!, 10)
}

export function getFolderItemsIds(targets: HTMLElement[]): number[] {
  return targets.map(getFolderItemId)
}

export function getPosFromElement(el: HTMLElement): IPoint {
  return {
    x: parseFloat(el.style.left),
    y: parseFloat(el.style.top)
  }
}

export function createTabDummy(targetRoots: HTMLElement[], mouseDownEvent: React.MouseEvent, isFolderItem: boolean): HTMLElement {
  const dummy = document.createElement("div")
  targetRoots.forEach(selectedEl => {
    const clonedNode = selectedEl.cloneNode(true) as HTMLElement
    clonedNode.classList.add("folder-item__inner--selected")
    dummy.append(clonedNode)
    if (isFolderItem) {
      selectedEl.style.opacity = "0"
    }
  })
  const rect = targetRoots[0].getBoundingClientRect()
  dummy.style.width = `${rect.width + 4}px`
  dummy.style.marginTop = `${rect.top - mouseDownEvent.clientY}px`
  dummy.style.marginLeft = `${rect.left - mouseDownEvent.clientX}px`
  dummy.classList.add("dad-dummy")
  if (isFolderItem) {
    dummy.classList.add("dad-dummy--folder-item")
  }

  return dummy
}

export function calculateFoldersDropAreas(folderEls: Element[], calcItemRects = false): DropArea[] {
  return folderEls.map((el) => ({
    objectId: getFolderId(el as HTMLElement),
    element: el as HTMLElement,
    rect: el.getBoundingClientRect(),
    itemRects: calcItemRects ? Array.from(el.children).map((item) => {
      const offsetTop = (item as HTMLElement).offsetTop
      return {
        objectId: getFolderItemId(item as HTMLElement),
        thresholdY: offsetTop + item.clientHeight / 2,
        itemTop: offsetTop,
        itemHeight: item.clientHeight
      }
    }) : null!
  }))
}

export function calculateGroupsDropAreas(): DropArea[] {
  const groupElements = Array.from(document.querySelectorAll(".folder-group-item__inner"))
  return groupElements.map((el) => ({
    objectId: getFolderItemId(el as HTMLElement),
    element: el as HTMLElement,
    rect: el.getBoundingClientRect(),
    itemRects: Array.from(el.querySelectorAll(".folder-item")).map((item) => {
      const offsetTop = (item as HTMLElement).offsetTop
      return {
        objectId: getFolderItemId(item as HTMLElement),
        thresholdY: offsetTop + item.clientHeight / 2,
        itemTop: offsetTop,
        itemHeight: item.clientHeight
      }
    })
  }))
}

export function calculateSpacesDropAreas(): DropArea[] {
  const spacesEls = Array.from(document.querySelectorAll(".spaces-list__item"))
  return spacesEls.map((el) => ({
    objectId: getSpaceId(el as HTMLElement),
    element: el as HTMLElement,
    rect: el.getBoundingClientRect(),
    itemRects: null!
  }))
}

export function createFolderDummy(targetRoot: HTMLElement, mouseDownEvent: React.MouseEvent): HTMLElement {
  // targetRoot.style.opacity = `0.4`
  const dummy = document.createElement("div")
  dummy.append(targetRoot.cloneNode(true))
  dummy.style.opacity = "0.8"
  const itemsBoxEl = dummy.querySelector<HTMLElement>(".folder-items-box")
  if (itemsBoxEl) {
    itemsBoxEl.style.visibility = "hidden"
  }

  const buttons = dummy.querySelectorAll<HTMLElement>(".btn__icon, .inbox-item__already-saved")
  buttons.forEach(btn => {
    btn.style.display = "none"
  })

  const rect = targetRoot.getBoundingClientRect()
  // dummy.style.width = `${rect.width + 4}px`
  dummy.style.marginTop = `${rect.top - mouseDownEvent.clientY}px`
  dummy.style.marginLeft = `${rect.left - mouseDownEvent.clientX}px`
  dummy.classList.add("dad-dummy")
  return dummy
}

export function createPlaceholder(forItem: boolean) {
  const dummy = document.createElement("div")
  dummy.classList.add(forItem ? "bm-item-placeholder" : "bm-folder-placeholder")
  return dummy
}
