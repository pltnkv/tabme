import React, { useContext, useState } from "react"
import { IFolder } from "../helpers/types"
import { createNewSection, DEFAULT_FOLDER_COLOR, EMPTY_FOLDER_COLOR, filterItemsBySearch } from "../helpers/utils"
import { Action, canShowArchived, DispatchContext, IAppState } from "../state"
import { DropdownMenu } from "./DropdownMenu"
import { showMessageWithUndo } from "../helpers/actions"
import { FolderItem } from "./FolderItem"

export function Folder(props: {
  appState: IAppState;
  folder: IFolder;
}) {
  const { dispatch } = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)

  function onDelete() {
    dispatch({
      type: Action.DeleteFolder,
      folderId: props.folder.id
    })
    showMessageWithUndo("Folder has been deleted", dispatch)
  }

  function onEditTitle() {
    dispatch({
      type: Action.UpdateFolderTitle,
      folderId: props.folder.id
    })
  }

  function onAddSection() {
    dispatch({
      type: Action.AddBookmarkToFolder,
      folderId: props.folder.id,
      itemIdInsertAfter: undefined,
      item: createNewSection()
    })
  }

  function onColorChange(e: any) {
    dispatch({
      type: Action.UpdateFolderColor,
      folderId: props.folder.id,
      color: e.target.value
    })
  }

  /* восстановить двух-колоночный режим*/
  // function onToggleColumnMode() {
  //   dispatch({
  //     type: Action.UpdateFolderColumnMode,
  //     folderId: props.folder.id,
  //     twoColumn: !props.folder.twoColumn
  //   })
  // }

  /*TODO избавиться от двойной фильтрации*/
  const folderItems = filterItemsBySearch(props.folder.items, props.appState.search)
    .filter(i => canShowArchived(props.appState) || !i.archived)

  const folderIsEmptyDuringSearch = props.appState.search != "" && folderItems.length === 0

  const folderClassName = `folder 
  ${props.folder.twoColumn ? "two-column" : ""}
  ${folderIsEmptyDuringSearch ? "folder--empty" : ""}
  `
  const folderBackgroundColor = folderIsEmptyDuringSearch ? EMPTY_FOLDER_COLOR : props.folder.color || DEFAULT_FOLDER_COLOR

  return (
    <div className={folderClassName} data-folder-id={props.folder.id}>
      <h2 style={{ backgroundColor: folderBackgroundColor }} className="draggable-folder">
        <span className="folder-title">
          <span className="folder-title__text" onClick={onEditTitle}>{props.folder.title}</span>
          <span className="folder-title__button" onClick={() => setShowMenu(!showMenu)}>☰</span>
        </span>

        {showMenu ? (
          <DropdownMenu onClose={() => setShowMenu(false)} className={"dropdown-menu--folder"}>
            <input className="dropdown-menu__button"
                   type="color"
                   onChange={onColorChange}
                   value={props.folder.color || DEFAULT_FOLDER_COLOR}
            />
            <button className="dropdown-menu__button" onClick={onEditTitle}>Rename</button>
            <button className="dropdown-menu__button" onClick={onAddSection}>Add section</button>
            {/*<button className="dropdown-menu__button" onClick={onToggleColumnMode}>{props.folder.twoColumn ? "Disable two column" : "Enable two column"}</button>*/}
            <button className="dropdown-menu__button dropdown-menu__button--dander" onClick={onDelete}>Delete</button>
          </DropdownMenu>
        ) : null}
      </h2>
      {
        folderItems.length === 0 && !folderIsEmptyDuringSearch ?
          <div className="folder-empty-tip">
            To add bookmark, drop an item form side panel here
          </div>
          : null
      }

      <div className="folder-items-box" data-folder-id={props.folder.id}>
        {
          folderItems.map(
            (item) => (
              <FolderItem
                key={item.id}
                item={item}
                appState={props.appState}
                folder={props.folder}
                inEdit={item.id === props.appState.itemInEdit}
              />
            )
          )}
      </div>
    </div>
  )
}