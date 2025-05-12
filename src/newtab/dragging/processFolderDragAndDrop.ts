import {
  calculateFoldersDropAreas,
  calculateTargetInsertBeforeFolderId,
  createFolderDummy,
  createPlaceholder,
  DropArea,
  getFolderId,
  getOverlappedDropArea,
  initSpacesSwitcher,
  PConfigFolder
} from "./dragAndDrop"
import { setScrollByDummyClientY, subscribeMouseEvents } from "./dragAndDropUtils"

export function processFolderDragAndDrop(mouseDownEvent: React.MouseEvent,
                                         config: PConfigFolder,
                                         onChangeSpace: (spaceId: number) => void,
                                         targetRoot: HTMLElement) {

  const placeholder: HTMLElement = createPlaceholder(false)
  const draggingFolderId = getFolderId(targetRoot)
  const spacesSwitcher = initSpacesSwitcher(onChangeSpace)
  let dummy: undefined | HTMLElement = undefined
  let dropArea: DropArea | undefined = undefined
  let targetInsertBeforeFolderId: number | undefined

  let dropFoldersAreas: DropArea[]
  const onViewportScrolled = () => {
    const folderEls = Array.from(document.querySelectorAll(".folder:not(.folder--new)"))
    dropFoldersAreas = calculateFoldersDropAreas(folderEls)
  }
  onViewportScrolled()

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${e.clientY + "px"})`

      if (spacesSwitcher.test(e)) {
        requestAnimationFrame(onViewportScrolled) // to recalculate dropFoldersAreas
        placeholder.remove()
        dropArea = undefined
      } else {
        dropArea = getOverlappedDropArea(dropFoldersAreas, e)
        if (dropArea) {
          const insertBefore = e.clientX < dropArea.rect.left + dropArea.rect.width / 2
          targetInsertBeforeFolderId = calculateTargetInsertBeforeFolderId(dropFoldersAreas, dropArea, insertBefore)

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
    if (dummy) {
      document.body.classList.remove("dragging")
      dummy.remove()
      placeholder.remove()
      targetRoot.style.removeProperty("opacity")
      if (dropArea) {
        config.onDrop(draggingFolderId, spacesSwitcher.getLastSelectedSpaceId(), targetInsertBeforeFolderId)
      } else {
        config.onCancel()
      }
    } else if (config.onClick) {
      config.onClick(draggingFolderId)
    }
  }

  const unsubscribeEvents = subscribeMouseEvents(mouseDownEvent, onMouseMove, onMouseUp, onViewportScrolled)
  return unsubscribeEvents
}