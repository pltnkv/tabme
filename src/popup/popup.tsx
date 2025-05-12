import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { initStats } from "../newtab/helpers/stats"
import { getStateFromLS, IStoredAppState } from "../newtab/state/storage"
import { applyTheme } from "../newtab/state/colorTheme"
import { ISpace } from "../newtab/helpers/types"
import { CL } from "../newtab/helpers/classNameHelper"
import { findSpaceById } from "../newtab/state/actionHelpers"
import { getFolderGradientColor } from "../newtab/helpers/getFolderGradientColor"
import { isTabAlreadySavedInFolder } from "./popup-utils"
import Tab = chrome.tabs.Tab
import { hlSearch, isContainsSearch } from "../newtab/helpers/utils"
import { isTabmeTab } from "../newtab/helpers/isTabmeTab"
import IconFind from "../newtab/icons/find.svg"
import IconEdit from "../newtab/icons/edit.svg"
import { saveNewTabToFolder } from "./popup-logic"
import { EditableTitle } from "../newtab/components/EditableTitle"
import { PopupKeyboardManager } from "./PopupKeyboardManager"

const POPUP_STORAGE_KEY = "popup_last_selection"

type PopupStorage = {
  lastSpaceId?: number
  lastFolderId?: number
}

function saveToStorage(newVal: Partial<PopupStorage>) {
  chrome.storage.local.get(POPUP_STORAGE_KEY, (result) => {
    const storage: PopupStorage = result[POPUP_STORAGE_KEY] || {}
    chrome.storage.local.set({
      [POPUP_STORAGE_KEY]: {
        ...storage,
        ...newVal
      }
    })
  })
}

