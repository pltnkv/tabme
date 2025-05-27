import { isBetaMode, IStoredAppState, saveStateThrottled } from "./storage"
import { getFirstSortedByPosition } from "../helpers/fractionalIndexes"
import { faviconsStorage } from "../helpers/faviconUtils"
import { getAvailableWhatsNew } from "../helpers/whats-new"
import { applyTheme } from "./colorTheme"

export function preprocessLoadedState(state: IStoredAppState): void {
  ////////////////////////////////////////////////////////////
  // initialize app.stat
  ////////////////////////////////////////////////////////////
  if (state.stat) { // not first run, need to update stat
    state.stat.sessionNumber++
    state.stat.lastVersion = chrome.runtime.getManifest().version
  } else { // the most first run of the extension
    state.stat = {
      sessionNumber: 1,
      firstSessionDate: Date.now(),
      lastVersion: chrome.runtime.getManifest().version
    }
  }

  ////////////////////////////////////////////////////////////
  // Parse URL for spaceId parameter and set current space
  ////////////////////////////////////////////////////////////
  const urlParams = new URLSearchParams(window.location.search)
  const spaceIdFromUrl = urlParams.get('spaceId')
  if (spaceIdFromUrl) {
    const spaceIdNumber = parseInt(spaceIdFromUrl, 10)
    if (!isNaN(spaceIdNumber)) {
      if (state.spaces.some(s => s.id === spaceIdNumber)) {
        state.currentSpaceId = spaceIdNumber
      }
    }
  }

  ////////////////////////////////////////////////////////////
  // Making sure that selected space exists
  ////////////////////////////////////////////////////////////
  const selectedSpace = state.spaces.find(s => s.id === state.currentSpaceId)
  if (!selectedSpace) {
    const firstSortedSpace = getFirstSortedByPosition(state.spaces)
    if (firstSortedSpace) {
      state.currentSpaceId = firstSortedSpace.id
    }
  }

  ////////////////////////////////////////////////////////////
  // Process FavIcons
  //
  // AND Check if there is hidden items
  ////////////////////////////////////////////////////////////

  let hasHiddenObjects = false
  state.spaces.forEach(s => {
    s.folders.forEach(f => {
      if (f.archived) {
        hasHiddenObjects = true
      }
      f.items.forEach(i => {
        if (i.archived) {
          hasHiddenObjects = true
        }
        faviconsStorage.registerInCache(i.favIconUrl, i.url)
      })
    })
  })
  state.hasHiddenObjects = hasHiddenObjects

  ////////////////////////////////////////////////////////////
  // Check if user in betaMode
  ////////////////////////////////////////////////////////////
  state.betaMode = isBetaMode()

  ////////////////////////////////////////////////////////////
  // Init available "Whats new"
  ////////////////////////////////////////////////////////////
  state.currentWhatsNew = getAvailableWhatsNew(state.stat.firstSessionDate, state.betaMode)

  ////////////////////////////////////////////////////////////
  // Apply Dark Light Themes
  ////////////////////////////////////////////////////////////
  applyTheme(state.colorTheme)

  ////////////////////////////////////////////////////////////
  // save updated stat in state
  ////////////////////////////////////////////////////////////
  saveStateThrottled(state)
}