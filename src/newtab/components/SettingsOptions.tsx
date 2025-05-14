import React, { useContext, useRef, useState } from "react"
import { hasItemsToHighlight } from "../helpers/utils"
import { Action, IAppState } from "../state/state"
import { DispatchContext } from "../state/actions"
import { showErrorMessage, showMessage } from "../helpers/actionsHelpersWithDOM"
import { importFromJson, onExportJson, onImportFromToby } from "../helpers/importExportHelpers"
import { ImportConfirmationModal } from "./modals/ImportConfirmationModal"
import { trackStat } from "../helpers/stats"
import { LeaveBetaModal } from "./modals/LeaveBetaModal"
import { loadFaviconUrl } from "../helpers/faviconUtils"
import { ShortcutsModal } from "./modals/ShortcutsModal"
import { OverrideModal } from "./modals/OverrideModal"
import { IFolderItem } from "../helpers/types"
import { CL } from "../helpers/classNameHelper"
import { findSpaceById, genUniqLocalId } from "../state/actionHelpers"
import IconToggle from "../icons/toggle-on.svg"
import IconCollapse from "../icons/collapse.svg"
import IconExpand from "../icons/expand.svg"
import { GetProPlanModal } from "./modals/GetProPlanModal"

type OnClickOption = {
  onClick: (e: any) => void;
  title: string;
  text: string;
  hidden?: boolean;
  isFile?: boolean,
  dangerStyle?: boolean,
  icon?: React.FunctionComponent<React.SVGProps<any>>
  proOnly?: boolean
}
type OnToggleOption = { onToggle: () => void; value: boolean, title: string; text: string; hidden?: boolean }
export type OptionsConfig = Array<OnClickOption | OnToggleOption | { separator: true }>

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
      text: "Share feedback about Beta"
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
    {
      leavingBetaModalOpen && <LeaveBetaModal onClose={() => setLeavingBetaModalOpen(false)} spaces={props.appState.spaces}/>
    }
  </>
}

export const HelpOptions = (p: {
  appState: IAppState
}) => {

  const dispatch = useContext(DispatchContext)
  const [isJoinProModalOpen, setJoinProModalOpen] = useState(false)
  const [isShortcutsModalOpen, setShortcutsModalOpen] = useState(false)

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

  function showShortcutsModal() {
    setShortcutsModalOpen(true)
    trackStat("settingsClicked", { settingName: "shortcuts" })
  }

  function tryBeta() {
    setJoinProModalOpen(true)
    trackStat("settingsClicked", { settingName: "tryBeta" })
  }

  function invalidateFavicon(folderItem: IFolderItem): Promise<void> {
    if (folderItem.url) {
      return loadFaviconUrl(folderItem.url, false).then(newFaviconUrl => {
        if (newFaviconUrl !== folderItem.favIconUrl) {
          dispatch({
            type: Action.UpdateFolderItem,
            itemId: folderItem.id,
            favIconUrl: newFaviconUrl
          })
        }
      })
    } else {
      return Promise.resolve()
    }
  }

  function minTimeoutPromise() {
    return new Promise(resolve => setTimeout(resolve, 500))
  }

  function invalidateBrokenIcons() {
    const promises: Promise<unknown>[] = [minTimeoutPromise()]
    const currentSpace = p.appState.spaces.find(s => s.id === p.appState.currentSpaceId)
    if (currentSpace) {
      currentSpace.folders.forEach(f => {
        promises.push(...f.items.map(invalidateFavicon))
      })
    }

    showMessage("updating...", dispatch, true)
    Promise.all(promises).then(() => {
      showMessage("Favicons are updated", dispatch)
    })
  }

  type OnClickOption = { onClick: (e: any) => void; title: string; text: string; hidden?: boolean; isFile?: boolean }
  type OnToggleOption = { onToggle: () => void; value: boolean, title: string; text: string; hidden?: boolean }
  const settingsOptions: Array<OnClickOption | OnToggleOption | { separator: true }> = [
    {
      onClick: onHowToUse,
      title: "Discover hidden features and learn how to make the most of Tabme.",
      text: "How to use Tabme"
    },
    {
      onClick: showShortcutsModal,
      title: "Boost your speed with keyboard shortcuts.",
      text: "Keyboard Shortcuts"
    },
    {
      onClick: invalidateBrokenIcons,
      title: "If some favicons aren’t showing, try this to refresh them. Applies only to bookmarks in the current space.",
      text: "Reload Favicons",
      hidden: !p.appState.alphaMode
    },
    {
      onClick: onRateInStore,
      title: "Thanks for using Tabme 🖤. Your support helps Tabme grow!",
      text: "Rate Tabme in Chrome Store"
    },
    {
      onClick: onSendFeedback,
      title: "Got feedback, ideas, or found a bug? I’d love to hear from you!",
      text: "Share feedback or report an issue"
    },
    {
      separator: true,
      hidden: p.appState.betaMode
    },
    {
      onClick: tryBeta,
      title: "Try out new features before everyone else. Welcome to Beta!",
      text: "Try Pro Features for free",
      hidden: p.appState.betaMode
    }
  ]

  return <>
    <Options optionsConfig={settingsOptions}/>
    {
      isJoinProModalOpen && <GetProPlanModal onClose={() => setJoinProModalOpen(false)} reason={"Nope"}/>
    }
    {
      isShortcutsModalOpen && <ShortcutsModal setOpen={setShortcutsModalOpen}/>
    }
  </>
}

