import React, { useEffect, useState, useRef, useContext } from "react"
import { IAppState, Action } from "../state/state"
import { trackStat } from "../helpers/stats"
import { DispatchContext } from "../state/actions"
import { ColorTheme } from "../helpers/types"
import { applyTheme } from "../state/colorTheme"
import ReactDOM from "react-dom"

interface TutorialStep {
  id: number
  title: string
  description: string
  targetSelector?: string
  popupPosition: "top" | "bottom" | "left" | "right" | "center"
  popupOffset?: { x?: number; y?: number }
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to TabMe!",
    description: "Manage tabs, save bookmarks, and add sticky notes.",
    popupPosition: "center"
  },
  {
    id: 2,
    title: "Sidebar with Open Tabs and Recently Closed",
    description: "Manage and save Tabs with drag-and-drop.",
    targetSelector: ".app-sidebar",
    popupPosition: "right",
    popupOffset: { x: 20, y: 0 }
  },
  {
    id: 3,
    title: "Organize Saved Tabs in Folders",
    description: "Simply drag and saved drop tabs to arrange them. Use colors and collapsible groups to keep everything tidy and easy to find.",
    targetSelector: ".folder",
    popupPosition: "right",
    popupOffset: { x: 0, y: -20 }
  },
  {
    id: 4,
    title: "Add Sticky Notes",
    description: "Click any note to edit, change its color, or mark tasks as complete. To add a new sticky note, just double-click any empty space.",
    targetSelector: ".widget-sticker",
    popupPosition: "left",
    popupOffset: { x: -20, y: 0 }
  },
  {
    id: 4,
    title: "Organize Across Spaces",
    description: "Use different spaces to separate your saved tabs by project, task, or topic.",
    targetSelector: ".spaces-list",
    popupPosition: "bottom",
    popupOffset: { x: 0, y: 20 }
  },
  {
    id: 6,
    title: "That's it! 🎉",
    description: "You can retake this tour anytime from the help menu.",
    targetSelector: ".help-menu-button",
    popupPosition: "bottom",
    popupOffset: { x: 0, y: 10 }
  }
]

// Simple SVG icons for theme selection
const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)

const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

const AutoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)

interface ThemeSelectorProps {
  currentTheme: ColorTheme
  onThemeChange: (theme: ColorTheme) => void
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
  const themes: { key: ColorTheme; label: string; icon: React.ReactNode }[] = [
    { key: "light", label: "Light Theme", icon: <SunIcon/> },
    { key: "dark", label: "Dark Theme", icon: <MoonIcon/> },
    // { key: undefined, label: "Auto", icon: <AutoIcon/> }
  ]

