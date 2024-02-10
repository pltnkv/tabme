import { Action, ActionDispatcher } from "../state"
import { genUniqId } from "./utils"

export function showMessage(message: string, dispatch: ActionDispatcher): void {
  dispatch({
    type: Action.ShowNotification,
    message: message,
    dispatch: dispatch
  })
}

export function showMessageWithUndo(message: string, dispatch: ActionDispatcher): void {
  dispatch({
    type: Action.ShowNotification,
    message: message,
    dispatch: dispatch,
    button: {
      text: "Undo",
      onClick: () => {
        dispatch({ type: Action.Undo })
        dispatch({ type: Action.HideNotification })
      }
    }
  })
}

export function getCanDragChecker(search: string, dispatch: ActionDispatcher): () => boolean {
  return () => {
    if (search) {
      dispatch({
        type: Action.ShowNotification,
        message: "Dragging is unavailable during search",
        dispatch: dispatch
      })
      return false
    } else {
      return true
    }
  }
}

export function createFolder(dispatch: ActionDispatcher): number {
  const newFolderId = genUniqId()
  dispatch({ type: Action.CreateFolder, newFolderId })
  showMessageWithUndo("Folder has been created", dispatch)
  return newFolderId
}