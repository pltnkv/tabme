import React, { useContext, useState } from "react"
import { IFolder, IFolderItem } from "../helpers/types"
import { hlSearch, isFolderItemNotUsed, isFolderItemOpened, removeUselessProductName } from "../helpers/utils"
import { Action, DispatchContext, IAppState } from "../state"
import { DropdownMenu } from "./DropdownMenu"
import { showMessage, showMessageWithUndo } from "../helpers/actions"

export function FolderItem(props: {
  item: IFolderItem;
  folder: IFolder;
  appState: IAppState
}) {
  const { dispatch } = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)

  function onRenameItem() {
    const newTitle = prompt("Enter item new title", props.item.title)
    if (newTitle) {
      dispatch({
        type: Action.UpdateFolderItem,
        folderId: props.folder.id,
        itemId: props.item.id,
        newTitle
      })
    }
  }

  function onDeleteItem() {
    dispatch({
      type: Action.DeleteFolderItem,
      itemId: props.item.id
    })
    showMessageWithUndo("Link has been deleted", dispatch)
  }

  function onCopyUrl() {
    navigator.clipboard.writeText(props.item.url)
    setShowMenu(false)
    showMessage("URL has been copied", dispatch)
  }

  function onEditUrl() {
    const newUrl = prompt("Edit URL", props.item.url)

    if (newUrl) {
      dispatch({
        type: Action.UpdateFolderItem,
        folderId: props.folder.id,
        itemId: props.item.id,
        url: newUrl
      })
      showMessageWithUndo("URL has been updated", dispatch)
    }
  }

  function onArchive() {
    dispatch({
      type: Action.UpdateFolderItem,
      folderId: props.folder.id,
      itemId: props.item.id,
      archived: true
    })
    showMessageWithUndo("Item has been archived", dispatch)
  }

  function onRestore() {
    dispatch({
      type: Action.UpdateFolderItem,
      folderId: props.folder.id,
      itemId: props.item.id,
      archived: false
    })
    showMessage("Item has been restored", dispatch)
  }

  function onContextMenu(e: React.MouseEvent) {
    setShowMenu(true)
    e.preventDefault()
  }

  const className = "folder-item__inner__title "
    + (isFolderItemOpened(props.item.url, props.appState.tabs) ? "opened " : "")
    + (props.appState.showNotUsed && isFolderItemNotUsed(props.item, props.appState.historyItems) ? "not-used " : "")

  return (
    <div className={
      "folder-item "
      + (showMenu ? "selected " : "")
      + (props.item.archived ? "archived " : "")
      + (props.item.isSection ? "section " : "")
    }>
      {showMenu && !props.item.isSection ? (
        <DropdownMenu onClose={() => setShowMenu(false)} className={"dropdown-menu--folder-item"}>
          <button className="dropdown-menu__button" onClick={onRenameItem}>Rename</button>
          <button className="dropdown-menu__button" onClick={onCopyUrl}>Copy url</button>
          <button className="dropdown-menu__button" onClick={onEditUrl}>Edit url</button>
          {
            props.item.archived
              ? <button className="dropdown-menu__button" onClick={onRestore}>Restore</button>
              : <button className="dropdown-menu__button" onClick={onArchive}>Archive</button>
          }
          <button className="dropdown-menu__button dropdown-menu__button--dander" onClick={onDeleteItem}>Delete</button>
        </DropdownMenu>
      ) : null}

      {showMenu && props.item.isSection ? (
        <DropdownMenu onClose={() => setShowMenu(false)} className={"dropdown-menu--folder-section"}>
          <button className="dropdown-menu__button" onClick={onRenameItem}>Rename</button>
          <button className="dropdown-menu__button dropdown-menu__button--dander" onClick={onDeleteItem}>Delete</button>
        </DropdownMenu>
      ) : null}

      <button className="folder-item__menu"
              onClick={() => setShowMenu(!showMenu)}>⋯
      </button>
      <div className="folder-item__inner draggable-item"
           data-id={props.item.id}
           onContextMenu={onContextMenu}>
        <img src={props.item.favIconUrl}/>
        <div className={className}
             dangerouslySetInnerHTML={hlSearch(removeUselessProductName(props.item.title), props.appState.search)}>
        </div>
      </div>
    </div>
  )
}