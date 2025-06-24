import { OptionsConfig } from "../SettingsOptions"
import { canvasAPI } from "./canvasAPI"
import { ActionDispatcher } from "../../state/actions"
import { IAppState } from "../../state/state"
import { IPoint } from "../../helpers/MathTypes"
import { IFolder } from "../../helpers/types"

export function getCanvasMenuOption(
  dispatch: ActionDispatcher,
  canvasMenuType: "canvas" | "widgets",
  appState: IAppState,
  currentFolders: IFolder[],
  onClose: () => void,
): OptionsConfig {
  // todo add stat for each action + move onClose in a single place

  if (canvasMenuType === "canvas") {
    return [
      {
        text: "Paste",
        title: "Paste Sticky Notes from clipboard",
        onClick: () => {
          canvasAPI.pasteWidgets(dispatch, appState.currentSpaceId)
          onClose()
        }
      },
      {
        text: "Add Sticky Note",
        title: "Create Sticky Note",
        onClick: () => {
          canvasAPI.createStickerUnderCursor(dispatch, appState.currentSpaceId)
          onClose()
        }
      },
      {
        text: "Add Folder",
        title: "Create new Folder in the current viewport",
        onClick: () => {
          canvasAPI.createFolderInCurrentViewport(dispatch, currentFolders)
          onClose()
        }
      }
    ]
  } else {
    return [
      {
        text: "Cut",
        title: "Cut selected Sticky Notes to clipboard",
        onClick: () => {
          canvasAPI.cutWidgets(dispatch, appState.selectedWidgetIds)
          onClose()
        }
      },
      {
        text: "Copy",
        title: "Copy selected Sticky Notes to clipboard",
        onClick: () => {
          canvasAPI.copyWidgets(dispatch, appState.selectedWidgetIds)
          onClose()
        }
      },
      {
        text: "Bring to front",
        title: "Bring selected Sticky Notes to front",
        onClick: () => {
          canvasAPI.bringToFront(dispatch, appState.selectedWidgetIds)
          onClose()
        }
      },
      {
        text: "Send to back",
        title: "Send selected Sticky Notes to back",
        onClick: () => {
          canvasAPI.sendToBack(dispatch, appState.selectedWidgetIds)
          onClose()
        }
      },
      {
        text: "Duplicate",
        title: "Duplicate selected Sticky Notes",
        onClick: () => {
          canvasAPI.duplicateWidgets(dispatch, appState.selectedWidgetIds)
          onClose()
        }
      }
      ,
      {
        text: "Delete",
        title: "Delete selected Sticky Notes",
        dangerStyle: true,
        onClick: () => {
          canvasAPI.deleteWidgets(dispatch, appState.selectedWidgetIds)
          onClose()
        }
      }
    ]
  }
}