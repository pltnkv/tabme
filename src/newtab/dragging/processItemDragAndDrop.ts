import { unselectAllItems } from "../helpers/selectionUtils"
import { setScrollByDummyClientY, subscribeMouseEvents } from "./dragAndDropUtils"
import {
  calculateFoldersDropAreas,
  createPlaceholder,
  createTabDummy,
  getFolderId,
  getIdsFromElements,
  getItemIdByIndex, getNewPlacementForItem,
  getOverlappedDropArea, PConfigItem,
} from "./dragAndDrop"
import { inRange } from "../helpers/mathUtils"

export function processItemDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigItem,
  targetRoots: HTMLElement[]
) {
  let originalFolderId: number
  let originalIndex: number
  let dummy: undefined | HTMLElement = undefined
  const placeholder: HTMLElement = createPlaceholder(true)

  const folderEls = Array.from(document.querySelectorAll(".folder .folder-items-box"))
  let dropAreas = calculateFoldersDropAreas(folderEls, true)

  let prevBoxToDrop: HTMLElement | undefined = undefined
  let indexToDrop: number
  let targetFolderId: number

  const onViewportScrolled = () => {
    // recalculate drop areas if viewport was scrolled
    dropAreas = calculateFoldersDropAreas(folderEls, true)
  }

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
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
        targetFolderId = dropArea.objectId
        const tryAddToOriginalPos = targetFolderId === originalFolderId && inRange(res.index, originalIndex, originalIndex + targetRoots.length)
        if (tryAddToOriginalPos) { //actual only for isFolderItem
          placeholder.style.top = `${dropArea.itemRects[originalIndex].itemTop}px`
          indexToDrop = originalIndex
        } else {
          placeholder.style.top = `${res.placeholderY}px`
          indexToDrop = res.index
        }
      }

      setScrollByDummyClientY(e.clientY)
    } else {
      if (mouseMoved) {
        if (!config.onDragStarted()) {
          unsubscribeEvents()
          return
        }
        //create dummy
        dummy = createTabDummy(targetRoots, mouseDownEvent, config.isFolderItem)
        dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`
        document.body.classList.add("dragging")
        document.body.append(dummy)
        if (config.isFolderItem) {
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
    if (dummy) {
      document.body.classList.remove("dragging")
      dummy.remove()
      placeholder.remove()
      targetRoots.forEach(el => el.style.removeProperty("opacity"))
      const tryAddToOriginalPos = targetFolderId === originalFolderId && inRange(indexToDrop, originalIndex, originalIndex + targetRoots.length)
      if (prevBoxToDrop && !tryAddToOriginalPos) {
        const folderId = getFolderId(prevBoxToDrop)
        const insertBeforeItemId = getItemIdByIndex(prevBoxToDrop, indexToDrop)
        config.onDrop(folderId, insertBeforeItemId, getIdsFromElements(targetRoots))
      } else {
        config.onCancel()
      }
    } else {
      // we can click only by single element
      config.onClick(getIdsFromElements(targetRoots)[0])
    }

    unselectAllItems()
  }

  const unsubscribeEvents = subscribeMouseEvents(mouseDownEvent, onMouseMove, onMouseUp, onViewportScrolled)
  return unsubscribeEvents
}