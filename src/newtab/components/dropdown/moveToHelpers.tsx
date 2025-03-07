import React from "react"
import { ISpace } from "../../helpers/types"
import { DropdownSubMenu } from "./DropdownMenu"
import IconSaved from "../../icons/saved.svg"

export function getFoldersList(
  space: ISpace,
  onFolderClick: (folderId: number, spaceId: number) => void,
  onCreateFolderClick: (spaceId: number) => void,
  currentFolderId?: number) {
  return (<>
    <div className="sub-menu__title">Folders:</div>
    {space.folders.map(folder => (
      <button
        key={folder.id}
        className="dropdown-menu__button focusable"
        disabled={currentFolderId === folder.id}
        onClick={() => onFolderClick(folder.id, space.id)}
      >
        <span className="folder-color" style={{ backgroundColor: folder.color }}></span>
        <span style={{ flexGrow: 1 }}>{folder.title}</span>
        {currentFolderId === folder.id && <IconSaved className="current-icon"></IconSaved>}
      </button>
    ))}
    <button className="btn__setting"
            style={{ marginTop: "12px" }}
            onClick={() => onCreateFolderClick(space.id)}>
      + new folder
    </button>
  </>)
}

export function getSpacesList(
  spaces: ISpace[],
  onSpaceClick: (spaceId: number) => void,
  currentSpaceId?: number
) {
  return (<>
    <div className="sub-menu__title">Spaces:</div>
    {spaces.map(space => (
      <button
        key={space.id}
        className="dropdown-menu__button focusable"
        disabled={currentSpaceId === space.id}
        onClick={() => onSpaceClick(space.id)}
      >
        <span>{space.title}</span>
        {currentSpaceId === space.id && <IconSaved className="current-icon"></IconSaved>}
      </button>
    ))}
  </>)
}

export function getSpacesWithNestedFoldersList(
  spaces: ISpace[],
  onFolderClick: (folderId: number) => void,
  onCreateFolderClick: (spaceId: number) => void,
  currentFolderId?: number
) {
  return (<>
    {
      spaces.length === 1
        ? getFoldersList(spaces[0], onFolderClick, onCreateFolderClick, currentFolderId)
        : <>
          <div className="sub-menu__title">Spaces:</div>
          {spaces.map(space => (
            <DropdownSubMenu
              key={space.id}
              menuId={space.id}
              title={space.title}
              submenuContent={getFoldersList(space, onFolderClick, onCreateFolderClick, currentFolderId)}
            ></DropdownSubMenu>
          ))}
        </>
    }
  </>)
}
