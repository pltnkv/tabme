import React, { useRef } from "react"
import { CSSTransition } from "react-transition-group"
import { IAppState } from "../state/state"
import { CL } from "../helpers/classNameHelper"
import IconProgress from "../icons/progress.svg"

export const Notification = React.memo((props: {
  notification: IAppState["notification"];
}) => {
  const refEl = useRef<HTMLDivElement>(null)

  return (
    <div className="notification-box">
      <CSSTransition
        nodeRef={refEl}
        in={props.notification.visible}
        timeout={300}
        classNames="notification"
        unmountOnExit
      >
        <div className={CL("notification", {
          "notification__error": props.notification.isError
        })} ref={refEl}>
          {
            props.notification.isLoading && <IconProgress/>
          }
          {props.notification.message}
          {
            props.notification.button
              ? <span className="notification__button"
                      onClick={props.notification.button.onClick}>
                {props.notification.button.text}</span>
              : null
          }
        </div>
      </CSSTransition>
    </div>
  )
})
