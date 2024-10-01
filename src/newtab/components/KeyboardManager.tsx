import React, { useContext, useEffect } from "react"
import { Action, DispatchContext, wrapIntoTransaction } from "../state"
import { getSelectedItemsElements, getSelectedItemsIds } from "../helpers/selectionUtils"

export function KeyboardManager(props: {
  search: string;
}) {
  const { dispatch } = useContext(DispatchContext)
  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement !== document.body) {
        return
      }

      if (getSelectedItemsElements().length > 0) {
        if (e.code === "Backspace" || e.code === "Delete") {
          wrapIntoTransaction(() => {
            dispatch({
              type: Action.DeleteFolderItem,
              itemIds: getSelectedItemsIds()
            })
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

      const isLetterOrNumber = !!(e.key.length === 1 && e.key.match(/[a-z]|[а-я]|[0-9]/i))
      if (isLetterOrNumber) {
        // dispatch({
        //   type: Action.UpdateSearch,
        //   value: props.search + e.key
        // })
        ;(document.querySelector("input.search") as HTMLElement).focus()
      }
    }
    document.addEventListener("keydown", onKeyUp)

    return () => {
      document.removeEventListener("keydown", onKeyUp)
    }
  })
  return null
}

