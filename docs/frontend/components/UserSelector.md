# UserSelector

## Role

First screen shown when no user is selected. Lets the user pick an existing user or create a new one; calls `onUserSelect` with the chosen username.

## Main functions

- **handleAddUser** – On form submit: trim username, check not duplicate, add to local list, call onUserSelect(trimmedUsername). Depends on users list and onUserSelect.

## Main useEffects

- **On mount** – Load users via ApiService.getUsers(), set users and loading state. Empty deps; runs once.

## Props / dependencies

- **onUserSelect** – Callback(username) when a user is chosen (select or create).
- **ApiService.getUsers** – Fetches user list from backend.

## Structures / dependencies

- **Estilos:** UserSelector.css.
