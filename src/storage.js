/**
 * Handles data storage operations for the Subdomain Switcher using Chrome's storage.sync API.
 *
 * Schema: [{ domain: string, aliases: [{ color, name, subdomain }] }]
 *   - domain           : the base domain, e.g. "app.netsuite.com"
 *   - alias.subdomain  : prefix ONLY, e.g. "3777749-sb1"
 *   - full hostname    : composed at runtime as alias.subdomain + "." + domain
 *
 * Renaming domain automatically affects all full hostnames — no migration needed.
 */

import { showMessage } from "./utils.js";

const STORAGE_KEY = "domainGroups";

/**
 * Loads domain groups from Chrome storage.
 * @param {HTMLElement} messageBox
 * @returns {Promise<Array>} Array of domain group objects.
 */
export async function loadDomainGroups(messageBox) {
    try {
        const result = await chrome.storage.sync.get(STORAGE_KEY);
        return result[STORAGE_KEY] || [];
    } catch (error) {
        console.error("Error loading domain groups from storage:", error);
        showMessage(messageBox, "Error loading saved data.", "error");
        return [];
    }
}

/**
 * Saves domain groups to Chrome storage.
 * @param {Array} domainGroups
 * @param {HTMLElement} messageBox
 */
export async function saveDomainGroups(domainGroups, messageBox) {
    try {
        await chrome.storage.sync.set({ [STORAGE_KEY]: domainGroups });
    } catch (error) {
        console.error("Error saving domain groups to storage:", error);
        showMessage(messageBox, "Error saving data.", "error");
    }
}

/**
 * Gets the currently active tab's URL.
 * @param {HTMLElement} messageBox
 * @returns {Promise<string|null>}
 */
export async function getCurrentTabUrl(messageBox) {
    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab && tab.url) {
            return tab.url;
        }
        return null;
    } catch (error) {
        console.error("Error getting current tab URL:", error);
        showMessage(
            messageBox,
            "Could not get current tab URL. Ensure necessary permissions.",
            "error",
        );
        return null;
    }
}