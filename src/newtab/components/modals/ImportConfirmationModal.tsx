import React, { useState } from "react"
import { Modal } from "./Modal"

export const ImportConfirmationModal = (p: { isModalOpen: boolean, onClose: (opt: string) => void }) => {
  const [importOption, setImportOption] = useState("add")

  // todo improve this logic later
  const handleOptionChange = (event: any) => {
    setImportOption(event.target.value)
  }

  const handleSubmit = () => {
    p.onClose(importOption)
  }

  return (
    <Modal className="spaces-settings-modal" isOpen={p.isModalOpen} onClose={() => p.onClose(importOption)}>
      {/*<h2>How to add imported bookmarks?</h2>*/}
      {/*<p>*/}
      {/*  <label>*/}
      {/*    <input*/}
      {/*      type="radio"*/}
      {/*      name="import-type"*/}
      {/*      value="add"*/}
      {/*      checked={importOption === "add"}*/}
      {/*      onChange={handleOptionChange}*/}
      {/*    />*/}
      {/*    <span>Add to already existing bookmarks.</span>*/}
      {/*  </label>*/}
      {/*</p>*/}
      {/*<p>*/}
      {/*  <label>*/}
      {/*    <input*/}
      {/*      type="radio"*/}
      {/*      name="import-type"*/}
      {/*      value="clear"*/}
      {/*      checked={importOption === "replace"}*/}
      {/*      onChange={handleOptionChange}*/}
      {/*    />*/}
      {/*    <span>Replace existing bookmarks.</span>*/}
      {/*  </label>*/}
      {/*</p>*/}
      {/*<p>*/}
      {/*  <button className="btn__setting primary" style={{ float: "right" }} onClick={handleSubmit}>*/}
      {/*    Done*/}
      {/*  </button>*/}
      {/*</p>*/}
      <h2>Importing JSON backup will replace <br/>all current bookmarks</h2>
      <button className="btn__setting" style={{ float: "right" }} onClick={() => p.onClose('cancel')}>Cancel</button>
      <button className="btn__setting primary" style={{ float: "right" }} onClick={() => p.onClose('import')} autoFocus={true}>Import</button>
    </Modal>
  )
}
