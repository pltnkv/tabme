import React, { useContext, useState} from "react"
import PlusIcon from "../icons/plus.svg"
import DeleteIcon from "../icons/delete.svg"
import { ISpace } from "../helpers/types"
import { CL } from "../helpers/classNameHelper"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { SimpleEditableTitle } from "./EditableTitle"
import { DropdownMenu } from "./dropdown/DropdownMenu"
import { genUniqLocalId } from "../state/actionHelpers"
import { insertBetween } from "../helpers/fractionalIndexes"
import { trackStat } from "../helpers/stats"
import { GetProPlanModal } from "./modals/GetProPlanModal"

export function SpacesList(p: {
  betaMode: boolean
  spaces: ISpace[]
  currentSpaceId: number
  itemInEdit: number | undefined
}) {
  const dispatch = useContext(DispatchContext)

  const [menuSpaceId, setMenuSpaceId] = useState(-1)
  const [isJoinBetaModalOpen, setJoinBetaModalOpen] = useState(false)

  const spaceInEdit = p.spaces.find(s => s.id === p.itemInEdit)

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
    const bookmarksCount = space.folders.reduce((count, f) => count + f.items.length, 0)
    const stickersCount = space.widgets?.length ?? 0
    const totalCount = bookmarksCount + stickersCount
    let res = true
    if (totalCount > 0) {
      res = confirm(`Delete the space '${space.title}'?`)
    }
    if (res) {
      dispatch({
        type: Action.DeleteSpace,
        spaceId: space.id
      })
    }
  }

  const onAddSpace = () => {
    if (p.betaMode || p.spaces.length === 0) {
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

      trackStat("spaceCreated", { source: "new-space-button" })
    } else {
      setJoinBetaModalOpen(true)
    }
  }

  return (
    <div className={CL("spaces-list")}>
      {
        p.spaces.length === 0 && <span style={{ padding: "8px" }}>Create New Space</span>
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
              space.id === p.itemInEdit && p.spaces.length > 1 && <button className="spaces-list__delete-button"
                                                                          title="Delete space"
                                                                          onMouseDown={() => deleteSpace(space)}
              >
                <DeleteIcon/>
              </button>
            }
            {
              menuSpaceId === space.id && <DropdownMenu onClose={() => {setMenuSpaceId(-1)}} className={"dropdown-menu--folder"} offset={{ top: 2, left: -16 }}>
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
        !spaceInEdit && <div className="spaces-list__new" onClick={onAddSpace} title="Add new space">
          <PlusIcon/>
        </div>
      }
      {
        isJoinBetaModalOpen && <GetProPlanModal onClose={() => setJoinBetaModalOpen(false)} reason={"Spaces"}/>
      }
    </div>
  )
}

