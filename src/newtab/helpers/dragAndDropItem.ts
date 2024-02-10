const DAD_THRESHOLD = 4
type DropArea = { element: HTMLElement, rect: DOMRect, itemRects: { thresholdY: number, itemTop: number, itemHeight: number }[] }

let scrollDown = false
let scrollUp = false

export function bindDADItemEffect(
  mouseDownEvent: React.MouseEvent,
  itemConfig: {
    isFolderItem: boolean,
    onDrop: (folderId: number, itemIdInsertAfter: number | undefined, targetId: number) => void,
    onCancel: () => void,
    onClick: (targetId: number) => void,
    onDragStarted: () => boolean // return false to prevent action. Previously was named canDrag()
  },
  folderConfig?: {
    onDrop: (draggedFolderId: number, insertBeforeFolderId: number) => void,
    onCancel: () => void,
  }
) {
  const targetRoot = findRootOfDraggableItem(mouseDownEvent.target as HTMLElement)

  if (targetRoot && mouseDownEvent.button === 0) {
    return runItemDragAndDrop(mouseDownEvent, targetRoot, itemConfig.isFolderItem, itemConfig.onDrop, itemConfig.onCancel, itemConfig.onClick, itemConfig.onDragStarted)
  } else if (folderConfig) {
    const targetFolderHeader = findRootOfDraggableFolder(mouseDownEvent.target as HTMLElement)
    if (targetFolderHeader && mouseDownEvent.button === 0) {
      return runFolderDragAndDrop(mouseDownEvent, targetFolderHeader.parentElement!, folderConfig.onDrop, folderConfig.onCancel)
    }
  }
}

function runItemDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  targetRoot: HTMLElement,
  isFolderItem: boolean,
  onDrop: (folderId: number, itemIdInsertAfter: number | undefined, targetId: number) => void,
  onCancel: () => void,
  onClick: (targetId: number) => void,
  onDragStarted: () => boolean) {
  let originalFolderId: number
  let originalIndex: number
  let dummy: undefined | HTMLElement = undefined
  const placeholder: HTMLElement = createPlaceholder(true)

  const folderEls = Array.from(document.querySelectorAll(".folder .folder-items-box"))
  const calculateDropAreas = (): DropArea[] => folderEls.map((el) => ({
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
  const SCROLL_THRESHOLD = 20

  const onMouseMove = (e: MouseEvent) => {
    if (scrollDown || scrollUp) {
      // recalculate drop areas if viewport was scrolled
      dropAreas = calculateDropAreas()
    }

    scrollDown = false
    scrollUp = false

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
        targetFolderId = getFolderId(curBoxToDrop)
        if (targetFolderId === originalFolderId && res.index === originalIndex + 1) { //actual only for isFolderItem
          placeholder.style.top = `${dropArea.itemRects[originalIndex].itemTop}px`
          indexToDrop = originalIndex
        } else {
          placeholder.style.top = `${res.placeholderY}px`
          indexToDrop = res.index
        }
      }

      // Check if the element is too close to the bottom edge of the viewport
      const bottomThreshold = window.innerHeight - SCROLL_THRESHOLD
      if (e.clientY > bottomThreshold) {
        scrollDown = true
      } else if (e.clientY < SCROLL_THRESHOLD) {
        scrollUp = true
      }
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
        dummy = createTabDummy(targetRoot, mouseDownEvent, isFolderItem)
        targetRoot.style.opacity = "0"
        document.body.classList.add("dragging")
        document.body.append(dummy)
        if (isFolderItem) {
          originalIndex = Array.from(targetRoot.parentElement!.parentElement!.children).indexOf(targetRoot.parentElement!)
          originalFolderId = getFolderId(targetRoot.parentElement!.parentElement!)
        }
      }
    }
  }
  const onMouseUp = (e: MouseEvent) => {
    scrollDown = false
    scrollUp = false

    if (dummy) {
      document.body.classList.remove("dragging")
      dummy.remove()
      placeholder.remove()
      targetRoot.style.opacity = "1"
      if (prevBoxToDrop
        && !(targetFolderId === originalFolderId && originalIndex === indexToDrop)) {
        const folderId = getFolderId(prevBoxToDrop)
        const itemIdInsertAfter = getItemIdByIndex(prevBoxToDrop, indexToDrop)
        onDrop(folderId, itemIdInsertAfter, getDraggedItemId(targetRoot))
      } else {
        onCancel()
      }
    } else {
      onClick(getDraggedItemId(targetRoot))
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

function runFolderDragAndDrop(mouseDownEvent: React.MouseEvent,
                              targetRoot: HTMLElement,
                              onDrop: (draggedFolderId: number, insertBeforeFolderId: number) => void,
                              onCancel: () => void) {

  let dummy: undefined | HTMLElement = undefined
  const placeholder: HTMLElement = createPlaceholder(false)

  const folderEls = Array.from(document.querySelectorAll(".folder"))
  const calculateDropAreas = (): DropArea[] => folderEls.map((el) => ({
    element: el as HTMLElement,
    rect: el.getBoundingClientRect(),
    itemRects: null! // not needed for folder
  }))
  let dropAreas = calculateDropAreas()
  let prevBoxToDrop: HTMLElement | undefined = undefined
  const draggingFolderId = getFolderId(targetRoot)
  let targetInsertBeforeFolderId: number
  const SCROLL_THRESHOLD = 20

  const onMouseMove = (e: MouseEvent) => {
    if (scrollDown || scrollUp) {
      // recalculate drop areas if viewport was scrolled
      dropAreas = calculateDropAreas()
    }

    scrollDown = false
    scrollUp = false

    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`

      // find target position
      const dropArea = getOverlappedDropArea(dropAreas, e)
      const curBoxToDrop = dropArea ? dropArea.element : undefined
      const targetInsertBeforeFolderId0 = curBoxToDrop && getFolderId(curBoxToDrop)
      if (curBoxToDrop !== prevBoxToDrop) {
        if (curBoxToDrop && targetInsertBeforeFolderId0 && targetInsertBeforeFolderId0 !== draggingFolderId) {
          targetInsertBeforeFolderId = targetInsertBeforeFolderId0
          dropArea?.element.parentElement?.appendChild(placeholder)
        } else {
          placeholder.remove()
        }
        prevBoxToDrop = curBoxToDrop
      }
      if (curBoxToDrop && dropArea) {
        // calc placeholder placement
        placeholder.style.top = `${dropArea.element.offsetTop + 22}px`
        placeholder.style.left = `${dropArea.element.offsetLeft + 22}px`
        placeholder.style.height = `${dropArea.element.clientHeight - 80}px`
      }

      // Check if the element is too close to the bottom edge of the viewport
      const bottomThreshold = window.innerHeight - SCROLL_THRESHOLD
      if (e.clientY > bottomThreshold) {
        scrollDown = true
      } else if (e.clientY < SCROLL_THRESHOLD) {
        scrollUp = true
      }
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
    scrollDown = false
    scrollUp = false

    if (dummy) {
      document.body.classList.remove("dragging")
      dummy.remove()
      placeholder.remove()
      targetRoot.style.opacity = "1"
      if (prevBoxToDrop && targetInsertBeforeFolderId && draggingFolderId !== targetInsertBeforeFolderId) {
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

function findRootOfDraggableFolder(targetElement: HTMLElement): HTMLElement | null {
  if (isDraggableFolderHeader(targetElement)) {
    return targetElement
  }
  return null
}

function findRootOfDraggableItem(targetElement: HTMLElement): HTMLElement | null {
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

function getFolderId(dropAreaElement: HTMLElement): number {
  return parseInt(dropAreaElement.dataset.folderId!)
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

function createTabDummy(targetRoot: HTMLElement, mouseDownEvent: React.MouseEvent, isFolderItem: boolean): HTMLElement {
  const dummy = document.createElement("div")
  dummy.append(targetRoot.cloneNode(true))
  const rect = targetRoot.getBoundingClientRect()
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

const SCROLL_SPEED = 8

function getBookmarksElement(): HTMLElement {
  return document.querySelector(".bookmarks") as HTMLElement
}

function tryToScrollViewport() {
  if (scrollDown) {
    getBookmarksElement().scrollBy(0, SCROLL_SPEED)
  }

  if (scrollUp) {
    getBookmarksElement().scrollBy(0, -SCROLL_SPEED)
  }

  requestAnimationFrame(tryToScrollViewport)
}

requestAnimationFrame(tryToScrollViewport)