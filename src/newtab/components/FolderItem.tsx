import React, { useContext, useEffect, useState } from "react"
import { IFolderItem } from "../helpers/types"
import { findItemsByIds, findTabsByURL, isFolderItemNotUsed } from "../helpers/utils"
import { Action, DispatchContext, IAppState, wrapIntoTransaction } from "../state"
import { DropdownMenu } from "./DropdownMenu"
import { showMessage, showMessageWithUndo } from "../helpers/actions"
import { EditableTitle } from "./EditableTitle"
import { getSelectedItemsIds } from "../helpers/selectionUtils"

export function FolderItem(p: {
  item: IFolderItem;
  inEdit: boolean
  appState: IAppState
}) {
  const { dispatch } = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)

  function trySaveTitle(newTitle: string) {
    if (p.item.title !== newTitle) {
      wrapIntoTransaction(() => {
        dispatch({
          type: Action.UpdateFolderItem,
          itemId: p.item.id,
          newTitle
        })
      })
    }
  }

  function setEditing(val: boolean) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: val ? p.item.id : undefined }
    })
  }

  function onContextMenu(e: React.MouseEvent) {
    setShowMenu(true)
    e.preventDefault()
  }

  function onCloseTab() {
    const tabs = findTabsByURL(p.item.url, p.appState.tabs)
    const tabIds = tabs.filter(t => t.id).map(t => t.id!)
    dispatch({
      type: Action.CloseTabs,
      tabIds: tabIds
    })
  }

  const folderItemOpened = findTabsByURL(p.item.url, p.appState.tabs).length !== 0
  const titleClassName = "folder-item__inner__title "
    + (folderItemOpened ? "opened " : "")
    + (p.appState.showNotUsed && isFolderItemNotUsed(p.item, p.appState.historyItems) ? "not-used " : "")

  return (
    <div className={
      "folder-item "
      + (showMenu ? "selected " : "")
      + (p.item.archived ? "archived " : "")
    }>
      {showMenu
        ? <FolderItemMenu
          appState={p.appState}
          item={p.item}
          inEdit={p.inEdit}
          setEditing={setEditing}
          setShowMenu={setShowMenu}/>
        : null
      }
      <button className="folder-item__menu"
              onContextMenu={onContextMenu}
              onClick={() => setShowMenu(!showMenu)}>⋯
      </button>
      <a className={
        "folder-item__inner draggable-item "
        + (p.item.isSection ? "section " : "")
      }
         tabIndex={2}
         data-id={p.item.id}
         onClick={e => e.preventDefault()}
         title={p.item.url}
         href={p.item.url}
         onContextMenu={onContextMenu}>
        <img src={p.item.favIconUrl} alt=""/>
        <EditableTitle className={titleClassName}
                       inEdit={p.inEdit}
                       setEditing={setEditing}
                       initTitle={p.item.title}
                       search={p.appState.search}
                       onSaveTitle={trySaveTitle}
        />
        {
          folderItemOpened ? <button className="btn__close-tab stop-dad-propagation"
                                     tabIndex={2}
                                     title="Close the Tab"
                                     onClick={onCloseTab}
          ><span>✕</span></button> : null
        }
      </a>
    </div>
  )
}

function FolderItemMenu(p: {
  setShowMenu: (value: boolean) => void,
  setEditing: (val: boolean) => void,
  item: IFolderItem;
  inEdit: boolean
  appState: IAppState
}) {
  const { dispatch } = useContext(DispatchContext)
  const [selectedItemsIds, setSelectedItemsIds] = useState<number[]>([])

  useEffect(() => {
    const ids = getSelectedItemsIds()
    if (ids.length > 0) {
      setSelectedItemsIds(ids)
    } else {
      setSelectedItemsIds([p.item.id])
    }
  }, [])

  function onRenameItem() {
    p.setShowMenu(false)
    p.setEditing(true)
  }

  // support multiple
  function onOpenNewTab() {
    let items = findItemsByIds(p.appState, selectedItemsIds)
    items.forEach((item) => {
      if (item.url) {
        chrome.tabs.create({ url: item.url })
      }
    })

    p.setShowMenu(false)
  }

  // support multiple
  function onDeleteItem() {
    wrapIntoTransaction(() => {
      dispatch({
        type: Action.DeleteFolderItem,
        itemIds: selectedItemsIds
      })
    })
    showMessageWithUndo("Bookmark has been deleted", dispatch)
  }

  function onCopyUrl() {
    navigator.clipboard.writeText(p.item.url)
    p.setShowMenu(false)
    showMessage("URL has been copied", dispatch)
  }

  function onEditUrl() {
    const newUrl = prompt("Edit URL", p.item.url)

    if (newUrl) {
      wrapIntoTransaction(() => {
        dispatch({
          type: Action.UpdateFolderItem,
          itemId: p.item.id,
          url: newUrl
        })
      })
    }
  }

  // support multiple
  function onArchive() {
    let items = findItemsByIds(p.appState, selectedItemsIds)

    wrapIntoTransaction(() => {
      items.forEach((item) => {
        dispatch({
          type: Action.UpdateFolderItem,
          itemId: item.id,
          archived: true
        })
      })

    })
    showMessageWithUndo("Bookmark has been archived", dispatch)
  }

  function onRestore() {
    wrapIntoTransaction(() => {
      dispatch({
        type: Action.UpdateFolderItem,
        itemId: p.item.id,
        archived: false
      })
    })
    showMessage("Bookmark has been restored", dispatch)
  }

  return <>
    {
      selectedItemsIds.length > 1 ?
        <DropdownMenu onClose={() => p.setShowMenu(false)} className={"dropdown-menu--folder-item"} topOffset={4}>
          <button className="dropdown-menu__button focusable" onClick={onOpenNewTab}>Open in New Tab</button>
          <button className="dropdown-menu__button focusable" onClick={onArchive}>Archive</button>
          <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDeleteItem}>Delete</button>
        </DropdownMenu>
        :
        <>
          {p.item.isSection ?
            <DropdownMenu onClose={() => p.setShowMenu(false)} className={"dropdown-menu--folder-section"}>
              <button className="dropdown-menu__button focusable" onClick={onRenameItem}>Rename</button>
              <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDeleteItem}>Delete</button>
            </DropdownMenu>
            :
            <DropdownMenu onClose={() => p.setShowMenu(false)} className={"dropdown-menu--folder-item"} topOffset={4}>
              <button className="dropdown-menu__button focusable" onClick={onOpenNewTab}>Open in New Tab</button>
              <button className="dropdown-menu__button focusable" onClick={onRenameItem}>Rename</button>
              <button className="dropdown-menu__button focusable" onClick={onCopyUrl}>Copy url</button>
              <button className="dropdown-menu__button focusable" onClick={onEditUrl}>Edit url</button>
              {
                p.item.archived
                  ? <button className="dropdown-menu__button focusable" onClick={onRestore}>Restore</button>
                  : <button className="dropdown-menu__button focusable" onClick={onArchive}>Archive</button>
              }
              <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDeleteItem}>Delete</button>
            </DropdownMenu>
          }
        </>
    }
  </>
}