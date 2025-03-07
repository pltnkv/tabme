import { unselectAll } from "./selectionUtils"
import { findParentWithClass } from "./utils"
import { insertBetween } from "./fractionalIndexes"

const DAD_THRESHOLD = 4

export function bindDADSpaceEffect(
  mouseDownEvent: React.MouseEvent,
  config: {
    onChangeSpacePosition: (spaceId: number, newPosition:string) => void,
  }
) {
  if(mouseDownEvent.button === 0) {
    runDragAndDrop(mouseDownEvent, config.onChangeSpacePosition)
  }
}

type InitRes = {
  clonedSpacesList: HTMLElement,
  clonedSpacesListRect: DOMRect,
  clonedItems: HTMLElement[],
  draggingItem: HTMLElement,
  draggingItemStartLeft: number
}

function runDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  onChangeSpacePosition: (spaceId: number, newPosition:string) => void,
) {
  let dummy: InitRes | undefined
  let prevOverItem: HTMLElement | undefined = undefined
  let prevInsertType: string = ""

  const target = findParentWithClass(mouseDownEvent.target as HTMLElement, "spaces-list__item")

  if (!target) {
    return
  }

  function findOverItem(mouseX: number) {
    let overItem: HTMLElement | undefined = undefined
    let insertType = ""
    dummy!.clonedItems.some(item => {
      if (item === dummy!.draggingItem) {
        return false
      }
      const rect = item.getBoundingClientRect()
      if (rect.left < mouseX && mouseX < rect.right) {
        overItem = item
        insertType = rect.left + rect.width / 2 < mouseX ? "after" : "before"
        return true
      }
    })
    return {
      overItem,
      insertType
    }
  }

  function insertSpaceBetween(overItem: HTMLElement, insertType: string) {
    const items = getSortedItems(dummy!.clonedItems)
    const overItemIndex = items.indexOf(overItem)
    if (insertType === "before") {
      dummy!.draggingItem.dataset.position = insertBetween(items[overItemIndex - 1]?.dataset.position ?? "", overItem.dataset.position!)
    } else {
      dummy!.draggingItem.dataset.position = insertBetween(overItem.dataset.position!, items[overItemIndex + 1]?.dataset.position ?? "")
    }

    updateItemsOrder(dummy!.clonedItems, dummy!.draggingItem)
  }

  const onMouseMove = (e: MouseEvent) => {
    if (dummy) {
      // move dummy
      const delta = mouseDownEvent.clientX - e.clientX
      if (dummy.clonedSpacesListRect.left - 10 < e.clientX && e.clientX < dummy.clonedSpacesListRect.right + 10) {
        dummy.draggingItem.style.left = `${dummy.draggingItemStartLeft - delta}px`
        const { overItem, insertType } = findOverItem(e.clientX)
        if (overItem && (prevOverItem !== prevOverItem || prevInsertType !== insertType)) {
          prevOverItem = overItem
          prevInsertType = insertType
          insertSpaceBetween(overItem, insertType)
        }
      }
    } else {
      if (
        Math.abs(mouseDownEvent.clientX - e.clientX) > DAD_THRESHOLD ||
        Math.abs(mouseDownEvent.clientY - e.clientY) > DAD_THRESHOLD
      ) {

        //create dummy
        dummy = createClonedSpacesList(target)
        document.body.appendChild(dummy.clonedSpacesList)
      }
    }
  }
  const onMouseUp = () => {

    if (dummy) {
      document.body.classList.remove("dragging")
      dummy.clonedSpacesList.remove()
      console.log(dummy.draggingItem.dataset.spaceId!, dummy.draggingItem.dataset.position!)
      onChangeSpacePosition(parseInt(dummy.draggingItem.dataset.spaceId!, 10), dummy.draggingItem.dataset.position!)

    } else {
      // do nothing here
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

const ITEM_MARGIN_RIGHT = 12

function createClonedSpacesList(target: HTMLElement): InitRes {
  const origSpacesList = document.querySelector(".spaces-list") as HTMLElement
  const origItems = Array.from(origSpacesList.querySelectorAll(".spaces-list__item"))

  const listRect = origSpacesList.getBoundingClientRect()
  const clonedSpacesList = origSpacesList.cloneNode() as HTMLElement
  clonedSpacesList.classList.add("dummy")
  clonedSpacesList.style.position = "absolute"
  clonedSpacesList.style.width = `${listRect.width}px`
  clonedSpacesList.style.height = `${listRect.height}px`
  clonedSpacesList.style.top = `${listRect.top}px`
  clonedSpacesList.style.left = `${listRect.left}px`

  let draggingItem: HTMLElement = undefined!
  let clonedItems: HTMLElement[] = []
  origItems.forEach(item => {
    const clonedItem = item.cloneNode(true) as HTMLElement
    const itemRect = item.getBoundingClientRect()
    console.log(itemRect)
    clonedItem.style.position = "absolute"
    clonedItem.style.width = `${itemRect.width}px`
    clonedItem.style.top = `${itemRect.top - listRect.top}px`

    if (target.dataset.spaceId === clonedItem.dataset.spaceId) {
      clonedItem.classList.add("dummy")
      draggingItem = clonedItem
    }

    clonedSpacesList.append(clonedItem)
    clonedItems.push(clonedItem)
  })
  draggingItem.style.zIndex = "10"
  updateItemsOrder(clonedItems)

  return {
    clonedSpacesList,
    clonedSpacesListRect: listRect,
    clonedItems,
    draggingItem,
    draggingItemStartLeft: parseInt(draggingItem.style.left, 10)
  }
}

function updateItemsOrder(items: HTMLElement[], skipElement?: HTMLElement) {
  const itemsArray = getSortedItems(items)
  let curX = 2 //padding in spaces-list
  itemsArray.forEach(item => {
    if (item !== skipElement) {
      item.style.left = `${curX}px`
    }
    curX += parseInt(item.style.width, 10) + ITEM_MARGIN_RIGHT
  })
}

function getSortedItems(items: HTMLElement[]): HTMLElement[] {
  return items.sort((a, b) => {
    if (a.dataset.position! < b.dataset.position!) {
      return -1
    } else if (a.dataset.position! > b.dataset.position!) {
      return 1
    }
    return 0
  })
}