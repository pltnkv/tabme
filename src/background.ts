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

chrome.tabs.onActivated.addListener(((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (t) => {
    if (t.id !== undefined) {
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

let uninstallURL = __OVERRIDE_NEWTAB
  ? "https://docs.google.com/forms/d/e/1FAIpQLSevGfJekcHfb0WjnnuE9XMFYhPIRwtxGFFZH6WV0ve3aBbgwQ/viewform"
  : "https://docs.google.com/forms/d/e/1FAIpQLSc4f_Qfgd9jvL3kTk1puG_zAiobYPBYdKPEj7ug9YWsHU515Q/viewform?usp=header"

chrome.runtime.setUninstallURL(uninstallURL, () => {
  if (chrome.runtime.lastError) {
    console.error("Error setting uninstall URL:", chrome.runtime.lastError.message)
  }
})