  return (
    <div className="tutorial-theme-selector">
      <div className="tutorial-theme-options">
        {themes.map((theme) => (
          <button
            key={theme.key || "auto"}
            className={`tutorial-theme-option ${currentTheme === theme.key ? "active" : ""}`}
            onClick={() => onThemeChange(theme.key)}
            title={`Switch to ${theme.label} theme`}
          >
            {theme.icon}
            <span>{theme.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function Tutorial(p: {
  appState: IAppState;
  onComplete: () => void;
}) {
  const dispatch = useContext(DispatchContext)
  const [currentStep, setCurrentStep] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(p.appState.colorTheme)

  const step = TUTORIAL_STEPS[currentStep]

  useEffect(() => {
    // Start tutorial with a slight delay for smooth appearance
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!step) {
      return
    }

    const updateSpotlight = () => {
      if (!step.targetSelector) {
        // No target selector - center the popup and no spotlight
        setSpotlightRect(null)
        calculatePopupPosition(null, step)
        return
      }

      const targetElement = document.querySelector(step.targetSelector) as HTMLElement
      if (!targetElement) {
        return
      }

      const rect = targetElement.getBoundingClientRect()
      setSpotlightRect(rect)
      calculatePopupPosition(rect, step)
    }

    // Initial positioning
    updateSpotlight()

    // Update on window resize or scroll
    window.addEventListener("resize", updateSpotlight)
    window.addEventListener("scroll", updateSpotlight, true)

    return () => {
      window.removeEventListener("resize", updateSpotlight)
      window.removeEventListener("scroll", updateSpotlight, true)
    }
  }, [step])

  const calculatePopupPosition = (targetRect: DOMRect | null, step: TutorialStep) => {
    const popup = { width: 380, height: currentStep === 0 ? 400 : 200 } // Larger for first step with theme selector
    const offset = step.popupOffset || { x: 0, y: 0 }
    let x = 0, y = 0

    if (!targetRect || step.popupPosition === "center") {
      // Center the popup on screen
      x = (window.innerWidth - popup.width) / 2
      y = (window.innerHeight - popup.height) / 2
    } else {
      switch (step.popupPosition) {
        case "top":
          x = targetRect.left + targetRect.width / 2 - popup.width / 2 + (offset.x || 0)
          y = targetRect.top - popup.height + (offset.y || 0) - 20 //hack
          break
        case "bottom":
          x = targetRect.left + targetRect.width / 2 - popup.width / 2 + (offset.x || 0)
          y = targetRect.bottom + (offset.y || 0)
          break
        case "left":
          x = targetRect.left - popup.width + (offset.x || 0)
          y = targetRect.top + targetRect.height / 2 - popup.height / 2 + (offset.y || 0)
          break
        case "right":
          x = targetRect.right + (offset.x || 0)
          y = targetRect.top + targetRect.height / 2 - popup.height / 2 + (offset.y || 0)
          break
      }

      // Keep popup within viewport bounds
      x = Math.max(20, Math.min(x, window.innerWidth - popup.width - 20))
      y = Math.max(20, Math.min(y, window.innerHeight - popup.height - 20))
    }

    setPopupPosition({ x, y })
  }

  const handleThemeChange = (theme: ColorTheme) => {
    // TODO !!!
    setSelectedTheme(theme)

    // Apply theme immediately
    applyTheme(theme)

    // Update app state
    dispatch({
      type: Action.UpdateAppState,
      newState: { colorTheme: theme }
    })

    trackStat("tutorialStep", { step: 0 })
  }

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
      trackStat("tutorialStep", { step: currentStep + 1 })
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    setIsVisible(false)
    setTimeout(() => {
      p.onComplete()
      trackStat("tutorialCompleted", {})
    }, 300)
  }

  const handleSkip = () => {
    trackStat("tutorialSkipped", { step: currentStep + 1 })
    handleComplete()
  }

  if (!step) {
    return null
  }

  return ReactDOM.createPortal(
    <div
      className={`tutorial-wrapper ${isVisible ? "tutorial-visible" : ""}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.3s ease-in-out"
      }}
    >
      {/* Overlay with spotlight cutout */}
      <div className="tutorial-overlay">
        <svg className="tutorial-mask" width="100%" height="100%">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white"/>
              {spotlightRect && (
                <rect
                  x={spotlightRect.left - 8}
                  y={spotlightRect.top - 8}
                  width={spotlightRect.width + 16}
                  height={spotlightRect.height + 16}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Tutorial popup */}
      <div
        className="tutorial-popup"
        style={{
          left: 0,
          top: 0,
          width: currentStep === 0 ? 380 : 320,
          transform: isVisible
            ? `translate(${popupPosition.x}px, ${popupPosition.y}px) scale(1)`
            : `translate(${popupPosition.x}px, ${popupPosition.y - 10}px) scale(0.95)`,
          opacity: isVisible ? 1 : 0,
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}
      >
        <div className="tutorial-popup-header">
          <h3 className="tutorial-popup-title">{step.title}</h3>
          <div className="tutorial-step-counter">
            {currentStep + 1} of {TUTORIAL_STEPS.length}
          </div>
        </div>

        <p className="tutorial-popup-description">{step.description}</p>

        {/* Special content for final step */}
        {currentStep === TUTORIAL_STEPS.length - 1 && (
                      <div className="tutorial-final-step">
              <p className="tutorial-guide-link">
                More tips in our{" "}
                <a
                  href="https://gettabme.com/guide.html"
                  target="_blank"
                  className="tutorial-link"
                >
                  guide
                </a>
                .
              </p>
            </div>
        )}

        {/* Theme selector for first step */}
        {currentStep === 0 && (
          <div className="tutorial-theme-section">
            <p className="tutorial-theme-intro">
              Choose your theme preference before we start the tour.
            </p>
            <ThemeSelector
              currentTheme={selectedTheme}
              onThemeChange={handleThemeChange}
            />
          </div>
        )}

        <div className="tutorial-popup-actions">
          {
            currentStep !== TUTORIAL_STEPS.length - 1 ?
              <button className="tutorial-btn tutorial-btn-skip"
                      onClick={handleSkip}>
                Skip
              </button>
              : <div> </div>
          }


          <div className="tutorial-navigation">
            {currentStep > 0 && (
              <button
                className="tutorial-btn tutorial-btn-secondary"
                onClick={handlePrevious}
              >
                Previous
              </button>
            )}

            <button
              className="tutorial-btn tutorial-btn-primary"
              onClick={handleNext}
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="tutorial-progress">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`tutorial-progress-dot ${index <= currentStep ? "active" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

