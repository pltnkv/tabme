import React, { useContext, useEffect, useRef, useState } from "react"
import { blurSearch, isContainsSearch, isTargetSupportsDragAndDrop } from "../helpers/utils"
import { bindDADItemEffect } from "../dragging/dragAndDrop"
import { Folder } from "./Folder"
import { handleBookmarksKeyDown } from "../helpers/handleBookmarksKeyDown"
import { Action, IAppState } from "../state/state"
import { canShowArchived, DispatchContext, mergeStepsInHistory } from "../state/actions"
import { IFolder, IWidget } from "../helpers/types"
import { findSpaceById, genUniqLocalId } from "../state/actionHelpers"
import { clickFolderItem, createFolderWithStat, getCanDragChecker } from "../helpers/actionsHelpersWithDOM"
import { Canvas } from "./Canvas"
import { IPoint } from "../helpers/MathTypes"
import { TopBar } from "./TopBar"
import { trackStat } from "../helpers/stats"
import { Toolbar } from "./Toolbar"
import { hideWidgetsContextMenu } from "./canvas/widgetsContextMenu"
import { hideWidgetsSelectionFrame } from "./canvas/widgetsSelectionFrame"
import { canvasAPI } from "./canvas/canvasAPI"
import { DropdownMenu } from "./dropdown/DropdownMenu"
import { Options } from "./SettingsOptions"
import { getCanvasMenuOption } from "./canvas/getCanvasMenuOptions"

let __prevCurrentSpaceId: number | undefined = undefined
let __prevSearch: string | undefined = undefined

export function Bookmarks(p: {
  appState: IAppState;
}) {
  const dispatch = useContext(DispatchContext)
  const [mouseDownEvent, setMouseDownEvent] = useState<React.MouseEvent | undefined>(undefined)
  const [isScrolled, setIsScrolled] = useState(false)
  const [canvasMenuPos, setCanvasMenuPos] = useState<IPoint | undefined>(undefined)
  const [canvasMenuType, setCanvasMenuType] = useState<"canvas" | "widgets">("canvas")

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bookmarksRef = useRef<HTMLDivElement>(null)

  // useSwipeAnimation(bookmarksRef, p.appState.currentSpaceId, p.appState.spaces.length)

  useEffect(() => {
    // This condition help to not dispatch Action.SelectWidgets when it is not nessesary, for example when load app
    if (__prevCurrentSpaceId !== p.appState.currentSpaceId || __prevSearch !== p.appState.search) {
      __prevCurrentSpaceId = p.appState.currentSpaceId
      __prevSearch = p.appState.search
      if (p.appState.selectedWidgetIds.length > 0) {
        dispatch({
          type: Action.SelectWidgets,
          widgetIds: []
        })
      }
      hideWidgetsContextMenu()
      hideWidgetsSelectionFrame()
    }
  }, [p.appState.currentSpaceId, p.appState.search, p.appState.selectedWidgetIds])

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
          trackStat("bookmarksDragged", { count: targetsIds.length })
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

      const onChangeSpacePosition = (spaceId: number, newPosition: string) => {
        dispatch({
          type: Action.UpdateSpace,
          spaceId: spaceId,
          position: newPosition
        })
      }

      const onCanvasDoubleClick = (point: IPoint) => {
        const widgetId = genUniqLocalId()
        dispatch({
          type: Action.CreateWidget,
          spaceId: p.appState.currentSpaceId,
          widgetId,
          pos: { point: point }
        })
        canvasAPI.setEditingWidget(dispatch, widgetId)
        trackStat("widgetCreated", { type: "sticker", source: "double-click" })
      }

      const onWidgetsRightClick = (pos: IPoint, targetWidgetId: number) => {
        if (!p.appState.selectedWidgetIds.includes(targetWidgetId)) {
          canvasAPI.selectWidgets(dispatch, [targetWidgetId])
        }
        setCanvasMenuType("widgets")
        setCanvasMenuPos(pos)
      }

      const onCanvasRightClick = (pos: IPoint) => {
        setCanvasMenuType("canvas")
        setCanvasMenuPos(pos)
        canvasAPI.selectWidgets(dispatch, [])
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
        {
          canvasEl: canvasRef.current!,
          onWidgetsSelected: (widgetIds: number[]) => {
            // !!! TODO dont dispatch it if widgetIds has not changed
            dispatch({ type: Action.SelectWidgets, widgetIds })
          },
          onWidgetsMoved: (positions: { id: number, pos: IPoint }[]) => {
            mergeStepsInHistory((historyStepId) => {
              positions.forEach(p => {
                dispatch({ type: Action.UpdateWidget, widgetId: p.id, pos: { point: p.pos }, historyStepId })
              })
            })
          },
          onSetEditingWidget: (widgetId: number | undefined) => {
            dispatch({ type: Action.SetEditingWidget, widgetId })
          },
          onWidgetsRightClick,
          onCanvasRightClick,
          onCanvasDoubleClick
        },
        {
          onChangeSpacePosition,
          canSortSpaces: () => p.appState.spaces.length > 1
        }
      )
    }
  }, [mouseDownEvent])

  function onMouseDown(e: React.MouseEvent) {
    if (isTargetSupportsDragAndDrop(e)) {
      blurSearch(e)
      setMouseDownEvent(e)
    }
  }

  const getCanvasMenuOptionWrapper = () => {
    return getCanvasMenuOption(dispatch, canvasMenuType, p.appState, folders, () => setCanvasMenuPos(undefined))
  }

  function onCreateFolder() {
    const folderId = createFolderWithStat(dispatch, {}, "by-click-new-in-bookmarks")
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: folderId }
    })
  }

  let folders: IFolder[] = []
  let widgets: IWidget[] = []
  if (p.appState.search === "") {
    const currentSpace = findSpaceById(p.appState, p.appState.currentSpaceId)
    if (currentSpace) {
      folders = p.appState.showArchived
        ? currentSpace.folders ?? [] // just in case of broken data
        : currentSpace.folders.filter(f => canShowArchived(p.appState) || !f.archived)

      widgets = currentSpace.widgets ?? []
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
    <div className="bookmarks-box" onMouseDown={onMouseDown}>
      <TopBar appState={p.appState} isScrolled={isScrolled}/>
      <div className="bookmarks"
           ref={bookmarksRef}
           onKeyDown={(e) => handleBookmarksKeyDown(e, p.appState, dispatch)}>
        <Canvas selectedWidgetIds={p.appState.selectedWidgetIds}
                editingWidgetId={p.appState.editingWidgetId}
                widgets={widgets}/>
        <canvas id="canvas-selection" ref={canvasRef}></canvas>


        {folders.map((folder) => (
          <Folder
            key={folder.id}
            spaces={p.appState.spaces}
            folder={folder}
            tabs={p.appState.tabs}
            recentItems={p.appState.recentItems}
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
              folders.length === 0 ? <div style={{ marginLeft: "58px" }}>No bookmarks found</div> : null
            )
        }
      </div>
      {
        canvasMenuPos
        && p.appState.search === ""
        && <DropdownMenu onClose={() => {setCanvasMenuPos(undefined)}} absPosition={canvasMenuPos}>
          <Options optionsConfig={getCanvasMenuOptionWrapper}/>
        </DropdownMenu>
      }
      {
        p.appState.search === ""
        && <Toolbar folders={folders} currentSpaceId={p.appState.currentSpaceId}/>
      }
    </div>
  )
}

