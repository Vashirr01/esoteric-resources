# Link Previews Design

## Summary
Auto-fetch OG metadata (title, description, image) when adding a URL. Display description and image on resource cards for a richer feed.

## API
- `GET /meta?url=...` — fetches the page, parses `<title>`, `og:title`, `og:description`, `og:image`. Returns `{ title, description, image }`. No auth required. 5s timeout.

## Data Model
Add to Resource model:
- `description` — optional String
- `imageUrl` — optional String

## Add Resource Flow
1. User pastes URL → frontend debounces 500ms → calls `GET /meta?url=...`
2. Title, description auto-fill (editable). Image preview shown if available.
3. User can override any field before submitting.
4. On submit, description and imageUrl sent with existing fields.

## Resource Cards
- If imageUrl exists, show as thumbnail on card
- Show description as 2-line truncated snippet below domain

## Save (copy) flow
Copy description and imageUrl along with url/title/tags.

## Edge cases
- 5s fetch timeout — fields stay empty, user types manually
- No OG tags — fall back to `<title>`, description/image stay null
- Invalid URL — return 400

## Not in scope
- Refetching metadata for existing resources
- Caching metadata server-side
