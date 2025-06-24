import { Action } from "../../state/state"
import { hideWidgetsContextMenu, updateWidgetsContextMenu } from "./widgetsContextMenu"
import { ActionDispatcher } from "../../state/actions"
import { getCanvasScrolledOffset, hideWidgetsSelectionFrame, updateWidgetsSelectionFrame_RAF_NotPerformant } from "./widgetsSelectionFrame"
import { createFolderWithStat } from "../../helpers/actionsHelpersWithDOM"
import { findWidgetById, genUniqLocalId } from "../../state/actionHelpers"
import { IFolder, IWidget, IWidgetContent, IWidgetPos, WidgetType } from "../../helpers/types"
import { insertBetween } from "../../helpers/fractionalIndexes"
import { getMouseX, getMouseY } from "../KeyboardAndMouseManager"
import { sticker_size_half } from "./const"
import { round10 } from "../../helpers/mathUtils"
import { trackStat } from "../../helpers/stats"
import { getGlobalAppState } from "../App"
import { defaultStickerColor, stickerSizeS } from "./WidgetsHorMenu"

let newStickerShift = 0

class CanvasAPI {
  deleteWidgets(dispatch: ActionDispatcher, widgetIds: number[]) {
    dispatch({
      type: Action.DeleteWidgets,
      widgetIds
    })
    hideWidgetsSelectionFrame()
    hideWidgetsContextMenu()
  }

  duplicateWidgets(dispatch: ActionDispatcher, widgetIds: number[]) {
    dispatch({
      type: Action.DuplicateWidgets,
      widgetIds
    })
    updateWidgetsSelectionFrame_RAF_NotPerformant()
    updateWidgetsContextMenu()
  }

  selectWidgets(dispatch: ActionDispatcher, widgetIds: number[]) {
    dispatch({
      type: Action.SelectWidgets,
      widgetIds
    })
    updateWidgetsSelectionFrame_RAF_NotPerformant()
    updateWidgetsContextMenu()
  }

  setEditingWidget(dispatch: ActionDispatcher, widgetId: number) {
    dispatch({
      type: Action.SetEditingWidget,
      widgetId
    })
    hideWidgetsSelectionFrame()
    updateWidgetsContextMenu()
  }

  bringToFront(dispatch: ActionDispatcher, widgetIds: number[]) {
    dispatch({
      type: Action.BringToFront,
      widgetIds
    })
  }

  sendToBack(dispatch: ActionDispatcher, widgetIds: number[]) {
    dispatch({
      type: Action.SendToBack,
      widgetIds
    })
  }

  ////////////////////////////////////////////////
  // HELPERS
  //////////////////////////////////////////////

  async copyWidgets(dispatch: ActionDispatcher, widgetIds: number[]) {
    const widgets = widgetIds
      .map(id => findWidgetById(getGlobalAppState(), id))
      .filter(Boolean)
    if (!widgets.length) {
      return
    }

    await navigator.clipboard.writeText(JSON.stringify({ widgets, action: "copy" }))
  }

  async cutWidgets(dispatch: ActionDispatcher, widgetIds: number[]) {
    const widgets = widgetIds
      .map(id => findWidgetById(getGlobalAppState(), id))
      .filter(Boolean)
    if (!widgets.length) {
      return
    }

    await navigator.clipboard.writeText(JSON.stringify({ widgets, action: "cut" }))
    this.deleteWidgets(dispatch, widgetIds)
  }

  async pasteWidgets(dispatch: ActionDispatcher, currentSpaceId: number) {
    const clipboardText = await navigator.clipboard.readText()
    if (!clipboardText) {
      return
    }
    try {
      const clipboard = JSON.parse(clipboardText)
      if (clipboard?.widgets?.length && clipboard?.widgets[0]?.widgetType && clipboard?.action) {
        this.createWidgetsUnderTheCursor(clipboard.widgets, dispatch, currentSpaceId)
      }
    } catch (e) {
      const newSticker: IWidget = {
        id: 0,
        position: undefined!,
        widgetType: "Sticker",
        pos: { point: { x: 0, y: 0 } },
        content: {
          contentType: "Sticker",
          text: clipboardText,
          color: defaultStickerColor,
          fontSize: stickerSizeS
        }
      }
      this.createWidgetsUnderTheCursor([newSticker], dispatch, currentSpaceId)
    }
  }

  private createWidgetsUnderTheCursor(widgets: IWidget[], dispatch: ActionDispatcher, currentSpaceId: number) {
    const canvasOffset = getCanvasScrolledOffset()

    const newX = round10(getMouseX() + canvasOffset.x - 10)
    const newY = round10(getMouseY() + canvasOffset.y - 10)

    let deltaX = 0
    let deltaY = 0

    const newWidgetIds: number[] = []

    widgets.forEach((originalWidget: IWidget, index: number) => {
      let x = 0
      let y = 0
      if (index === 0) {
        x = newX
        y = newY
        deltaX = newX - originalWidget.pos.point.x
        deltaY = newY - originalWidget.pos.point.y
      } else {
        x = originalWidget.pos.point.x + deltaX
        y = originalWidget.pos.point.y + deltaY
      }

      const newWidget = {
        ...originalWidget,
        id: genUniqLocalId(),
        pos: { point: { x, y } }
      }

      dispatch({
        type: Action.CreateWidget,
        spaceId: currentSpaceId,
        widgetId: newWidget.id,
        pos: newWidget.pos,
        content: newWidget.content
      })

      newWidgetIds.push(newWidget.id)
    })

    this.selectWidgets(dispatch, newWidgetIds)
  }

  createFolderInCurrentViewport(dispatch: ActionDispatcher, folders: IFolder[]) {
    const folderId = createFolderWithStat(dispatch, {
      position: findPositionForNewFolder(folders)
    }, "toolbar")

    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: folderId }
    })
  }

  createStickerInCurrentViewport(dispatch: ActionDispatcher, currentSpaceId: number) {
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
  }

  createStickerUnderCursor(dispatch: ActionDispatcher, spaceId: number) {
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

export const canvasAPI = new CanvasAPI()

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