/**
 * Main application logic for the Subdomain Switcher popup.
 * Handles displaying aliases and switching subdomains.
 * Configuration is managed in the options page.
 */

import { loadAliases, getCurrentTabUrl } from "./storage.js";
import { showMessage, cleanHostname } from "./utils.js";
import { updateCurrentUrlDisplay, renderMainViewAliases } from "./dom.js";

document.addEventListener("DOMContentLoaded", async () => {
    // --- DOM Element References ---
    const aliasesContainer = document.getElementById("aliases-container");
    const currentUrlDisplay = document.getElementById("currentUrlDisplay");
    const currentUrlDisplayTable = document.getElementById(
        "currentUrlDisplayTable",
    );
    const optionsIcon = document.getElementById("optionsIcon");
    const messageBox = document.getElementById("messageBox");

    // --- Application State ---
    let domainAliases = [];

    // --- Helper Functions ---
    const renderMainViewAliasesWrapper = (currentTabFullHostname) => {
        renderMainViewAliases(
            aliasesContainer,
            messageBox,
            domainAliases,
            currentTabFullHostname,
        );
    };

    // --- Initialization ---
    domainAliases = await loadAliases(messageBox);
    const currentTabUrl = await getCurrentTabUrl(messageBox);
    const currentHostname = currentTabUrl
        ? new URL(currentTabUrl).hostname
        : null;
    const normalizedCurrentHostname = currentHostname
        ? cleanHostname(currentHostname)
        : null;

    updateCurrentUrlDisplay(
        currentUrlDisplay,
        currentUrlDisplayTable,
        messageBox,
        currentTabUrl,
        domainAliases,
    );
    renderMainViewAliasesWrapper(normalizedCurrentHostname);

    // Listen for changes in storage (synced from options page)
    chrome.storage.sync.onChanged.addListener(async (changes) => {
        if (changes.domainAliases) {
            domainAliases = changes.domainAliases.newValue || [];
            const updatedCurrentUrl = await getCurrentTabUrl(messageBox);
            const updatedCurrentHostname = updatedCurrentUrl
                ? new URL(updatedCurrentUrl).hostname
                : null;
            const normalizedUpdatedCurrentHostname = updatedCurrentHostname
                ? cleanHostname(updatedCurrentHostname)
                : null;

            renderMainViewAliasesWrapper(normalizedUpdatedCurrentHostname);
            updateCurrentUrlDisplay(
                currentUrlDisplay,
                currentUrlDisplayTable,
                messageBox,
                updatedCurrentUrl,
                domainAliases,
            );
        }
    });

    // --- Event Listeners ---

    // Open options page when gear icon is clicked
    optionsIcon.addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });
});