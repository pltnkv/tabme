import React, { useContext, useState } from "react"
import { IFolder } from "../helpers/types"
import { colors, createNewSection, DEFAULT_FOLDER_COLOR, filterItemsBySearch } from "../helpers/utils"
import { DropdownMenu } from "./DropdownMenu"
import { showMessageWithUndo } from "../helpers/actionsHelpers"
import { FolderItem } from "./FolderItem"
import { EditableTitle } from "./EditableTitle"
import { CL } from "../helpers/classNameHelper"
import { Action } from "../state/state"
import { canShowArchived, DispatchContext } from "../state/actions"
import HistoryItem = chrome.history.HistoryItem
import Tab = chrome.tabs.Tab
import { wrapIntoTransaction } from "../state/oldActions"

export function Folder(props: {
  folder: IFolder;
  folders: IFolder[];
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

  function onDelete() {
    const archivedItemsCount = props.folder.items.filter(item => item.archived).length
    if (archivedItemsCount > 0) {
      const itemsText = archivedItemsCount > 1 ? "items" : "item"
      const res = confirm(`Folder contains ${archivedItemsCount} hidden ${itemsText}. Do you still want to delete it?`)
      if (!res) {
        return
      }
    }

    wrapIntoTransaction(() => {
      dispatch({
        type: Action.DeleteFolder,
        folderId: props.folder.id
      })
    })
    showMessageWithUndo("Folder has been deleted", dispatch)
  }

  function saveFolderTitle(newTitle: string) {
    if (props.folder.title !== newTitle) {
      wrapIntoTransaction(() => {
        dispatch({
          type: Action.UpdateFolder,
          folderId: props.folder.id,
          title: newTitle
        })
      })
    }
    setEditing(false)
  }

  function onArchiveOrRestore() {
    const newArchiveState = !props.folder.archived
    dispatch({
      type: Action.UpdateFolder,
      folderId: props.folder.id,
      archived: newArchiveState
    })

    const message = `Folder has been ${newArchiveState ? "archived" : "restored"}`
    showMessageWithUndo(message, dispatch)
    setShowMenu(false)
  }

  function onAddSection() {
    const newSection = createNewSection()
    wrapIntoTransaction(() => {
      dispatch({
        type: Action.CreateFolderItem,
        folderId: props.folder.id,
        itemIdInsertBefore: undefined,
        item: newSection
      })

      dispatch({
        type: Action.UpdateAppState,
        newState: { itemInEdit: newSection.id }
      })
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
    console.log("setColorConfirmed", color)
    setLocalColor(undefined)
    wrapIntoTransaction(() => {
      dispatch({
        type: Action.UpdateFolder,
        folderId: props.folder.id,
        color: color
      })
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

  const folderItems = filterItemsBySearch(props.folder.items, props.search)
    .filter(i => canShowArchived(props) || !i.archived)

  const folderIsEmptyDuringSearch = props.search != "" && folderItems.length === 0

  const folderClassName = `folder 
  ${props.folder.twoColumn ? "two-column" : ""}
  ${folderIsEmptyDuringSearch ? "folder--empty" : ""}
  ${props.folder.archived ? "archived" : ""}
  `
  // const folderColor = folderIsEmptyDuringSearch ? EMPTY_FOLDER_COLOR : props.folder.color || DEFAULT_FOLDER_COLOR
  const folderColor = localColor ?? props.folder.color

  const onHeaderContextMenu = (e: React.MouseEvent) => {
    setShowMenu(!showMenu)
    e.preventDefault()
  }

  return (
    <div className={folderClassName} data-folder-id={props.folder.id}>
      <h2 style={{ backgroundColor: folderColor ?? DEFAULT_FOLDER_COLOR }} className="draggable-folder" onContextMenu={onHeaderContextMenu}>
        {
          <EditableTitle
            className="folder-title__text"
            inEdit={props.folder.id === props.itemInEdit}
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
          <DropdownMenu onClose={() => setShowMenu(false)} className={"dropdown-menu--folder"} topOffset={15} leftOffset={159}>
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
            <button className="dropdown-menu__button focusable" onClick={onAddSection}>Add Header</button>
            {/*<button className="dropdown-menu__button focusable" onClick={onArchiveOrRestore}>{props.folder.archived ? "Restore" : "Archive"}</button>*/}
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
                inEdit={item.id === props.itemInEdit}
                folders={props.folders}
                tabs={props.tabs}
                historyItems={props.historyItems}
                showNotUsed={props.showNotUsed}
                search={props.search}
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
