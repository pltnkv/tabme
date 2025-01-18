import { getSelectedItemsElements, selectItems, unselectAll } from "./selectionUtils"

const DAD_THRESHOLD = 4
type DropArea = { folderId: number, element: HTMLElement, rect: DOMRect, itemRects: { thresholdY: number, itemTop: number, itemHeight: number }[] }

let viewportWasScrolled = false //performance optimization
let scrollByDummyClientY: number | undefined = undefined

export function bindDADItemEffect(
  mouseDownEvent: React.MouseEvent,
  itemConfig: {
    isFolderItem: boolean, // otherwise we drag-and-drop from sidebar
    onDrop: (folderId: number, insertBeforeItemId: number | undefined, targetsIds: number[]) => void,
    onCancel: () => void,
    onClick: (targetId: number) => void,
    onDragStarted: () => boolean // return false to prevent action. Previously was named canDrag()
  },
  folderConfig?: {
    onDrop: (draggedFolderId: number, insertBeforeFolderId: number | undefined) => void,
    onCancel: () => void,
  },
  canvasEl?: HTMLCanvasElement
) {
  const targetRoot = findRootOfDraggableItem(mouseDownEvent.target as HTMLElement)
  const targetFolderHeader = findRootOfDraggableFolder(mouseDownEvent.target as HTMLElement)

  if (targetRoot && mouseDownEvent.button === 0) {
    // checking if we start d&d one of selected item
    let targetRoots = [targetRoot]
    if (getSelectedItemsElements().includes(targetRoot)) {
      targetRoots = getSelectedItemsElements()
    }
    return runItemDragAndDrop(mouseDownEvent, targetRoots, itemConfig.isFolderItem, itemConfig.onDrop, itemConfig.onCancel, itemConfig.onClick, itemConfig.onDragStarted)
  } else if (folderConfig && targetFolderHeader && mouseDownEvent.button === 0) {
    unselectAll()
    return runFolderDragAndDrop(mouseDownEvent, targetFolderHeader.parentElement!, folderConfig.onDrop, folderConfig.onCancel)
  } else {
    const isInput = (mouseDownEvent.target as HTMLElement).tagName === "INPUT"
    if (canvasEl && mouseDownEvent.button === 0 && !isInput) {
      return runMultiselection(mouseDownEvent, canvasEl)
    }
  }
}

