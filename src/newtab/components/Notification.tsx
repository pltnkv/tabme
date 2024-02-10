import React, { useRef } from "react"
import { ActionDispatcher, IAppState } from "../state"
import { CSSTransition } from "react-transition-group"

export function Notification(props: {
  appState: IAppState;
}) {
  const refEl = useRef<HTMLDivElement>(null)

  return (
    <div className="notification-box">
      <CSSTransition
        nodeRef={refEl}
        in={props.appState.notification.visible}
        timeout={300}
        classNames="notification"
        unmountOnExit
      >
        <div className="notification" ref={refEl}>
          {props.appState.notification.message}
          {
            props.appState.notification.button
              ? <span className="notification__button"
                      onClick={props.appState.notification.button.onClick}>
                {props.appState.notification.button.text}</span>
              : null
          }
        </div>
      </CSSTransition>
    </div>
  )
}