export const SettingsOptions = (p: {
  appState: IAppState;
}) => {
  const [importConfirmationOpen, setImportConfirmationOpen] = useState(false)
  const fileEvent = useRef(null)
  const dispatch = useContext(DispatchContext)
  const [isJoinProModalOpen, setJoinProModalOpen] = useState(false)
  const [isOverrideModalOpen, setOverrideModalOpen] = useState(false)

  const currentSpace = findSpaceById(p.appState, p.appState.currentSpaceId)
  const expandAllFolders = currentSpace?.folders.some(f => f.collapsed) ?? false

  function onToggleNotUsed() {
    if (p.appState.showNotUsed) {
      dispatch({ type: Action.UpdateShowNotUsedItems, value: false })
      showMessage("Highlighting canceled", dispatch)
    } else {
      if (hasItemsToHighlight(p.appState.spaces, p.appState.recentItems)) {
        dispatch({ type: Action.UpdateShowNotUsedItems, value: true })
        showMessage("Unused items for the past 60 days are highlighted", dispatch)
      } else {
        showErrorMessage(`There are no unused items to highlight`, dispatch)
      }
    }

    trackStat("settingsClicked", { settingName: "ToggleNotUsed" })
  }

  function onToggleCollapseExpand() {
    if (p.appState.betaMode) {
      dispatch({
        type: Action.SetCollapsedAllFoldersInCurSpace,
        collapsedValue: !expandAllFolders
      })
      trackStat("settingsClicked", { settingName: "CollapseExpand" })
    } else {
      setJoinProModalOpen(true)
    }
  }

  function onImportExistingBookmarks() {
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } })
    trackStat("settingsClicked", { settingName: "ImportExistingBookmarks" })
  }

  function onToggleReversedOpenTabs() {
    dispatch({ type: Action.UpdateAppState, newState: { reverseOpenTabs: !p.appState.reverseOpenTabs } })
    trackStat("settingsClicked", { settingName: "ToggleReversedOpenTabs" })
  }

  function onToggleMode() {
    dispatch({ type: Action.ToggleDarkMode })
    trackStat("settingsClicked", { settingName: "ToggleDarkMode" })
  }

  function onToggleOpenInTheNewTab() {
    dispatch({ type: Action.UpdateAppState, newState: { openBookmarksInNewTab: !p.appState.openBookmarksInNewTab } })
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

  const settingsOptions: OptionsConfig = [
    {
      onClick: onToggleCollapseExpand,
      title: "Toggle all folders in current space",
      text: expandAllFolders ? "Expand all folders" : "Collapse all folders",
      icon: expandAllFolders ? IconExpand : IconCollapse,
      proOnly: !p.appState.betaMode
    },
    {
      onToggle: onToggleNotUsed,
      value: p.appState.showNotUsed,
      title: "Highlight items unused for 60 days",
      text: "Show unused items"
    },
    {
      separator: true
    },
    {
      onToggle: onToggleMode,
      value: p.appState.colorTheme === "dark",
      title: "Switch between light and dark theme",
      text: "Dark mode"
    },
    {
      onToggle: onToggleReversedOpenTabs,
      value: p.appState.reverseOpenTabs,
      title: "Match the tab order to how they appear in your browser window",
      text: `Reverse tab order in ‘Open Tabs’`
    },
    {
      onToggle: onToggleOpenInTheNewTab,
      value: !p.appState.openBookmarksInNewTab,
      title: "Set default for opening bookmarks. CMD/CTRL works too.",
      text: "Open bookmarks in same tab"
    },
    {
      title: "Enable Tabme on Chrome new tab",
      onToggle: () => {
        setOverrideModalOpen(true)
        trackStat("settingsClicked", { settingName: "toggleShowTabmeOnEachNewTab" })
      },
      value: __OVERRIDE_NEWTAB,
      text: "Show Tabme on Chrome new tab"
    },
    {
      separator: true
    },
    {
      onClick: onImportExistingBookmarks,
      title: "Bring in your Chrome bookmarks",
      text: "Import Chrome bookmarks"
    },
    {
      onClick: (e) => {
        onImportFromToby(e, dispatch, () => {
          showMessage("Bookmarks has been imported", dispatch)
        })
        trackStat("settingsClicked", { settingName: "ImportFromToby" })
      },
      title: "Export JSON from Toby to import",
      text: "Import json file from Toby",
      isFile: true
    },
    {
      separator: true
    },
    {
      onClick: e => onImportClick(e),
      title: "Import a Tabme backup file",
      text: "Import from file",
      isFile: true
    },
    {
      onClick: () => {
        onExportJson(p.appState.spaces)
        trackStat("settingsClicked", { settingName: "ExportToJson" })
      },
      title: "Download your Tabme backup",
      text: "Export to file"
    },
    {
      separator: true
    },
    {
      onClick: () => {
        const res = confirm("Permanently remove all your saved Bookmarks and Stickers from Tabme? This action cannot be undone.")
        if (res) {
          dispatch({ type: Action.DeleteEverything })
          const defaultSpaceId = genUniqLocalId()
          dispatch({ type: Action.CreateSpace, spaceId: defaultSpaceId, title: "Bookmarks" })
          dispatch({ type: Action.SelectSpace, spaceId: defaultSpaceId })
          trackStat("settingsClicked", { settingName: "Everything erased" })
        }
      },
      title: "Permanently remove all your saved Bookmarks and Stickers from Tabme. This action cannot be undone.",
      text: "Delete everything from Tabme"
    }
  ]

  return <>
    <Options optionsConfig={settingsOptions}/>
    {
      importConfirmationOpen && <ImportConfirmationModal onClose={onImportTypeConfirmed}/>
    }
    {
      isOverrideModalOpen && <OverrideModal setOpen={setOverrideModalOpen}/>
    }
    {
      isJoinProModalOpen && <GetProPlanModal onClose={() => setJoinProModalOpen(false)} reason={"Collapsing"}/>
    }
  </>
}

