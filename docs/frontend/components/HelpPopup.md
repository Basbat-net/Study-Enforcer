# HelpPopup

## Role

Help button that opens a modal with static text: modes (active tracking vs normal), main actions (start/pause, reset, logs, clear), and how data is saved. No external data; closes on overlay click.

## Main behaviour

- **useState(isOpen)** – Toggle modal visibility.
- Button sets isOpen true; overlay click sets false; content click stopPropagation to avoid closing when clicking inside.

## Structures / dependencies

- **Estilos:** HelpPopup.css.
