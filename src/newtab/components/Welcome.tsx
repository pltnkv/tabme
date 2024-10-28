import React from "react"
import { BookmarkImporter } from "./BookmarksImporter"
import { IAppState } from "../state/state"

export function Welcome(props: {
  appState: IAppState;
}) {

  return (
    <div className="welcome">
      <div className="welcome-scrollable">
        <BookmarkImporter appState={props.appState}/>
      </div>
    </div>
  )
}

