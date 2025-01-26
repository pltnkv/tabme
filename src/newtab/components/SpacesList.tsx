import React, { useContext, useState } from "react"
import MenuIcon from "../icons/menu.svg"
import { ISpace } from "../helpers/types"
import { CL } from "../helpers/classNameHelper"
import { DispatchContext } from "../state/actions"
import { Action } from "../state/state"
import { SpacesModal } from "./modals/SpacesModal"

export function SpacesList(p: {
  spaces: ISpace[]
  currentSpaceId: number
}) {
  const dispatch = useContext(DispatchContext)

  const [isSpacesModalOpen, setSpacesModalOpen] = useState(false)

  const onSpaceClick = (spaceId: number) => {
    if (p.currentSpaceId === spaceId) {
      console.log("edit")
    } else {
      dispatch({
        type: Action.SelectSpace,
        spaceId: spaceId
      })
    }
  }

  return (
    <div className="spaces-list">
      {
        p.spaces.map((space) => {
          return <button
            key={space.id}
            className={CL("spaces-list__item", { active: space.id === p.currentSpaceId })}
            onClick={() => onSpaceClick(space.id)}
          >{space.title}</button>
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

