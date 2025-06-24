import React, { useContext } from "react"
import { Modal } from "./Modal"
import { trackStat } from "../../helpers/stats"
import { showMessage } from "../../helpers/actionsHelpersWithDOM"
import { DispatchContext } from "../../state/actions"
import { ISpace } from "../../helpers/types"
import { Action } from "../../state/state"

export const LeaveBetaModal = (p: {
  onClose: () => void
  spaces: ISpace[]
}) => {
  const dispatch = useContext(DispatchContext)

  const leaveTheBeta = () => {
    trackStat("betaLeave", {})
    localStorage.removeItem("betaMode")
    dispatch({
      type: Action.UpdateAppState,
      newState: {betaMode: false}
    })

    const firstSpace = p.spaces[0]
    if (firstSpace) {
      for (let i = 1; i < p.spaces.length; i++) {
        const space = p.spaces[i]
        space.folders.forEach((folder) => {
          dispatch({
            type: Action.MoveFolder,
            folderId: folder.id,
            targetSpaceId: firstSpace.id,
            insertBeforeFolderId: undefined
          })
        })
        dispatch({
          type: Action.DeleteSpace,
          spaceId: space.id
        })
      }
    }
    dispatch({
      type: Action.SelectSpace,
      spaceId: -1
    })
    p.onClose()
    showMessage("Beta has been disabled and spaces merged", dispatch)
  }

  return (
    <Modal onClose={p.onClose}>
      <div className="modal-no-override">
        <h2>Leaving the Beta Program</h2>
        <p>
          Are you sure you want to leave the <b>Tabme Pro Beta</b>?
          If you proceed:
        </p>
        <ul>
          <li>🔄 Pro features will no longer be available.</li>
          <li>📂 All your Spaces will be merged into a single Space.</li>
        </ul>
        <p>
          You can rejoin the Pro Beta later.
        </p>

        <button className="btn__setting" onClick={leaveTheBeta}>Merge Spaces and leave the Pro Beta Program</button>
      </div>
    </Modal>
  )
}