function runMultiselection(mouseDownEvent: React.MouseEvent, canvas: HTMLCanvasElement) {
  let mouseMoved = false
  const rect = canvas.getBoundingClientRect()
  const startPos = {
    x: mouseDownEvent.clientX - rect.left,
    y: mouseDownEvent.clientY - rect.top
  }
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * dpr
  canvas.height = canvas.clientHeight * dpr
  const context = canvas.getContext("2d")!
  context.scale(dpr, dpr)
  if (!context) {
    return
  }

  const itemElements = Array.from(document.querySelectorAll(".bookmarks .folder-item__inner")) as HTMLElement[]
  const itemsByRect = itemElements.map(el => ({
    rect: el.getBoundingClientRect(),
    element: el
  }))

  const onMouseMove = (e: MouseEvent) => {
    if (!mouseMoved) {
      const maxDelta = Math.max(Math.abs(mouseDownEvent.clientX - e.clientX), Math.abs(mouseDownEvent.clientY - e.clientY))
      if (maxDelta < 3) {
        return
      }
    }

    mouseMoved = true
    canvas.style.pointerEvents = "auto"

    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    // Clear the canvas before drawing the new rectangle
    context.clearRect(0, 0, canvas.width * dpr, canvas.height * dpr)

    // Draw the rectangle
    context.strokeStyle = "rgba(56, 89, 255, 1)"
    context.lineWidth = 2
    context.strokeRect(startPos.x, startPos.y, currentX - startPos.x, currentY - startPos.y)

    const selectionRect: Rect = normalizeRect({
      x: mouseDownEvent.clientX,
      y: mouseDownEvent.clientY,
      width: e.clientX - mouseDownEvent.clientX,
      height: e.clientY - mouseDownEvent.clientY
    })

    const itemsToSelect: HTMLElement[] = []
    itemsByRect.forEach(i => {
      if (areRectsOverlapping(selectionRect, i.rect)) {
        itemsToSelect.push(i.element)
      }
    })
    selectItems(itemsToSelect)
  }

  const onMouseUp = (e:MouseEvent) => {
    if (!mouseMoved) {
      const folderItemFirstSelected = document.querySelector(".folder-item--first-selected")
      if (folderItemFirstSelected && folderItemFirstSelected.contains(e.target as HTMLElement)) {
        // todo hacking hack. make possible to click content menu button on first selected element
        // ideally we need to move selected-items management to store.
      } else {
        unselectAll()
      }
    }
    context.clearRect(0, 0, canvas.width * dpr, canvas.height * dpr)
    canvas.style.pointerEvents = "none"
    unsubscribeEvents()
  }

  document.addEventListener("mousemove", onMouseMove)
  document.addEventListener("mouseup", onMouseUp)

  const unsubscribeEvents = () => {
    document.removeEventListener("mousemove", onMouseMove)
    document.removeEventListener("mouseup", onMouseUp)
  }

  return unsubscribeEvents
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function areRectsOverlapping(rect1: Rect, rect2: Rect): boolean {
  // Check if one rectangle is to the left of the other
  if (rect1.x + rect1.width <= rect2.x || rect2.x + rect2.width <= rect1.x) {
    return false
  }

  // Check if one rectangle is above the other
  if (rect1.y + rect1.height <= rect2.y || rect2.y + rect2.height <= rect1.y) {
    return false
  }

  // If neither condition is true, the rectangles must overlap
  return true
}

function normalizeRect(rect: Rect): Rect {
  let normalizedRect = { ...rect }

  // If width is negative, adjust the x coordinate and make width positive
  if (normalizedRect.width < 0) {
    normalizedRect.x += normalizedRect.width
    normalizedRect.width = Math.abs(normalizedRect.width)
  }

  // If height is negative, adjust the y coordinate and make height positive
  if (normalizedRect.height < 0) {
    normalizedRect.y += normalizedRect.height
    normalizedRect.height = Math.abs(normalizedRect.height)
  }

  return normalizedRect
}

function runItemDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  targetRoots: HTMLElement[],
  isFolderItem: boolean,
  onDrop: (folderId: number, itemIdInsertBefore: number | undefined, targetIds: number[]) => void,
  onCancel: () => void,
  onClick: (targetId: number) => void,
  onDragStarted: () => boolean) {
  let originalFolderId: number
  let originalIndex: number
  let dummy: undefined | HTMLElement = undefined
  const placeholder: HTMLElement = createPlaceholder(true)

  const folderEls = Array.from(document.querySelectorAll(".folder .folder-items-box"))
  const calculateDropAreas = (): DropArea[] => folderEls.map((el) => ({
    folderId: getFolderId(el as HTMLElement),
    element: el as HTMLElement,
    rect: el.getBoundingClientRect(),
    itemRects: Array.from(el.children).map((item) => {
      //todo support grid
      const offsetTop = (item as HTMLElement).offsetTop
      return {
        thresholdY: offsetTop + item.clientHeight / 2,
        itemTop: offsetTop,
        itemHeight: item.clientHeight
      }
    })
  }))
  let dropAreas = calculateDropAreas()

  let prevBoxToDrop: HTMLElement | undefined = undefined
  let indexToDrop: number
  let targetFolderId: number

  const onMouseMove = (e: MouseEvent) => {
    if (viewportWasScrolled) {
      // recalculate drop areas if viewport was scrolled
      dropAreas = calculateDropAreas()
    }
    viewportWasScrolled = false
    scrollByDummyClientY = undefined

    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`

      // find target position
      const dropArea = getOverlappedDropArea(dropAreas, e)
      const curBoxToDrop = dropArea ? dropArea.element : undefined
      if (curBoxToDrop !== prevBoxToDrop) {
        if (curBoxToDrop) {
          curBoxToDrop.appendChild(placeholder)
        } else {
          placeholder.remove()
        }
        prevBoxToDrop = curBoxToDrop
      }
      if (curBoxToDrop && dropArea) {
        const res = getNewPlacementForItem(dropArea, e)
        targetFolderId = dropArea.folderId
        const tryAddToOriginalPos = targetFolderId === originalFolderId && inRange(res.index, originalIndex, originalIndex + targetRoots.length)
        if (tryAddToOriginalPos) { //actual only for isFolderItem
          placeholder.style.top = `${dropArea.itemRects[originalIndex].itemTop}px`
          indexToDrop = originalIndex
        } else {
          placeholder.style.top = `${res.placeholderY}px`
          indexToDrop = res.index
        }
      }

      scrollByDummyClientY = e.clientY
    } else {
      if (
        Math.abs(mouseDownEvent.clientX - e.clientX) > DAD_THRESHOLD ||
        Math.abs(mouseDownEvent.clientY - e.clientY) > DAD_THRESHOLD
      ) {
        if (!onDragStarted()) {
          unsubscribeEvents()
          return
        }
        //create dummy
        dummy = createTabDummy(targetRoots, mouseDownEvent, isFolderItem)
        dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`
        document.body.classList.add("dragging")
        document.body.append(dummy)
        if (isFolderItem) {
          // currently we support drag-and-drop of single folder only
          const targetRoot = targetRoots[0]
          // here we remember only first index from all selected elements
          originalIndex = Array.from(targetRoot.parentElement!.parentElement!.children).indexOf(targetRoot.parentElement!)
          originalFolderId = getFolderId(targetRoot.parentElement!.parentElement!)
        }
      }
    }
  }
  const onMouseUp = () => {
    scrollByDummyClientY = undefined

    if (dummy) {
      document.body.classList.remove("dragging")
      dummy.remove()
      placeholder.remove()
      targetRoots.forEach(el => el.style.removeProperty("opacity"))
      const tryAddToOriginalPos = targetFolderId === originalFolderId && inRange(indexToDrop, originalIndex, originalIndex + targetRoots.length)
      if (prevBoxToDrop && !tryAddToOriginalPos) {
        const folderId = getFolderId(prevBoxToDrop)
        const itemIdInsertBefore = getItemIdByIndex(prevBoxToDrop, indexToDrop)
        onDrop(folderId, itemIdInsertBefore, getDraggedItemsIds(targetRoots))
      } else {
        onCancel()
      }
    } else {
      // we can click only by single element
      onClick(getDraggedItemsIds(targetRoots)[0])
    }

    unselectAll()
    unsubscribeEvents()
  }
  document.body.addEventListener("mousemove", onMouseMove)
  document.body.addEventListener("mouseup", onMouseUp)

  const unsubscribeEvents = () => {
    document.body.removeEventListener("mousemove", onMouseMove)
    document.body.removeEventListener("mouseup", onMouseUp)
  }

  return unsubscribeEvents
}

