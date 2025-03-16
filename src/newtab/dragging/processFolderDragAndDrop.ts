import {
  calculateFoldersDropAreas,
  calculateSpacesDropAreas, calculateTargetInsertBeforeFolderId, createFolderDummy,
  createPlaceholder,
  DropArea,
  getFolderId, getOverlappedDropArea, getOverlappedSpaceDropArea,
  PConfigFolder
} from "./dragAndDrop"
import { isViewportWasScrolled, setScrollByDummyClientY, setViewportWasScrolled, subscribeMouseEvents } from "./dragAndDropUtils"

export function processFolderDragAndDrop(mouseDownEvent: React.MouseEvent,
                                         config: PConfigFolder,
                                         targetRoot: HTMLElement) {

  let dummy: undefined | HTMLElement = undefined
  const placeholder: HTMLElement = createPlaceholder(false)
  const folderEls = Array.from(document.querySelectorAll(".folder:not(.folder--new)"))
  let dropFoldersAreas = calculateFoldersDropAreas(folderEls)
  let dropSpacesAreas = calculateSpacesDropAreas()
  let prevSpaceDropArea: DropArea | undefined = undefined
  let dropArea: DropArea | undefined = undefined
  const draggingFolderId = getFolderId(targetRoot)
  let targetInsertBeforeFolderId: number | undefined
  let lastSelectedSpaceId: number | undefined

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (isViewportWasScrolled()) {
      // recalculate drop areas if viewport was scrolled
      const folderEls = Array.from(document.querySelectorAll(".folder:not(.folder--new)"))
      dropFoldersAreas = calculateFoldersDropAreas(folderEls)
    }

    setViewportWasScrolled(false)
    setScrollByDummyClientY(undefined)

    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`

      const spaceDropArea = getOverlappedSpaceDropArea(dropSpacesAreas, e)

      if (spaceDropArea) {
        if (spaceDropArea !== prevSpaceDropArea) {
          prevSpaceDropArea = spaceDropArea
          config.onChangeSpace(spaceDropArea.objectId)
          lastSelectedSpaceId = spaceDropArea.objectId
          requestAnimationFrame(() => {
            setViewportWasScrolled(true)
          })
        }
        placeholder.remove()
        dropArea = undefined
      } else {
        prevSpaceDropArea = undefined
        dropArea = getOverlappedDropArea(dropFoldersAreas, e)
        if (dropArea) {
          const insertBefore = e.clientX < dropArea.rect.left + dropArea.rect.width / 2
          targetInsertBeforeFolderId = calculateTargetInsertBeforeFolderId(dropFoldersAreas, dropArea, insertBefore)
          console.log("targetInsertBeforeFolderId", targetInsertBeforeFolderId)

          if (dropArea.objectId !== draggingFolderId) {
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
      }

      setScrollByDummyClientY(e.clientY)
    } else {
      if (mouseMoved) {
        if (!config.onDragStarted()) {
          unsubscribeEvents()
          return
        }

        //create dummy
        dummy = createFolderDummy(targetRoot, mouseDownEvent)
        dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`
        targetRoot.style.opacity = "0.2"
        document.body.classList.add("dragging")
        document.body.append(dummy)
      }
    }
  }
  const onMouseUp = () => {
    setScrollByDummyClientY(undefined)

    if (dummy) {
      document.body.classList.remove("dragging")
      dummy.remove()
      placeholder.remove()
      targetRoot.style.removeProperty("opacity")
      if (dropArea) {
        config.onDrop(draggingFolderId, lastSelectedSpaceId, targetInsertBeforeFolderId)
      } else {
        config.onCancel()
      }
    }
  }

  const unsubscribeEvents = subscribeMouseEvents(mouseDownEvent, onMouseMove, onMouseUp)
  return unsubscribeEvents
}