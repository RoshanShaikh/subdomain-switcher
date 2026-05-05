/**
 * Handles data storage operations for the Subdomain Switcher using Chrome's storage.sync API.
 *
 * Schema: [{ domain: string, allowCrossDomain?: boolean, aliases: [{ color, name, subdomain, targetHost?: string }] }]
 *   - domain           : the base domain, e.g. "app.netsuite.com"
 *   - alias.subdomain  : prefix ONLY, e.g. "3777749-sb1"
 *   - full hostname    : composed at runtime as alias.subdomain + "." + domain
 *
 * Renaming domain automatically affects all full hostnames — no migration needed.
 */

import { showMessage } from "./utils.js";

const STORAGE_KEY = "domainGroups";

function normalizeHostname(value) {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!raw) return null;
    try {
        const url = new URL(`http://${raw}`);
        return url.hostname.toLowerCase();
    } catch {
        return null;
    }
}

function normalizeAlias(alias) {
    if (!alias || typeof alias !== "object") return null;
    const name = typeof alias.name === "string" ? alias.name : "";
    const subdomain = typeof alias.subdomain === "string" ? alias.subdomain : "";
    const color = typeof alias.color === "string" ? alias.color : "";
    const targetHost = normalizeHostname(alias.targetHost);
    return {
        name,
        subdomain,
        color,
        ...(targetHost ? { targetHost } : {}),
    };
}

function normalizeDomainGroup(group) {
    if (!group || typeof group !== "object") return null;
    const domain = normalizeHostname(group.domain);
    if (!domain) return null;
    const aliases = Array.isArray(group.aliases)
        ? group.aliases.map(normalizeAlias).filter(Boolean)
        : [];
    return {
        domain,
        allowCrossDomain: Boolean(group.allowCrossDomain),
        aliases,
    };
}

/**
 * Loads domain groups from Chrome storage.
 * @param {HTMLElement} messageBox
 * @returns {Promise<Array>} Array of domain group objects.
 */
export async function loadDomainGroups(messageBox) {
    try {
        const result = await chrome.storage.sync.get(STORAGE_KEY);
        const groups = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
        return groups.map(normalizeDomainGroup).filter(Boolean);
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
        const safeGroups = Array.isArray(domainGroups)
            ? domainGroups.map(normalizeDomainGroup).filter(Boolean)
            : [];
        await chrome.storage.sync.set({ [STORAGE_KEY]: safeGroups });
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