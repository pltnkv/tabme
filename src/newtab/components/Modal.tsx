import React, { useEffect } from "react"
import ReactDOM from "react-dom"

export const Modal = (props: {
  isOpen: boolean,
  onClose: () => void,
  children: React.ReactChild | React.ReactChild[];
}) => {
  // Close modal when clicking outside of it or pressing the ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [props.onClose])

  if (!props.isOpen) {
    return null
  }

  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={props.onClose}
    >
      <div
        style={{
          position: "relative",
          background: "white",
          padding: "40px",
          borderRadius: "8px",
          maxWidth: "640px",
          width: "100%",
          fontSize: "16px"
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        <div onClick={props.onClose}
             style={{
               position: "absolute",
               top: "10px",
               right: "10px",
               fontSize: "26px",
               lineHeight: "16px",
               padding: "8px",
               cursor: "pointer",
               height: "24px",
               verticalAlign: "top"
             }}>⨉
        </div>
        {props.children}
      </div>
    </div>,
    document.body
  )
}
