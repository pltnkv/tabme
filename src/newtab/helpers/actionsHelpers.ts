import { findItemById, genUniqLocalId, isCustomActionItem } from "./utils"
import { IFolderItem, IFolderItemToCreate } from "./types"
import { ActionDispatcher, executeCustomAction } from "../state/actions"
import { Action, IAppState } from "../state/state"

export function showMessage(message: string, dispatch: ActionDispatcher): void {
  dispatch({
    type: Action.ShowNotification,
    message: message
  })
}

export function showMessageWithUndo(message: string, dispatch: ActionDispatcher): void {
  dispatch({
    type: Action.ShowNotification,
    message: message,
    button: {
      text: "Undo",
      onClick: () => {
        dispatch({ type: Action.Undo, dispatch })
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
        message: "Dragging is unavailable during search"
      })
      return false
    } else {
      return true
    }
  }
}

export function createFolder(dispatch: ActionDispatcher, title?: string, items?: IFolderItemToCreate[], historyStepId?:number): number {
  const newFolderId = genUniqLocalId()
  dispatch({ type: Action.CreateFolder, newFolderId, title, items })
  return newFolderId
}

export function clickFolderItem(targetId: number, appState: IAppState, dispatch: ActionDispatcher, openInNewTab: boolean, openBookmarksInNewTab: boolean) {
  const targetItem = findItemById(appState, targetId)
  if (targetItem?.isSection) {
    onRenameSection(targetItem)
  } else if (isCustomActionItem(targetItem) && targetItem?.url) {
    executeCustomAction(targetItem.url, dispatch)
  } else if (targetItem) {
    if (openInNewTab) {
      // open in new tab
      chrome.tabs.create({ url: targetItem.url, active: false })
      //TODO fix bug of not updating bold items when move to new tab in new window
    } else {
      // open in the same tab or switch to already opened
      const tab = appState.tabs.find(t => t.url === targetItem.url)
      if (tab && tab.id) {
        chrome.tabs.update(tab.id, { active: true })
        chrome.windows.update(tab.windowId, { focused: true })
      } else {
        chrome.tabs.getCurrent(t => {
          if (openBookmarksInNewTab) {
            chrome.tabs.create({ url: targetItem.url, active: true })
          } else {
            chrome.tabs.update(t?.id!, { url: targetItem.url })
          }

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