function runFolderDragAndDrop(mouseDownEvent: React.MouseEvent,
                              targetRoot: HTMLElement,
                              onDrop: (draggedFolderId: number, insertBeforeFolderId: number | undefined) => void,
                              onCancel: () => void) {

  let dummy: undefined | HTMLElement = undefined
  const placeholder: HTMLElement = createPlaceholder(false)

  const folderEls = Array.from(document.querySelectorAll(".folder:not(.folder--new)"))
  const calculateDropAreas = (): DropArea[] => folderEls.map((el) => ({
    folderId: getFolderId(el as HTMLElement),
    element: el as HTMLElement,
    rect: el.getBoundingClientRect(),
    itemRects: null! // not needed for folder
  }))
  let dropAreas = calculateDropAreas()
  let dropArea: DropArea | undefined = undefined
  const draggingFolderId = getFolderId(targetRoot)
  let targetInsertBeforeFolderId: number | undefined

  const onMouseMove = (e: MouseEvent) => {
    if (viewportWasScrolled) {
      // recalculate drop areas if viewport was scrolled
      dropAreas = calculateDropAreas()
    }

    viewportWasScrolled = false
    scrollByDummyClientY = undefined

    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`

      // find target position
      dropArea = getOverlappedDropArea(dropAreas, e)
      if (dropArea) {
        const insertBefore = e.clientX < dropArea.rect.left + dropArea.rect.width / 2
        targetInsertBeforeFolderId = calculateTargetInsertBeforeFolderId(dropAreas, dropArea, insertBefore)

        if (dropArea.folderId !== draggingFolderId) {
          const leftShift = 10
          dropArea.element.parentElement?.appendChild(placeholder)
          placeholder.style.top = `${dropArea.element.offsetTop + 22}px`
          placeholder.style.left = insertBefore ? `${dropArea.element.offsetLeft + leftShift}px` : `${dropArea.element.offsetLeft + dropArea.element.clientWidth + leftShift}px`
          placeholder.style.height = `${dropArea.element.clientHeight - 80}px`
        } else {
          placeholder.remove()
        }
      } else {
        placeholder.remove()
      }

      scrollByDummyClientY = e.clientY
    } else {
      if (
        Math.abs(mouseDownEvent.clientX - e.clientX) > DAD_THRESHOLD ||
        Math.abs(mouseDownEvent.clientY - e.clientY) > DAD_THRESHOLD
      ) {
        //create dummy
        dummy = createFolderDummy(targetRoot, mouseDownEvent)
        dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`
        targetRoot.style.opacity = "0"
        document.body.classList.add("dragging")
        document.body.append(dummy)
      }
    }
  }
  const onMouseUp = () => {
    scrollByDummyClientY = undefined

    if (dummy) {
      document.body.classList.remove("dragging")
      dummy.remove()
      placeholder.remove()
      targetRoot.style.removeProperty("opacity")
      if (dropArea && draggingFolderId !== targetInsertBeforeFolderId) {
        onDrop(draggingFolderId, targetInsertBeforeFolderId)
      } else {
        onCancel()
      }
    }

    unsubscribeEvents()
  }
  document.body.addEventListener("mousemove", onMouseMove)
  document.body.addEventListener("mouseup", onMouseUp)

  const unsubscribeEvents = () => {
    document.body.removeEventListener("mousemove", onMouseMove)
    document.body.removeEventListener("mouseup", onMouseUp)
  }

  return unsubscribeEvents
}

