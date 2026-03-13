# Privacy Policy

Last updated: 2026-03-13

This GPT sends note content to a private API hosted on Vercel and controlled by the owner of this GPT.

What is sent:

- note title
- target folder inside the Obsidian vault
- optional tags and source
- markdown content generated for the note

What the API does:

- validates the request
- exchanges a Google OAuth refresh token for a temporary access token
- creates or updates a Markdown file inside the configured Google Drive folder used by the Obsidian vault
- does not share note content with third parties beyond the infrastructure required to deliver the request

Retention:

- note files are stored only in the owner's Obsidian vault on Google Drive and any sync targets chosen by the owner

Contact:

- replace this line with your own contact email or website
