import React, { useContext, useState } from "react"
import { Modal } from "./Modal"
import { ISpace } from "../../helpers/types"
import { DispatchContext } from "../../state/actions"
import { Action } from "../../state/state"
import { insertBetween } from "../../helpers/fractionalIndexes"
import { EditableTitle } from "../EditableTitle"
import { CL } from "../../helpers/classNameHelper"
import { genUniqLocalId } from "../../state/actionHelpers"

export const SpacesModal = (p: {
  spaces: ISpace[],
  currentSpaceId: number
  isSpacesModalOpen: boolean,
  setSpacesModalOpen: (value: boolean) => void
}) => {

  const dispatch = useContext(DispatchContext)
  const [spaceIdInEdit, setSpaceIdInEdit] = useState(-1)

  const createSpace = () => {
    const lastSpace = p.spaces.at(-1)
    const spaceId = genUniqLocalId()
    dispatch({
      type: Action.CreateSpace,
      spaceId: spaceId,
      title: `New space`,
      position: insertBetween(lastSpace?.position ?? "", "")
    })

    dispatch({
      type: Action.SelectSpace,
      spaceId: spaceId
    })

    setSpaceIdInEdit(spaceId)
  }

  return (
    <Modal className="spaces-settings-modal" isOpen={p.isSpacesModalOpen} onClose={() => p.setSpacesModalOpen(false)}>
      <h2>Edit Spaces</h2>
      <div className="spaces-settings-modal__list">
        {
          p.spaces.map((space) => {
            return <SpaceRecordInModal
              key={space.id}
              currentSpaceId={p.currentSpaceId}
              space={space}
              spaces={p.spaces}
              spaceIdInEdit={spaceIdInEdit}
              setSpaceIdInEdit={setSpaceIdInEdit}
            />
          })
        }
        <div className="new-space-button" onClick={createSpace}>+ create new space</div>
      </div>
      <p>
        <button className="btn__setting"
                onClick={() => p.setSpacesModalOpen(false)}
                style={{ float: "right" }}>Done
        </button>
      </p>
    </Modal>
  )
}

// todo !!! improve styles
const SpaceRecordInModal = (p: {
  space: ISpace,
  spaces: ISpace[],
  currentSpaceId: number,
  spaceIdInEdit: number,
  setSpaceIdInEdit: (value: number) => void
}) => {
  const dispatch = useContext(DispatchContext)

  const [localTitle, setLocalTitle] = useState<string>(p.space.title)

  function saveTitle() {
    if (p.space.title !== localTitle) {
      dispatch({
        type: Action.UpdateSpace,
        spaceId: p.space.id,
        title: localTitle
      })
    }
    p.setSpaceIdInEdit(-1)
  }

  function deleteSpace() {
    const res = confirm(`Are you sure you want to delete '${p.space.title}' space?`)
    if (res) {
      dispatch({
        type: Action.DeleteSpace,
        spaceId: p.space.id
      })
    }
  }

  function moveUp() {
    const index = p.spaces.findIndex(s => s.id === p.space.id)
    const insertBeforeSpaceId = p.spaces[index - 1]?.id

    if (insertBeforeSpaceId) {
      dispatch({
        type: Action.MoveSpace,
        spaceId: p.space.id,
        insertBeforeSpaceId
      })
    }
  }

  function moveDown() {
    const index = p.spaces.findIndex(s => s.id === p.space.id)
    const insertBeforeSpaceId = p.spaces[index + 2]?.id

    dispatch({
      type: Action.MoveSpace,
      spaceId: p.space.id,
      insertBeforeSpaceId
    })
  }

  function rename() {
    p.setSpaceIdInEdit(p.space.id)
  }

  return <div className="space-item">
    <EditableTitle
      className={CL("space-item__title", {
        "active": p.space.id === p.currentSpaceId
      })}
      inEdit={p.space.id === p.spaceIdInEdit}
      localTitle={localTitle}
      setLocalTitle={setLocalTitle}
      onSaveTitle={saveTitle}
      search={""}
      onClick={rename}
    />
    <button className="btn__setting" onClick={moveUp}>move up</button>
    <button className="btn__setting" onClick={moveDown}>move down</button>
    <button className="btn__setting" onClick={deleteSpace}>delete</button>
  </div>
}