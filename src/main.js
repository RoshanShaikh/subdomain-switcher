/**
 * Main application logic for the Subdomain Switcher popup.
 * Works with new schema: domainGroups = [{ domain, aliases: [{color, name, subdomain}] }]
 */

import { loadDomainGroups, getCurrentTabUrl } from "./storage.js";
import { showMessage, cleanHostname } from "./utils.js";
import { updateCurrentUrlDisplay, renderMainViewAliases } from "./dom.js";

document.addEventListener("DOMContentLoaded", async () => {
    const aliasesContainer       = document.getElementById("aliases-container");
    const currentUrlDisplay      = document.getElementById("currentUrlDisplay");
    const currentUrlDisplayTable = document.getElementById("currentUrlDisplayTable");
    const optionsIcon            = document.getElementById("optionsIcon");
    const messageBox             = document.getElementById("messageBox");

    let domainGroups = [];

    const renderWrapper = (currentTabFullHostname) => {
        renderMainViewAliases(
            aliasesContainer,
            messageBox,
            domainGroups,
            currentTabFullHostname,
        );
    };

    domainGroups = await loadDomainGroups(messageBox);
    const currentTabUrl = await getCurrentTabUrl(messageBox);
    const currentHostname = currentTabUrl ? new URL(currentTabUrl).hostname : null;
    const normalizedCurrentHostname = currentHostname ? cleanHostname(currentHostname) : null;

    updateCurrentUrlDisplay(currentUrlDisplay, currentUrlDisplayTable, messageBox, currentTabUrl, domainGroups);
    renderWrapper(normalizedCurrentHostname);

    chrome.storage.sync.onChanged.addListener(async (changes) => {
        if (changes.domainGroups) {
            domainGroups = changes.domainGroups.newValue || [];
            const updatedUrl = await getCurrentTabUrl(messageBox);
            const updatedHostname = updatedUrl ? cleanHostname(new URL(updatedUrl).hostname) : null;
            renderWrapper(updatedHostname);
            updateCurrentUrlDisplay(currentUrlDisplay, currentUrlDisplayTable, messageBox, updatedUrl, domainGroups);
        }
    });

    optionsIcon.addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });
});