const FOLDER_TOP_OFFSET = 50
const FOLDER_BOTTOM_OFFSET = 20

function getOverlappedDropArea(dropAreas: DropArea[], e: MouseEvent): DropArea | undefined {
  return dropAreas.find((da) => {
    return (
      da.rect.left < e.clientX &&
      e.clientX < da.rect.right &&
      da.rect.top - FOLDER_TOP_OFFSET < e.clientY &&
      e.clientY < da.rect.bottom + FOLDER_BOTTOM_OFFSET
    )
  })
}

function getNewPlacementForItem(dropArea: DropArea, e: MouseEvent): { placeholderY: number, index: number } {
  const deltaY = e.clientY - dropArea.rect.y

  const index = dropArea.itemRects.findIndex(r => deltaY < r.thresholdY)
  if (index === -1) {
    const len = dropArea.itemRects.length
    return {
      index: len,
      placeholderY: len > 0 ? dropArea.itemRects[len - 1].itemTop + dropArea.itemRects[len - 1].itemHeight : 0
    }
  } else {
    return {
      index,
      placeholderY: dropArea.itemRects[index].itemTop
    }
  }
}

/**
 * "undefined" result means we should insert Folder to the very end
 */
function calculateTargetInsertBeforeFolderId(dropAreas: DropArea[], dropArea: DropArea, insertBefore: boolean): number | undefined {
  if (insertBefore) {
    return dropArea.folderId
  } else {
    const indexOfNextDropArea = dropAreas.indexOf(dropArea) + 1
    return indexOfNextDropArea < dropAreas.length ? dropAreas[indexOfNextDropArea].folderId : undefined
  }
}

