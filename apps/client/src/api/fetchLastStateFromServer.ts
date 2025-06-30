import { getAuthToken, sdk, setAuthTokenToContext } from "./client"
import { convertRemoteStateToLocal } from "../newtab/state/convertRemoteStateToLocal"
import { Action } from "../newtab/state/state"
import { ActionDispatcher } from "../newtab/state/actions"
import { getGlobalAppState } from "../newtab/components/App"

export function fetchLastStateFromServer(dispatch: ActionDispatcher) {
  const authToken = getAuthToken()
  if (authToken !== null) {
    setAuthTokenToContext(authToken)
    sdk.sync.getFullData().then(remoteState => {
      if (remoteState) {
        console.log("Remote content", remoteState)
        const localState = convertRemoteStateToLocal(remoteState)
        const globalAppState = getGlobalAppState()
        if (JSON.stringify(globalAppState.spaces) !== JSON.stringify(remoteState.spaces)) {
          dispatch({ type: Action.InitDashboard, spaces: localState.spaces, saveToLS: true })
          dispatch({ type: Action.SelectSpace, spaceId: globalAppState.currentSpaceId })
        } else {
          alert("!!! globalAppState is the same with REMOTE")
        }
      } else {
        throw Error("Remote state not loaded")
      }
    })
  }
}