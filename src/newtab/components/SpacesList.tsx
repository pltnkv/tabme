import React, { useContext, useEffect, useState } from "react"
import PlusIcon from "../icons/plus.svg"
import DeleteIcon from "../icons/delete.svg"
import { ISpace } from "../helpers/types"
import { CL } from "../helpers/classNameHelper"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { SimpleEditableTitle } from "./EditableTitle"
import { DropdownMenu } from "./dropdown/DropdownMenu"
import { bindDADSpaceEffect } from "../helpers/dragAndDropSpace"
import { isTargetSupportsDragAndDrop } from "../helpers/utils"
import { genUniqLocalId } from "../state/actionHelpers"
import { insertBetween } from "../helpers/fractionalIndexes"
import { JoinBetaModal } from "./modals/JoinBetaModal"

export function SpacesList(p: {
  betaMode: boolean
  spaces: ISpace[]
  currentSpaceId: number
  itemInEdit: number | undefined
}) {
  const dispatch = useContext(DispatchContext)

  const [menuSpaceId, setMenuSpaceId] = useState(-1)
  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)
  const [isJoinBetaModalOpen, setJoinBetaModalOpen] = useState(false)

  const setEditingSpaceId = (spaceId: number | undefined) => {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: spaceId }
    })
  }

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
    setEditingSpaceId(undefined)
  }

  const onSpaceTitleElementUnmount = () => {
    setEditingSpaceId(undefined)
  }

  const onRenameSpace = (spaceId: number) => {
    setMenuSpaceId(-1)
    setEditingSpaceId(spaceId)
  }

  const deleteSpace = (space: ISpace) => {
    const res = confirm(`Are you sure you want to delete '${space.title}' Space with all its Bookmarks?`)
    if (res) {
      dispatch({
        type: Action.DeleteSpace,
        spaceId: space.id
      })
    }
  }

  const onAddSpace = () => {
    if (p.betaMode) {
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

      setEditingSpaceId(spaceId)
    } else {
      setJoinBetaModalOpen(true)
    }
  }

  useEffect(() => {
    if (mouseDownEvent) {

      const onChangeSpacePosition = (spaceId: number, newPosition: string) => {
        dispatch({
          type: Action.UpdateSpace,
          spaceId: spaceId,
          position: newPosition
        })
      }

      return bindDADSpaceEffect(mouseDownEvent,
        {
          onChangeSpacePosition
        }
      )
    }
  }, [mouseDownEvent])

  function onMouseDown(e: React.MouseEvent) {
    if (isTargetSupportsDragAndDrop(e, "spaces-list__delete-button") && p.spaces.length > 1) {
      setMouseDownEvent(e)
    }
  }

  return (
    <div className="spaces-list"
         onMouseDown={onMouseDown}>
      {
        p.spaces.length === 0 && <span style={{ padding: "8px" }}>no spaces</span>
      }
      {
        p.spaces.map((space) => {
          return <span key={space.id}
                       className={CL("spaces-list__item", { active: space.id === p.currentSpaceId })}
                       onClick={() => onSpaceClick(space.id)}
                       data-position={space.position}
                       data-space-id={space.id}
          >
            <SimpleEditableTitle
              inEdit={space.id === p.itemInEdit}
              onContextMenu={() => setMenuSpaceId(space.id)}
              value={space.title || "untitled"}
              onSave={(title) => onSaveNewSpaceTitle(space.id, title)}
              onUnmount={onSpaceTitleElementUnmount}
            />
            {
              space.id === p.itemInEdit && <button className="spaces-list__delete-button"
                                                   title="Delete space"
                                                   onMouseDown={() => deleteSpace(space)}
              >
                <DeleteIcon/>
              </button>
            }
            {
              menuSpaceId === space.id && <DropdownMenu onClose={() => {setMenuSpaceId(-1)}} className={"dropdown-menu--folder"} offset={{ top: -22, left: -16 }}>
                <button className="dropdown-menu__button focusable" onClick={() => onRenameSpace(space.id)}>Rename space</button>
                {
                  p.spaces.length > 1 && <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={() => deleteSpace(space)}>Delete space</button>
                }
              </DropdownMenu>
            }
          </span>
        })

      }
      {
        !p.itemInEdit && <div className="spaces-list__new" onClick={onAddSpace} title="Add new space">
          <PlusIcon/>
        </div>
      }

      <JoinBetaModal setOpen={setJoinBetaModalOpen} isOpen={isJoinBetaModalOpen}/>
    </div>
  )
}

