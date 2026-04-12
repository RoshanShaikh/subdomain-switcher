/**
 * DOM manipulation and rendering for the Subdomain Switcher.
 *
 * Storage schema:
 *   domainGroups = [{ domain: string, aliases: [{ color, name, subdomain }] }]
 *
 * alias.subdomain  = prefix ONLY  (e.g. "3777749-sb1")
 * group.domain     = base domain  (e.g. "app.netsuite.com")
 * full hostname    = alias.subdomain + "." + group.domain  (composed at runtime, never stored)
 *
 * Renaming group.domain automatically affects all full hostnames — no alias data migration needed.
 */

import {
    cleanHostname,
    adjustColorBrightness,
    getContrastTextColor,
    clearInputErrors,
    showMessage,
    isSameOrSubdomain,
} from "./utils.js";
import { getCurrentTabUrl } from "./storage.js";

const defaultButtonColor = "#3b82f6";

const defaultColors = [
    "#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#DDDDDD", "#EEEEEE", "#FFFFFF",
    "#E53935", "#F44336", "#EF5350", "#FFCDD2", "#FFC107", "#FFEB3B", "#FFECB3", "#FFF9C4",
    "#FB8C00", "#FF9800", "#FFA726", "#FFCC80", "#FFB300", "#FFCA28", "#FFE082", "#FFF59D",
    "#43A047", "#4CAF50", "#66BB6A", "#C8E6C9", "#8BC34A", "#9CCC65", "#AED581", "#DCEDC8",
    "#1976D2", "#2196F3", "#42A5F5", "#BBDEFB", "#3F51B5", "#3F51B5", "#7986CB", "#C5CAE9",
    "#9C27B0", "#AB47BC", "#CE93D8", "#E1BEE7", "#E91E63", "#EC407A", "#F06292", "#F8BBD0",
];

/** Compose the full hostname from a prefix and a domain. */
function fullHostname(prefix, domain) {
    return `${prefix}.${domain}`;
}

// ---------------------------------------------------------------------------
// Popup: current URL display
// ---------------------------------------------------------------------------

export function updateCurrentUrlDisplay(
    currentUrlDisplay,
    currentUrlDisplayTable,
    messageBox,
    urlString,
    domainGroups,
) {
    currentUrlDisplay.textContent = "Loading...";
    currentUrlDisplay.style.color = "#555";
    currentUrlDisplayTable.style.backgroundColor = "#f8fafc";
    currentUrlDisplayTable.style.borderColor = "#e2e8f0";
    currentUrlDisplayTable.classList.remove("themed-table");

    if (!urlString) {
        currentUrlDisplay.textContent = "Unable to retrieve current URL.";
        currentUrlDisplay.style.color = "#ef4444";
        currentUrlDisplayTable.style.borderColor = "#ef4444";
        currentUrlDisplayTable.style.backgroundColor = "#fef2f2";
        return;
    }
    try {
        const url = new URL(urlString);
        const currentFullHostname = cleanHostname(url.hostname);
        let displayedText = currentFullHostname;
        let themeColor = null;

        outer: for (const group of domainGroups) {
            for (const alias of group.aliases || []) {
                // Compose full hostname from stored prefix + group domain
                if (cleanHostname(fullHostname(alias.subdomain, group.domain)) === currentFullHostname) {
                    displayedText = alias.name;
                    themeColor = alias.color || defaultButtonColor;
                    break outer;
                }
            }
        }

        currentUrlDisplay.textContent = displayedText;

        if (themeColor) {
            const textColor = getContrastTextColor(themeColor);
            currentUrlDisplay.style.color = textColor;
            currentUrlDisplayTable.style.backgroundColor = themeColor;
            currentUrlDisplayTable.style.borderColor = adjustColorBrightness(themeColor, -0.2);
            currentUrlDisplayTable.classList.add("themed-table");
        }
    } catch (error) {
        console.error("Error parsing current URL for display:", error);
        currentUrlDisplay.textContent = "Invalid URL format.";
        currentUrlDisplay.style.color = "#ef4444";
        currentUrlDisplayTable.style.borderColor = "#ef4444";
        currentUrlDisplayTable.style.backgroundColor = "#fef2f2";
    }
}

