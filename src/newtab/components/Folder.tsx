import React, { useContext, useEffect, useState } from "react"
import { IFolder, IFolderItem, ISpace } from "../helpers/types"
import { colors, filterItemsBySearch, scrollElementIntoView } from "../helpers/utils"
import { DropdownMenu, DropdownSubMenu } from "./dropdown/DropdownMenu"
import { FolderItem } from "./FolderItem"
import { EditableTitle } from "./EditableTitle"
import { CL } from "../helpers/classNameHelper"
import { Action } from "../state/state"
import { DispatchContext } from "../state/actions"
import { Color } from "../helpers/Color"
import MenuIcon from "../icons/menu.svg"
import CollapseIcon from "../icons/collapse.svg"
import ExpandIcon from "../icons/expand.svg"
import ArrowRightIcon from "../icons/arrow-right.svg"

import { getSpacesList } from "./dropdown/moveToHelpers"
import { showMessageWithUndo } from "../helpers/actionsHelpersWithDOM"
import { createNewFolderItem, createNewSection, findSpaceByFolderId } from "../state/actionHelpers"
import { trackStat } from "../helpers/stats"
import { RecentItem } from "../helpers/recentHistoryUtils"
import Tab = chrome.tabs.Tab
import { GetProPlanModal } from "./modals/GetProPlanModal"
import { getFolderGradientColor } from "../helpers/getFolderGradientColor"

