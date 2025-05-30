import React, { useContext, useEffect } from "react"
import { getSelectedItemsElements, getSelectedItemsIds } from "../helpers/selectionUtils"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { showMessageWithUndo } from "../helpers/actionsHelpersWithDOM"
import { isSomeModalOpened } from "./modals/Modal"
import { canvasAPI } from "./canvas/canvasAPI"
import { updateWidgetsSelectionFrame_RAF_NotPerformant } from "./canvas/widgetsSelectionFrame"
import { updateWidgetsContextMenu } from "./canvas/widgetsContextMenu"
import { getGlobalAppState } from "./App"
import { isTargetInputOrTextArea } from "../helpers/utils"

let mouseX = 0
let mouseY = 0

export function getMouseX() {
  return mouseX
}

export function getMouseY() {
  return mouseY
}

export const KeyboardAndMouseManager = React.memo((p: {
  search: string;
  selectedWidgetIds: number[];
}) => {

  useEffect(() => {
    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
    })
  }, [])

  const dispatch = useContext(DispatchContext)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {

      if (isSomeModalOpened()) { // disabling hotkeys when any Modal open
        return
      }

      if (document.activeElement && isTargetInputOrTextArea(document.activeElement)) {
        return
      }

      if (getSelectedItemsElements().length > 0) {
        if (e.code === "Backspace" || e.code === "Delete") {
          dispatch({
            type: Action.DeleteFolderItems,
            itemIds: getSelectedItemsIds()
          })
          showMessageWithUndo("Bookmark has been deleted", dispatch)
          return
        }
      }

      if (e.code === "KeyF" && (e.ctrlKey || e.metaKey)) {
        ;(document.querySelector("input.search") as HTMLElement).focus()
        e.preventDefault()
        return
      }

      //////////////////////////////////////////////////////
      // IN CANVAS
      //////////////////////////////////////////////////////

      if (e.code === "KeyA" && (e.ctrlKey || e.metaKey)) {
        const state = getGlobalAppState()
        const widgets = state.spaces.find(s => s.id === state.currentSpaceId)?.widgets || []
        canvasAPI.selectWidgets(dispatch, widgets.map(w => w.id))
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (e.code === "KeyV" && (e.ctrlKey || e.metaKey)) {
        const state = getGlobalAppState()
        canvasAPI.pasteWidgets(dispatch, state.currentSpaceId)
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (p.selectedWidgetIds.length > 0) {
        if ((e.code === "Backspace" || e.code === "Delete")) {
          canvasAPI.deleteWidgets(dispatch, p.selectedWidgetIds)
          return
        }

        if (p.selectedWidgetIds.length === 1 && e.code === "Enter") {
          canvasAPI.setEditingWidget(dispatch, p.selectedWidgetIds[0])
          e.preventDefault()
          e.stopPropagation()
          return
        }

        if (e.code === "KeyD" && (e.ctrlKey || e.metaKey)) {
          canvasAPI.duplicateWidgets(dispatch, p.selectedWidgetIds)
          e.preventDefault()
          e.stopPropagation()
          return
        }

        if (e.code === "KeyC" && (e.ctrlKey || e.metaKey)) {
          canvasAPI.copyWidgets(dispatch, p.selectedWidgetIds)
          e.preventDefault()
          e.stopPropagation()
          return
        }

        if (e.code === "KeyX" && (e.ctrlKey || e.metaKey)) {
          canvasAPI.cutWidgets(dispatch, p.selectedWidgetIds)
          e.preventDefault()
          e.stopPropagation()
          return
        }

        if (e.code === "Escape") {
          canvasAPI.selectWidgets(dispatch, [])
          return
        }

        if (e.code === "BracketRight") {
          canvasAPI.bringToFront(dispatch, p.selectedWidgetIds)
          return
        }

        if (e.code === "BracketLeft") {
          canvasAPI.sendToBack(dispatch, p.selectedWidgetIds)
          return
        }
      }

      if (e.code === "KeyZ" && (e.metaKey || e.ctrlKey)) {
        dispatch({
          type: Action.Undo,
          dispatch
        })
        updateWidgetsSelectionFrame_RAF_NotPerformant()
        updateWidgetsContextMenu()
        return
      }

      if (document.activeElement === document.body) {

        if (e.code === "ArrowDown") {
          ;(document.querySelector("input.search") as HTMLElement).focus()
          return
        }

        if (e.code.startsWith("Digit")) {
          if (e.ctrlKey || e.altKey) {
            const spaceIndex = parseInt(e.code.at(5) ?? "", 10)
            if (spaceIndex > 0 && spaceIndex < 10) {
              dispatch({
                type: Action.SelectSpace,
                spaceIndex: spaceIndex - 1
              })
              return
            }
          }
        }
      }

    }
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [p.search, p.selectedWidgetIds])
  return null
})

