import React, { useContext, useEffect, useRef, useState } from "react"
import { blurSearch, IS_MAC_DEVICE, isTargetSupportsDragAndDrop } from "../helpers/utils"
import { bindDADItemEffect } from "../helpers/dragAndDropItem"
import { clickFolderItem, createFolder, getCanDragChecker } from "../helpers/actionsHelpers"
import { Folder } from "./Folder"
import { DropdownMenu } from "./DropdownMenu"
import { handleBookmarksKeyDown, handleSearchKeyDown } from "../helpers/handleBookmarksKeyDown"
import { Modal } from "./Modal"
import { Action, IAppState } from "../state/state"
import { canShowArchived, DispatchContext, wrapIntoTransaction } from "../state/actions"
import { HelpOptions, SettingsOptions } from "./SettingsOptions"
import { CL } from "../helpers/classNameHelper"
import IconHelp from "../icons/help.svg"
import IconSettings from "../icons/settings.svg"
import IconFind from "../icons/find.svg"

export function Bookmarks(props: {
  appState: IAppState;
}) {
  const dispatch = useContext(DispatchContext)
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState<boolean>(false)
  const [helpMenuVisibility, setHelpMenuVisibility] = useState<boolean>(false)
  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)

  const [isOverrideModalOpen, setOverrideModalOpen] = useState(false)
  const [isShortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const bookmarksRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (bookmarksRef.current) {
        setIsScrolled(bookmarksRef.current.scrollTop > 0)
      }
    }

    const bookmarksElement = bookmarksRef.current
    if (bookmarksElement) {
      bookmarksElement.addEventListener("scroll", handleScroll)
    }

    return () => {
      if (bookmarksElement) {
        bookmarksElement.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    if (mouseDownEvent) {
      const onDropItems = (folderId: number, insertBeforeItemId: number | undefined, targetsIds: number[]) => {

        wrapIntoTransaction(() => { // todo figure out how to wrap it into single action. pipe here??

          if (folderId === -1) { // we need to create new folder first
            folderId = createFolder(dispatch)
          }

          dispatch({
            type: Action.MoveFolderItems,
            itemIds: targetsIds,
            targetFolderId: folderId,
            itemIdInsertBefore: insertBeforeItemId
          })
        })

        setMouseDownEvent(undefined)
      }
      const onDropFolder = (folderId: number, insertBeforeFolderId: number | undefined) => {
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
        clickFolderItem(targetId, props.appState, dispatch, meta, props.appState.openBookmarksInNewTab)
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
    console.log('onMouseDown 1')
    if (!props.appState.itemInEdit && isTargetSupportsDragAndDrop(e)) {
      console.log('onMouseDown 2')
      blurSearch(e)
      setMouseDownEvent(e)
    }
  }

  function onCreateFolder() {
    const folderId = createFolder(dispatch)
    wrapIntoTransaction(() => {
      dispatch({
        type: Action.UpdateAppState,
        newState: { itemInEdit: folderId }
      })
    })
  }

  function onToggleHelpSettings() {
    setHelpMenuVisibility(!helpMenuVisibility)
  }

  function onToggleSettings() {
    setSettingsMenuVisibility(!settingsMenuVisibility)
  }

  function onSearchChange(event: React.ChangeEvent) {
    dispatch({ type: Action.UpdateSearch, value: (event.target as any).value })
  }

  function onClearSearch() {
    dispatch({ type: Action.UpdateSearch, value: "" })
  }

  async function onLogout() {
    localStorage.removeItem("authToken")
    alert("Logout successful")
  }

  const folders = props.appState.showArchived
    ? props.appState.folders
    : props.appState.folders.filter(f => canShowArchived(props.appState) || !f.archived)

  return (
    <div className="bookmarks-box">
      <div className={CL("bookmarks-menu", { "bookmarks-menu--scrolled": isScrolled })}>
        <div style={{ display: "flex" }}>
          <IconFind className="search-icon"/>
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
            props.appState.betaMode ?
              <>
                <button className={"btn__setting"} onClick={onLogout}>Logout</button>
              </>
              : null
          }

          <button className={`btn__icon ${helpMenuVisibility ? "active" : ""}`} onClick={onToggleHelpSettings}>
            <IconHelp/>
          </button>
          <button className={`btn__icon ${settingsMenuVisibility ? "active" : ""}`} onClick={onToggleSettings}>
            <IconSettings/>
          </button>
          {helpMenuVisibility ? (
            <DropdownMenu onClose={() => {setHelpMenuVisibility(false)}} className="dropdown-menu--settings dropdown-menu--help" topOffset={30} noSmartPositioning={true}>
              <HelpOptions appState={props.appState} onShortcutsModal={() => setShortcutsModalOpen(true)}/>
            </DropdownMenu>
          ) : null}

          {settingsMenuVisibility ? (
            <DropdownMenu onClose={() => {setSettingsMenuVisibility(false)}} className="dropdown-menu--settings" topOffset={30} noSmartPositioning={true}>
              <SettingsOptions appState={props.appState} onOverrideNewTabMenu={() => setOverrideModalOpen(true)}/>
            </DropdownMenu>
          ) : null}

        </div>
        <OverrideModal isOverrideModalOpen={isOverrideModalOpen} setOverrideModalOpen={setOverrideModalOpen}/>
        <ShortcutsModal isShortcutsModalOpen={isShortcutsModalOpen} setShortcutsModalOpen={setShortcutsModalOpen}/>
      </div>
      <div className="bookmarks"
           ref={bookmarksRef}
           onMouseDown={onMouseDown}
           onKeyDown={(e) => handleBookmarksKeyDown(e, props.appState, dispatch)}>
        <canvas id="canvas-selection" ref={canvasRef}></canvas>

        {folders.map((folder) => (
          <Folder
            key={folder.id}
            folder={folder}
            folders={props.appState.folders}
            tabs={props.appState.tabs}
            historyItems={props.appState.historyItems}
            showNotUsed={props.appState.showNotUsed}
            showArchived={props.appState.showArchived}
            search={props.appState.search}
            itemInEdit={props.appState.itemInEdit}
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
              <span>Settings → Export to JSON</span></li>
            <li>Uninstall current "Tabme" extension. <br/>
              <span>Go to "Manage extensions" from your browser. Find the card for Tabme and click "Remove"</span></li>
            <li>Install "<a href="https://chromewebstore.google.com/detail/tabme-%E2%80%94-version-without-n/jjdbikbbknmhkknpfnlhgpcikbfjldee">Tabme — version without newtab</a>"
              extension
            </li>
            <li>[optional] Import saved bookmarks.<br/>
              <span>Settings → Import from JSON</span></li>
          </ol>
          <p>Sorry for the complex steps. Chrome doesn't support easy new tab customization.</p>
          <button className="btn__setting" onClick={() => setOverrideModalOpen(false)}>Close</button>
        </div>
      </Modal>
      :
      <Modal isOpen={isOverrideModalOpen} onClose={() => setOverrideModalOpen(false)}>
        <div className="modal-no-override">
          <h2>How to open Tabme in the every new tab?</h2>
          <p>If you want Tabme was open every new tab, try the regular Tabme extension.
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

const ShortcutsModal = ({ isShortcutsModalOpen, setShortcutsModalOpen }:
                          { isShortcutsModalOpen: boolean, setShortcutsModalOpen: (value: boolean) => void }) => {

  const cmdOrCtrl = IS_MAC_DEVICE ? `⌘` : `CTRL`

  return (
    <Modal isOpen={isShortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)}>
      <div className="modal-no-override">
        <h2>Keyboard shortcuts</h2>
        <p>
          <span className="hotkey">TAB</span> to focus on Search input
        </p>
        <p>
          <span className="hotkey">Type text</span> immediate typing in Search input
        </p>
        <p>
          <span className="hotkey">Arrow keys</span> navigate bookmarks
        </p>
        <p>
          <span className="hotkey">{cmdOrCtrl}&thinsp;+&thinsp;click</span> open bookmark in new Tab
        </p>
        <p>
          <span className="hotkey">DEL</span> delete selected items
        </p>
        <p>
          <span className="hotkey">{cmdOrCtrl}&thinsp;+&thinsp;Z</span> undo
        </p>
      </div>
    </Modal>
  )
}