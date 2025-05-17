import React from "react"
import { Modal } from "./Modal"
import { IS_MAC_DEVICE } from "../../helpers/utils"

export const ShortcutsModal = ({setOpen }:
                          { setOpen: (value: boolean) => void }) => {

  const cmdOrCtrl = IS_MAC_DEVICE ? `⌘` : `CTRL`

  return (
    <Modal onClose={() => setOpen(false)}>
      <div className="modal-no-override">
        <h2>Keyboard shortcuts</h2>
        <p>
          <span className="hotkey">{cmdOrCtrl} + F</span> search
        </p>
        <p>
          <span className="hotkey">{cmdOrCtrl}&thinsp;+&thinsp;click</span> open bookmark in new Tab
        </p>
        <p>
          <span className="hotkey">Arrow keys</span> navigate bookmarks
        </p>
        <p>
          <span className="hotkey">CTRL + 1..9</span> open Space by index
        </p>
        <p>
          <span className="hotkey">DEL</span> delete selected items
        </p>
        <p>
          <span className="hotkey">{cmdOrCtrl}&thinsp;+&thinsp;Z</span> undo
        </p>
      </div>
    </Modal>
  )
}