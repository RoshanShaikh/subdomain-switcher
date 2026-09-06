/**
 * Background service worker for the Subdomain Switcher extension.
 *
 * Its only job is to register a URL that Chrome opens automatically right
 * after the user uninstalls the extension, so we can collect feedback on
 * why they left (bug, missing feature, etc).
 *
 * chrome.runtime.setUninstallURL() needs no extra manifest permissions, but
 * it must be (re)registered whenever the service worker starts, since MV3
 * service workers are short-lived and don't retain state between runs.
 */

const FEEDBACK_URL = "https://forms.gle/hpnJCDxk6obQkLVi8";

chrome.runtime.setUninstallURL(FEEDBACK_URL);