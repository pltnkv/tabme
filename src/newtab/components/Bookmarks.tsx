import React, { useContext, useEffect, useRef, useState } from "react"
import { blurSearch, isContainsSearch, isTargetSupportsDragAndDrop } from "../helpers/utils"
import { bindDADItemEffect } from "../helpers/dragAndDropItem"
import { Folder } from "./Folder"
import { DropdownMenu } from "./dropdown/DropdownMenu"
import { handleBookmarksKeyDown, handleSearchKeyDown } from "../helpers/handleBookmarksKeyDown"
import { Action, IAppState } from "../state/state"
import { canShowArchived, DispatchContext, mergeStepsInHistory } from "../state/actions"
import { BetaOptions, HelpOptions, SettingsOptions } from "./SettingsOptions"
import { CL } from "../helpers/classNameHelper"
import IconHelp from "../icons/help.svg"
import IconSettings from "../icons/settings.svg"
import IconFind from "../icons/find.svg"
import IconBeta from "../icons/beta.svg"
import { SpacesList } from "./SpacesList"
import { OverrideModal } from "./modals/OverrideModal"
import { ShortcutsModal } from "./modals/ShortcutsModal"
import { IFolder } from "../helpers/types"
import { loadFromNetwork } from "../../api/api"
import { findSpaceById } from "../state/actionHelpers"
import { clickFolderItem, createFolderWithStat, getCanDragChecker } from "../helpers/actionsHelpersWithDOM"
import { useSwipeAnimation } from "../helpers/bookmarksSwipes"

export function Bookmarks(p: {
  appState: IAppState;
}) {
  const dispatch = useContext(DispatchContext)
  const [betaMenuVisibility, setBetaMenuVisibility] = useState<boolean>(false)
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState<boolean>(false)
  const [helpMenuVisibility, setHelpMenuVisibility] = useState<boolean>(false)
  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)

  const [isOverrideModalOpen, setOverrideModalOpen] = useState(false)
  const [isShortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bookmarksRef = useRef<HTMLDivElement>(null)

  useSwipeAnimation(bookmarksRef, p.appState.currentSpaceId, p.appState.spaces.length)

  useEffect(() => {
    const handleScroll = (e: any) => {
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
            folderId = createFolderWithStat(dispatch, { historyStepId }, "by-drag-in-new-folder--bookmarks")
          }

          // todo !!! support switching spaces like for folders
          dispatch({
            type: Action.MoveFolderItems,
            itemIds: targetsIds,
            targetFolderId: folderId,
            insertBeforeItemId: insertBeforeItemId,
            historyStepId
          })
        })

        setMouseDownEvent(undefined)
      }
      const onDropFolder = (folderId: number, targetSpaceId: number | undefined, insertBeforeFolderId: number | undefined) => {
        dispatch({
          type: Action.MoveFolder,
          folderId,
          targetSpaceId: targetSpaceId ?? p.appState.currentSpaceId,
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

      const onChangeSpace = (spaceId: number) => {
        dispatch({
          type: Action.SelectSpace,
          spaceId
        })
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
          onCancel,
          onChangeSpace,
          onDragStarted: canDrag
        },
        canvasRef.current!
      )
    }
  }, [mouseDownEvent])

  function onMouseDown(e: React.MouseEvent) {
    if (isTargetSupportsDragAndDrop(e)) {
      blurSearch(e)
      setMouseDownEvent(e)
    }
  }

  function onCreateFolder() {
    const folderId = createFolderWithStat(dispatch, {}, "by-click-new-in-bookmarks")
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

  function toggleBetaMenu() {
    setBetaMenuVisibility(!betaMenuVisibility)
  }

  async function onLogout() {
    localStorage.removeItem("authToken")
    alert("Logout successful")
  }

  let folders: IFolder[] = []
  if (p.appState.search === "") {
    const currentSpace = findSpaceById(p.appState, p.appState.currentSpaceId)
    if (currentSpace) {
      folders = p.appState.showArchived
        ? currentSpace.folders ?? [] // just in case of broken data
        : currentSpace.folders.filter(f => canShowArchived(p.appState) || !f.archived)
    }
  } else {
    const searchValueLC = p.appState.search.toLowerCase()
    p.appState.spaces.forEach(s => {
      s.folders.forEach(f => {
        if (isContainsSearch(f, searchValueLC) || f.items.some(i => isContainsSearch(i, searchValueLC))) {
          folders.push(f)
        }
      })
    })
  }

  return (
    <div className="bookmarks-box">
      <div className={CL("bookmarks-menu", { "bookmarks-menu--scrolled": isScrolled })}>
        {
          p.appState.search && <div className="search-results-header">Search results:</div>
        }
        {
          !p.appState.search && <SpacesList
            betaMode={p.appState.betaMode}
            spaces={p.appState.spaces}
            currentSpaceId={p.appState.currentSpaceId}
            itemInEdit={p.appState.itemInEdit}/>
        }
        <div className="menu-stretching-space"></div>
        <div style={{ display: "flex", marginRight: "12px", position: "relative" }}>
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
          {
            p.appState.search !== ""
              ? <button tabIndex={1}
                        className={"btn__clear-search"}
                        style={{ left: "155px", top: "9px" }}
                        onClick={onClearSearch}>✕</button>
              : null
          }
        </div>


        <div className="menu-buttons">
          {
            p.appState.betaMode && <>
              <span className={CL("beta-mode-label", {'active': betaMenuVisibility})} onClick={toggleBetaMenu}> <IconBeta/> Beta </span>
              {
                betaMenuVisibility && <DropdownMenu onClose={() => {setBetaMenuVisibility(false)}} noSmartPositioning={true} alignRight={true} offset={{ top: 14, right: 80 }}>
                  <BetaOptions appState={p.appState}/>
                </DropdownMenu>
              }

            </>
          }
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
            <DropdownMenu onClose={() => {setHelpMenuVisibility(false)}} noSmartPositioning={true} alignRight={true} offset={{ top: 14, right: 48 }}>
              <HelpOptions appState={p.appState} onShortcutsModal={() => setShortcutsModalOpen(true)}/>
            </DropdownMenu>
          ) : null}

          {settingsMenuVisibility ? (
            <DropdownMenu onClose={() => {setSettingsMenuVisibility(false)}} noSmartPositioning={true} alignRight={true} offset={{ top: 14 }}>
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
            spaces={p.appState.spaces}
            folder={folder}
            tabs={p.appState.tabs}
            historyItems={p.appState.historyItems}
            showNotUsed={p.appState.showNotUsed}
            showArchived={p.appState.showArchived}
            search={p.appState.search}
            itemInEdit={p.appState.itemInEdit}
            hiddenFeatureIsEnabled={p.appState.hiddenFeatureIsEnabled}
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
            : (
              folders.length === 0 ? <div style={{ marginLeft: "58px" }}>Nothing found</div> : null
            )
        }
      </div>
    </div>
  )
}
