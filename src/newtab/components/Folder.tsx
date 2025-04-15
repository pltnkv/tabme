import React, { useContext, useEffect, useState } from "react"
import { IFolder, ISpace } from "../helpers/types"
import { colors, DEFAULT_FOLDER_COLOR, filterItemsBySearch, scrollElementIntoView } from "../helpers/utils"
import { DropdownMenu, DropdownSubMenu } from "./dropdown/DropdownMenu"
import { FolderItem } from "./FolderItem"
import { EditableTitle } from "./EditableTitle"
import { CL } from "../helpers/classNameHelper"
import { Action } from "../state/state"
import { canShowArchived, DispatchContext } from "../state/actions"
import { Color } from "../helpers/Color"
import MenuIcon from "../icons/menu.svg"
import { getSpacesList } from "./dropdown/moveToHelpers"
import HistoryItem = chrome.history.HistoryItem
import Tab = chrome.tabs.Tab
import { showMessageWithUndo } from "../helpers/actionsHelpersWithDOM"
import { createNewFolderItem, createNewSection, findSpaceByFolderId } from "../state/actionHelpers"
import { trackStat } from "../helpers/stats"
import { RecentItem } from "../helpers/recentHistoryUtils"

export const Folder = React.memo(function Folder(p: {
  spaces: ISpace[];
  folder: IFolder;
  tabs: Tab[];
  recentItems: RecentItem[];
  showNotUsed: boolean;
  showArchived: boolean;
  search: string;
  itemInEdit: undefined | number,
  hiddenFeatureIsEnabled: boolean
}) {
  const dispatch = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)
  const [localColor, setLocalColor] = useState<string | undefined>(undefined)
  const [localTitle, setLocalTitle] = useState<string>(p.folder.title)

  useEffect(() => {
    // to support UNDO operation
    setLocalTitle(p.folder.title)
  }, [p.folder.title])

  function onDelete() {
    const archivedItemsCount = p.folder.items.filter(item => item.archived).length
    if (archivedItemsCount > 0) {
      const itemsText = archivedItemsCount > 1 ? "items" : "item"
      const res = confirm(`Folder contains ${archivedItemsCount} hidden ${itemsText}. Do you still want to delete it?`)
      if (!res) {
        return
      }
    }

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

  function onArchiveOrRestore() {
    alert("The “Hiding” feature will be deprecated soon due to very low usage.\n"
      + "All previously hidden folders will became visible again.\n"
      + "Sorry for the inconvenience, and thank you for understanding!")

    const newArchiveState = !p.folder.archived
    dispatch({
      type: Action.UpdateFolder,
      folderId: p.folder.id,
      archived: newArchiveState
    })

    const message = `Folder has been ${newArchiveState ? "hidden" : "restored"}`
    showMessageWithUndo(message, dispatch)
    setShowMenu(false)
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
      if (!item.archived && !item.isSection) {
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
    .filter(i => canShowArchived(p) || !i.archived)

  const folderIsEmptyDuringSearch = p.search != "" && folderItems.length === 0

  const folderClassName = `folder 
  ${p.folder.twoColumn ? "two-column" : ""}
  ${folderIsEmptyDuringSearch ? "folder--empty" : ""}
  ${p.folder.archived ? "archived" : ""}
  `
  // const folderColor = folderIsEmptyDuringSearch ? EMPTY_FOLDER_COLOR : props.folder.color || DEFAULT_FOLDER_COLOR
  const folderColor = localColor ?? p.folder.color
  const color = new Color()
  const color2 = new Color()
  color.setColor(localColor ?? p.folder.color ?? DEFAULT_FOLDER_COLOR)
  color.setAlpha(p.folder.archived ? 0.2 : 1)
  color2.value = { ...color.value }
  color2.setSaturation(color2.value.s + 0.1)
  color2.value.h = color2.value.h + 0.05
  // console.log(color2.value)
  // const folderColorWithOpacity = color.getRGBA()
  const folderGradientColor = `linear-gradient(45deg, ${color.getRGBA()}, ${color2.getRGBA()})`

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
    <div className={folderClassName} data-folder-id={p.folder.id}>
      <h2 style={{
        background: folderGradientColor,
        outline: p.folder.archived ? "1px solid rgba(0, 0, 0, 0.3)" : "none"
      }} className="draggable-folder" onContextMenu={onHeaderContextMenu}>
        {
          <EditableTitle
            className="folder-title__text"
            inEdit={p.folder.id === p.itemInEdit}
            localTitle={localTitle}
            setLocalTitle={setLocalTitle}
            onSaveTitle={saveFolderTitle}
            search={p.search}
            onClick={() => setEditing(true)}
          />
        }
        {p.folder.archived ? <span> [hidden]</span> : ""}
        <span className={CL("folder-title__button", {
          "folder-title__button--visible": showMenu
        })}
              onClick={() => setShowMenu(!showMenu)}><MenuIcon/></span>

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
            <button className="dropdown-menu__button focusable" onClick={onOpenAll}>Open All</button>
            <button className="dropdown-menu__button focusable" onClick={onAddBookmark}>Add Bookmark</button>
            <button className="dropdown-menu__button focusable" onClick={onAddSection}>Add Section</button>
            {
              p.hiddenFeatureIsEnabled && <button className="dropdown-menu__button focusable" onClick={onArchiveOrRestore}>{p.folder.archived ? "Unhide" : "Hide"}</button>
            }
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
        folderItems.length === 0 && !folderIsEmptyDuringSearch ?
          <div className="folder-empty-tip">
            To add bookmark, drop an item form the sidebar
          </div>
          : null
      }

      <div className="folder-items-box" data-folder-id={p.folder.id}>
        {
          folderItems.map(
            (item) => (
              <FolderItem
                key={item.id}
                spaces={p.spaces}
                item={item}
                inEdit={item.id === p.itemInEdit}
                tabs={p.tabs}
                recentItems={p.recentItems}
                showNotUsed={p.showNotUsed}
                search={p.search}
                hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
              />
            )
          )}
      </div>
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