export const Folder = React.memo(function Folder(p: {
  spaces: ISpace[];
  folder: IFolder;
  tabs: Tab[];
  recentItems: RecentItem[];
  showNotUsed: boolean;
  search: string;
  itemInEdit: undefined | number,
  isBeta: boolean
}) {
  const dispatch = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)
  const [localColor, setLocalColor] = useState<string | undefined>(undefined)
  const [localTitle, setLocalTitle] = useState<string>(p.folder.title)
  const [isGetProModalOpen, setGetProModalOpen] = useState(false)

  useEffect(() => {
    // to support UNDO operation
    setLocalTitle(p.folder.title)
  }, [p.folder.title])

  function collapseFolder() {
    if (p.isBeta) {
      dispatch({ type: Action.UpdateFolder, folderId: p.folder.id, collapsed: true })
      trackStat("collapseFolder", {})
    } else {
      setGetProModalOpen(true)
    }
  }

  function expandFolder() {
    dispatch({ type: Action.UpdateFolder, folderId: p.folder.id, collapsed: false })
  }

  function onDelete() {
    dispatch({
      type: Action.DeleteFolder,
      folderId: p.folder.id
    })
    showMessageWithUndo("Folder has been deleted", dispatch)
  }

  function saveFolderTitle(newTitle: string) {
    if (p.folder.title !== newTitle) {
      dispatch({
        type: Action.UpdateFolder,
        folderId: p.folder.id,
        title: newTitle
      })
    }
    setEditing(false)
  }

  function onAddSection() {
    const newSection = createNewSection()
    dispatch({
      type: Action.CreateFolderItem,
      folderId: p.folder.id,
      insertBeforeItemId: undefined,
      item: newSection
    })

    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: newSection.id }
    })

    setShowMenu(false)

    scrollElementIntoView(`[data-id="${newSection.id}"]`)
    trackStat("createSection", {})
  }

  function onAddBookmark() {

    const newBookmark = createNewFolderItem(undefined, "New bookmark")
    dispatch({
      type: Action.CreateFolderItem,
      folderId: p.folder.id,
      insertBeforeItemId: undefined,
      item: newBookmark
    })

    requestAnimationFrame(() => {
      const bookmarkElement = document.querySelector(`[data-id="${newBookmark.id}"]`)
      const menuButton = bookmarkElement?.parentElement?.querySelector(".folder-item__menu") as HTMLButtonElement
      if (menuButton) {
        menuButton.click()
      }
    })

    setShowMenu(false)

    scrollElementIntoView(`[data-id="${newBookmark.id}"]`)
    trackStat("createEmptyBookmark", {})
  }

  function setColorLocally(color: string) {
    setLocalColor(color)
  }

  function setColorConfirmed(color: string) {
    setLocalColor(undefined)
    dispatch({
      type: Action.UpdateFolder,
      folderId: p.folder.id,
      color: color
    })
  }

  function onOpenAll() {
    p.folder.items.forEach(item => {
      if (!item.isSection) {
        chrome.tabs.create({ url: item.url, active: false })
      }
    })
    trackStat("tabOpened", { inNewTab: true, source: "folder-menu-open-all" })

    setShowMenu(false)
  }

  function onRename() {
    setEditing(true)
    setShowMenu(false)
  }

  function setEditing(val: boolean) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: val ? p.folder.id : undefined }
    })
  }

  const folderItems = filterItemsBySearch(p.folder.items, p.search)
  const collapsedChildrenCountBySectionId = new Map<number, number>()

  let visibleFolderItems: IFolderItem[] = []
  if (p.search === "") {
    let lastCollapsedSectionId: number | undefined = undefined
    let hiddenItemsCount = 0
    folderItems.forEach((item) => {
      if (item.isSection) {
        visibleFolderItems.push(item)
        if (item.collapsed) {
          collapsedChildrenCountBySectionId.set(item.id, 0)
          lastCollapsedSectionId = item.id
          hiddenItemsCount = 0
        } else {
          lastCollapsedSectionId = undefined
        }
      } else {
        if (lastCollapsedSectionId) {
          collapsedChildrenCountBySectionId.set(lastCollapsedSectionId, ++hiddenItemsCount)
        } else {
          visibleFolderItems.push(item)
        }
      }
    })
  } else {
    visibleFolderItems = folderItems
  }

  const folderColor = localColor ?? p.folder.color
  const folderGradientColor = getFolderGradientColor(localColor ?? p.folder.color)

  const onHeaderContextMenu = (e: React.MouseEvent) => {
    setShowMenu(!showMenu)
    e.preventDefault()
  }

  const moveFolderToSpace = (spaceId: number) => {
    dispatch({
      type: Action.MoveFolder,
      folderId: p.folder.id,
      targetSpaceId: spaceId,
      insertBeforeFolderId: undefined
    })

    dispatch({
      type: Action.SelectSpace,
      spaceId: spaceId
    })

    dispatch({ type: Action.ShowNotification, message: "Folder has been moved" })

    scrollElementIntoView(`[data-folder-id="${p.folder.id}"]`)

    setShowMenu(false)
  }

  return (
    <div className={CL("folder", { "two-column": p.folder.twoColumn })} data-folder-id={p.folder.id}>
      <h2 style={{
        background: folderGradientColor
      }} className="draggable-folder" onContextMenu={onHeaderContextMenu}>
        {
          <EditableTitle
            className="folder-title__text"
            inEdit={p.folder.id === p.itemInEdit}
            value={localTitle}
            setNewValue={setLocalTitle}
            onSaveTitle={saveFolderTitle}
            search={p.search}
            onClick={() => setEditing(true)}
          />
        }

        <button
          title="Show menu"
          className={CL("folder-title__button", { "visible": showMenu || p.folder.collapsed })}
          onClick={() => setShowMenu(!showMenu)}><MenuIcon/>
        </button>
        {
          p.search === "" ?
            p.folder.collapsed
              ? <button title="Expand" className={CL("folder-title__button visible")} onClick={expandFolder}><ExpandIcon/></button>
              : <button title="Collaps" className={CL("folder-title__button")} onClick={collapseFolder}><CollapseIcon/></button>
            : null
        }

        {showMenu ? (
          <DropdownMenu onClose={() => setShowMenu(false)} className={"dropdown-menu--folder"} offset={{ top: 5, left: 150, bottom: 38 }}>
            <div className="dropdown-menu__colors-row" style={{ marginTop: "4px" }}>
              <PresetColor color={PRESET_COLORS[0]} onClick={setColorConfirmed} currentColor={folderColor}/>
              <PresetColor color={PRESET_COLORS[1]} onClick={setColorConfirmed} currentColor={folderColor}/>
              <PresetColor color={PRESET_COLORS[2]} onClick={setColorConfirmed} currentColor={folderColor}/>
              <PresetColor color={PRESET_COLORS[3]} onClick={setColorConfirmed} currentColor={folderColor}/>
            </div>
            <div className="dropdown-menu__colors-row" style={{ marginBottom: "4px" }}>
              <PresetColor color={PRESET_COLORS[4]} onClick={setColorConfirmed} currentColor={folderColor}/>
              <PresetColor color={PRESET_COLORS[5]} onClick={setColorConfirmed} currentColor={folderColor}/>
              <PresetColor color={PRESET_COLORS[6]} onClick={setColorConfirmed} currentColor={folderColor}/>
              <CustomColorInput onChange={setColorLocally} onBlur={setColorConfirmed} currentColor={folderColor}/>
            </div>
            <button className="dropdown-menu__button focusable" onClick={onAddBookmark}>+ Add Bookmark</button>
            <button className="dropdown-menu__button focusable" onClick={onAddSection}>+ Add Group</button>
            <button className="dropdown-menu__button focusable" onClick={onOpenAll}>Open All</button>
            {
              p.spaces.length > 1 ?
                <DropdownSubMenu
                  menuId={1}
                  title={"Move to space"}
                  submenuContent={getSpacesList(p.spaces, moveFolderToSpace, findSpaceByFolderId(p, p.folder.id)?.id)}
                /> : null
            }

            <button className="dropdown-menu__button focusable" onClick={onRename}>Rename</button>
            <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDelete}>Delete</button>
          </DropdownMenu>
        ) : null}
      </h2>
      {
        folderItems.length === 0 && !p.folder.collapsed ?
          <div className="folder-empty-tip">
            To add bookmark, drop an item form the sidebar
          </div>
          : null
      }

      <div className="folder-items-box" data-folder-id={p.folder.id}>
        {
          p.folder.collapsed && p.search === ""
            ? <div className={CL("folder-item-all-collapsed")}>
              <div className={CL("folder-item-all__inner")} onClick={expandFolder}>
                <ArrowRightIcon/>
                <span>Collapsed ({folderItems.length})</span>
              </div>
            </div>
            : visibleFolderItems.map((item) => (
                <FolderItem
                  key={item.id}
                  spaces={p.spaces}
                  item={item}
                  inEdit={item.id === p.itemInEdit}
                  tabs={p.tabs}
                  recentItems={p.recentItems}
                  showNotUsed={p.showNotUsed}
                  search={p.search}
                  collapsedChildrenCount={collapsedChildrenCountBySectionId.get(item.id) ?? 1}
                />
              )
            )}
      </div>
      {
        isGetProModalOpen && <GetProPlanModal onClose={() => setGetProModalOpen(false)} reason={"Collapsing"}/>
      }
    </div>
  )
})

const PRESET_COLORS = [...colors]
PRESET_COLORS.length = 7

function PresetColor(p: { onClick: (color: string) => void; color: string, currentColor?: string }) {
  const borderColor = window.pSBC(-0.5, p.color)
  const onClick = () => {
    p.onClick(p.color)
  }
  const active = p.color === p.currentColor
  return <button className={"dropdown-menu__preset_color " + (active ? "selected" : "")}
                 tabIndex={0}
                 onClick={onClick}>
    <span style={{ backgroundColor: p.color, borderColor }}></span>
  </button>
}

function CustomColorInput(p: { onChange: (color: string) => void; onBlur: (color: string) => void; currentColor?: string }) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    p.onChange(e.target.value)
  }
  const onBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    p.onBlur(e.target.value)
  }

  const active = !PRESET_COLORS.includes(p.currentColor!)
  return <div className={"color-picker-container " + (active ? "selected" : "")}>
    <input type="color" id="colorInput" value={p.currentColor}
           onChange={e => onChange(e)}
           onBlur={e => onBlur(e)}
    />
    <label htmlFor="colorInput" className="custom-color-picker"></label>
  </div>
}
