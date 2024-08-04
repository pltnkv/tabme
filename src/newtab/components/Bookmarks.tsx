import React, { useContext, useEffect, useRef, useState } from "react"
import { IFolderItem } from "../helpers/types"
import { blurSearch, findItemById, hasArchivedItems, hasItemsToHighlight, isCustomActionItem } from "../helpers/utils"
import { Action, DispatchContext, executeCustomAction, IAppState } from "../state"
import { bindDADItemEffect } from "../helpers/dragAndDropItem"
import { createFolder, getCanDragChecker, showMessage } from "../helpers/actions"
import { clearPressedKeys } from "../helpers/keyboardManager"
import { Folder } from "./Folder"
import { DropdownMenu } from "./DropdownMenu"

export function Bookmarks(props: {
  appState: IAppState;
}) {

  const { dispatch } = useContext(DispatchContext)
  const [moreButtonsVisibility, setMoreButtonsVisibility] = useState<boolean>(false)
  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)

  const fileInput = useRef(null)

  useEffect(() => {
    if (mouseDownEvent) {
      const onDropItem = (folderId: number, itemIdInsertAfter: number | undefined, targetId: number) => {
        const targetItem = findItemById(props.appState, targetId)
        if (targetItem) {

          if (folderId === -1) { // we need to create new folder first
            folderId = createFolder(dispatch)
          }

          dispatch({
            type: Action.DeleteFolderItem,
            itemId: targetId
          })

          dispatch({
            type: Action.AddBookmarkToFolder,
            folderId,
            itemIdInsertAfter,
            item: targetItem
          })
        }
        setMouseDownEvent(undefined)
      }
      const onDropFolder = (folderId: number, insertBeforeFolderId: number) => {
        dispatch({
          type: Action.MoveFolder,
          folderId,
          insertBeforeFolderId
        })

        setMouseDownEvent(undefined)
      }
      const onCancel = () => {
        setMouseDownEvent(undefined)
      }
      const onClick = (targetId: number) => {
        const targetItem = findItemById(props.appState, targetId)
        if (targetItem?.isSection) {
          onRenameSection(targetItem)
        } else if (isCustomActionItem(targetItem) && targetItem?.url) {
          executeCustomAction(targetItem.url, dispatch)
        } else if (targetItem) {
          if (mouseDownEvent.metaKey || mouseDownEvent.ctrlKey) {
            // open in new tab
            chrome.tabs.create({ url: targetItem.url })
            //TODO fix bug of not updating bold items when move to new tab in new window
          } else {
            // open in the same tab or switch to already opened
            const tab = props.appState.tabs.find(t => t.url === targetItem.url)
            if (tab && tab.id) {
              chrome.tabs.update(tab.id, { active: true })
              chrome.windows.update(tab.windowId, { focused: true })
            } else {
              chrome.tabs.getCurrent(t => {
                chrome.tabs.update(t?.id!, { url: targetItem.url })
              })
            }
          }
          clearPressedKeys()
        }
      }

      const canDrag = getCanDragChecker(props.appState.search, dispatch)
      return bindDADItemEffect(mouseDownEvent,
        {
          isFolderItem: true,
          onDrop: onDropItem,
          onCancel,
          onClick,
          onDragStarted: canDrag
        },
        {
          onDrop: onDropFolder,
          onCancel
        }
      )
    }
  }, [mouseDownEvent])

  function onRenameSection(targetItem: IFolderItem) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: targetItem.id }
    })
  }

  function onMouseDown(e: React.MouseEvent) {
    if (props.appState.itemInEdit === undefined) {
      setMouseDownEvent(e)
      blurSearch(e)
    }
  }

  function onCreateFolder() {
    const folderId = createFolder(dispatch)
    dispatch({
      type: Action.UpdateFolderTitle,
      folderId: folderId
    })
  }

  function onToggleHidden() {
    if (hasArchivedItems(props.appState.folders)) {
      dispatch({ type: Action.UpdateShowArchivedItems, value: !props.appState.showArchived })
      const message = !props.appState.showArchived ? "Archived items are visible" : "Archived items are hidden"
      showMessage(message, dispatch)
    } else {
      showMessage(`There are no archived items yet`, dispatch)
    }
  }

  function onToggleNotUsed() {
    if (hasItemsToHighlight(props.appState.folders, props.appState.historyItems)) {
      dispatch({ type: Action.UpdateShowNotUsedItems, value: !props.appState.showNotUsed })
      const message = !props.appState.showNotUsed ? "Unused items for the past 60 days are highlighted" : "Highlighting canceled"
      showMessage(message, dispatch)
    } else {
      showMessage(`There are no unused items to highlight`, dispatch)
    }
  }

  function onToggleMore() {
    setMoreButtonsVisibility(!moreButtonsVisibility)
  }

  function onToggleExport() {
    downloadObjectAsJson(props.appState.folders, "tabme_backup")
  }

  function downloadObjectAsJson(exportObj: any, exportName: string) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj))
    const downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", exportName + ".json")
    document.body.appendChild(downloadAnchorNode) // required for firefox
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  function onToggleImport(event: any) {
    const file = event.target.files[0]
    const fr = new FileReader()
    fr.onload = receivedText
    fr.readAsText(file)
  }

  function receivedText(e: any) {
    let lines = e.target.result
    const loadedState = JSON.parse(lines)
    dispatch({ type: Action.InitFolders, folders: loadedState })
  }

  function onSearchChange(event: React.ChangeEvent) {
    dispatch({ type: Action.UpdateSearch, value: (event.target as any).value })
  }

  function onClearSearch() {
    dispatch({ type: Action.UpdateSearch, value: "" })
  }

  function onReportBug() {
    prompt("Share feedback or encountered issues to the email: gettabme@gmail.com \n\nThank you for using Tabme", "gettabme@gmail.com")
  }

  function onHowToUse() {
    chrome.tabs.create({ url: "https://gettabme.com/guide.html", active: true })
  }

  function onImportExistingBookmarks() {
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } })
  }

  const folders = props.appState.showArchived ? props.appState.folders : props.appState.folders.filter(f => !f.archived)

  return (
    <div className="bookmarks-box">
      <div className="bookmarks-menu">
        <div style={{ display: "flex" }}>
          <input
            className="search"
            autoFocus={true}
            type="text"
            placeholder="Search in Tabme"
            value={props.appState.search}
            onChange={onSearchChange}
          />
        </div>
        {
          props.appState.search !== ""
            ? <button className={"btn__clear-search"} onClick={onClearSearch}>✕</button>
            : null
        }
        {/*<div className="toolbar-buttons" style={{marginRight: "auto"}}>*/}
        {/*  <button className={"btn__setting"}>+ folder</button>*/}
        {/*  <button className={"btn__setting"}>+ note </button>*/}
        {/*</div>*/}

        <div className="menu-buttons">
          {
            props.appState.devMode ?
              <>
                <button className={"btn__setting"} onClick={onToggleExport}>Export</button>
                <div className="file-input-container">
                  <button className={"btn__setting"}>Import</button>
                  <input type="file" accept=".json" className="hidden-file-input" ref={fileInput} onChange={onToggleImport}/>
                </div>
              </>
              : null
          }
          <button className={`btn__setting ${props.appState.showArchived ? "btn__setting--active" : ""}`}
                  onClick={onToggleHidden}>{props.appState.showArchived ? "Hide archived" : "Show archived"}</button>
          <button className={`btn__setting ${moreButtonsVisibility ? "btn__setting--active" : ""}`}
                  onClick={onToggleMore}>{moreButtonsVisibility ? "Hide settings" : "Settings"}</button>
          {moreButtonsVisibility ? (
            <DropdownMenu onClose={onToggleMore} className={"dropdown-menu--settings"}>
              <button className="dropdown-menu__button"
                      onClick={onToggleNotUsed}>{props.appState.showNotUsed ? "Unhighlight not used" : "Highlight not used"}</button>
              <button className="dropdown-menu__button" onClick={onImportExistingBookmarks}>Import bookmarks</button>
              <button className="dropdown-menu__button" onClick={onHowToUse}>Guide: How to use</button>
              <button className="dropdown-menu__button" onClick={onReportBug}>Report issue</button>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="bookmarks" onMouseDown={onMouseDown}>

        {folders.map((folder) => (
          <Folder
            appState={props.appState}
            key={folder.id}
            folder={folder}
          />
        ))}

        {
          props.appState.search === ""
            ? (
              <div className="folder folder--new">
                <h2 onClick={onCreateFolder}>New folder <span>+ Click to add</span></h2>
                <div className="folder-items-box" data-folder-id="-1"/>
              </div>
            )
            : null
        }

      </div>
    </div>
  )
}

