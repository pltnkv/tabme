import React, { useContext, useState } from "react"
import MenuIcon from "../icons/menu.svg"
import { ISpace } from "../helpers/types"
import { CL } from "../helpers/classNameHelper"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { SpacesModal } from "./modals/SpacesModal"
import { SimpleEditableTitle } from "./EditableTitle"
import { DropdownMenu } from "./dropdown/DropdownMenu"

export function SpacesList(p: {
  spaces: ISpace[]
  currentSpaceId: number
}) {
  const dispatch = useContext(DispatchContext)

  const [menuSpaceId, setMenuSpaceId] = useState(-1)
  const [editingSpaceId, setEditingSpaceId] = useState(-1)
  const [isSpacesModalOpen, setSpacesModalOpen] = useState(false)

  const onSpaceClick = (spaceId: number) => {
    if (p.currentSpaceId === spaceId) {
      setEditingSpaceId(spaceId)
    } else {
      dispatch({
        type: Action.SelectSpace,
        spaceId: spaceId
      })
    }
  }

  const onSaveNewSpaceTitle = (spaceId: number, title: string) => {
    dispatch({
      type: Action.UpdateSpace,
      spaceId,
      title
    })
    setEditingSpaceId(-1)
  }

  const onRenameSpace = (spaceId: number) => {
    setMenuSpaceId(-1)
    setEditingSpaceId(spaceId)
  }

  const deleteSpace = (space: ISpace) => {
    const res = confirm(`Are you sure you want to delete '${space.title}' space?`)
    if (res) {
      dispatch({
        type: Action.DeleteSpace,
        spaceId: space.id
      })
    }
  }

  return (
    <div className="spaces-list">
      {
        p.spaces.length === 0 && <span style={{ padding: "8px" }}>no spaces</span>
      }
      {
        p.spaces.map((space) => {
          return <span key={space.id}
                       className={CL("spaces-list__item", { active: space.id === p.currentSpaceId })}
                       data-space-id={space.id}
          >
            <SimpleEditableTitle
              inEdit={space.id === editingSpaceId}
              onClick={() => onSpaceClick(space.id)}
              onContextMenu={() => setMenuSpaceId(space.id)}

              value={space.title}
              onSave={(title) => onSaveNewSpaceTitle(space.id, title)}
            />
            {
              menuSpaceId === space.id && <DropdownMenu onClose={() => {setMenuSpaceId(-1)}} className={"dropdown-menu--folder"} offset={{top: -22, left: -16}}>
                <button className="dropdown-menu__button focusable" onClick={() => onRenameSpace(space.id)}>Rename</button>
                <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={() => deleteSpace(space)}>Delete space</button>
              </DropdownMenu>
            }

          </span>
        })

      }
      <div className="spaces-list__settings" onClick={() => setSpacesModalOpen(!isSpacesModalOpen)}>
        <MenuIcon/>
      </div>
      <SpacesModal setSpacesModalOpen={setSpacesModalOpen}
                   isSpacesModalOpen={isSpacesModalOpen}
                   currentSpaceId={p.currentSpaceId}
                   spaces={p.spaces}/>
    </div>
  )
}

