import React, { useContext, useState } from "react"
import IconFolder from "../icons/folder.svg"
import IconSticky from "../icons/sticky.svg"
import { DispatchContext } from "../state/actions"
import { IFolder } from "../helpers/types"
import { canvasAPI } from "./canvas/canvasAPI"
import { DropdownMenu } from "./dropdown/DropdownMenu"

export const Toolbar = React.memo(function Toolbar(p: {
  currentSpaceId: number
  folders: IFolder[]
}) {
  const dispatch = useContext(DispatchContext)
  const [createFolderMenuVisible, setCreateFolderMenuVisible] = useState(false)

  const onFolderCreate = () => {
    canvasAPI.createFolderInCurrentViewport(dispatch, p.folders)
  }

  const onStickerCreate = () => {
    canvasAPI.createStickerInCurrentViewport(dispatch, p.currentSpaceId)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  return <div className="toolbar-wrapper">
    <div className="toolbar">
      {createFolderMenuVisible && <DropdownMenu onClose={() => {setCreateFolderMenuVisible(false)}} offset={{ bottom: 26 }}>
        <div>
          <button className="btn__setting" onClick={onFolderCreate}>Create Folder</button>
        </div>
        <div style={{ marginTop: "8px" }}>
        </div>
      </DropdownMenu>}

      <button className="toolbar-button" onClick={onFolderCreate} title="Add Folder"><IconFolder/></button>
      <button className="toolbar-button" onClick={onStickerCreate} title="Add Sticky Note"><IconSticky/></button>
    </div>
  </div>
})

