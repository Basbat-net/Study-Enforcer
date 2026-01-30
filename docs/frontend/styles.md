# Styles

## Role

Styles are split by screen/component. Global base lives in `global/index.css`; App and each major component have their own CSS file under `Frontend/styles/`.

## File layout

- **App.css** – App container, timer area, user info, controls, logs container, log entries.
- **components/ActivityCharts.css** – Chart area, date picker, activity chart.
- **components/HelpPopup.css** – Help button, popup overlay and content.
- **components/ModeSelector.css** – Mode toggle and label.
- **components/ScreenSaver.css** – Screen saver overlay, bouncing element, time/user, instructions.
- **components/UserSelector.css** – User selector layout, create-user form.
- **global/index.css** – Global resets and variables (e.g. --bg-secondary, --text-primary) used across components.

## Mapping (component → CSS)

| Component       | CSS file                                      |
| --------------- | --------------------------------------------- |
| App             | App.css, ActivityCharts.css (logs/charts)     |
| UserSelector    | UserSelector.css                              |
| ActivityCharts  | ActivityCharts.css                            |
| ModeSelector    | ModeSelector.css                              |
| ScreenSaver     | ScreenSaver.css                               |
| HelpPopup       | HelpPopup.css                                 |
