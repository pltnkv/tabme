export function isTabmeTab(tab:{url?: string; pendingUrl?: string;}):boolean {
  return !!(tab.url?.includes("://newtab/") || tab.pendingUrl?.includes("://newtab/"))
   || !!(tab.url?.includes("/newtab.html") || tab.pendingUrl?.includes("/newtab.html"))
}