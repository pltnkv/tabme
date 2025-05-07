export enum WhatsNewKey {
  StickyNotes = "sticky-notes",
  Collapsing = "collapsing",
}

export type WhatsNew = {
  key: WhatsNewKey
  buttonText: string
  bodyTitle: string
  bodyHtml: string
  approxReleaseDate: string
  availableForBetaOnly?: boolean
}

export const WhatsNewConfig: { [x in WhatsNewKey]: WhatsNew } = {
  [WhatsNewKey.StickyNotes]: {
    key: WhatsNewKey.StickyNotes,
    buttonText: "Meet the Sticky Notes Update",
    bodyTitle: "🆕 Meet the Sticky Notes Update",
    bodyHtml: `<p>Now you can quickly jot down ideas, to-dos, or anything on your mind with <b>Sticky Notes</b>!<br>Just <b>double-click anywhere</b> to create a note and keep your thoughts right where you need them.</p>${getYoutubeIframe(
      "https://www.youtube.com/embed/9jZCsg8lF8o?si=8skWdiBN2FY8HqQb")}`,
    approxReleaseDate: "10.4.2025"
  },
  [WhatsNewKey.Collapsing]: {
    key: WhatsNewKey.Collapsing,
    buttonText: "Meet Collapsable Folders and Groups",
    bodyTitle: "🆕 Meet Collapsable Folders and Groups",
    bodyHtml: `<p>Keep your workspace tidy with collapsible Folders and Groups!<br/>
              Use the new “Collapse all folders” option in "Settings" to quickly reorganize your bookmarks.<br/>
              I've also improved drag-and-drop for Groups, making it easier to use.<br/><br/>
              <i>Note: Collapsing is available in the Pro plan only.</i><br/><br/>
              Watch the quick demo below to see it in action:</p>${getYoutubeIframe(
      "https://www.youtube.com/embed/pAnZQ1GrlEA?si=bjjPlUn81deBrRCb")}`,
    approxReleaseDate: "9.5.2025"
  }
}

// Helper to parse dates in dd.MM.yyyy format.
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split(".").map(Number)
  return new Date(year, month - 1, day)
}

// Helper to retrieve seen WhatsNew keys from localStorage.
function getSeenWhatsNewKeys(): WhatsNewKey[] {
  const stored = localStorage.getItem("whatsNewSeen")
  return stored ? JSON.parse(stored) : []
}

/**
 * Returns the first available "What's New" item that:
 * - Has a minDate that is in the past or today.
 * - Has not been marked as seen.
 *
 * If none is available, it returns undefined.
 */
export function getAvailableWhatsNew(firstSessionDate: number | undefined, isBeta: boolean): WhatsNew | undefined {
  const seen = getSeenWhatsNewKeys()
  const now = new Date()
  return Object.values(WhatsNewConfig).find(whatsNew => {
    const releaseDate = parseDate(whatsNew.approxReleaseDate)
    return now >= releaseDate
      && (firstSessionDate === undefined || firstSessionDate <= releaseDate.getTime())
      && (!whatsNew.availableForBetaOnly || isBeta)
      && !seen.includes(whatsNew.key)
  })
}

/**
 * Marks the given WhatsNew key as seen by adding it to localStorage.
 */
export function markWhatsNewAsSeen(key: WhatsNewKey) {
  const seen = getSeenWhatsNewKeys()
  if (!seen.includes(key)) {
    seen.push(key)
    localStorage.setItem("whatsNewSeen", JSON.stringify(seen))
  }
}

function getYoutubeIframe(src: string) {
  return `<iframe width="560" height="315" src="${src}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
}