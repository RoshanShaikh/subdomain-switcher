# Privacy Policy — Subdomain Switcher

**Last updated:** April 2026

---

## Overview

Subdomain Switcher is a Chrome extension that helps users navigate between subdomains of the same website. This privacy policy explains what data the extension accesses, how it is used, and what it does not do.

---

## Data We Collect

**We do not collect any data.**

Subdomain Switcher does not collect, record, transmit, or share any information about you or your browsing activity with any person, company, or server — including the developer.

---

## Data Stored Locally

The extension stores the domain and alias configuration that you create (domain names, alias names, subdomain prefixes, and button colors) using Chrome's built-in `chrome.storage.sync` API. This data:

- Is stored entirely within your own Chrome profile
- Is synced across your own devices via your Google account if Chrome sync is enabled, using Google's infrastructure — the extension developer has no access to it
- Is never transmitted to any external server
- Can be deleted at any time from the extension's configuration page using **Reset All**, or by removing the extension

No browsing history, page content, credentials, or personal information is ever read or stored.

---

## Permissions Used

The extension requests the following Chrome permissions, each used solely for the extension's core functionality:

| Permission | Why it is needed |
|---|---|
| `activeTab` | To read the URL of the current tab so the extension can identify which configured domain applies and show the relevant alias buttons |
| `storage` | To save and retrieve the user's domain and alias configuration using `chrome.storage.sync` |

No other permissions are requested or used.

---

## Remote Code

The extension's configuration page loads a CSS stylesheet (Tailwind CSS) from the jsDelivr CDN (`cdn.jsdelivr.net`) for styling purposes only. No JavaScript is loaded from any external source. All extension logic runs entirely from code bundled within the extension itself.

---

## Third-Party Services

Subdomain Switcher does not integrate with, report to, or communicate with any third-party analytics, advertising, or data services.

---

## Changes to This Policy

If this policy changes in a future release, the updated version will be published in the extension's GitHub repository and the **Last updated** date above will be revised. Significant changes will be noted in the release notes.

---

## Contact

If you have any questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/RoshanShaikh/subdomain-switcher).