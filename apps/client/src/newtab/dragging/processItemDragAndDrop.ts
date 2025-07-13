import { unselectAllItems } from "../helpers/selectionUtils"
import { setScrollByDummyClientY, subscribeMouseEvents } from "./dragAndDropUtils"
import {
  calculateFoldersDropAreas,
  calculateGroupsDropAreas,
  createPlaceholder,
  createTabDummy,
  DropArea,
  getFolderId,
  getFolderItemId,
  getFolderItemsIds,
  getNewPlacementForItem,
  getOverlappedDropArea,
  getOverlappedFolderDropArea,
  initSpacesSwitcher,
  PConfigItem
} from "./dragAndDrop"
import { findParentWithClass, isGroupItem } from "../helpers/utils"
import { inRange } from "../helpers/mathUtils"
import { getGlobalAppState } from "../components/App"
import { findFolderByItemId, findItemById } from "../state/actionHelpers"

export function processItemDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigItem,
  onChangeSpace: (spaceId: number) => void,
  targetElements: HTMLElement[]
) {
  const movingItemsIds = getFolderItemsIds(targetElements)
  let originalIndex: number
  let originalFolderId: number
  let originalGroupId: number | undefined
  let originalInsertBeforeId: number | undefined
  let dummy: undefined | HTMLElement = undefined
  const placeholder: HTMLElement = createPlaceholder(true)

  let dropArea: DropArea | undefined = undefined
  let prevBoxToDrop: HTMLElement | undefined = undefined
  let targetFolderId: number | undefined
  let targetGroupId: number | undefined

  let dropAreas: DropArea[]
  let groupDropAreas: DropArea[]
  const onViewportScrolled = () => {
    // recalculate drop areas if viewport was scrolled
    const folderEls = Array.from(document.querySelectorAll(".folder .folder-items-box"))
    dropAreas = calculateFoldersDropAreas(folderEls, true)
    groupDropAreas = calculateGroupsDropAreas()
  }
  onViewportScrolled()

  const spacesSwitcher = initSpacesSwitcher(onChangeSpace)

  let currentGroupArea: DropArea | undefined
  let enterGroupModeTimeoutId: number | undefined
  let insertBeforeItemId: number | undefined

  function unhighlightPrevDropArea() {
    if (currentGroupArea) {
      currentGroupArea.element.classList.remove("dnd-group-mode")
      currentGroupArea = undefined
      targetGroupId = undefined
    } else {
      clearTimeout(enterGroupModeTimeoutId)
      enterGroupModeTimeoutId = undefined
    }
  }

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`

      if (enterGroupModeTimeoutId) {
        clearTimeout(enterGroupModeTimeoutId)
        enterGroupModeTimeoutId = undefined
      }
      const newGroupDropArea = getOverlappedDropArea(groupDropAreas, e)
      // make sure to not enter "group-mode" into current dragging group
      if (newGroupDropArea && !movingItemsIds.some(id => id === newGroupDropArea.objectId)) {
        if (newGroupDropArea !== currentGroupArea) {
          //enter "group-mode" if dont move mouse for X ms
          enterGroupModeTimeoutId = window.setTimeout(() => {
            unhighlightPrevDropArea()
            currentGroupArea = newGroupDropArea
            currentGroupArea.element.classList.add("dnd-group-mode")
            onMouseMove(e, false)
          }, 0)
        }
      } else {
        unhighlightPrevDropArea()
      }

      if (spacesSwitcher.test(e)) {
        requestAnimationFrame(onViewportScrolled) // to recalculate dropFoldersAreas
        placeholder.remove()
        dropArea = undefined
      } else {
        // find target position
        dropArea = getOverlappedFolderDropArea(dropAreas, e)
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
          const res = getNewPlacementForItem(dropArea, currentGroupArea, e)
          const groupItem = currentGroupArea?.objectId ? findItemById(getGlobalAppState(), currentGroupArea?.objectId) : undefined
          const isGroupCollapsed = isGroupItem(groupItem) ? groupItem.collapsed : false
          placeholder.style.visibility = isGroupCollapsed ? 'hidden' : 'visible'

          targetFolderId = dropArea.objectId
          targetGroupId = currentGroupArea?.objectId
          insertBeforeItemId = res.itemRect?.objectId

          const tryAddToOriginalPos = targetFolderId === originalFolderId
            && targetGroupId === originalGroupId
            && inRange(res.index, originalIndex, originalIndex + movingItemsIds.length)
          if (tryAddToOriginalPos) {
            const itemRects = currentGroupArea?.itemRects ?? dropArea.itemRects
            placeholder.style.top = `${itemRects[originalIndex].itemTop}px`
            targetFolderId = undefined
          } else {
            placeholder.style.top = `${res.placeholderY}px`
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

        //create dummy
        dummy = createTabDummy(targetElements, mouseDownEvent, config.isFolderItemsDragging)
        dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`
        document.body.classList.add("dragging")
        document.body.append(dummy)
        onViewportScrolled()
        if (config.isFolderItemsDragging) {
          const targetRoot = targetElements[0]
          const origContainerChildren = Array.from(getParentFolderOrGroupElement(targetRoot)!.children)

          // here we remember only first index from all selected elements
          originalIndex = origContainerChildren.indexOf(targetRoot.parentElement!)
          const nextItem = origContainerChildren.at(originalIndex + 1) as HTMLElement | undefined
          originalInsertBeforeId = nextItem ? getFolderItemId(nextItem) : undefined
          originalFolderId = getFolderId(getParentFolderElement(targetRoot)!)
          const parentGroupElement = getParentGroupElement(targetRoot)
          originalGroupId = parentGroupElement ? getFolderItemId(parentGroupElement) : undefined
        }
      }
    }
  }
  const onMouseUp = (e: any) => {
    if (dummy) {
      document.body.classList.remove("dragging")
      dummy.remove()
      placeholder.remove()
      targetElements.forEach(el => el.style.removeProperty("opacity"))
      const tryAddToOriginalPos = originalInsertBeforeId === insertBeforeItemId
        && originalGroupId === targetGroupId
        && originalFolderId === targetFolderId
      if (prevBoxToDrop && !tryAddToOriginalPos && targetFolderId) { // if folder not specified it means we add to the same position
        config.onDrop(targetFolderId, targetGroupId, insertBeforeItemId, movingItemsIds)
      } else {
        config.onCancel()
      }
      unhighlightPrevDropArea() //must be in the end to not cleanup "targetGroupId"
    } else {
      let targetId: number | undefined
      if (config.isFolderItemsDragging) {
        const itemEl = findParentWithClass(e.target, "folder-item__inner") ?? findParentWithClass(e.target, "folder-group-item__header")?.parentElement
        if (itemEl) {
          targetId = getFolderItemId(itemEl)
        } else {
          throw new Error("no targetId defined")
        }
      } else {
        // we can click only by single element
        if (!targetIsTabGroup(targetElements[0])) {
          targetId = getFolderItemId(targetElements[0])
        }
      }
      if (targetId) {
        config.onClick(targetId)
      }
    }

    unselectAllItems()
  }

  const unsubscribeEvents = subscribeMouseEvents(mouseDownEvent, onMouseMove, onMouseUp, onViewportScrolled)
  return unsubscribeEvents
}

function getParentFolderElement(target: HTMLElement): HTMLElement | undefined {
  return findParentWithClass(target, "folder-items-box")
}

function getParentGroupElement(target: HTMLElement): HTMLElement | undefined {
  return findParentWithClass(target, "group-items-box")
}

function getParentFolderOrGroupElement(target: HTMLElement): HTMLElement | undefined {
  return getParentGroupElement(target) ?? getParentFolderElement(target)
}

function targetIsTabGroup(targetElement: HTMLElement): boolean {
  return targetElement.classList.contains("is-tab-group")
}