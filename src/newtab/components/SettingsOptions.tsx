import React, { useContext, useRef, useState } from "react"
import { hasArchivedItems, hasItemsToHighlight } from "../helpers/utils"
import { Action, IAppState } from "../state/state"
import { DispatchContext } from "../state/actions"
import Switch from "react-switch"
import { showMessage } from "../helpers/actionsHelpersWithDOM"
import { onExportJson, onImportFromToby, importFromJson } from "../helpers/importExportHelpers"
import { ImportConfirmationModal } from "./modals/ImportConfirmationModal"
import { trackStat } from "../helpers/stats"
import { LeaveBetaModal } from "./modals/LeaveBetaModal"

type OnClickOption = { onClick: (e: any) => void; title: string; text: string; hidden?: boolean; isFile?: boolean }
type OnToggleOption = { onToggle: () => void; value: boolean, title: string; text: string; hidden?: boolean }
type OptionsConfig = Array<OnClickOption | OnToggleOption | { separator: true }>

export const BetaOptions = (props: {
  appState: IAppState;
}) => {
  const [leavingBetaModalOpen, setLeavingBetaModalOpen] = useState<boolean>(false)

  function onStopBeta() {
    trackStat("settingsClicked", { settingName: "betaStopped" })
    setLeavingBetaModalOpen(true)
  }

  function onSendFeedbackBeta() {
    chrome.tabs.create({ url: "https://docs.google.com/forms/d/e/1FAIpQLSeA-xs3GjBVNQQEzSbHiGUs1y9_XIo__pQBJKQth737VqAEOw/formResponse", active: true })
    trackStat("settingsClicked", { settingName: "sendFeedbackBeta" })
  }

  type OnClickOption = { onClick: (e: any) => void; title: string; text: string; hidden?: boolean; isFile?: boolean }
  type OnToggleOption = { onToggle: () => void; value: boolean, title: string; text: string; hidden?: boolean }
  const options: Array<OnClickOption | OnToggleOption | { separator: true }> = [
    {
      onClick: onSendFeedbackBeta,
      title: "I appreciate honest feedback on what needs to be improved or bug reports. Thanks for your time and support!",
      text: "Send feedback"
    },
    {
      onClick: onStopBeta,
      title: "Cancel the beta program and switch to free plan",
      text: "Cancel Beta program 👋",
      hidden: !props.appState.betaMode
    }
  ]

  return <>
    <Options optionsConfig={options}/>
    <LeaveBetaModal isOpen={leavingBetaModalOpen} setOpen={setLeavingBetaModalOpen} spaces={props.appState.spaces}/>
  </>
}

export const HelpOptions = (props: {
  appState: IAppState;
  onShortcutsModal: () => void
}) => {

  function onSendFeedback() {
    chrome.tabs.create({ url: "https://docs.google.com/forms/d/e/1FAIpQLSeA-xs3GjBVNQQEzSbHiGUs1y9_XIo__pQBJKQth737VqAEOw/formResponse", active: true })
    trackStat("settingsClicked", { settingName: "sendFeedback" })
  }

  function onRateInStore() {
    if (__OVERRIDE_NEWTAB) {
      chrome.tabs.create({ url: "https://chromewebstore.google.com/detail/tabme/jnhiookaaldadiimlgncedhkpmhlmmip/reviews", active: true })
    } else {
      chrome.tabs.create({ url: "https://chromewebstore.google.com/detail/tabme-%E2%80%94-version-without-n/jjdbikbbknmhkknpfnlhgpcikbfjldee/reviews", active: true })
    }
    trackStat("settingsClicked", { settingName: "rateInStore" })
  }

  function onHowToUse() {
    chrome.tabs.create({ url: "https://gettabme.com/guide.html", active: true })
    trackStat("settingsClicked", { settingName: "HowToUse" })
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
      onClick: () => {
        props.onShortcutsModal()
        trackStat("settingsClicked", { settingName: "shortcuts" })
      },
      title: "Keyboard shortcuts",
      text: "Keyboard shortcuts"
    },
    {
      onClick: onRateInStore,
      title: "Thank you for using Tabme 🖤",
      text: "Rate Tabme in Chrome Store"
    },
    {
      onClick: onSendFeedback,
      title: "I appreciate honest feedback on what needs to be improved or bug reports. Thanks for your time and support!",
      text: "Send feedback"
    }
  ]

  return <>
    <Options optionsConfig={settingsOptions}/>
  </>
}

