import React, { useContext, useEffect, useRef, useState } from "react"
import { blurSearch, findItemById, hasArchivedItems, hasItemsToHighlight } from "../helpers/utils"
import { Action, DispatchContext, IAppState, wrapIntoTransaction } from "../state"
import { bindDADItemEffect } from "../helpers/dragAndDropItem"
import { clickFolderItem, createFolder, getCanDragChecker, showMessage } from "../helpers/actions"
import { Folder } from "./Folder"
import { DropdownMenu } from "./DropdownMenu"
import { handleBookmarksKeyDown, handleSearchKeyDown } from "../helpers/handleBookmarksKeyDown"

export function Bookmarks(props: {
  appState: IAppState;
}) {

  const { dispatch } = useContext(DispatchContext)
  const [moreButtonsVisibility, setMoreButtonsVisibility] = useState<boolean>(false)
  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)

  const fileInput = useRef(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (mouseDownEvent) {
      const onDropItems = (folderId: number, itemIdInsertAfter: number | undefined, targetsIds: number[]) => {

        if (folderId === -1) { // we need to create new folder first
          folderId = createFolder(dispatch)
        }

        wrapIntoTransaction(() => {
          targetsIds.forEach(targetId => {
            dispatch({
              type: Action.MoveBookmarkToFolder,
              targetItemId: targetId,
              targetFolderId: folderId,
              itemIdInsertAfter
            })
          })
        })

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
        const meta = mouseDownEvent.metaKey || mouseDownEvent.ctrlKey || mouseDownEvent.button === 1
        clickFolderItem(targetId, props.appState, dispatch, meta)
      }

      const canDrag = getCanDragChecker(props.appState.search, dispatch)
      return bindDADItemEffect(mouseDownEvent,
        {
          isFolderItem: true,
          onDrop: onDropItems,
          onCancel,
          onClick,
          onDragStarted: canDrag
        },
        {
          onDrop: onDropFolder,
          onCancel
        },
        canvasRef.current!
      )
    }
  }, [mouseDownEvent])

  function onMouseDown(e: React.MouseEvent) {
    if (props.appState.itemInEdit === undefined) {
      setMouseDownEvent(e)
      blurSearch(e)
    }
  }

  function onCreateFolder() {
    const folderId = createFolder(dispatch)
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: folderId }
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

  function onSendFeedback() {
    chrome.tabs.create({ url: "https://chromewebstore.google.com/detail/tabme/jnhiookaaldadiimlgncedhkpmhlmmip/reviews", active: true })
  }

  function onHowToUse() {
    chrome.tabs.create({ url: "https://gettabme.com/guide.html", active: true })
  }

  function onImportExistingBookmarks() {
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } })
  }

  function onToggleMode() {
    dispatch({ type: Action.ToggleDarkMode })
  }

  function onAdvanced() {
    dispatch({ type: Action.UpdateAppState, newState: { devMode: !props.appState.devMode } })
  }

  let toggleModeText = "System Color Theme"
  if (props.appState.colorTheme === "dark") {
    toggleModeText = "Dark Color Theme"
  } else if (props.appState.colorTheme === "light") {
    toggleModeText = "Light Color Theme"
  }

  const folders = props.appState.showArchived ? props.appState.folders : props.appState.folders.filter(f => !f.archived)

  return (
    <div className="bookmarks-box">
      <div className="bookmarks-menu">
        <div style={{ display: "flex" }}>
          <input
            tabIndex={1}
            className="search"
            type="text"
            placeholder="Search in Tabme"
            value={props.appState.search}
            onChange={onSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        {
          props.appState.search !== ""
            ? <button tabIndex={1} className={"btn__clear-search"} onClick={onClearSearch}>✕</button>
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
            <DropdownMenu onClose={onToggleMore} className={"dropdown-menu--settings"} topOffset={30}>
              <button className="dropdown-menu__button focusable" onClick={onToggleNotUsed}
                      title="Highlight not used in past 60 days to archive them. It helps to keep workspace clean. ">
                {props.appState.showNotUsed ? "Unhighlight not used" : "Highlight not used"}
              </button>
              <button className="dropdown-menu__button focusable" onClick={onToggleMode} title="Change your Color Schema">{toggleModeText}</button>
              <button className="dropdown-menu__button focusable" onClick={onImportExistingBookmarks} title="Import existing Chrome bookmarks into Tabme">Import bookmarks</button>
              <button className="dropdown-menu__button focusable" onClick={onAdvanced} title="Shows Import and Export into JSON file buttons">Advanced mode</button>
              <button className="dropdown-menu__button focusable" onClick={onHowToUse} title="Learn more about the Tabme. There are a lot hidden functionality">Guide: How to use
              </button>
              <button className="dropdown-menu__button focusable" onClick={onSendFeedback}
                      title="I would appreciate honest feedback on what needs to be improved. Thanks you for using Tabme 🖤">Send feedback 😅
              </button>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="bookmarks" onMouseDown={onMouseDown} onKeyDown={(e) => handleBookmarksKeyDown(e, props.appState, dispatch)}>
        <canvas id="canvas-selection" ref={canvasRef}></canvas>

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