// ---------------------------------------------------------------------------
// Popup: alias buttons
// ---------------------------------------------------------------------------

export function renderMainViewAliases(
    aliasesContainer,
    messageBox,
    domainGroups,
    currentTabFullHostname,
) {
    aliasesContainer.innerHTML = "";

    if (!domainGroups || domainGroups.length === 0) {
        aliasesContainer.textContent =
            "No aliases configured. Click the settings icon to add some.";
        return;
    }

    let foundMatchingGroup = false;

    domainGroups.forEach((group) => {
        const groupKey = cleanHostname(group.domain);
        const aliases = group.aliases || [];

        if (currentTabFullHostname && isSameOrSubdomain(currentTabFullHostname, groupKey)) {
            foundMatchingGroup = true;

            const domainGroupDiv = document.createElement("div");
            domainGroupDiv.className = "domain-group";

            const groupHeader = document.createElement("h4");
            groupHeader.className = "domain-group-header";
            groupHeader.textContent = groupKey;
            domainGroupDiv.appendChild(groupHeader);

            const buttonsContainer = document.createElement("div");
            buttonsContainer.className = "domain-group-buttons";

            aliases.forEach((alias) => {
                // Compose full hostname for comparison and navigation
                const aliasFullHostname = cleanHostname(fullHostname(alias.subdomain, group.domain));

                if (aliasFullHostname !== currentTabFullHostname) {
                    const aliasButton = document.createElement("button");
                    aliasButton.className = "alias-button";
                    aliasButton.textContent = alias.name;
                    // Store the composed full hostname as the navigation target
                    aliasButton.value = aliasFullHostname;
                    aliasButton.style.backgroundColor = alias.color || defaultButtonColor;

                    aliasButton.addEventListener("click", async () => {
                        const currentTabUrl = await getCurrentTabUrl(messageBox);
                        if (!currentTabUrl) return;
                        try {
                            const url = new URL(currentTabUrl);
                            const newUrl = `${url.protocol}//${aliasButton.value}${url.pathname}${url.search}${url.hash}`;
                            const [currentTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                            await chrome.tabs.create({ url: newUrl, index: currentTab.index + 1 });
                            showMessage(messageBox, `Opened in new tab: ${newUrl}`, "success");
                        } catch (error) {
                            console.error("Error processing URL:", error);
                            showMessage(messageBox, "Error processing URL.", "error");
                        }
                    });

                    buttonsContainer.appendChild(aliasButton);
                }
            });

            if (buttonsContainer.children.length > 0) {
                domainGroupDiv.appendChild(buttonsContainer);
                aliasesContainer.appendChild(domainGroupDiv);
            }
        }
    });

    if (aliasesContainer.children.length === 0 && !foundMatchingGroup) {
        aliasesContainer.textContent =
            "No aliases configured for this domain, or current page is already aliased. Click the settings icon to add some.";
    } else if (aliasesContainer.children.length === 0 && foundMatchingGroup) {
        aliasesContainer.textContent = "No other aliases to switch to on this domain.";
    }
}

// ---------------------------------------------------------------------------
// Options: accordion domain list
// ---------------------------------------------------------------------------

/**
 * Renders the full accordion list of domains + their alias rows.
 *
 * @param {HTMLElement} container
 * @param {Array}    domainGroups
 * @param {Set}      openIndices       - set of group indices that are expanded
 * @param {Function} onToggle          - (groupIndex) => void
 * @param {Function} onAddAlias        - (groupIndex) => void
 * @param {Function} onEditAlias       - (groupIndex, aliasIndex, aliasData, mode) => void
 * @param {Function} onDeleteAlias     - (groupIndex, aliasIndex) => void
 * @param {Function} onEditDomain      - (groupIndex) => void
 * @param {Function} onDeleteDomain    - (groupIndex) => void
 */
export function renderAccordionDomains(
    container,
    domainGroups,
    openIndices,
    onToggle,
    onAddAlias,
    onEditAlias,
    onDeleteAlias,
    onEditDomain,
    onDeleteDomain,
) {
    container.innerHTML = "";

    if (!domainGroups || domainGroups.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state-msg";
        empty.textContent = "No domains configured. Click + to add one.";
        container.appendChild(empty);
        return;
    }

    domainGroups.forEach((group, groupIndex) => {
        const isOpen = openIndices.has(groupIndex);

        const accordion = document.createElement("div");
        accordion.className = "accordion-item" + (isOpen ? " accordion-open" : "");

        // ── Header row
        const header = document.createElement("div");
        header.className = "accordion-header";

        const chevron = document.createElement("span");
        chevron.className = "accordion-chevron";
        chevron.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';

        const labelWrap = document.createElement("div");
        labelWrap.className = "accordion-label";

        const domainSpan = document.createElement("span");
        domainSpan.className = "accordion-domain-name";
        domainSpan.textContent = group.domain;

        const countSpan = document.createElement("span");
        countSpan.className = "accordion-alias-count";
        const count = (group.aliases || []).length;
        countSpan.textContent = `${count} alias${count !== 1 ? "es" : ""}`;

        labelWrap.appendChild(domainSpan);
        labelWrap.appendChild(countSpan);

        // Add alias button
        const addAliasHeaderBtn = document.createElement("button");
        addAliasHeaderBtn.className = "icon-btn add-alias-header-btn";
        addAliasHeaderBtn.title = `Add alias for ${group.domain}`;
        addAliasHeaderBtn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';
        addAliasHeaderBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            onAddAlias(groupIndex);
        });

        // Edit domain button
        const editDomainBtn = document.createElement("button");
        editDomainBtn.className = "icon-btn edit-icon-btn accordion-edit-domain-btn";
        editDomainBtn.title = "Edit domain";
        editDomainBtn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
        editDomainBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            onEditDomain(groupIndex);
        });

        // Delete domain button
        const deleteDomainBtn = document.createElement("button");
        deleteDomainBtn.className = "icon-btn delete-btn accordion-delete-btn";
        deleteDomainBtn.title = "Delete domain";
        deleteDomainBtn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1H9.5l-1 1H5v2h14V4z"/></svg>';
        deleteDomainBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            onDeleteDomain(groupIndex);
        });

        header.appendChild(chevron);
        header.appendChild(labelWrap);
        header.appendChild(addAliasHeaderBtn);
        header.appendChild(editDomainBtn);
        header.appendChild(deleteDomainBtn);
        header.addEventListener("click", () => onToggle(groupIndex));

        // ── Body
        const body = document.createElement("div");
        body.className = "accordion-body";

        const aliases = group.aliases || [];

        if (aliases.length === 0) {
            const empty = document.createElement("p");
            empty.className = "accordion-empty";
            empty.textContent = "No aliases yet.";
            body.appendChild(empty);
        } else {
            aliases.forEach((alias, aliasIndex) => {
                const row = document.createElement("div");
                row.className = "alias-list-item";

                const info = document.createElement("span");
                info.className = "alias-list-info";

                const swatch = document.createElement("span");
                swatch.className = "alias-color-swatch";
                swatch.style.backgroundColor = alias.color || defaultButtonColor;

                const textWrap = document.createElement("span");
                textWrap.className = "alias-list-text";

                const nameSpan = document.createElement("span");
                nameSpan.className = "alias-list-name";
                nameSpan.textContent = alias.name;

                // Display the composed full hostname so the user sees the real target
                const subSpan = document.createElement("span");
                subSpan.className = "alias-list-subdomain";
                subSpan.textContent = fullHostname(alias.subdomain, group.domain);

                textWrap.appendChild(nameSpan);
                textWrap.appendChild(subSpan);
                info.appendChild(swatch);
                info.appendChild(textWrap);

                const editBtn = document.createElement("button");
                editBtn.className = "icon-btn edit-icon-btn";
                editBtn.title = "Edit alias";
                editBtn.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
                editBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onEditAlias(groupIndex, aliasIndex, alias, "edit");
                });

                const dupBtn = document.createElement("button");
                dupBtn.className = "icon-btn duplicate-btn";
                dupBtn.title = "Duplicate alias";
                dupBtn.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm7 9h2v-2h2v-2h-2V9h-2v2H9v2h2v2zm9-14H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 14H8V3h12v12z"/></svg>';
                dupBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onEditAlias(groupIndex, -1, alias, "duplicate");
                });

                const delBtn = document.createElement("button");
                delBtn.className = "icon-btn delete-btn";
                delBtn.title = "Delete alias";
                delBtn.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1H9.5l-1 1H5v2h14V4z"/></svg>';
                delBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onDeleteAlias(groupIndex, aliasIndex);
                });

                row.appendChild(info);
                row.appendChild(editBtn);
                row.appendChild(dupBtn);
                row.appendChild(delBtn);
                body.appendChild(row);
            });
        }

        accordion.appendChild(header);
        accordion.appendChild(body);
        container.appendChild(accordion);
    });
}

