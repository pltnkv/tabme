import React, { useContext, useEffect, useRef, useState } from "react"
import { blurSearch, hasArchivedItems, hasItemsToHighlight } from "../helpers/utils"
import { Action, DispatchContext, IAppState, wrapIntoTransaction } from "../state"
import { bindDADItemEffect } from "../helpers/dragAndDropItem"
import { clickFolderItem, createFolder, getCanDragChecker, showMessage } from "../helpers/actions"
import { Folder } from "./Folder"
import { DropdownMenu } from "./DropdownMenu"
import { handleBookmarksKeyDown, handleSearchKeyDown } from "../helpers/handleBookmarksKeyDown"
import { Modal } from "./Modal"

export function Bookmarks(props: {
  appState: IAppState;
}) {
  const { dispatch } = useContext(DispatchContext)
  const [moreButtonsVisibility, setMoreButtonsVisibility] = useState<boolean>(false)
  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)

  const [isOverrideModalOpen, setOverrideModalOpen] = useState(false)

  const fileInput = useRef(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (mouseDownEvent) {
      const onDropItems = (folderId: number, itemIdInsertAfter: number | undefined, targetsIds: number[]) => {

        wrapIntoTransaction(() => {

          if (folderId === -1) { // we need to create new folder first
            folderId = createFolder(dispatch)
          }

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
        wrapIntoTransaction(() => {
          dispatch({
            type: Action.MoveFolder,
            folderId,
            insertBeforeFolderId
          })
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
    wrapIntoTransaction(() => {
      const folderId = createFolder(dispatch)

      dispatch({
        type: Action.UpdateAppState,
        newState: { itemInEdit: folderId }
      })
    })
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
                <button className={"btn__setting"} onClick={onToggleExport}>Export JSON</button>
                <div className="file-input-container">
                  <button className={"btn__setting"}>Import JSON</button>
                  <input type="file" accept=".json" className="hidden-file-input" ref={fileInput} onChange={onToggleImport}/>
                </div>
              </>
              : null
          }

          <button className={`btn__setting ${moreButtonsVisibility ? "btn__setting--active" : ""}`} onClick={onToggleMore}>Settings</button>
          {moreButtonsVisibility ? (
            <DropdownMenu onClose={() => {setMoreButtonsVisibility(false)}} className={"dropdown-menu--settings"} topOffset={30}>
              <SettingsOptions appState={props.appState} onOverrideNewTabMenu={() => setOverrideModalOpen(true)}/>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      <OverrideModal isOverrideModalOpen={isOverrideModalOpen} setOverrideModalOpen={setOverrideModalOpen}/>
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

const SettingsOptions = (props: {
  appState: IAppState;
  onOverrideNewTabMenu: () => void
}) => {
  const { dispatch } = useContext(DispatchContext)

  function onToggleNotUsed() {
    if (hasItemsToHighlight(props.appState.folders, props.appState.historyItems)) {
      dispatch({ type: Action.UpdateShowNotUsedItems, value: !props.appState.showNotUsed })
      const message = !props.appState.showNotUsed ? "Unused items for the past 60 days are highlighted" : "Highlighting canceled"
      showMessage(message, dispatch)
    } else {
      showMessage(`There are no unused items to highlight`, dispatch)
    }
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

  function onSendFeedback() {
    chrome.tabs.create({ url: "https://docs.google.com/forms/d/e/1FAIpQLSeA-xs3GjBVNQQEzSbHiGUs1y9_XIo__pQBJKQth737VqAEOw/formResponse", active: true })
  }

  function onRateInStore() {
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

  let toggleModeText
  if (props.appState.colorTheme === "dark") {
    toggleModeText = "Light Color Theme"
  } else {
    toggleModeText = "Dark Color Theme"
  }

  const settingsOptions: Array<{ onClick: () => void; title: string; text: string } | { separator: true }> = [
    {
      onClick: onToggleNotUsed,
      title: "Highlight not used in past 60 days to archive them. It helps to keep workspace clean.",
      text: props.appState.showNotUsed ? "Unhighlight not used" : "Highlight not used"
    },
    {
      onClick: onToggleHidden,
      title: "It shows hidden bookmarks.",
      text: props.appState.showArchived ? "Hide archived" : "Show archived"
    },
    {
      onClick: onToggleMode,
      title: "Change your Color Schema",
      text: toggleModeText
    },
    {
      separator: true
    },
    {
      onClick: onImportExistingBookmarks,
      title: "Import existing Chrome bookmarks into Tabme",
      text: "Import browser bookmarks"
    },
    {
      onClick: props.onOverrideNewTabMenu,
      title: "Manage browser new tab override by Tabme",
      text: __OVERRIDE_NEWTAB ? "Revert to default new tab" : "Show Tabme on new tab"
    },
    {
      onClick: onAdvanced,
      title: "Shows Import and Export into JSON file buttons",
      text: "Advanced mode"
    },
    {
      onClick: onHowToUse,
      title: "Learn more about Tabme. There is a lot of hidden functionality",
      text: "Guide: How to use"
    },
    {
      separator: true
    },
    {
      onClick: onSendFeedback,
      title: "I appreciate honest feedback on what needs to be improved or bug reports. Thanks for your time and support!",
      text: "Send feedback"
    },
    {
      onClick: onRateInStore,
      title: "Thank you for using Tabme 🖤",
      text: "Rate Tabme in Chrome Store"
    }
  ]

  function isSeparator(opt: any): opt is { separator: boolean } {
    return opt.hasOwnProperty("separator")
  }

  return <>
    {settingsOptions.map((option, index) => {
      if (isSeparator(option)) {
        return <div className="dropdown-menu__separator"/>
      } else {
        return <button
          key={index}
          className="dropdown-menu__button focusable"
          onClick={option.onClick}
          title={option.title}
        >
          {option.text}
        </button>
      }
    })}
  </>
}

const OverrideModal = ({ isOverrideModalOpen, setOverrideModalOpen }:
                         { isOverrideModalOpen: boolean, setOverrideModalOpen: (value: boolean) => void }) => {
  return (
    __OVERRIDE_NEWTAB
      ?
      <Modal isOpen={isOverrideModalOpen} onClose={() => setOverrideModalOpen(false)}>
        <div className="modal-no-override">
          <h2>How to remove Tabme from the new tab?</h2>
          <p>If you want to use Tabme without it taking over your new tab, <br/>try the "Tabme — version without newtab" extension.</p>
          <p>It includes all the same features but doesn’t open on every new tab</p>
          <p>Steps:</p>
          <ol>
            <li>[optional] Export existing bookmarks into JSON file.<br/>
              <span>Settings → Advanced mode → Export</span></li>
            <li>Uninstall current "Tabme" extension. <br/>
              <span>Go to "Manage extensions" from your browser. Find the card for Tabme and click "Remove"</span></li>
            <li>Install "<a href="https://chromewebstore.google.com/detail/tabme/jnhiookaaldadiimlgncedhkpmhlmmip">Tabme — version without newtab</a>" extension</li>
            <li>[optional] Import saved bookmarks.<br/>
              <span>Settings → Advanced mode → Import</span></li>
          </ol>
          <p>Sorry for the complex steps. Chrome doesn't support easy new tab customization.</p>
          <button className="btn__setting" onClick={() => setOverrideModalOpen(false)}>Close</button>
        </div>
      </Modal>
      :
      <Modal isOpen={isOverrideModalOpen} onClose={() => setOverrideModalOpen(false)}>
        <div className="modal-no-override">
          <h2>How to open Tabme in the every new tab?</h2>
          <p>If you want Tabme was open every new tab, try the regular <a href="https://chromewebstore.google.com/detail/tabme/jnhiookaaldadiimlgncedhkpmhlmmip">Tabme extension</a>.
          </p>
          <p>It includes all the same features.</p>
          <p>Steps:</p>
          <ol>
            <li>[optional] Export existing bookmarks into JSON file. <br/>
              <span>Settings → Advanced mode → Export</span></li>
            <li>Uninstall current "Tabme — without new tab override" extension. <br/>
              <span>Go to "Manage extensions" from your browser. Find the card for Tabme and click "Remove"</span></li>
            <li>Install <a href="https://chromewebstore.google.com/detail/tabme/jnhiookaaldadiimlgncedhkpmhlmmip">Tabme extension</a></li>
            <li>[optional] Import saved bookmarks.<br/>
              <span>Settings → Advanced mode → Import</span></li>
          </ol>
          <p>Sorry for the complex steps. Chrome doesn't support easy new tab customization.</p>
          <button className="btn__setting" onClick={() => setOverrideModalOpen(false)}>Close</button>
        </div>
      </Modal>
  )
}