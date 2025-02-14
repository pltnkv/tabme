import React, { useEffect } from "react"
import ReactDOM from "react-dom"

export const Modal = (props: {
  isOpen: boolean,
  onClose: () => void,
  className?: string,
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
      className="modal-wrapper"
      onClick={props.onClose}>
      <div
        className={"modal-inner " + props.className}
        // Prevent closing when clicking inside modal content
        onClick={(e) => e.stopPropagation()}>
        <div onClick={props.onClose} className="modal-close-x">⨉</div>
        {props.children}
      </div>
    </div>,
    document.body
  )
}
