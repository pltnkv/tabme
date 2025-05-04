import React from "react"
import { Modal } from "./Modal"

export const OverrideModal = ({ setOpen }:
                                { setOpen: (value: boolean) => void }) => {
  return (
    __OVERRIDE_NEWTAB
      ? (
        <Modal onClose={() => setOpen(false)}>
          <div className="modal-no-override">
            <h2>Don’t want Tabme on your new tab?</h2>
            <p>
              Use <a href="https://chromewebstore.google.com/detail/tabme-%E2%80%94-version-without-n/jjdbikbbknmhkknpfnlhgpcikbfjldee">Tabme Mini</a> instead. It works just like Tabme, but doesn’t open in every new tab.
            </p>
            <p>Steps:</p>
            <ol>
              <li>[optional] Export existing bookmarks into JSON file.<br />
                <span>Settings → Export to file</span></li>
              <li>Uninstall current "Tabme" extension. <br />
                <span>Go to "Manage extensions" from your browser. Find the card for Tabme and click "Remove"</span></li>
              <li>Install "<a href="https://chromewebstore.google.com/detail/tabme-%E2%80%94-version-without-n/jjdbikbbknmhkknpfnlhgpcikbfjldee">Tabme Mini — version without newtab</a>"
                extension.<br />
                <span>Choose "No, start fresh" option in the onboarding</span>
              </li>
              <li>[optional] Import saved bookmarks.<br />
                <span>Settings → Import from file</span></li>
            </ol>
            <p>Sorry it's a bit complicated — Chrome doesn’t allow easier new tab settings.</p>
            <button className="btn__setting" onClick={() => setOpen(false)}>Close</button>
          </div>
        </Modal>
      ) : (
        <Modal onClose={() => setOpen(false)}>
          <div className="modal-no-override">
            <h2>Want Tabme on every new tab?</h2>
            <p>Install the regular Tabme extension. It opens every time you open a new tab.</p>
            <p>Steps:</p>
            <ol>
              <li>[optional] Export existing bookmarks into JSON file. <br />
                <span>Settings → Export to file</span></li>
              <li>Uninstall current "Tabme Mini" extension. <br />
                <span>Go to "Manage extensions" from your browser. Find the card for "Tabme" and click "Remove"</span></li>
              <li>Install <a href="https://chromewebstore.google.com/detail/tabme/jnhiookaaldadiimlgncedhkpmhlmmip">Tabme for New Tab</a></li>
              <li>[optional] Import saved bookmarks.<br />
                <span>Settings → Import from file</span></li>
            </ol>
            <p>Sorry it's a bit complicated — Chrome doesn’t allow easier new tab settings.</p>
            <button className="btn__setting" onClick={() => setOpen(false)}>Close</button>
          </div>
        </Modal>
      )
  )
}