export const Options = (props: { optionsConfig: OptionsConfig | (() => OptionsConfig) }) => {

  function isSeparator(opt: any): opt is { separator: boolean } {
    return opt.hasOwnProperty("separator")
  }

  function isToggle(opt: any): opt is OnToggleOption {
    return opt.hasOwnProperty("onToggle")
  }

  function isClick(opt: any): opt is OnClickOption {
    return opt.hasOwnProperty("onClick")
  }

  const options = typeof props.optionsConfig === "function" ? props.optionsConfig() : props.optionsConfig

  return <>
    {options.map((option, index) => {
      if ((option as any).hidden) {
        return null
      }

      if (isSeparator(option)) {
        return <div key={index} className="dropdown-menu__separator"/>
      } else if (isToggle(option)) {
        return <button key={index}
                       className="dropdown-menu__button justify-content-start focusable"
                       onClick={option.onToggle}
                       title={option.title}>
          {
            option.value
              ? <IconToggle className="icon active"/>
              : <IconToggle className="icon" style={{ transform: "rotate(180deg)" }}/>
          }
          <span>{option.text}</span>
        </button>

      } else if (isClick(option)) {
        if (option.isFile) {
          return <label key={index}
                        className={CL("dropdown-menu__button focusable")}
                        style={{ position: "relative" }}
                        title={option.title}
                        tabIndex={0}>
            <span>{option.text}</span>
            <input type="file" accept=".json" className="hidden-file-input" onChange={option.onClick} tabIndex={-1}/>
          </label>
        } else {
          return <button
            key={index}
            className={CL("dropdown-menu__button focusable", {
              "dropdown-menu__button--dander": option.dangerStyle,
              "dropdown-menu__button--pro-only": option.proOnly
            })}
            onClick={option.onClick}
            title={option.title}
          >
            {option.icon ? React.createElement(option.icon, { className: "icon" }) : null}
            <span style={{flexGrow: 1}}>{option.text}</span>
            {
              option.proOnly ? <span className="get-pro-label">Get Pro</span> : null
            }
          </button>
        }
      }
    })}
  </>
}
