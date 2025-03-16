import React, { useContext } from "react"
import IconFolder from "../icons/folder.svg"
import IconSticky from "../icons/sticky.svg"
import IconPen from "../icons/pen.svg"
import IconImage from "../icons/image.svg"
import { DispatchContext } from "../state/actions"
import { IFolder } from "../helpers/types"
import { canvasAPI } from "./canvas/canvasAPI"

export const Toolbar = React.memo(function Toolbar(p: {
  currentSpaceId: number
  folders: IFolder[]
}) {
  const dispatch = useContext(DispatchContext)

  const onFolderCreate = () => {
    canvasAPI.createFolderInCurrentViewport(dispatch, p.folders)
  }

  const onStickerCreate = () => {
    canvasAPI.createStickerInCurrentViewport(dispatch, p.currentSpaceId)
  }

  const notImplemented = () => {
    alert("No goal, just a path.\n"
      + "A samurai without users is like a samurai with users, only without users")
  }

  return <div className="toolbar">
    <button className="toolbar-button" onClick={onFolderCreate} title="Add Folder"><IconFolder/></button>
    <button className="toolbar-button" onClick={onStickerCreate} title="Add Sticky Note"><IconSticky/></button>
    <button className="toolbar-button" onClick={notImplemented} style={{ opacity: 0.4 }} title="Add Image"><IconImage/></button>
    <button className="toolbar-button" onClick={notImplemented} style={{ opacity: 0.4 }} title="Freehand drawing"><IconPen/></button>
  </div>
})

