# Site Access Control

A Firefox extension that controls which websites the browser is allowed to visit using a **whitelist** or **blacklist** of URL/site patterns. When enabled, matching requests are blocked entirely via Firefox's `webRequest` API.

## Features

- **Whitelist mode** — only listed sites can be reached; everything else is blocked.
- **Blacklist mode** — listed sites are blocked; everything else is allowed.
- **Enable/disable toggle** with a visual status indicator in the toolbar popup.
- **Site pattern matching** supporting:
  - Exact hostnames (`example.com`) and full hosts/ports (`example.com:8080`)
  - Full URLs (`https://example.com/path`)
  - Domain suffixes (`.example.com` matches `www.example.com/page`)
  - Wildcards (`*.example.com` matches any single-label subdomain)
  - HTTP(S) URL prefixes (`https://example.com*`)
- **Import / export** configuration as a base64-encoded string, so the same settings can be shared between profiles or browsers.
- Settings persist across browser restarts via `browser.storage.local`.
- `about:` pages are always allowed through (never blocked).

## Usage

1. Click the extension's toolbar icon to open the popup.
2. Check **Enabled** to turn site control on (the status dot turns green).
3. Choose a **Mode**:
   - *Blacklist (block listed)* — sites in the list are blocked.
   - *Whitelist (allow only listed)* — only sites in the list load (requires at least one entry, otherwise everything is still allowed as a safety fallback).
4. Add site patterns in the **Sites** field and click **Add** (or press Enter). Duplicate entries are ignored. Remove an entry with the **×** button.
5. Use **Export Config → Generate** then **Copy** to produce a shareable base64 string. Paste it into another instance's **Import Config** textarea and click **Import**.

## Export and import

Configuration can be transferred between browsers/profiles as a base64 string.

**Export**

1. Open the popup and click **Generate** under *Export Config*.
2. The base64 string appears in the read-only textarea.
3. Click **Copy** to copy it to the clipboard (falls back to selecting the text if clipboard access is unavailable).

The exported value is `btoa(JSON.stringify({ enabled, mode, sites }))`.

**Import**

1. Paste a previously exported base64 string into the *Import Config* textarea.
2. Click **Import**.
3. On success the popup shows `Imported: N sites (mode)` and clears the textarea. On failure it shows "Invalid config string. Please check and try again."

Importing decodes the string with `atob`, parses the JSON, and replaces the current configuration (`enabled` defaults to `true` if missing, `mode` defaults to `blacklist`, `sites` defaults to `[]`). The background script is also notified to reload via the same path when imported through the popup.

## Pattern examples

| Pattern                | Matches                                                  |
| ---------------------- | -------------------------------------------------------- |
| `example.com`          | The exact host `example.com`                             |
| `example.com:8080`     | The exact host and port `example.com:8080`               |
| `www.example.com`      | The exact host `www.example.com`                         |
| `*.example.com`        | Single-label subdomains such as `www.example.com`        |
| `.example.com`         | Any host ending in `example.com` (e.g. `www.example.com`)|
| `https://example.com`  | Any URL starting with `https://example.com`              |
| `https://example.com*` | Same as above (trailing `*` is optional)                 |
| `https://a.com/x`      | Any URL starting with `https://a.com/x`                  |

## Configuration format

Configurations are stored under the storage key `siteControlConfig` and have this shape:

```json
{
  "enabled": true,
  "mode": "blacklist",
  "sites": ["*.example.com", "ads.example.org"]
}
```

- `enabled` — boolean, whether enforcement is active.
- `mode` — `"blacklist"` or `"whitelist"`.
- `sites` — array of pattern strings.

Exported/imported values are the JSON above, encoded with `btoa()` (base64). Importing replaces the current configuration.

## Permissions

Declared in `manifest.json`:

- `webRequest`, `webRequestBlocking` — intercept and cancel requests.
- `<all_urls>` — match requests to all hosts.
- `storage` — persist configuration.

## License

MIT License

2026 Eric Nielsen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.