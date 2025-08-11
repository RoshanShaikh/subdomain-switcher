/**
 * Handles data storage operations for the Subdomain Switcher using Chrome's storage.sync API.
 */

import { showMessage } from "./utils.js"; // Assuming messageBox is passed to showMessage

/**
 * Loads aliases from Chrome storage.
 * @param {HTMLElement} messageBox - The message box DOM element to display messages.
 * @returns {Promise<Array>} Array of aliases.
 */
export async function loadAliases(messageBox) {
    try {
        const result = await chrome.storage.sync.get("domainAliases");
        return result.domainAliases || []; // Return empty array if no aliases
    } catch (error) {
        console.error("Error loading aliases from storage:", error);
        showMessage(messageBox, "Error loading saved aliases.", "error");
        return [];
    }
}

/**
 * Saves aliases to Chrome storage.
 * @param {Array} aliases - The array of aliases to save.
 * @param {HTMLElement} messageBox - The message box DOM element to display messages.
 */
export async function saveAliases(aliases, messageBox) {
    try {
        await chrome.storage.sync.set({ domainAliases: aliases });
        showMessage(messageBox, "Aliases saved successfully!", "success");
    } catch (error) {
        console.error("Error saving aliases to storage:", error);
        showMessage(messageBox, "Error saving aliases.", "error");
    }
}

/**
 * Gets the currently active tab's URL.
 * @param {HTMLElement} messageBox - The message box DOM element to display messages.
 * @returns {Promise<string|null>} The URL of the active tab, or null if an error occurs.
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
