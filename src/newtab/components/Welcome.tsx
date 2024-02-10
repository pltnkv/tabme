import React from "react"
import { IAppState } from "../state"
import { BookmarkImporter } from "./BookmarksImporter"

export function Welcome(props: {
  appState: IAppState;
}) {

  return (
    <div className="welcome">
      <BookmarkImporter appState={props.appState}/>
    </div>
  )
}

