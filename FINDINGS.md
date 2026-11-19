# Security and robustness audit

The repository contains a deployable Cloudflare Worker, deployment instructions, and a screenshot. Locations refer to the working tree.

| Severity | Location | One-line risk | Fix applied |
| --- | --- | --- | --- |
| high | `worker.js:423` | Provider HTML and other active file formats could execute on the Worker's origin. | Serve files as attachments with a restrictive CSP. Render only the Google download confirmation flow inline, with scripts disabled and forms limited to validated download endpoints. |
| high | `worker.js:374` | Forwarding browser request headers, methods, and bodies could expose credentials or submit unintended actions to a provider. | Accept GET and HEAD and forward only range and conditional download headers plus the fixed Drive referrer. |
| high | `worker.js:18` | Upstream cookies and browser directives could set state, clear storage, or navigate from the Worker origin. | Allowlist download metadata and construct redirect and confirmation headers locally. |
| medium | `worker.js:33` | Hostname-only validation allowed plaintext requests, alternate ports, and broad subdomain matching. | Require HTTPS on the default port without URL credentials. Match configured hosts exactly and allow single-label Dropbox download aliases. |
| medium | `worker.js:401` | Malformed, unsupported, or self-referential redirects could fail late or cause repeated requests. | Resolve and validate every upstream redirect before emitting a Worker URL. Reject unsupported destinations and immediate loops. |
| medium | `worker.js:7` | Proxying provider sign-in pages could lead users to enter credentials under the Worker origin. | Remove the sign-in host from the default allowlist and return a controlled error when Drive redirects to sign-in. |
| medium | `worker.js:47` | The mutable Tailwind CDN script ran with access to file share links entered on the homepage. | Replace external scripts and styles with inline CSS and a nonce-authorized homepage script. |
| medium | `worker.js:22` | Shared caches and browser referrers could retain or disclose file share URLs or responses. | Disable response storage and upstream Worker caching, and send `Referrer-Policy: no-referrer`. |
| medium | `worker.js:300` | Buffering upstream HTML could exceed Worker memory, and stale length or cache validators could describe the wrong response body. | Stream the confirmation through `HTMLRewriter` with fresh headers and stream files directly. |
| medium | `worker.js:385` | Stalled upstream headers could hold the request open, and raw exception messages could expose sensitive request details. | Bound the upstream header wait to 30 seconds and return a generic error while allowing downloads to stream after headers arrive. |
| medium | `worker.js:451` | Anyone using a public deployment can consume its request quota with repeated allowed downloads. | Report-only. Rate limiting or access controls require a deployment policy and affect publicly shared links. |
| medium | `README.md:68` | Proxy URLs contain the original share URL, which may grant file access and persist in browser history or platform request logs. | Report-only. Removing the share URL from the path requires changing the stateless link format and introducing server-side storage or equivalent deployment support. Documented how to handle proxy links. |
| low | `worker.js:474` | Decoding entire raw proxy paths could corrupt reserved characters in provider URLs and break valid links. | Decode fully encoded targets once and preserve escapes in legacy raw routes. |
| low | `worker.js:248` | Invalid inputs could generate unusable links, and denied storage or clipboard access could interrupt the homepage. | Apply the same target validation in the browser, clear stale results, and handle unavailable browser APIs. |
| low | `.gitignore:1` | Local Worker secrets, caches, and development artifacts could be committed by accident. | Ignore common local credential files and generated artifacts while allowing example configs. |
| low | `README.md:39` | The deployment guide pointed readers to a missing entry point. | Name `worker.js` and update the documented download and sign-in behavior. |
| low | `assets/1.1:1` | The tracked, undocumented marker can be mistaken for a release artifact. | Report-only. Its release purpose could not be verified from repository references. |

## Verification

The tracked-tree credential scan found no suspected committed credentials. The screenshot is a referenced documentation asset and shows the empty input state. The repository has no package manifests, lockfiles, or CI workflows. The mutable browser dependency is covered above.

`node --check worker.js`, `git diff --check`, and local mocked checks passed. The checks covered homepage link generation, request validation, redirect handling, Dropbox download aliases, range and conditional forwarding, attachment headers, the Google confirmation handlers, and upstream failures. Cloudflare's implementation of `HTMLRewriter`, browser rendering, and live provider downloads were not exercised.
