export function isTabmeTab(tab:{url?: string; pendingUrl?: string;}):boolean {
  return !!(tab.url?.includes("://newtab/") || tab.pendingUrl?.includes("://newtab/"))
}