import React, { useContext, useEffect } from "react"
import { Modal } from "./Modal"
import { DispatchContext } from "../../state/actions"
import { Action } from "../../state/state"
import { getAvailableWhatsNew, markWhatsNewAsSeen, WhatsNew } from "../../helpers/whats-new"
import { trackStat } from "../../helpers/stats"

export const WhatsNewModal = (p: {
  whatsNew: WhatsNew
  isBeta: boolean
  firstSessionDate?: number
  onClose: () => void
}) => {
  const dispatch = useContext(DispatchContext)

  useEffect(() => {
    markWhatsNewAsSeen(p.whatsNew.key)
    dispatch({
      type: Action.UpdateAppState, newState: { currentWhatsNew: getAvailableWhatsNew(p.firstSessionDate, p.isBeta) }
    })

    trackStat("whatsNewOpened", { key: p.whatsNew.key })
  }, [])

  return (
    <Modal onClose={p.onClose} className="modal-whats-new">
      <div>
        <h2>{p.whatsNew.bodyTitle}</h2>

        <div dangerouslySetInnerHTML={{ __html: p.whatsNew.bodyHtml }}></div>

        <button className="btn__setting primary" onClick={p.onClose}>Got it</button>
      </div>
    </Modal>
  )
}