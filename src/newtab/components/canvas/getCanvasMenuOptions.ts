import { OptionsConfig } from "../SettingsOptions"
import { canvasAPI } from "./canvasAPI"
import { ActionDispatcher } from "../../state/actions"
import { IAppState } from "../../state/state"
import { IPoint } from "../../helpers/MathTypes"
import { IFolder } from "../../helpers/types"

// todo !!!! stats
export function getCanvasMenuOption(
  dispatch: ActionDispatcher,
  canvasMenuType: "canvas" | "widgets",
  appState: IAppState,
  currentFolders: IFolder[],
  setCanvasMenuPos: (point: IPoint | undefined) => void
): OptionsConfig {
  if (canvasMenuType === "canvas") {
    return [
      {
        onClick: () => {
          canvasAPI.createStickerUnderCursor(dispatch, appState.currentSpaceId)
          setCanvasMenuPos(undefined)
        },
        title: "Create Sticky Note",
        text: "Create Sticky Note",
        hidden: !appState.betaStickers
      },
      {
        onClick: () => {
          canvasAPI.createFolderInCurrentViewport(dispatch, currentFolders)
          setCanvasMenuPos(undefined)
        },
        title: "Create new Folder in the current viewport",
        text: "Create Folder"
      }
    ]
  } else {
    return [
      {
        onClick: () => {
          canvasAPI.bringToFront(dispatch, appState.selectedWidgetIds)
          setCanvasMenuPos(undefined)
        },
        title: "Bring selected widgets to front",
        text: "Bring to front"
      },
      {
        onClick: () => {
          canvasAPI.sendToBack(dispatch, appState.selectedWidgetIds)
          setCanvasMenuPos(undefined)
        },
        title: "Send selected widgets to back",
        text: "Send to back"
      },
      {
        onClick: () => {
          canvasAPI.duplicateWidgets(dispatch, appState.selectedWidgetIds)
          setCanvasMenuPos(undefined)
        },
        title: "Duplicate selected widgets",
        text: "Duplicate"
      }
      ,
      {
        onClick: () => {
          canvasAPI.deleteWidgets(dispatch, appState.selectedWidgetIds)
          setCanvasMenuPos(undefined)
        },
        title: "Delete selected widgets",
        text: "Delete"
      }
    ]
  }
}