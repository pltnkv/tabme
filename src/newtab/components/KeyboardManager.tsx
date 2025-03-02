import React, { useContext, useEffect } from "react"
import { getSelectedItemsElements, getSelectedItemsIds } from "../helpers/selectionUtils"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { showMessageWithUndo } from "../helpers/actionsHelpersWithDOM"
import { isSomeModalOpened } from "./modals/Modal"

export const KeyboardManager = React.memo((props: {
  search: string;
}) => {
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

      const isLetterOrNumber = !!(e.key.length === 1 && e.key.match(/[a-z]|[а-я]|[0-9]/i))
      if (isLetterOrNumber) {
        // dispatch({
        //   type: Action.UpdateSearch,
        //   value: props.search + e.key
        // })
        ;(document.querySelector("input.search") as HTMLElement).focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])
  return null
})

