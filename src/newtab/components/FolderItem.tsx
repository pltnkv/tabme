import React, { useContext, useEffect, useRef, useState } from "react"
import { IFolder, IFolderItem } from "../helpers/types"
import { hlSearch, isFolderItemNotUsed, isFolderItemOpened } from "../helpers/utils"
import { Action, DispatchContext, IAppState } from "../state"
import { DropdownMenu } from "./DropdownMenu"
import { showMessage, showMessageWithUndo } from "../helpers/actions"

export function FolderItem(props: {
  item: IFolderItem;
  folder: IFolder;
  inEdit: boolean
  appState: IAppState
}) {
  const { dispatch } = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)

  function onRenameItem() {
    setShowMenu(false)
    setEditing(true)
  }

  function setEditing(val: boolean) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: val ? props.item.id : undefined }
    })
  }

  function trySaveTitle(newTitle: string) {
    if (props.item.title !== newTitle) {
      dispatch({
        type: Action.UpdateFolderItem,
        folderId: props.folder.id,
        itemId: props.item.id,
        newTitle
      })
      showMessageWithUndo("Item has been renamed", dispatch)
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
           title={props.item.url}
           onContextMenu={onContextMenu}>
        <img src={props.item.favIconUrl} alt="" />
        <EditableTitle className={className}
                       inEdit={props.inEdit}
                       setEditing={setEditing}
                       initTitle={props.item.title}
                       search={props.appState.search}
                       saveTitle={trySaveTitle}
        />

      </div>
    </div>
  )
}

function EditableTitle(p: {
  className: string,
  inEdit: boolean,
  setEditing: (value: boolean) => void,
  initTitle: string,
  search: string
  saveTitle: (val: string) => void,
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [title, setTitle] = useState(p.initTitle)

  useEffect(() => {
    // to support UNDO operation
    setTitle(p.initTitle)
  }, [p.initTitle])

  useEffect(() => {
    if (p.inEdit && textareaRef.current) {
      textareaRef.current.style.height = "0px" // Reset height to recalculate
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`
    }
  }, [p.inEdit, title])

  function handleTitleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setTitle(event.target.value)
  }

  function trySaveChange() {
    p.setEditing(false)
    p.saveTitle(title)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const isCmdEnter = event.metaKey && event.key === "Enter"
    const isCtrlEnter = event.ctrlKey && event.key === "Enter"
    const isEnter = event.key === "Enter" && !event.shiftKey
    const isEscape = event.key === "Escape"

    if (isEscape) {
      p.setEditing(false)
      setTitle(p.initTitle)
    } else if (isEnter || isCmdEnter || isCtrlEnter) {
      event.preventDefault() // Prevent the default action to avoid inserting a newline
      trySaveChange()
    }
  }

  return <>
    {
      p.inEdit ?
        <textarea
          ref={textareaRef}
          onKeyDown={handleKeyDown}
          onChange={handleTitleChange}
          onBlur={trySaveChange}
          value={title}
          autoFocus
        />
        :
        <div className={p.className} dangerouslySetInnerHTML={hlSearch(title, p.search)}/>
    }
  </>
}
