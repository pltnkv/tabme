import { Action, ActionDispatcher, executeCustomAction, IAppState } from "../state"
import { findItemById, genUniqId, isCustomActionItem } from "./utils"
import { IFolderItem } from "./types"

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

export function createFolder(dispatch: ActionDispatcher, title?: string, successMessage?: string): number {
  const newFolderId = genUniqId()
  dispatch({ type: Action.CreateFolder, newFolderId, title })
  showMessage(successMessage || "Folder has been created", dispatch)
  return newFolderId
}

export function clickFolderItem(targetId: number, appState: IAppState, dispatch: ActionDispatcher, openInNewTab: boolean) {
  const targetItem = findItemById(appState, targetId)
  if (targetItem?.isSection) {
    onRenameSection(targetItem)
  } else if (isCustomActionItem(targetItem) && targetItem?.url) {
    executeCustomAction(targetItem.url, dispatch)
  } else if (targetItem) {
    if (openInNewTab) {
      // open in new tab
      chrome.tabs.create({ url: targetItem.url })
      //TODO fix bug of not updating bold items when move to new tab in new window
    } else {
      // open in the same tab or switch to already opened
      const tab = appState.tabs.find(t => t.url === targetItem.url)
      if (tab && tab.id) {
        chrome.tabs.update(tab.id, { active: true })
        chrome.windows.update(tab.windowId, { focused: true })
      } else {
        chrome.tabs.getCurrent(t => {
          chrome.tabs.update(t?.id!, { url: targetItem.url })
        })
      }
    }
  }

  function onRenameSection(targetItem: IFolderItem) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: targetItem.id }
    })
  }
}