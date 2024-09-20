import React, { useContext, useState } from "react"
import { IFolder } from "../helpers/types"
import { colors, createNewSection, DEFAULT_FOLDER_COLOR, EMPTY_FOLDER_COLOR, filterItemsBySearch } from "../helpers/utils"
import { Action, canShowArchived, DispatchContext, IAppState } from "../state"
import { DropdownMenu } from "./DropdownMenu"
import { showMessageWithUndo } from "../helpers/actions"
import { FolderItem } from "./FolderItem"
import { EditableTitle } from "./EditableTitle"
import { CL } from "../helpers/classNameHelper"

export function Folder(props: {
  appState: IAppState;
  folder: IFolder;
}) {
  const { dispatch } = useContext(DispatchContext)
  const [showMenu, setShowMenu] = useState<boolean>(false)

  function onDelete() {
    const archivedItemsCount = props.folder.items.filter(item => item.archived).length
    if (archivedItemsCount > 0) {
      const itemsText = archivedItemsCount > 1 ? "items" : "item"
      const res = confirm(`Folder contains ${archivedItemsCount} hidden ${itemsText}. Do you still want to delete it?`)
      if (!res) {
        return
      }
    }

    dispatch({
      type: Action.DeleteFolder,
      folderId: props.folder.id
    })
    showMessageWithUndo("Folder has been deleted", dispatch)
  }

  function saveFolderTitle(newTitle: string) {
    if (props.folder.title !== newTitle) {
      dispatch({
        type: Action.UpdateFolderTitle,
        folderId: props.folder.id,
        title: newTitle
      })
    }
    setEditing(false)
  }

  function onArchiveOrRestore() {
    const newArchiveState = !props.folder.archived
    dispatch({
      type: Action.UpdateFolderArchived,
      folderId: props.folder.id,
      archived: newArchiveState
    })

    const message = `Folder has been ${newArchiveState ? "archived" : "restored"}`
    showMessageWithUndo(message, dispatch)
    setShowMenu(false)
  }

  function onAddSection() {
    const newSection = createNewSection()
    dispatch({
      type: Action.AddNewBookmarkToFolder,
      folderId: props.folder.id,
      itemIdInsertAfter: undefined,
      item: newSection
    })

    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: newSection.id }
    })

    setShowMenu(false)
  }

  function setColor(color: string) {
    dispatch({
      type: Action.UpdateFolderColor,
      folderId: props.folder.id,
      color: color
    })
  }

  function onOpenAll() {
    props.folder.items.forEach(item => {
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
      newState: { itemInEdit: val ? props.folder.id : undefined }
    })
  }

  const folderItems = filterItemsBySearch(props.folder.items, props.appState.search)
    .filter(i => canShowArchived(props.appState) || !i.archived)

  const folderIsEmptyDuringSearch = props.appState.search != "" && folderItems.length === 0

  const folderClassName = `folder 
  ${props.folder.twoColumn ? "two-column" : ""}
  ${folderIsEmptyDuringSearch ? "folder--empty" : ""}
  ${props.folder.archived ? "archived" : ""}
  `
  const folderBackgroundColor = folderIsEmptyDuringSearch ? EMPTY_FOLDER_COLOR : props.folder.color || DEFAULT_FOLDER_COLOR

  const onHeaderContextMenu = (e: React.MouseEvent) => {
    setShowMenu(!showMenu)
    e.preventDefault()
  }

  return (
    <div className={folderClassName} data-folder-id={props.folder.id}>
      <h2 style={{ backgroundColor: folderBackgroundColor }} className="draggable-folder" onContextMenu={onHeaderContextMenu}>
        {
          <EditableTitle
            className="folder-title__text"
            inEdit={props.folder.id === props.appState.itemInEdit}
            initTitle={props.folder.title}
            search=""
            onSaveTitle={saveFolderTitle} // Save the new title
            onClick={() => setEditing(true)}
          />
        }
        <span className={CL("folder-title__button", {
          "folder-title__button--visible": showMenu
        })}
              onClick={() => setShowMenu(!showMenu)}>☰</span>

        {showMenu ? (
          <DropdownMenu onClose={() => setShowMenu(false)} className={"dropdown-menu--folder"}>
            <div className="dropdown-menu__colors-row" style={{ marginTop: "4px" }}>
              <PresetColor color={PRESET_COLORS[0]} onClick={setColor} currentColor={props.folder.color}/>
              <PresetColor color={PRESET_COLORS[1]} onClick={setColor} currentColor={props.folder.color}/>
              <PresetColor color={PRESET_COLORS[2]} onClick={setColor} currentColor={props.folder.color}/>
              <PresetColor color={PRESET_COLORS[3]} onClick={setColor} currentColor={props.folder.color}/>
            </div>
            <div className="dropdown-menu__colors-row" style={{ marginBottom: "4px" }}>
              <PresetColor color={PRESET_COLORS[4]} onClick={setColor} currentColor={props.folder.color}/>
              <PresetColor color={PRESET_COLORS[5]} onClick={setColor} currentColor={props.folder.color}/>
              <PresetColor color={PRESET_COLORS[6]} onClick={setColor} currentColor={props.folder.color}/>
              <CustomColorInput onChange={setColor} currentColor={props.folder.color}/>
            </div>
            <button className="dropdown-menu__button focusable" onClick={onOpenAll}>Open All Tabs</button>
            <button className="dropdown-menu__button focusable" onClick={onRename}>Rename</button>
            <button className="dropdown-menu__button focusable" onClick={onAddSection}>Add Header</button>
            <button className="dropdown-menu__button focusable" onClick={onArchiveOrRestore}>{props.folder.archived ? "Restore" : "Archive"}</button>
            <button className="dropdown-menu__button dropdown-menu__button--dander focusable" onClick={onDelete}>Delete</button>
          </DropdownMenu>
        ) : null}
      </h2>
      {
        folderItems.length === 0 && !folderIsEmptyDuringSearch ?
          <div className="folder-empty-tip">
            To add bookmark, drop an item form side panel here
          </div>
          : null
      }

      <div className="folder-items-box" data-folder-id={props.folder.id}>
        {
          folderItems.map(
            (item) => (
              <FolderItem
                key={item.id}
                item={item}
                appState={props.appState}
                folder={props.folder}
                inEdit={item.id === props.appState.itemInEdit}
              />
            )
          )}
      </div>
    </div>
  )
}

declare global {
  interface Window {
    pSBC: any
  }
}

const PRESET_COLORS = [colors[0], colors[2], colors[4], colors[6], colors[8], colors[9], colors[13]]

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

function CustomColorInput(p: { onChange: (color: string) => void; currentColor?: string }) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    p.onChange(e.target.value)
  }

  const active = !PRESET_COLORS.includes(p.currentColor!)
  return <div className={"color-picker-container " + (active ? "selected" : "")}>
    <input type="color" id="colorInput" value={p.currentColor} onChange={e => onChange(e)}/>
    <label htmlFor="colorInput" className="custom-color-picker"></label>
  </div>
}
