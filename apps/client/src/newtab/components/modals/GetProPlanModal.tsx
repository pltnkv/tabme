import React, { useContext, useEffect } from "react"
import { Modal } from "./Modal"
import { trackStat } from "../../helpers/stats"
import { DispatchContext } from "../../state/actions"
import IconBookmarks from "../../icons/bookmarks.svg"
import IconGrid from "../../icons/grid.svg"
import IconCollapse from "../../icons/collapse.svg"
import IconShare from "../../icons/share.svg"
import IconSync from "../../icons/sync.svg"
import IconHelp from "../../icons/help.svg"
import IconSticky from "../../icons/sticky.svg"
import IconCloudDone from "../../icons/cloud-done.svg"
import { Action } from "../../state/state"

const features = [
  { name: "Bookmarks count", free: "∞", upgrade: "∞", icon: IconBookmarks },
  { name: "Spaces count", free: "1", upgrade: "∞", icon: IconGrid, id: "Spaces" },
  { name: "Sticky Notes", free: true, upgrade: true, icon: IconSticky },
  { name: "Collapsable folders and groups", free: false, upgrade: true, icon: IconCollapse, id: "Collapsing" },
  { name: "Cross-device sync [planned]", free: false, upgrade: true, icon: IconSync },
  { name: "Spaces sharing [planned]", free: false, upgrade: true, icon: IconShare },
  { name: "Daily backups [planned]", free: false, upgrade: true, icon: IconCloudDone }
]

export type GetProPlanReason = "Nope" | "Spaces" | "Collapsing"

export const GetProPlanModal = (p: { onClose: () => void, reason: GetProPlanReason }) => {
  const dispatch = useContext(DispatchContext)

  const [email, setEmail] = React.useState<string>("")
  const [screen, setScreen] = React.useState("first")
  const [emailError, setEmailError] = React.useState<boolean>(false)

  useEffect(() => {
    trackStat("betaModalShown", {})
  }, [])

  const joinBeta = () => {
    if (!email.includes("@")) {
      setEmailError(true)
      return
    }
    setEmailError(false)

    setScreen("second")
    trackStat("betaModalJoined", { email })
    localStorage.setItem("betaMode", "true")
    localStorage.setItem("userEmail", email)
    dispatch({
      type: Action.UpdateAppState,
      newState: { betaMode: true }
    })
  }

  const onClose = () => {
    if (screen === "first") {
      trackStat("betaModalClosed", {})
    }
    p.onClose()
  }

  let title = <>Unlock Pro features</>
  if (p.reason === "Spaces") {
    title = <><span className="highlighted">Spaces</span> are available only in Pro plan</>
  } else if (p.reason === "Collapsing") {
    title = <><span className="highlighted">Collapsing</span> of folders and groups <br/>is available only in the Pro plan</>
  }

  return (
    <Modal onClose={onClose} className="get-pro-plan-modal">
      <>
        {
          screen === "first" && <div className="container">
            <h2 className="title">{title}</h2>
            <p style={{ textAlign: "center" }}>
              Tabme is free, and all existing features will <b>stay free forever</b>.<br/>
              But we’re building a Pro version with powerful upgrades.
              <br/>It will cost $5/month.
            </p>
            <p style={{ textAlign: "center" }}>
              While in development, the Pro plan is <b>free for testing</b>.
            </p>
            <table className="feature-table">
              <thead>
              <tr>
                <th></th>
                <th>Free</th>
                <th className="upgrade">Pro <span className="beta-label">beta</span></th>
              </tr>
              </thead>
              <tbody>
              {features.map((feature, idx) => (
                <tr key={idx} className={feature.id === p.reason ? "highlighted" : undefined}>
                  <td className="feature-name">
                    <div style={{ display: "flex", alignItems: "center", padding: "12px" }}>
                      {React.createElement(feature.icon)}
                      <span style={{ display: "inline-block" }}>{feature.name}</span>
                    </div>
                  </td>
                  <td className="status" style={{ fontSize: feature.free === "∞" ? "24px" : undefined }}>
                    {feature.free === true ? "✔" : feature.free || ""}
                  </td>
                  <td className="status upgrade" style={{ fontSize: feature.upgrade === "∞" ? "24px" : undefined }}>
                    {feature.upgrade === true ? "✔" : feature.upgrade || ""}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "16px", marginTop: "32px" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <input
                  className={`old-input normal-input ${emailError ? "input-error" : ""}`}
                  type="email"
                  style={{
                    width: "182px",
                    marginRight: "16px",
                    paddingLeft: "14px",
                    borderColor: emailError ? "red" : undefined
                  }}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError(false)
                  }}
                  title="Enter your email"
                  placeholder="Enter your email"
                />
                <button
                  className="btn__setting primary"
                  onClick={joinBeta}
                >
                  Join Pro Beta for free
                </button>
              </div>
              {emailError && <div style={{ color: "red", marginTop: "4px", textAlign: "center" }}>Please enter a valid email address</div>}
            </div>
            <div className="trial">
              By entering your email, you agree to <a href="https://gettabme.com/policy.html" target="_blank">Privacy Policy</a>.<br/>
              You can switch back to Free anytime.
            </div>
          </div>
        }
        {
          screen === "second" && <div className="container">
            <h2>🎉 Welcome to Tabme Pro Beta!</h2>
            <p>
              You now have access to <b>Spaces</b> and <b>Collapsing</b> features.<br/><br/>

              Quick tips for using Spaces:<br/>
              1️⃣ Drag and drop spaces to reorder<br/>
              2️⃣ Double-click space to rename<br/>
              3️⃣ Right-click for more options like Delete<br/><br/>

              Have thoughts? Use <IconHelp style={{ display: "inline-block", verticalAlign: "bottom" }}/> “Share Feedback” — we’d love to hear from you!<br/>
            </p>
            <button className="btn__setting primary" onClick={onClose}>Got it!</button>
          </div>
        }
      </>
    </Modal>
  )
}