export default function PopupApp(p: {
  spaces: ISpace[]
  popupStorage: PopupStorage
  currentTab: Tab | undefined
}) {

  const [showTabSavedScreen, setShowTabSavedScreen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [currentSpaceId, setCurrentSpaceId] = useState<number | undefined>(() => {
    return findSpaceById(p, p.popupStorage.lastSpaceId)?.id ?? p.spaces.at(0)?.id
  })
  const currentSpace = findSpaceById(p, currentSpaceId)
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(() => {
    if (currentSpace) {
      const hasSelectedFolderInCurrentSpace = currentSpace.folders.some(f => f.id === p.popupStorage.lastFolderId)
      if (hasSelectedFolderInCurrentSpace) {
        return p.popupStorage.lastFolderId
      } else {
        return currentSpace.folders.at(0)?.id
      }
    }
  })

  let folders = currentSpace?.folders
  if (searchValue !== "") {
    folders = []
    p.spaces.forEach(s => {
      s.folders.forEach(f => {
        if (isContainsSearch(f, searchValue)) {
          folders!.push(f)
        }
      })
    })
  }

  const totalFoldersCount = p.spaces.reduce((sum, curSpace) => sum + curSpace.folders.length, 0)
  const showSearch = p.spaces.length > 1 || totalFoldersCount > 10

  const onSpaceClick = (spaceId: number) => {
    const space = findSpaceById(p, spaceId)
    if (space) {
      setCurrentSpaceId(spaceId)
      setCurrentFolderId(space.folders.at(0)?.id)
      saveToStorage({ lastSpaceId: spaceId, lastFolderId: undefined })
    }
  }

  const onFolderClick = (folderId: number) => {
    setCurrentFolderId(folderId)
    saveToStorage({ lastFolderId: folderId })
  }

  const onSaveTabClick = () => {
    if (currentFolderId && p.currentTab) {
      p.currentTab.url = tabUrl
      p.currentTab.title = tabTitle
      saveNewTabToFolder(p, p.currentTab, currentFolderId)
      setShowTabSavedScreen(true)
    }
  }

  const foldersRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (foldersRef.current) {
      const curFolderElement = foldersRef.current.querySelector(`[data-folder-id="${currentFolderId}"]`)
      if (curFolderElement) {
        curFolderElement.scrollIntoView({ block: "center", behavior: "instant" })
      }
    }
  }, [foldersRef])

  const onOpenTabmeClick = () => {
    const viewTabUrl = chrome.runtime.getURL("newtab.html")
    if (__OVERRIDE_NEWTAB) {
      chrome.tabs.create({ url: viewTabUrl })
    } else {
      chrome.tabs.query({ currentWindow: true, pinned: true, url: viewTabUrl }, (tabs) => {
        if (tabs && tabs.length > 0) {
          chrome.tabs.update(tabs[0].id!, { active: true })
        } else {
          chrome.tabs.create({ url: viewTabUrl })
        }
      })
    }
  }

  const [editTabTitle, setEditTabTitle] = useState(false)
  const [tabTitle, setTabTitle] = useState(p.currentTab?.title || "")

  const [editTabUrl, setEditTabUrl] = useState(false)
  const [tabUrl, setTabUrl] = useState(p.currentTab?.url || "")

  return (
    <div className="p-app">
      <div className={CL("p-header", {
        "p-in-edit": editTabUrl || editTabTitle
      })}>
        <div className="p-icon-placeholder"/>
        {/* todo replace icon_32.png */}
        <img src={p.currentTab?.favIconUrl || "icon_32.png"} className="p-favicon"/>
        <IconEdit className="p-edit-tab"/>
        <div>
          <EditableTitle
            className="p-title"
            inEdit={editTabTitle}
            value={tabTitle}
            setNewValue={setTabTitle}
            onSaveTitle={() => setEditTabTitle(false)}
            search={""}
            onClick={() => setEditTabTitle(true)}
          />
          <EditableTitle
            className="p-url"
            inEdit={editTabUrl}
            value={tabUrl}
            setNewValue={setTabUrl}
            onSaveTitle={() => setEditTabUrl(false)}
            search={""}
            onClick={() => setEditTabUrl(true)}
          />
        </div>
      </div>

      {
        showTabSavedScreen ?
          <>
            <h2 className="p-tab-was-saved">✅ Tab saved</h2>
            <div className="p-buttons">
              <button className="btn__setting" onClick={onOpenTabmeClick}>Open Tabme</button>
            </div>
          </> :
          <>
            {
              showSearch && <div className="p-search-block">
                <IconFind className="search-icon"/>
                <input
                  className="p-search-input"
                  type="search"
                  placeholder="Search folder to save"
                  value={searchValue}
                  onChange={e => {
                    setCurrentFolderId(undefined)
                    setSearchValue(e.target.value)
                  }}
                /></div>
            }
            {
              searchValue === "" && <div className="p-spaces-list">
                {
                  p.spaces.length > 1 && p.spaces.map(s => {
                    return <span key={s.id}
                                 className={CL("p-space", { "active": s.id === currentSpaceId })}
                                 onClick={() => onSpaceClick(s.id)}>{s.title}</span>
                  })
                }
              </div>
            }
            <div className="p-folder-list" ref={foldersRef}>
              {folders?.map((folder) => (
                <div
                  key={folder.id}
                  className={CL("p-folder", { "active": folder.id === currentFolderId })}
                  style={{
                    background: getFolderGradientColor(folder.color)
                  }}
                  onClick={() => onFolderClick(folder.id)}
                  data-folder-id={folder.id}
                >
                  <span dangerouslySetInnerHTML={hlSearch(folder.title, searchValue)}></span>
                  {
                    isTabAlreadySavedInFolder(folder, p.currentTab?.url ?? "") && <span className="saved">✓ saved</span>}
                </div>
              ))}
              {
                searchValue !== "" && folders?.length === 0 && <div className="p-no-results">Nothing found</div>
              }
            </div>

            <div className="p-buttons">
              <button className="btn__setting primary" disabled={!currentFolderId} onClick={onSaveTabClick}>Save to folder<span className="p-hotkey">↵</span></button>
              <button className="btn__setting" onClick={onOpenTabmeClick}>Open Tabme</button>
            </div>
            {
              !currentFolderId && <div className="p-warning-message">Please select a folder to save this tab</div>
            }
          </>
      }
      <PopupKeyboardManager onSaveTab={onSaveTabClick}/>
    </div>
  )
}

function ThisIsTabmeApp() {
  return <div>
    <h2 className="p-tabme-is-already-open">Tabme is already open 🤗</h2>
  </div>
}

function mountApp(state: IStoredAppState, popupStorage: PopupStorage, currentTab: Tab | undefined) {
  const root = createRoot(document.getElementById("root")!)
  root.render(<PopupApp spaces={state.spaces} popupStorage={popupStorage} currentTab={currentTab}/>)
}

function mountAppThisIsTabme() {
  const root = createRoot(document.getElementById("root")!)
  root.render(<ThisIsTabmeApp/>)
}

async function runLocally() {
  await initStats()
  // loading state from LS
  getStateFromLS((res) => {
    applyTheme(res.colorTheme)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0]

      if (isTabmeTab(currentTab)) {
        mountAppThisIsTabme()
      } else {
        chrome.storage.local.get(POPUP_STORAGE_KEY, (result) => {
          const storage: PopupStorage = result[POPUP_STORAGE_KEY] || {}
          mountApp(res, storage, currentTab)
        })
      }
    })
  })
}

runLocally()

