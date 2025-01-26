import React, { useContext, useEffect, useRef, useState } from "react"
import { blurSearch, findSpaceById, isTargetSupportsDragAndDrop } from "../helpers/utils"
import { bindDADItemEffect } from "../helpers/dragAndDropItem"
import { clickFolderItem, createFolder, getCanDragChecker } from "../helpers/actionsHelpers"
import { Folder } from "./Folder"
import { DropdownMenu } from "./DropdownMenu"
import { handleBookmarksKeyDown, handleSearchKeyDown } from "../helpers/handleBookmarksKeyDown"
import { Action, IAppState } from "../state/state"
import { canShowArchived, DispatchContext, mergeStepsInHistory } from "../state/actions"
import { HelpOptions, SettingsOptions } from "./SettingsOptions"
import { CL } from "../helpers/classNameHelper"
import IconHelp from "../icons/help.svg"
import IconSettings from "../icons/settings.svg"
import IconFind from "../icons/find.svg"
import { SpacesList } from "./SpacesList"
import { OverrideModal } from "./modals/OverrideModal"
import { ShortcutsModal } from "./modals/ShortcutsModal"
import { IFolder } from "../helpers/types"
import { loadFromNetwork } from "../../api/api"

export function Bookmarks(p: {
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

        mergeStepsInHistory((historyStepId) => {

          if (folderId === -1) { // we need to create new folder first
            folderId = createFolder(dispatch, undefined, undefined, historyStepId)
          }

          dispatch({
            type: Action.MoveFolderItems,
            itemIds: targetsIds,
            targetFolderId: folderId,
            itemIdInsertBefore: insertBeforeItemId,
            historyStepId
          })
        })

        setMouseDownEvent(undefined)
      }
      const onDropFolder = (folderId: number, insertBeforeFolderId: number | undefined) => {
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
        clickFolderItem(targetId, p.appState, dispatch, meta, p.appState.openBookmarksInNewTab)
      }

      const canDrag = getCanDragChecker(p.appState.search, dispatch)
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
    if (!p.appState.itemInEdit && isTargetSupportsDragAndDrop(e)) {
      blurSearch(e)
      setMouseDownEvent(e)
    }
  }

  function onCreateFolder() {
    const folderId = createFolder(dispatch)
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: folderId }
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

  let folders: IFolder[] = []
  const currentSpace = findSpaceById(p.appState, p.appState.currentSpaceId)
  if (currentSpace) {
    folders = p.appState.showArchived
      ? currentSpace.folders ?? [] // just in case of broken data
      : currentSpace.folders.filter(f => canShowArchived(p.appState) || !f.archived)
  }

  return (
    <div className="bookmarks-box">
      <div className={CL("bookmarks-menu", { "bookmarks-menu--scrolled": isScrolled })}>
        {
          p.appState.betaMode ?
            <>
              <SpacesList spaces={p.appState.spaces} currentSpaceId={p.appState.currentSpaceId}/>
              <div className="menu-stretching-space"></div>
              <div style={{ display: "flex", marginRight: "12px" }}>
                <IconFind className="search-icon"/>
                <input
                  tabIndex={1}
                  className="search"
                  type="text"
                  placeholder="Search in Tabme"
                  value={p.appState.search}
                  onChange={onSearchChange}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>

              {
                p.appState.search !== ""
                  ? <button tabIndex={1}
                            className={"btn__clear-search"}
                            style={{ right: "110px", left: "auto" }}
                            onClick={onClearSearch}>✕</button>
                  : null
              }


            </> :
            <>
              <div style={{ display: "flex" }}>
                <IconFind className="search-icon"/>
                <input
                  tabIndex={1}
                  className="search"
                  type="text"
                  placeholder="Search in Tabme"
                  value={p.appState.search}
                  onChange={onSearchChange}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              {
                p.appState.search !== ""
                  ? <button tabIndex={1} className={"btn__clear-search"} onClick={onClearSearch}>✕</button>
                  : null
              }

              <div className="menu-stretching-space"></div>
            </>
        }

        <div className="menu-buttons">
          {
            loadFromNetwork() ?
              <>
                {/*todo move to menu. and replace to leave feedback button or something like this*/}
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
              <HelpOptions appState={p.appState} onShortcutsModal={() => setShortcutsModalOpen(true)}/>
            </DropdownMenu>
          ) : null}

          {settingsMenuVisibility ? (
            <DropdownMenu onClose={() => {setSettingsMenuVisibility(false)}} className="dropdown-menu--settings" topOffset={30} noSmartPositioning={true}>
              <SettingsOptions appState={p.appState} onOverrideNewTabMenu={() => setOverrideModalOpen(true)}/>
            </DropdownMenu>
          ) : null}

        </div>
        <OverrideModal isOverrideModalOpen={isOverrideModalOpen} setOverrideModalOpen={setOverrideModalOpen}/>
        <ShortcutsModal isShortcutsModalOpen={isShortcutsModalOpen} setShortcutsModalOpen={setShortcutsModalOpen}/>
      </div>
      <div className="bookmarks"
           ref={bookmarksRef}
           onMouseDown={onMouseDown}
           onKeyDown={(e) => handleBookmarksKeyDown(e, p.appState, dispatch)}>
        <canvas id="canvas-selection" ref={canvasRef}></canvas>

        {folders.map((folder) => (
          <Folder
            key={folder.id}
            folder={folder}
            tabs={p.appState.tabs}
            historyItems={p.appState.historyItems}
            showNotUsed={p.appState.showNotUsed}
            showArchived={p.appState.showArchived}
            search={p.appState.search}
            itemInEdit={p.appState.itemInEdit}
          />
        ))}

        {
          p.appState.search === ""
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
