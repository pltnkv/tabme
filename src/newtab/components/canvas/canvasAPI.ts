import { Action } from "../../state/state"
import { hideWidgetsContextMenu, updateWidgetsContextMenu } from "./widgetsContextMenu"
import { ActionDispatcher } from "../../state/actions"
import { getCanvasScrolledOffset, hideWidgetsSelectionFrame, updateWidgetsSelectionFrame_RAF_NotPerformant } from "./widgetsSelectionFrame"
import { createFolderWithStat } from "../../helpers/actionsHelpersWithDOM"
import { genUniqLocalId } from "../../state/actionHelpers"
import { IFolder } from "../../helpers/types"
import { insertBetween } from "../../helpers/fractionalIndexes"
import { getMouseX, getMouseY } from "../KeyboardManager"
import { sticker_size_half } from "./const"
import { round10 } from "../../helpers/mathUtils"
import { trackStat } from "../../helpers/stats"

let newStickerShift = 0

// todo add stat !!!!
export const canvasAPI = {
  deleteWidgets: (dispatch: ActionDispatcher, widgetIds: number[]) => {
    dispatch({
      type: Action.DeleteWidgets,
      widgetIds
    })
    hideWidgetsSelectionFrame()
    hideWidgetsContextMenu()
  },
  duplicateWidgets: (dispatch: ActionDispatcher, widgetIds: number[]) => {
    dispatch({
      type: Action.DuplicateWidgets,
      widgetIds
    })
    updateWidgetsSelectionFrame_RAF_NotPerformant()
    updateWidgetsContextMenu()
  },
  selectWidgets: (dispatch: ActionDispatcher, widgetIds: number[]) => {
    dispatch({
      type: Action.SelectWidgets,
      widgetIds
    })
    updateWidgetsSelectionFrame_RAF_NotPerformant()
    updateWidgetsContextMenu()
  },
  setEditingWidget: (dispatch: ActionDispatcher, widgetId: number) => {
    dispatch({
      type: Action.SetEditingWidget,
      widgetId
    })
    hideWidgetsSelectionFrame()
    updateWidgetsContextMenu()
  },
  bringToFront: (dispatch: ActionDispatcher, widgetIds: number[]) => {
    dispatch({
      type: Action.BringToFront,
      widgetIds
    })
  },
  sendToBack: (dispatch: ActionDispatcher, widgetIds: number[]) => {
    dispatch({
      type: Action.SendToBack,
      widgetIds
    })
  },

  ////////////////////////////////////////////////
  // HELPERS
  //////////////////////////////////////////////

  createFolderInCurrentViewport: (dispatch: ActionDispatcher, folders: IFolder[]) => {
    const folderId = createFolderWithStat(dispatch, {
      position: findPositionForNewFolder(folders)
    }, "toolbar")

    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: folderId }
    })
  },
  createStickerInCurrentViewport: (dispatch: ActionDispatcher, currentSpaceId: number) => {
    const canvasOffset = getCanvasScrolledOffset()
    newStickerShift += 6
    if (newStickerShift > 60) {
      newStickerShift = 0
    }
    const x = round10(document.body.clientWidth / 2 - 200 + canvasOffset.x + newStickerShift)
    const y = round10(document.body.clientHeight / 2 - 200 + canvasOffset.y + newStickerShift)
    const widgetId = genUniqLocalId()
    dispatch({
      type: Action.CreateWidget,
      spaceId: currentSpaceId,
      widgetId,
      pos: { point: { x, y } }
    })
    canvasAPI.selectWidgets(dispatch, [widgetId])
    trackStat("widgetCreated", { type: "sticker", source: "toolbar" })
  },
  createStickerUnderCursor: (dispatch: ActionDispatcher, spaceId: number) => {
    const canvasOffset = getCanvasScrolledOffset()
    const mouseX = getMouseX()
    const mouseY = getMouseY()
    const widgetId = genUniqLocalId()
    dispatch({
      type: Action.CreateWidget,
      spaceId,
      widgetId,
      pos: {
        point: {
          x: round10(mouseX + canvasOffset.x - sticker_size_half),
          y: round10(mouseY + canvasOffset.y - sticker_size_half)
        }
      }
    })
    canvasAPI.selectWidgets(dispatch, [widgetId])
    canvasAPI.setEditingWidget(dispatch, widgetId)
    trackStat("widgetCreated", { type: "sticker", source: "canvas-context-menu" })
  }
}

function findPositionForNewFolder(folders: IFolder[]): string {
  const MIN_TOP = 70
  const screenHeight = document.body.clientHeight - 40
  const folderH2Elements = Array.from(document.querySelectorAll<HTMLElement>(".folder h2.draggable-folder"))
  let prevFolderId: number | undefined = undefined
  let onscreenFolderId: number | undefined = undefined

  folderH2Elements.some(el => {
    const rect = el.getBoundingClientRect()
    if (rect.y > MIN_TOP && rect.y < screenHeight) {
      onscreenFolderId = getFolderIdByHeader(el)
      return true
    } else {
      prevFolderId = getFolderIdByHeader(el)
    }
  })

  let prevFolderPos = folders.find(f => f.id === prevFolderId)?.position ?? ""
  let nextFolderPos = folders.find(f => f.id === onscreenFolderId)?.position

  if (!nextFolderPos) {
    prevFolderPos = ""
    nextFolderPos = folders[0]?.position ?? ""
  }

  return insertBetween(prevFolderPos, nextFolderPos)
}

function getFolderIdByHeader(el: HTMLElement): number {
  return parseInt((el.parentNode as HTMLElement).dataset.folderId ?? "", 10)
}