export const SettingsOptions = (props: {
  appState: IAppState;
  onOverrideNewTabMenu: () => void
}) => {
  const [importConfirmationOpen, setImportConfirmationOpen] = useState(false)
  const fileEvent = useRef(null)
  const dispatch = useContext(DispatchContext)

  function onToggleNotUsed() {
    if (hasItemsToHighlight(props.appState.spaces, props.appState.historyItems)) {
      dispatch({ type: Action.UpdateShowNotUsedItems, value: !props.appState.showNotUsed })
      const message = !props.appState.showNotUsed ? "Unused items for the past 60 days are highlighted" : "Highlighting canceled"
      showMessage(message, dispatch)
    } else {
      showMessage(`There are no unused items to highlight`, dispatch)
    }
    trackStat("settingsClicked", { settingName: "ToggleNotUsed" })
  }

  function onToggleHidden() {
    if (hasArchivedItems(props.appState.spaces)) {
      dispatch({ type: Action.UpdateShowArchivedItems, value: !props.appState.showArchived })
      const message = !props.appState.showArchived ? "Hidden items are visible" : "Hidden items are hidden"
      showMessage(message, dispatch)
    } else {
      showMessage(`There are no hidden items`, dispatch)
    }
    trackStat("settingsClicked", { settingName: "ToggleHidden" })
  }

  function onImportExistingBookmarks() {
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } })
    trackStat("settingsClicked", { settingName: "ImportExistingBookmarks" })
  }

  function onToggleMode() {
    dispatch({ type: Action.ToggleDarkMode })
    trackStat("settingsClicked", { settingName: "ToggleDarkMode" })
  }

  function onToggleOpenInTheNewTab() {
    dispatch({ type: Action.UpdateAppState, newState: { openBookmarksInNewTab: !props.appState.openBookmarksInNewTab } })
    trackStat("settingsClicked", { settingName: "ToggleOpenInTheNewTab" })
  }

  function onImportClick(e: any) {
    fileEvent.current = e
    setImportConfirmationOpen(true)
    trackStat("settingsClicked", { settingName: "ImportTabmeJSON" })
  }

  function onImportTypeConfirmed(opt: string) {
    setImportConfirmationOpen(false)
    if (opt === "import") {
      importFromJson(fileEvent.current, dispatch)
    }
  }

  function tryFixBrokenIcons() {
    dispatch({ type: Action.FixBrokenIcons })
    showMessage("Broken favicons are updated", dispatch)
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
      text: "Show hidden items",
      hidden: !props.appState.hiddenFeatureIsEnabled
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
      onToggle: () => {
        props.onOverrideNewTabMenu()
        trackStat("settingsClicked", { settingName: "toggleShowTabmeOnEachNewTab" })
      },
      value: __OVERRIDE_NEWTAB,
      text: "Show Tabme on each new tab"
    },
    // fix later maybe
    // {
    //   onClick: tryFixBrokenIcons,
    //   title: "Sometimes favicons are not showing, this option may help to fix it",
    //   text: "Try reload broken favicons"
    // },
    {
      separator: true
    },
    {
      onClick: onImportExistingBookmarks,
      title: "Import existing Chrome bookmarks into Tabme",
      text: "Import from browser bookmarks"
    },
    {
      onClick: (e) => {
        onImportFromToby(e, dispatch, () => {
          showMessage("Bookmarks has been imported", dispatch)
        })
        trackStat("settingsClicked", { settingName: "ImportFromToby" })
      },
      title: "To get Toby`s 'JSON file' go to Account -> Export -> Json in the Toby App",
      text: "Import from Toby App JSON",
      isFile: true
    },
    {
      separator: true
    },
    {
      onClick: e => onImportClick(e),
      title: "Open exported Tabme JSON file",
      text: "Import from JSON",
      isFile: true
    },
    {
      onClick: () => {
        onExportJson(props.appState.spaces)
        trackStat("settingsClicked", { settingName: "ExportToJson" })
      },
      title: "Export all Folders and Bookmarks to JSON file",
      text: "Export to JSON"
    }
  ]

  return <>
    <Options optionsConfig={settingsOptions}/>
    <ImportConfirmationModal isModalOpen={importConfirmationOpen} onClose={onImportTypeConfirmed}/>
  </>
}

const Options = (props: { optionsConfig: OptionsConfig }) => {

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
