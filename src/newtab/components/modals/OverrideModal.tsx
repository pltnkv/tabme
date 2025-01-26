import React from "react"
import { Modal } from "./Modal"

export const OverrideModal = ({ isOverrideModalOpen, setOverrideModalOpen }:
                         { isOverrideModalOpen: boolean, setOverrideModalOpen: (value: boolean) => void }) => {
  return (
    __OVERRIDE_NEWTAB
      ?
      <Modal isOpen={isOverrideModalOpen} onClose={() => setOverrideModalOpen(false)}>
        <div className="modal-no-override">
          <h2>How to remove Tabme from the new tab?</h2>
          <p>If you want to use Tabme without it taking over your new tab, <br/>try the "Tabme — version without newtab" extension.</p>
          <p>It includes all the same features but doesn’t open on every new tab</p>
          <p>Steps:</p>
          <ol>
            <li>[optional] Export existing bookmarks into JSON file.<br/>
              <span>Settings → Export to JSON</span></li>
            <li>Uninstall current "Tabme" extension. <br/>
              <span>Go to "Manage extensions" from your browser. Find the card for Tabme and click "Remove"</span></li>
            <li>Install "<a href="https://chromewebstore.google.com/detail/tabme-%E2%80%94-version-without-n/jjdbikbbknmhkknpfnlhgpcikbfjldee">Tabme — version without newtab</a>"
              extension
            </li>
            <li>[optional] Import saved bookmarks.<br/>
              <span>Settings → Import from JSON</span></li>
          </ol>
          <p>Sorry for the complex steps. Chrome doesn't support easy new tab customization.</p>
          <button className="btn__setting" onClick={() => setOverrideModalOpen(false)}>Close</button>
        </div>
      </Modal>
      :
      <Modal isOpen={isOverrideModalOpen} onClose={() => setOverrideModalOpen(false)}>
        <div className="modal-no-override">
          <h2>How to open Tabme in the every new tab?</h2>
          <p>If you want Tabme was open every new tab, try the regular Tabme extension.
          </p>
          <p>It includes all the same features.</p>
          <p>Steps:</p>
          <ol>
            <li>[optional] Export existing bookmarks into JSON file. <br/>
              <span>Settings → Advanced mode → Export</span></li>
            <li>Uninstall current "Tabme — without new tab override" extension. <br/>
              <span>Go to "Manage extensions" from your browser. Find the card for Tabme and click "Remove"</span></li>
            <li>Install <a href="https://chromewebstore.google.com/detail/tabme/jnhiookaaldadiimlgncedhkpmhlmmip">Tabme extension</a></li>
            <li>[optional] Import saved bookmarks.<br/>
              <span>Settings → Advanced mode → Import</span></li>
          </ol>
          <p>Sorry for the complex steps. Chrome doesn't support easy new tab customization.</p>
          <button className="btn__setting" onClick={() => setOverrideModalOpen(false)}>Close</button>
        </div>
      </Modal>
  )
}