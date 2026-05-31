---
name: finding-globals-anchor-hover
description: CSS specificity trap in frontend globals.css base `a` rule that overrides utility text colors on hover for Link/a elements
metadata:
  type: project
---

`frontend/src/app/globals.css` (~line 41-43) has a Tailwind base rule `a { @apply text-primary transition-colors hover:text-primary-hover; }`. The compiled `a:hover` selector (specificity 0,1,1) beats utility classes like `text-white` (0,1,0).

**Why:** Any `<a>` or Next `<Link>` (renders `<a>`) with an explicit text color utility but no `hover:text-*` will have its text color flip to `primary-hover` on hover. Worst case: `bg-primary text-white hover:bg-primary-hover` (no hover text) → on hover text = bg = invisible.

**How to apply:** When reviewing/adding anchor styling in this frontend, ensure any `text-white`/explicit-color anchor on a colored hover bg also sets `hover:text-white` (or equivalent). Verify by grepping `<(Link|a) ... text-white` without a matching `hover:text`. Two structural fixes exist: per-element `hover:text-*`, or scoping the globals `a` rule to content-link contexts only (e.g. a `.prose`/`.content-link` wrapper) so utility-styled buttons-as-links are unaffected. See [[feedback-ui-design]] for broader UI standards.
