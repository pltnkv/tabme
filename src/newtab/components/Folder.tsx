import React, { useContext, useEffect, useState } from "react"
import { IFolder } from "../helpers/types"
import { colors, createNewSection, DEFAULT_FOLDER_COLOR, filterItemsBySearch } from "../helpers/utils"
import { DropdownMenu } from "./DropdownMenu"
import { showMessageWithUndo } from "../helpers/actionsHelpers"
import { FolderItem } from "./FolderItem"
import { EditableTitle } from "./EditableTitle"
import { CL } from "../helpers/classNameHelper"
import { Action } from "../state/state"
import { canShowArchived, DispatchContext, mergeStepsInHistory } from "../state/actions"
import { Color } from "../helpers/Color"
import MenuIcon from "../icons/menu.svg"
import HistoryItem = chrome.history.HistoryItem
import Tab = chrome.tabs.Tab

export const Folder = React.memo(function Folder(p: {
  folder: IFolder;
  tabs: Tab[];
  historyItems: HistoryItem[];
  showNotUsed: boolean;
  showArchived: boolean;
  search: string;
  itemInEdit: undefined | number,
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
      itemIdInsertBefore: undefined,
      item: newSection
    })

    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: newSection.id }
    })

    setShowMenu(false)

    requestAnimationFrame(() => {
      const element = document.querySelector(`[data-id="${newSection.id}"]`)
      if (element) {
        const rect = element.getBoundingClientRect()
        const viewportHeight = window.document.body.clientHeight
        if (rect.bottom > viewportHeight) {
          element.scrollIntoView({ block: "center" })
        }
      }
    })

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
      if (!item.archived) {
        chrome.tabs.create({ url: item.url, active: false })
      }
    })

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
          <DropdownMenu onClose={() => setShowMenu(false)} className={"dropdown-menu--folder"} topOffset={13} leftOffset={159}>
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
            <button className="dropdown-menu__button focusable" onClick={onRename}>Rename</button>
            <button className="dropdown-menu__button focusable" onClick={onArchiveOrRestore}>{p.folder.archived ? "Unhide" : "Hide"}</button>
            <button className="dropdown-menu__button focusable" onClick={onAddSection}>Add Section</button>
            <button className="dropdown-menu__button focusable" data-submenu-button="move-to">sub menu</button>
            <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDelete}>Delete</button>
            <div className="sub-menu level-1" data-submenu="move-to">
              <button className="dropdown-menu__button focusable">Open All</button>
              <button className="dropdown-menu__button focusable">Rename</button>
              <button className="dropdown-menu__button focusable">last</button>
            </div>
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
                item={item}
                inEdit={item.id === p.itemInEdit}
                tabs={p.tabs}
                historyItems={p.historyItems}
                showNotUsed={p.showNotUsed}
                search={p.search}
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
