import React, { useEffect } from "react"
import { Modal } from "./Modal"
import { trackStat } from "../../helpers/stats"

export const HiddenDeprecationModal = (p: { onClose: () => void }) => {

  useEffect(() => {
    trackStat('hiddenDeprecatedWasSeen', {})
  }, [])

  return (
    <Modal onClose={p.onClose}>
      <>
        <h2 className="title">Hidden folders and bookmarks are now visible</h2>
        <p>
          You’re seeing this message because you had hidden bookmarks or folders.<br/><br/>

          <b>Good news:</b> TabMe now supports <b>collapsible</b> folders and groups!<br/><br/>
          But to avoid UX confusion between “hidden” and “collapsible,”<br/>
          I’ve decided to remove the hidden feature due to low usage.<br/><br/>

          From now on, all previously hidden bookmarks and folders are visible again.<br/>
          Use collapsible folders and groups to keep your space organized and clutter-free.<br/><br/>

          I hope you enjoy the update!<br/>
        </p>
        <button className="btn__setting primary" onClick={p.onClose}>Got it</button>
      </>
    </Modal>
  )
}
