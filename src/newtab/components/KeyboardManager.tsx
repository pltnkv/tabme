import React, { useContext, useEffect } from "react"
import { getSelectedItemsElements, getSelectedItemsIds } from "../helpers/selectionUtils"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { showMessageWithUndo } from "../helpers/actionsHelpersWithDOM"
import { isSomeModalOpened } from "./modals/Modal"

let mouseX = 0
let mouseY = 0

export function getMouseX() {
  return mouseX
}

export function getMouseY() {
  return mouseY
}

export const KeyboardManager = React.memo((p: {
  search: string;
  selectedWidgetIds: number[];
}) => {

  useEffect(() => {
    document.addEventListener("mousemove", (e) => {
      mouseX = e.screenX
      mouseY = e.screenY
    })
  }, [])

  const dispatch = useContext(DispatchContext)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {

      if (isSomeModalOpened()) { // disabling hotkeys when any Modal open
        return
      }

      if (document.activeElement !== document.body) {
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

      // IN CANVAS
      if (p.selectedWidgetIds.length > 0) {
        if ((e.code === "Backspace" || e.code === "Delete")) {
          dispatch({
            type: Action.DeleteWidgets,
            widgetIds: p.selectedWidgetIds
          })
          return
        }

        if (p.selectedWidgetIds.length === 1 && e.code === "Enter") {
          dispatch({
            type: Action.SetEditingWidget,
            widgetId: p.selectedWidgetIds[0]
          })
          e.preventDefault()
          e.stopPropagation()
          return
        }

        if (e.code === "KeyD" && (e.ctrlKey || e.metaKey)) {
          dispatch({
            type: Action.DuplicateSelectedWidgets
          })
          e.preventDefault()
          e.stopPropagation()
          return
        }

        if (e.code === "Escape") {
          dispatch({
            type: Action.SelectWidgets,
            widgetIds: []
          })
          return
        }

        if (e.code === "BracketRight") {
          dispatch({
            type: Action.BringToFront,
            widgetIds: p.selectedWidgetIds
          })
          return
        }

        if (e.code === "BracketLeft") {
          dispatch({
            type: Action.SendToBack,
            widgetIds: p.selectedWidgetIds
          })
          return
        }
      }

      if (e.code === "KeyZ" && (e.metaKey || e.ctrlKey)) {
        dispatch({
          type: Action.Undo,
          dispatch
        })
        return
      }

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

      // disable instant typing in search
      // const isLetterOrNumber = !!(e.key.length === 1 && e.key.match(/[a-z]|[а-я]|[0-9]/i))
      // if (isLetterOrNumber) {
        // dispatch({
        //   type: Action.UpdateSearch,
        //   value: props.search + e.key
        // })
        // ;(document.querySelector("input.search") as HTMLElement).focus()
      // }
    }
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [p.search, p.selectedWidgetIds])
  return null
})

