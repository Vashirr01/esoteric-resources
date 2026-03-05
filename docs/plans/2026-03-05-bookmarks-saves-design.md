# Bookmarks/Saves Feature Design

## Summary
Users can save any public resource to one of their own boards. Saving creates an independent copy of the resource owned by the saving user.

## UX Flow
1. Bookmark icon (lucide `Bookmark`) on top-right of every resource card (feed + board view)
2. Click icon → dropdown popover listing user's boards
3. Pick a board → resource is copied to that board, dropdown closes
4. "New board" option at bottom → inline text input + create, then auto-saves to it
5. Not logged in → redirect to `/login`

## API
- `POST /boards/:id/save` (auth required)
  - Body: `{ resourceId: string }`
  - Copies the resource: creates a new Resource row (same url/title/tags, new userId) + BoardResource link
  - Returns the new resource
  - If the board already has a resource with the same URL, return 409

## Data Model
No schema changes. A save creates:
- New `Resource` row with the saving user's ID
- New `BoardResource` row linking it to the target board

## UI Details
- Bookmark icon positioned absolute top-right of `.resource-card`
- Dropdown: list of user's boards, fetched on click (or cached)
- Boards that already contain a resource with the same URL show a checkmark (disabled)
- "New board" row at bottom: text input + button, creates board via existing `POST /boards`, then saves
- Dropdown closes on outside click or after successful save

## Not in scope
- Save counts
- "Saved from" attribution
- Undo toast
- Bulk save
