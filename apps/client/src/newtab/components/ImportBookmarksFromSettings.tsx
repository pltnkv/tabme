import React, { useContext } from "react"
import { BookmarkImporter } from "./BookmarksImporter"
import { Action, IAppState } from "../state/state"
import { DispatchContext } from "../state/actions"

export function ImportBookmarksFromSettings(props: {
  appState: IAppState;
}) {

  const dispatch = useContext(DispatchContext)

  const onClose = () => {
    dispatch({ type: Action.UpdateAppState, newState: { page: "default" } })
  }

  return (
    <div className="welcome welcome__align-top">
      <div className="welcome-scrollable">
        <BookmarkImporter appState={props.appState} onClose={onClose}/>
      </div>
    </div>
  )
}

