import React, { useContext, useState } from "react"
import { Modal } from "./Modal"
import { genUniqLocalId } from "../../helpers/utils"
import { ISpace } from "../../helpers/types"
import { DispatchContext, mergeStepsInHistory } from "../../state/actions"
import { Action } from "../../state/state"
import { insertBetween } from "../../helpers/fractionalIndexes"
import { EditableTitle } from "../EditableTitle"
import { CL } from "../../helpers/classNameHelper"

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
      title: `s_${spaceId}`,
      position: insertBetween(lastSpace?.position ?? "", "")
    })
  }

  return (
    <Modal isOpen={p.isSpacesModalOpen} onClose={() => p.setSpacesModalOpen(false)}>
      <div className="modal-no-override spaces-settings-modal">
        <h2>Manage Spaces</h2>
        <div className="spaces-settings-modal__list">
          {
            p.spaces.map((space) => {
              return <SpaceRecordInModal
                key={space.id}
                currentSpaceId={p.currentSpaceId}
                space={space}
                spaceIdInEdit={spaceIdInEdit}
                setSpaceIdInEdit={setSpaceIdInEdit}
              />
            })
          }
        </div>
        <p>
          <button onClick={createSpace}>Add new Space</button>
        </p>
      </div>
    </Modal>
  )
}

// todo !!! improve styles
const SpaceRecordInModal = (p: {
  space: ISpace,
  currentSpaceId: number,
  spaceIdInEdit: number,
  setSpaceIdInEdit: (value: number) => void
}) => {
  const dispatch = useContext(DispatchContext)

  const [localTitle, setLocalTitle] = useState<string>(p.space.title)

  function saveTitle() {
    console.log("saveTitle")
    if (p.space.title !== localTitle) {
      dispatch({
        type: Action.UpdateSpace,
        spaceId: p.space.id,
        title: localTitle
      })
    }
    p.setSpaceIdInEdit(-1)
  }

  function selectSpace() {
    dispatch({
      type: Action.SelectSpace,
      spaceId: p.space.id
    })
  }

  function deleteSpace() {
    const res = confirm("Are you sure you want to delete this space?")
    if (res) {
      dispatch({
        type: Action.DeleteSpace,
        spaceId: p.space.id
      })
    }
  }

  function moveUp() {
    // todo !!!
    alert("to impl")
  }

  function moveDown() {
    // todo !!!
    alert("to impl")
  }

  function rename() {
    console.log("rename")
    p.setSpaceIdInEdit(p.space.id)
  }

  return <div className={"space-item"}>
    <EditableTitle
      className={CL("space-item__title", {
        "active": p.space.id === p.currentSpaceId
      })}
      inEdit={p.space.id === p.spaceIdInEdit}
      localTitle={localTitle}
      setLocalTitle={setLocalTitle}
      onSaveTitle={saveTitle}
      search={""}
      onClick={selectSpace}
    />
    {
      (p.space.id === p.spaceIdInEdit)
        ? null
        : <button onClick={rename}>rename</button>

    }
    <button onClick={moveUp}>move up</button>
    <button onClick={moveDown}>move down</button>
    <button onClick={deleteSpace}>remove</button>
  </div>
}