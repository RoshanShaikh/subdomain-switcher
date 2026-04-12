# Subdomain Switcher

A Chrome extension for quickly switching between subdomains of the current page — preserving the full URL path, query parameters, and hash. Built for developers, QA engineers, and anyone who regularly works across multiple environments of the same application.

---

## Features

- **One-click subdomain switching** — open any configured alias in a new tab, keeping the current path and query string intact
- **Domain-grouped aliases** — organize aliases under their parent domain for a clean, structured overview
- **Rename domains** — updating a domain name automatically applies to all its aliases everywhere
- **Custom alias colors** — assign a color to each alias for instant visual identification in the popup
- **Color-coded current URL** — the popup header reflects the active alias color when the current tab matches a configured alias
- **Export / Import** — back up and restore your full configuration as a JSON file
- **Reset** — clear all data with a confirmation prompt

---

## Installation

### From a GitHub Release (recommended)

1. Go to the [Releases](https://github.com/RoshanShaikh/subdomain-switcher/releases) page and download the latest `.crx` file.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Drag and drop the downloaded `.crx` file onto the extensions page.
5. Click **Add extension** in the confirmation dialog.

> **Note:** Chrome may warn that the extension is not from the Chrome Web Store. This is expected for a sideloaded `.crx`. The extension will be submitted to the Chrome Web Store in a future release.

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/RoshanShaikh/subdomain-switcher
   cd subdomain-switcher
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `subdomain-switcher/` directory.
5. Optionally pin the extension via the puzzle-piece icon in the toolbar.

---

## Usage

### Switching subdomains

1. Navigate to any page whose domain matches a configured domain group.
2. Click the **Subdomain Switcher** icon in the toolbar.
3. The popup shows the current hostname (or its alias name if matched) and buttons for all other aliases in the same domain group.
4. Click any alias button to open that subdomain in a new tab, preserving the current path and query string.

### Configuring domains and aliases

Click the **gear icon** in the popup to open the configuration page.

#### Adding a domain

Click the **+** button in the page header. Enter the base domain (e.g. `app.example.com`) and click **Create Domain**.

#### Adding an alias

Click the green **+** icon on any domain row (visible on hover). Fill in the alias editor:

- **Alias Name** — a friendly label shown on the switch button (e.g. `Production`, `UAT`)
- **Subdomain** — the subdomain prefix; the domain is shown as a fixed suffix (e.g. enter `dev`, the full hostname `dev.app.example.com` is used automatically)
- **Button Color** — choose from the color grid or enter a hex code

Click **Add Alias** to save.

#### Editing a domain

Click the blue **pencil** icon on a domain row (visible on hover) to rename it. All aliases under that domain reflect the new hostname automatically.

#### Editing an alias

Click the **pencil** icon on any alias row to update its name, subdomain, or color.

#### Duplicating an alias

Click the **duplicate** icon on an alias row to open the editor pre-filled with that alias's values, ready to save as a new alias.

#### Deleting

Click the **trash** icon on a domain row to delete the domain and all its aliases (with confirmation). Click the **trash** icon on an alias row to delete just that alias (with confirmation).

#### Export / Import / Reset

Use the **⋮** menu in the page header to:
- **Export Aliases** — download your full configuration as `subdomain_switcher_config.json`
- **Import Aliases** — restore from a previously exported JSON file (overwrites current data)
- **Reset All** — delete all domains and aliases

A sample import file is included in this repository: [`sample_config.json`](sample_config.json)

---

## Technologies

- HTML, CSS, JavaScript (ES Modules)
- [Tailwind CSS](https://tailwindcss.com/) (utility classes via CDN)
- Chrome Extension APIs: `activeTab`, `storage`, `scripting`
- Manifest V3

---

## Contributing

Pull requests are welcome. For significant changes, please open an issue first to discuss what you'd like to change.

---

## License

[MIT](LICENSE)