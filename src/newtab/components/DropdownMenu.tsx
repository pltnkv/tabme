import React, { useEffect, useRef, useState } from "react"

export function DropdownMenu(props: {
  className?: string;
  children: React.ReactChild[];
  onClose: () => void;
}) {
  const formEl = useRef<HTMLDivElement>(null);
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(-1);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (formEl.current && !formEl.current.contains(e.target as HTMLElement)) {
        props.onClose();
      }
    }

    document.addEventListener("click", onClick);
    document.addEventListener("contextmenu", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("contextmenu", onClick);
    };
  }, [props]);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); // Prevent page scrolling
        const buttons = Array.from(formEl.current?.querySelectorAll('.dropdown-menu__button') || []);
        let nextIndex = focusedButtonIndex;

        if (e.key === 'ArrowDown') {
          nextIndex = focusedButtonIndex + 1 >= buttons.length ? 0 : focusedButtonIndex + 1;
        } else if (e.key === 'ArrowUp') {
          nextIndex = focusedButtonIndex - 1 < 0 ? buttons.length - 1 : focusedButtonIndex - 1;
        }

        setFocusedButtonIndex(nextIndex);

        // Focus the next button
        (buttons[nextIndex] as HTMLElement)?.focus();
      }
    }

    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [focusedButtonIndex]);

  return (
    <div className={"dropdown-menu " + (props.className || '')} ref={formEl}>
      {React.Children.map(props.children, (child, index) =>
        React.cloneElement(child as React.ReactElement, {
          // Clone each child and modify it to be focusable
          tabIndex: 0,
          // Adding onFocus to manage focused item index
          onFocus: () => setFocusedButtonIndex(index),
        })
      )}
    </div>
  );
}

