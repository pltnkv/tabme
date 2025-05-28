import React, { useContext, useEffect, useState } from "react"
import { Modal } from "./Modal"
import { DispatchContext } from "../../state/actions"
import { Action } from "../../state/state"
import { getAvailableWhatsNew, markWhatsNewAsSeen, WhatsNew } from "../../helpers/whats-new"
import { trackStat } from "../../helpers/stats"

export const WhatsNewModal = (p: {
  whatsNews: WhatsNew[]
  isBeta: boolean
  firstSessionDate?: number
  onClose: () => void
}) => {
  const dispatch = useContext(DispatchContext)
  const [whatsNews, setWhatsNews] = React.useState<WhatsNew[]>([])

  useEffect(() => {
    setWhatsNews([...p.whatsNews].reverse())
    p.whatsNews.forEach(wn => {
      markWhatsNewAsSeen(wn.key)
      dispatch({
        type: Action.UpdateAppState, newState: { availableWhatsNew: [] }
      })

      trackStat("whatsNewOpened", { key: wn.key })
    })
  }, [])

  return (
    <Modal onClose={p.onClose} className="modal-whats-new">
      <div>
        {
          whatsNews.map(wn => {
            return <>
              <h2>{wn.bodyTitle}</h2>
              <div style={{ paddingBottom: "40px" }} dangerouslySetInnerHTML={{ __html: wn.bodyHtml }}></div>
            </>
          })
        }
        <button className="btn__setting primary" onClick={p.onClose}>Got it</button>
      </div>
    </Modal>
  )
}