// ---------------------------------------------------------------------------
// Options: color picker
// ---------------------------------------------------------------------------

export function renderColorGrid(colorGrid, setSelectedColor, newAliasColorHidden) {
    colorGrid.innerHTML = "";
    defaultColors.forEach((color) => {
        const swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color.toUpperCase();
        swatch.addEventListener("click", () => {
            setSelectedColor(color);
            document.getElementById("colorPickerDropdown").style.display = "none";
        });
        colorGrid.appendChild(swatch);
    });
    setSelectedColor(newAliasColorHidden.value);
}

export function setSelectedColor(
    color,
    newAliasColorHidden,
    newAliasColorDisplay,
    customHexInput,
    fromHexInput = false,
) {
    let normalizedColor = color.toUpperCase();
    if (normalizedColor.length === 4 && normalizedColor.startsWith("#")) {
        normalizedColor =
            "#" +
            normalizedColor[1] + normalizedColor[1] +
            normalizedColor[2] + normalizedColor[2] +
            normalizedColor[3] + normalizedColor[3];
    }

    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(normalizedColor)) {
        if (!fromHexInput) customHexInput.value = "";
        return;
    }

    newAliasColorHidden.value = normalizedColor;
    newAliasColorDisplay.style.backgroundColor = normalizedColor;
    if (!fromHexInput) {
        customHexInput.value = normalizedColor;
        clearInputErrors();
    }

    document.querySelectorAll(".color-swatch").forEach((swatch) => {
        swatch.classList.remove("selected");
        const checkmark = swatch.querySelector(".checkmark");
        if (checkmark) checkmark.remove();
    });

    const selectedSwatch = document.querySelector(`.color-swatch[data-color="${normalizedColor}"]`);
    if (selectedSwatch) {
        selectedSwatch.classList.add("selected");
        const checkmarkSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        checkmarkSVG.setAttribute("viewBox", "0 0 24 24");
        checkmarkSVG.setAttribute("fill", "white");
        checkmarkSVG.classList.add("checkmark");
        checkmarkSVG.innerHTML = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>';
        selectedSwatch.appendChild(checkmarkSVG);
    }
}

export function resetAliasForm(
    newAliasNameInput,
    newAliasSubdomainPrefix,
    setSelectedColorCallback,
    addAliasBtn,
    setEditingAliasIndex,
    cancelEditBtn,
) {
    newAliasNameInput.value = "";
    newAliasSubdomainPrefix.value = "";
    setSelectedColorCallback(defaultButtonColor);
    addAliasBtn.textContent = "Add Alias";
    addAliasBtn.classList.remove("bg-yellow-500", "hover:bg-yellow-700");
    addAliasBtn.classList.add("bg-green-500", "hover:bg-green-700");
    setEditingAliasIndex(-1);
    clearInputErrors();
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
    document.getElementById("colorPickerDropdown").style.display = "none";
}