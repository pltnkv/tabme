import Tab = chrome.tabs.Tab

const MAX_LAST_ACTIVE_TABS_COUNT = 3

////////////////////////////////////////////////////////
// clicking on extension icon
const chromeAny: any = chrome // hotfix for "chrome.action"
chromeAny.action.onClicked.addListener(async function() {
  const viewTabUrl = chrome.runtime.getURL("newtab.html")
  chrome.tabs.create({ url: viewTabUrl })
})

////////////////////////////////////////////////////////
// watching last active tabs
const bc = new BroadcastChannel("sync-state-channel")

let lastActiveTabIds: number[] = []

function addLastActiveTabId(tabId: number) {
  const newLastActiveTabs = [tabId, ...lastActiveTabIds]
  if (newLastActiveTabs.length > 3) {
    newLastActiveTabs.length = MAX_LAST_ACTIVE_TABS_COUNT
  }
  lastActiveTabIds = newLastActiveTabs
}

function isTabme(tab:Tab):boolean {
  return tab.pendingUrl?.includes("://newtab/") || tab.url?.includes("://newtab/") || false
}

let i = 1
chrome.tabs.onActivated.addListener((activeInfo => {
  chrome.tabs.get(activeInfo.tabId, (t) => {
    if (t.id !== undefined && !isTabme(t)) {
      addLastActiveTabId(t.id)
      bc.postMessage({ type: "last-active-tabs-updated", tabs: lastActiveTabIds })
    }
  })
}))

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "get-last-active-tabs") {
      sendResponse({ type: "send-last-active-tabs", tabs: lastActiveTabIds })
    }
  }
)