import React from "react"
import { createRoot } from "react-dom/client"

export default function PopupApp(p: {
}) {

  return (
    <div className="p-app">
      <h2>HI</h2>
    </div>
  )
}

function ThisIsTabmeApp() {
  return <div>
    <h2 className="p-tabme-is-already-open">Impl later</h2>
  </div>
}

function mountApp() {
  const root = createRoot(document.getElementById("root")!)
  root.render(<PopupApp/>)
}
mountApp()