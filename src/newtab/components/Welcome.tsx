import React, { useContext, useEffect, useState } from "react"
import { BookmarkImporter } from "./BookmarksImporter"
import { Action, IAppState } from "../state/state"
import { CL } from "../helpers/classNameHelper"
import { DispatchContext } from "../state/actions"
import { getBrowserBookmarks, importBrowserBookmarks, onImportFromToby } from "../helpers/importExportHelpers"
import ReadyIcon from "../icons/ready-for-use.svg"
import { trackStat } from "../helpers/stats"

const SCREEN = {
  FIRST: "first",
  IMPORT_BROWSER: "import-browser",
  IMPORT_TOBY: "import-toby",
  SELECT_BOOKMARKS: "select-bookmarks",
  READY_TO_USE: "ready-to-use"
}

export function Welcome(p: {
  appState: IAppState;
}) {

  const dispatch = useContext(DispatchContext)
  const [screen, setScreen] = useState(SCREEN.FIRST)

  useEffect(() => {
    trackStat("welcomeShown", {})
  }, [])

  const changeScreen = (screen: string) => {
    setScreen(screen)
    trackStat("welcomeStep", { welcomeStepName: screen })
  }

  const goPrevScreen = (screen: string) => {
    setScreen(screen)
    trackStat("welcomeStep", { welcomeStepName: "prev__" + screen })
  }

  const onCloseOnboarding = () => {
    trackStat("welcomeCompleted", {})
    dispatch({ type: Action.UpdateAppState, newState: { page: "default" } })
  }

  const onImportAllBookmarks = () => {
    trackStat("welcomeStep", { welcomeStepName: "importAllBookmarks" })
    getBrowserBookmarks((records) => {
      importBrowserBookmarks(records, dispatch, true)
      setScreen(SCREEN.READY_TO_USE)
    }, p.appState.recentItems, dispatch)
  }

  return (
    <div className={CL("welcome", {
      "welcome__align-top": screen === SCREEN.SELECT_BOOKMARKS
    })}>
      {
        screen === SCREEN.FIRST &&
        <div className="welcome-scrollable">
          <h1>Welcome to Tabme 🤗</h1>
          <h2>Want to bring in your current bookmarks?</h2>
          <div className="welcome-buttons-box">
            <button className="welcome-button" onClick={() => changeScreen(SCREEN.IMPORT_BROWSER)}>Yes, import browser bookmarks <span
              className="subtext">You can always do it later</span></button>
            <button className="welcome-button" onClick={() => changeScreen(SCREEN.IMPORT_TOBY)}>Yes, import from Toby App
              <span className="subtext">You can always do it later</span>
            </button>
            <button className="welcome-button" onClick={() => changeScreen(SCREEN.READY_TO_USE)}>No, start fresh</button>
          </div>
        </div>
      }

      {
        screen === SCREEN.IMPORT_BROWSER && <div className="welcome-scrollable">
          <h1>Importing browser bookmarks 📦</h1>
          <h2>How do you want to add your bookmarks?</h2>
          <div className="welcome-buttons-box">
            <button className="welcome-button" onClick={onImportAllBookmarks}>Import all bookmarks</button>
            <button className="welcome-button" onClick={() => changeScreen(SCREEN.SELECT_BOOKMARKS)}>Select some bookmarks to import</button>
            <button className="welcome-button welcome-back-button" onClick={() => goPrevScreen(SCREEN.FIRST)}>Go back</button>
          </div>
        </div>
      }

      {
        screen === SCREEN.IMPORT_TOBY && <div className="welcome-scrollable">
          <h1 style={{ textAlign: "left" }}>Importing from Toby App 📦</h1>
          <h2>First export your Bookmarks <br/>from Toby to JSON file:</h2>
          <div className="welcome-buttons-box">
            <ul>
              <li>Open the Toby app</li>
              <li>Choose "Data" → "Export"</li>
              <li>Choose ".JSON" format to export</li>
            </ul>
            <label className="welcome-button">
              Open Toby JSON file
              <input type="file"
                     accept=".json"
                     style={{ visibility: "hidden", position: "absolute" }}
                     onChange={(e) => onImportFromToby(e, dispatch, () => changeScreen(SCREEN.READY_TO_USE))}/>
            </label>

            <button className="welcome-button welcome-back-button" onClick={() => goPrevScreen(SCREEN.FIRST)}>Go back</button>
          </div>
        </div>
      }

      {
        screen === SCREEN.SELECT_BOOKMARKS && <BookmarkImporter appState={p.appState}
                                                                onClose={() => changeScreen(SCREEN.READY_TO_USE)}
                                                                onBack={() => goPrevScreen(SCREEN.IMPORT_BROWSER)}/>
      }

      {
        screen === SCREEN.READY_TO_USE && <div className="welcome-scrollable welcome-scrollable--ready">
          <div className="welcome-ready-icon">
            <ReadyIcon/>
          </div>
          <h1>Tabme is ready for use!</h1>
          <button className="welcome-button" onClick={onCloseOnboarding}>Get started</button>
        </div>
      }
    </div>
  )
}