function findRootOfDraggableFolder(targetElement: HTMLElement): HTMLElement | null {
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

function isDraggableFolderHeader(targetElement: HTMLElement | null): boolean {
  return targetElement ? targetElement.classList.contains("draggable-folder") : false
}

function doStopPropagation(targetElement: HTMLElement | null): boolean {
  return targetElement ? targetElement.classList.contains("stop-dad-propagation") : false
}

function getFolderId(dropAreaElement: HTMLElement): number {
  return parseInt(dropAreaElement.dataset.folderId!)
}

export function getDraggedItemsIds(targets: HTMLElement[]): number[] {
  return targets.map(getDraggedItemId)
}

export function getDraggedItemId(target: HTMLElement): number {
  return parseInt(target.dataset.id!, 10)
}

function getItemIdByIndex(currentBoxToDrop: HTMLElement, index: number): number | undefined {
  const children = currentBoxToDrop.children
  if (index >= children.length) {
    return undefined //means paste last
  } else {
    const item = children.item(index)!.querySelector(".folder-item__inner") as HTMLElement
    return parseInt(item.dataset.id!, 10)
  }
}

function createTabDummy(targetRoots: HTMLElement[], mouseDownEvent: React.MouseEvent, isFolderItem: boolean): HTMLElement {
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

function createFolderDummy(targetRoot: HTMLElement, mouseDownEvent: React.MouseEvent): HTMLElement {
  const dummy = document.createElement("div")
  dummy.append(targetRoot.cloneNode(true))
  const rect = targetRoot.getBoundingClientRect()
  // dummy.style.width = `${rect.width + 4}px`
  dummy.style.marginTop = `${rect.top - mouseDownEvent.clientY}px`
  dummy.style.marginLeft = `${rect.left - mouseDownEvent.clientX}px`
  dummy.classList.add("dad-dummy")
  return dummy
}

function createPlaceholder(forItem: boolean) {
  const dummy = document.createElement("div")
  dummy.classList.add(forItem ? "bm-item-placeholder" : "bm-folder-placeholder")
  return dummy
}

const MAX_SCROLL_SPEED = 18
const SCROLL_THRESHOLD = 60

function getBookmarksElement(): HTMLElement {
  return document.querySelector(".bookmarks") as HTMLElement
}

function tryToScrollViewport() {
  viewportWasScrolled = false
  if (typeof scrollByDummyClientY === "number") {
    // Check if the element is too close to the bottom edge of the viewport
    const bottomThreshold = window.innerHeight - SCROLL_THRESHOLD
    if (scrollByDummyClientY > bottomThreshold) { // scroll down
      const speed = Math.min((scrollByDummyClientY - bottomThreshold) / SCROLL_THRESHOLD * MAX_SCROLL_SPEED, MAX_SCROLL_SPEED)
      getBookmarksElement().scrollBy(0, speed)
      viewportWasScrolled = true
    } else if (scrollByDummyClientY < SCROLL_THRESHOLD) { // scroll up
      const speed = Math.min((SCROLL_THRESHOLD - scrollByDummyClientY) / SCROLL_THRESHOLD * MAX_SCROLL_SPEED, MAX_SCROLL_SPEED)
      getBookmarksElement().scrollBy(0, -speed)
      viewportWasScrolled = true
    }
  }

  requestAnimationFrame(tryToScrollViewport)
}

function inRange(index: number, min: number, max: number) {
  return index >= min && index <= max
}

requestAnimationFrame(tryToScrollViewport)