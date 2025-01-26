import React, { useContext } from "react"
import { genUniqLocalId, getFavIconUrl, hasArchivedItems, hasItemsToHighlight } from "../helpers/utils"
import { Action, IAppState } from "../state/state"
import { DispatchContext } from "../state/actions"
import Switch from "react-switch"
import { IFolder } from "../helpers/types"
import { showMessage } from "../helpers/actionsHelpers"

type OnClickOption = { onClick: (e: any) => void; title: string; text: string; hidden?: boolean; isFile?: boolean }
type OnToggleOption = { onToggle: () => void; value: boolean, title: string; text: string; hidden?: boolean }
type OptionsConfig = Array<OnClickOption | OnToggleOption | { separator: true }>

export const HelpOptions = (props: {
  appState: IAppState;
  onShortcutsModal: () => void
}) => {
  function onSendFeedback() {
    chrome.tabs.create({ url: "https://docs.google.com/forms/d/e/1FAIpQLSeA-xs3GjBVNQQEzSbHiGUs1y9_XIo__pQBJKQth737VqAEOw/formResponse", active: true })
  }

  function onRateInStore() {
    if (__OVERRIDE_NEWTAB) {
      chrome.tabs.create({ url: "https://chromewebstore.google.com/detail/tabme/jnhiookaaldadiimlgncedhkpmhlmmip/reviews", active: true })
    } else {
      chrome.tabs.create({ url: "https://chromewebstore.google.com/detail/tabme-%E2%80%94-version-without-n/jjdbikbbknmhkknpfnlhgpcikbfjldee/reviews", active: true })
    }
  }

  function onHowToUse() {
    chrome.tabs.create({ url: "https://gettabme.com/guide.html", active: true })
  }

  type OnClickOption = { onClick: (e: any) => void; title: string; text: string; hidden?: boolean; isFile?: boolean }
  type OnToggleOption = { onToggle: () => void; value: boolean, title: string; text: string; hidden?: boolean }
  const settingsOptions: Array<OnClickOption | OnToggleOption | { separator: true }> = [
    {
      onClick: onHowToUse,
      title: "Learn more about Tabme. There is a lot of hidden functionality",
      text: "Guide: How to use"
    },
    {
      onClick: props.onShortcutsModal,
      title: "Keyboard shortcuts",
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

  return <Option optionsConfig={settingsOptions}/>
}

export const SettingsOptions = (props: {
  appState: IAppState;
  onOverrideNewTabMenu: () => void
}) => {
  const dispatch = useContext(DispatchContext)

  function onToggleNotUsed() {
    if (hasItemsToHighlight(props.appState.spaces, props.appState.historyItems)) {
      dispatch({ type: Action.UpdateShowNotUsedItems, value: !props.appState.showNotUsed })
      const message = !props.appState.showNotUsed ? "Unused items for the past 60 days are highlighted" : "Highlighting canceled"
      showMessage(message, dispatch)
    } else {
      showMessage(`There are no unused items to highlight`, dispatch)
    }
  }

  function onToggleHidden() {
    if (hasArchivedItems(props.appState.spaces)) {
      dispatch({ type: Action.UpdateShowArchivedItems, value: !props.appState.showArchived })
      const message = !props.appState.showArchived ? "Hidden items are visible" : "Hidden items are hidden"
      showMessage(message, dispatch)
    } else {
      showMessage(`There are no hidden items`, dispatch)
    }
  }

  function onImportExistingBookmarks() {
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } })
  }

  function onImportJson(event: any) {
    //!!!! support spaces
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

    downloadObjectAsJson(props.appState.spaces, "tabme_backup")
  }

  function onImportFromToby(event: any) {
    //!!!! test that works
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
                id: genUniqLocalId(),
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

  const settingsOptions: OptionsConfig = [
    {
      onToggle: onToggleNotUsed,
      value: props.appState.showNotUsed,
      title: "Highlight not used in past 60 days to archive them. It helps to keep workspace clean.",
      text: props.appState.showNotUsed ? "Unhighlight not used" : "Highlight not used"
    },
    {
      onToggle: onToggleHidden,
      value: props.appState.showArchived,
      title: "You can hide unused folders and bookmarks to keep space clean",
      text: "Show hidden items"
    },
    {
      separator: true
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
      text: "Import from browser bookmarks"
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
      onClick: onImportJson,
      title: "Import exported Tabme JSON file",
      text: "Import from JSON",
      isFile: true
    },
    {
      onClick: onExportJson,
      title: "Export all Folders and Bookmarks to JSON file",
      text: "Export to JSON"
    },
  ]

  return <Option optionsConfig={settingsOptions}/>
}

const Option = (props: { optionsConfig: OptionsConfig }) => {

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
    {props.optionsConfig.map((option, index) => {
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