import React, { useContext, useEffect, useState } from "react"
import { DropdownMenu } from "./dropdown/DropdownMenu"
import { handleSearchKeyDown } from "../helpers/handleBookmarksKeyDown"
import { Action, IAppState } from "../state/state"
import { DispatchContext } from "../state/actions"
import { BetaOptions, HelpOptions, SettingsOptions } from "./SettingsOptions"
import { CL } from "../helpers/classNameHelper"
import IconHelp from "../icons/help.svg"
import IconSettings from "../icons/settings.svg"
import IconFind from "../icons/find.svg"
import IconBeta from "../icons/beta.svg"
import { SpacesList } from "./SpacesList"

export function TopBar(p: {
  appState: IAppState;
  isScrolled: boolean
}) {
  const dispatch = useContext(DispatchContext)
  const [betaMenuVisibility, setBetaMenuVisibility] = useState<boolean>(false)
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState<boolean>(false)
  const [helpMenuVisibility, setHelpMenuVisibility] = useState<boolean>(false)

  function onToggleHelpSettings() {
    setHelpMenuVisibility(!helpMenuVisibility)
  }

  function onToggleSettings() {
    setSettingsMenuVisibility(!settingsMenuVisibility)
  }

  function onSearchChange(event: React.ChangeEvent) {
    dispatch({ type: Action.UpdateSearch, value: (event.target as any).value })
  }

  function onClearSearch() {
    dispatch({ type: Action.UpdateSearch, value: "" })
  }

  function toggleBetaMenu() {
    setBetaMenuVisibility(!betaMenuVisibility)
  }

  async function onLogout() {
    localStorage.removeItem("authToken")
    alert("Logout successful")
  }

  return (
    <div className={CL("bookmarks-menu", { "bookmarks-menu--scrolled": p.isScrolled })}>
      {
        p.appState.search && <div className="search-results-header">Search results:</div>
      }
      {
        !p.appState.search && <SpacesList
          betaMode={p.appState.betaMode}
          spaces={p.appState.spaces}
          currentSpaceId={p.appState.currentSpaceId}
          itemInEdit={p.appState.itemInEdit}/>
      }
      <div className="menu-stretching-space"></div>
      <div style={{ display: "flex", marginRight: "12px", position: "relative" }}>
        <IconFind className="search-icon"/>
        <input
          tabIndex={1}
          className="search"
          type="text"
          placeholder="Search in Tabme"
          value={p.appState.search}
          onChange={onSearchChange}
          onKeyDown={handleSearchKeyDown}
        />
        {
          p.appState.search !== ""
            ? <button tabIndex={1}
                      className={"btn__clear-search"}
                      style={{ left: "155px", top: "9px" }}
                      onClick={onClearSearch}>✕</button>
            : null
        }
      </div>


      <div className="menu-buttons">
        {
          p.appState.betaMode && <>
            <span className={CL("beta-mode-label", { "active": betaMenuVisibility })} onClick={toggleBetaMenu}> <IconBeta/> Beta </span>
            {
              betaMenuVisibility && <DropdownMenu onClose={() => {setBetaMenuVisibility(false)}} noSmartPositioning={true} alignRight={true} offset={{ top: 38, right: 80 }}>
                <BetaOptions appState={p.appState}/>
              </DropdownMenu>
            }
          </>
        }
        <button className={`btn__icon ${helpMenuVisibility ? "active" : ""}`} onClick={onToggleHelpSettings}>
          <IconHelp/>
        </button>
        <button className={`btn__icon ${settingsMenuVisibility ? "active" : ""}`} onClick={onToggleSettings}>
          <IconSettings/>
        </button>
        {
          helpMenuVisibility && <DropdownMenu onClose={() => {setHelpMenuVisibility(false)}} noSmartPositioning={true} alignRight={true} offset={{ top: 38, right: 48 }}>
            <HelpOptions appState={p.appState}/>
          </DropdownMenu>
        }
        {
          settingsMenuVisibility && <DropdownMenu onClose={() => {setSettingsMenuVisibility(false)}} noSmartPositioning={true} alignRight={true} offset={{ top: 38 }}>
            <SettingsOptions appState={p.appState}/>
          </DropdownMenu>
        }
      </div>

    </div>
  )
}
