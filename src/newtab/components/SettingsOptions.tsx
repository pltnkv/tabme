import React, { useContext } from "react"
import { genNextRuntimeId, genUniqId, getFavIconUrl, hasItemsToHighlight } from "../helpers/utils"
import { showMessage } from "../helpers/actionsHelpers"
import { Action, IAppState } from "../state/state"
import { DispatchContext } from "../state/actions"
import Switch from "react-switch"
import { IFolder } from "../helpers/types"

export const SettingsOptions = (props: {
  appState: IAppState;
  onOverrideNewTabMenu: () => void
  onShortcutsModal: () => void
}) => {
  const dispatch = useContext(DispatchContext)

  function onToggleNotUsed() {
    if (hasItemsToHighlight(props.appState.folders, props.appState.historyItems)) {
      dispatch({ type: Action.UpdateShowNotUsedItems, value: !props.appState.showNotUsed })
      const message = !props.appState.showNotUsed ? "Unused items for the past 60 days are highlighted" : "Highlighting canceled"
      showMessage(message, dispatch)
    } else {
      showMessage(`There are no unused items to highlight`, dispatch)
    }
  }

  function onToggleHidden() {
    // if (hasArchivedItems(props.appState.folders)) {
    dispatch({ type: Action.UpdateShowArchivedItems, value: !props.appState.showArchived })
    // const message = !props.appState.showArchived ? "Archived items are visible" : "Archived items are hidden"
    // showMessage(message, dispatch)
    // } else {
    //   showMessage(`There are no archived items yet`, dispatch)
    // }
  }

  function onSendFeedback() {
    chrome.tabs.create({ url: "https://docs.google.com/forms/d/e/1FAIpQLSeA-xs3GjBVNQQEzSbHiGUs1y9_XIo__pQBJKQth737VqAEOw/formResponse", active: true })
  }

  function onRateInStore() {
    chrome.tabs.create({ url: "https://chromewebstore.google.com/detail/tabme/jnhiookaaldadiimlgncedhkpmhlmmip/reviews", active: true })
  }

  function onHowToUse() {
    chrome.tabs.create({ url: "https://gettabme.com/guide.html", active: true })
  }

  function onImportExistingBookmarks() {
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } })
  }

  function onImportJson(event: any) {
    function receivedText(e: any) {
      let lines = e.target.result
      try {
        const loadedFolders = JSON.parse(lines) as IFolder[]
        const validFormat = Array.isArray(loadedFolders) && loadedFolders[0]?.title && loadedFolders[0]?.items
        if (validFormat) {
          loadedFolders.forEach(loadedFolder => {
            dispatch({
              type: Action.CreateFolder,
              title: loadedFolder.title,
              items: loadedFolder.items,
              color: loadedFolder.color
            })
          })
        } else {
          throw new Error("Unsupported")
        }
      } catch (e) {
        dispatch({ type: Action.ShowNotification, isError: true, message: "Unsupported JSON format" })
      }
    }

    const file = event.target.files[0]
    const fr = new FileReader()
    fr.onload = receivedText
    fr.readAsText(file)
  }

  function onExportJson() {
    function downloadObjectAsJson(exportObj: any, exportName: string) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj))
      const downloadAnchorNode = document.createElement("a")
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", exportName + ".json")
      document.body.appendChild(downloadAnchorNode) // required for firefox
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
    }

    downloadObjectAsJson(props.appState.folders, "tabme_backup")
  }

  function onImportFromToby(event: any) {
    function receivedText(e: any) {
      let lines = e.target.result
      try {
        const tobyData = JSON.parse(lines) as ITobyJson
        const validFormat = Array.isArray(tobyData.lists)
        if (validFormat) {

          tobyData.lists.forEach(tobyFolder => {
            dispatch({
              type: Action.CreateFolder,
              title: tobyFolder.title,
              items: tobyFolder.cards.map(card => ({
                id: genUniqId(),
                title: card.title,
                url: card.url,
                favIconUrl: getFavIconUrl(card.url)
              }))
            })
          })
        } else {
          throw new Error("Unsupported")
        }
      } catch (e) {
        console.error(e)
        dispatch({ type: Action.ShowNotification, isError: true, message: "Unsupported JSON format" })
      }
    }

    const file = event.target.files[0]
    const fr = new FileReader()
    fr.onload = receivedText
    fr.readAsText(file)
  }

  function onToggleMode() {
    dispatch({ type: Action.ToggleDarkMode })
  }

  function onToggleOpenInTheNewTab() {
    dispatch({ type: Action.UpdateAppState, newState: { openBookmarksInNewTab: !props.appState.openBookmarksInNewTab } })
  }

  type OnClickOption = { onClick: (e: any) => void; title: string; text: string; hidden?: boolean; isFile?: boolean }
  type OnToggleOption = { onToggle: () => void; value: boolean, title: string; text: string; hidden?: boolean }
  const settingsOptions: Array<OnClickOption | OnToggleOption | { separator: true }> = [
    {
      onToggle: onToggleNotUsed,
      value: props.appState.showNotUsed,
      title: "Highlight not used in past 60 days to archive them. It helps to keep workspace clean.",
      text: props.appState.showNotUsed ? "Unhighlight not used" : "Highlight not used"
    },
    {
      onToggle: onToggleMode,
      value: props.appState.colorTheme === "dark",
      title: "Change your Color Schema",
      text: "Use Dark Theme"
    },
    {
      onToggle: onToggleOpenInTheNewTab,
      value: !props.appState.openBookmarksInNewTab,
      title: "You can also open bookmarks on the new tab with pressed CMD or CTRL",
      text: "Open bookmarks on the same tab"
    },
    {
      title: "Manage browser new tab override by Tabme",
      onToggle: props.onOverrideNewTabMenu,
      value: __OVERRIDE_NEWTAB,
      text: "Show Tabme on each new tab"
    },
    {
      separator: true
    },
    {
      onClick: onImportExistingBookmarks,
      title: "Import existing Chrome bookmarks into Tabme",
      text: "Import browser bookmarks"
    },
    {
      onClick: onExportJson,
      title: "Export all Folders and Bookmarks to JSON file",
      text: "Export to JSON"
    },
    {
      onClick: onImportJson,
      title: "Import exported Tabme JSON file",
      text: "Import from JSON",
      isFile: true
    },
    {
      onClick: onImportFromToby,
      title: "To get Toby`s 'JSON file' go to Account -> Export -> Json in the Toby App",
      text: "Import from Toby App JSON",
      isFile: true
    },
    {
      separator: true
    },
    {
      onClick: onHowToUse,
      title: "Learn more about Tabme. There is a lot of hidden functionality",
      text: "Guide: How to use"
    },
    {
      onClick: props.onShortcutsModal,
      title: "",
      text: "Keyboard shortcuts"
    },
    {
      onClick: onSendFeedback,
      title: "I appreciate honest feedback on what needs to be improved or bug reports. Thanks for your time and support!",
      text: "Send feedback"
    },
    {
      onClick: onRateInStore,
      title: "Thank you for using Tabme 🖤",
      text: "Rate Tabme in Chrome Store"
    }
  ]

  function isSeparator(opt: any): opt is { separator: boolean } {
    return opt.hasOwnProperty("separator")
  }

  function isToggle(opt: any): opt is OnToggleOption {
    return opt.hasOwnProperty("onToggle")
  }

  function isClick(opt: any): opt is OnClickOption {
    return opt.hasOwnProperty("onClick")
  }

  return <>
    {settingsOptions.map((option, index) => {
      if ((option as any).hidden) {
        return null
      }

      if (isSeparator(option)) {
        return <div key={index} className="dropdown-menu__separator"/>
      } else if (isToggle(option)) {
        return <label key={index} className="dropdown-menu__button focusable" title={option.title}>
          <Switch className={"switch"}
                  height={16}
                  width={28}
                  onColor={"#599ef2"}
                  offColor={"#cbcbcb"}
                  checkedIcon={false}
                  uncheckedIcon={false}
                  checked={option.value}
                  onChange={option.onToggle}
          />
          <span>{option.text}</span>
        </label>

      } else if (isClick(option)) {
        if (option.isFile) {
          return <label key={index}
                        className="dropdown-menu__button focusable"
                        style={{ position: "relative" }}
                        title={option.title}
                        tabIndex={0}>
            <span>{option.text}</span>
            <input type="file" accept=".json" className="hidden-file-input" onChange={option.onClick} tabIndex={-1}/>
          </label>
        } else {
          return <button
            key={index}
            className="dropdown-menu__button focusable"
            onClick={option.onClick}
            title={option.title}
          >{option.text}</button>
        }
      }
    })}
  </>
}

type ITobyItem = {
  "title": string,
  "url": string,
}
type ITobyFolder = {
  title: string
  cards: ITobyItem[]
}
type ITobyJson = {
  lists: ITobyFolder[]
}