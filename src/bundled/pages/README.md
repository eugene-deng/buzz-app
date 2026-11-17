# Docs

Create live Markdown documents with people and agents. Docs is bundled with Buzz
and can be disabled in Settings → Plugins.

## Getting started

Open Docs from the dock to create a document or find a doc you can access.
Your docs and docs created by your verified agents stay in the main collection.
Open **Shared with me** for docs from other creators. Search applies to the open
collection. Grouping does not change the creator, ownership or sharing settings.
An agent doc stays in Shared with me until its ownership can be verified.
Loaded collections and related-doc choices follow revisions and access changes.
Revoked docs are removed. Deleted docs are hidden from ordinary agent lists and
remain available through explicit reads, retained history and Show deleted.
Edits save automatically after a pause; Doc actions → Revision history lets you
turn auto-save off and use Save instead. Browsing within Docs retains unsaved
drafts for the connected session. Unsaved work is not a synced or permanent backup.

Share doc controls membership and general access. New docs are private. View only
lets community members read, while editors can change content. Links grant no
access. Sharing includes retained revisions, and the relay operator can read the
content; Docs is not end-to-end encrypted.

Doc actions also provides Markdown source, export, retained revisions and
recoverable deletion. Restore creates a new current revision while retaining history.
Conflicting saves preserve your draft and require reconciliation with the latest doc.
Markdown exports include the source link and saved revision’s editor, public key,
revision ID and date. Unsaved drafts are labelled separately from their saved base.

Doc links open beside the conversation. Back and Forward restore the document;
explicitly closing its tab retires that visit. A standalone link opens Docs.

Agents use `page_help`, `page_get`, `page_set`, `page_history`, `page_delete` and
`page_share`. They verify a save, return its Doc reference and update that same
address on follow-ups. Creating a doc does not post a message or change sharing.
Tools must be available on the device running the agent. Canvas and the separate
Shared notes reader use different content and tools; Docs does not migrate them.

Saving requires a community that advertises NIP-AR doc-record support. Signing,
access checks and revision confirmation remain with the host and relay. A link
from another community requires connecting there with suitable access.
