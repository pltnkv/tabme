import { selectItems, unselectAllItems } from "../helpers/selectionUtils"
import { setScrollByDummyClientY, subscribeMouseEvents } from "./dragAndDropUtils"
import {
  calculateFoldersDropAreas,
  createPlaceholder,
  createTabDummy, DropArea,
  getFolderId, getIdFromElement,
  getIdsFromElements,
  getItemIdByIndex, getNewPlacementForItem,
  getOverlappedDropArea, initSpacesSwitcher, PConfigItem
} from "./dragAndDrop"
import { inRange } from "../helpers/mathUtils"
import { getGlobalAppState } from "../components/App"
import { findFolderByItemId, findItemById, getSectionChildren } from "../state/actionHelpers"
import { IFolderItem, ISpace } from "../helpers/types"

export function processItemDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigItem,
  onChangeSpace: (spaceId: number) => void,
  targetRoots: HTMLElement[]
) {
  let originalFolderId: number
  let originalIndex: number
  let dummy: undefined | HTMLElement = undefined
  const placeholder: HTMLElement = createPlaceholder(true)

  let dropArea: DropArea | undefined = undefined
  let prevBoxToDrop: HTMLElement | undefined = undefined
  let indexToDrop: number
  let targetFolderId: number

  let dropAreas: DropArea[]
  const onViewportScrolled = () => {
    // recalculate drop areas if viewport was scrolled
    const folderEls = Array.from(document.querySelectorAll(".folder .folder-items-box"))
    dropAreas = calculateFoldersDropAreas(folderEls, true)
  }
  onViewportScrolled()

  const spacesSwitcher = initSpacesSwitcher(onChangeSpace)

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`

      if (spacesSwitcher.test(e)) {
        requestAnimationFrame(onViewportScrolled) // to recalculate dropFoldersAreas
        placeholder.remove()
        dropArea = undefined
      } else {
        // find target position
        dropArea = getOverlappedDropArea(dropAreas, e)
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
      }

      setScrollByDummyClientY(e.clientY)
    } else {
      if (mouseMoved) {
        if (!config.onDragStarted()) {
          unsubscribeEvents()
          return
        }

        if (targetRoots.length === 1) {
          targetRoots = selectSectionChildrenIfNeeded(targetRoots[0])
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

function selectSectionChildrenIfNeeded(element: HTMLElement): HTMLElement[] {
  const id = getIdFromElement(element)
  const state = getGlobalAppState()
  const item = findItemById(state, id)
  if (item?.isSection && !item.collapsed) {
    const sectionChildren = getSectionChildren(id, state.spaces)
    if (sectionChildren) {
      const childrenElements = sectionChildren.map(childItem => document.querySelector(`[data-id="${childItem.id}"]`) as HTMLElement)
      childrenElements.unshift(element)
      selectItems(childrenElements)
      return childrenElements
    } else {
      return [element]
    }
  } else {
    return [element]
  }
}