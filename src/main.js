/**
 * Main application logic for the Subdomain Switcher popup.
 * Works with new schema: domainGroups = [{ domain, aliases: [{color, name, subdomain}] }]
 */

import { loadDomainGroups, saveDomainGroups, getCurrentTabUrl } from "./storage.js";
import {
    showMessage,
    showInputError,
    clearInputErrors,
    cleanHostname,
    isSameOrSubdomain,
} from "./utils.js";
import {
    updateCurrentUrlDisplay,
    renderMainViewAliases,
    getAliasTargetHostname,
    renderColorGrid,
    setSelectedColor as domSetSelectedColor,
} from "./dom.js";

const FEEDBACK_URL = "https://forms.gle/hpnJCDxk6obQkLVi8";
const GITHUB_URL = "https://github.com/RoshanShaikh/subdomain-switcher";
const DEFAULT_ALIAS_COLOR = "#3b82f6";
const NEW_DOMAIN_OPTION = "__new__";

document.addEventListener("DOMContentLoaded", async () => {
    const aliasesContainer       = document.getElementById("aliases-container");
    const currentUrlDisplay      = document.getElementById("currentUrlDisplay");
    const currentUrlDisplayTable = document.getElementById("currentUrlDisplayTable");
    const optionsIcon            = document.getElementById("optionsIcon");
    const feedbackIcon           = document.getElementById("feedbackIcon");
    const githubIcon             = document.getElementById("githubIcon");
    const messageBox             = document.getElementById("messageBox");
    const editCurrentAliasBtn    = document.getElementById("editCurrentAliasBtn");

    // Add Current Page view
    const mainView                  = document.getElementById("mainView");
    const addCurrentView            = document.getElementById("addCurrentView");
    const addCurrentPageBtn         = document.getElementById("addCurrentPageBtn");
    const backFromAddCurrentBtn     = document.getElementById("backFromAddCurrentBtn");
    const addCurrentHostDisplay     = document.getElementById("addCurrentHostDisplay");
    const addCurrentAliasName       = document.getElementById("addCurrentAliasName");
    const addCurrentDomainSelect    = document.getElementById("addCurrentDomainSelect");
    const addCurrentNewDomainGroup  = document.getElementById("addCurrentNewDomainGroup");
    const addCurrentNewDomainInput  = document.getElementById("addCurrentNewDomainInput");
    const saveCurrentPageBtn        = document.getElementById("saveCurrentPageBtn");

    // Add Current Page view — color picker
    const newAliasColorDisplay   = document.getElementById("newAliasColorDisplay");
    const newAliasColorHidden    = document.getElementById("newAliasColorHidden");
    const customHexInput         = document.getElementById("customHexInput");
    const colorPickerDropdown    = document.getElementById("colorPickerDropdown");
    const colorGrid              = document.getElementById("colorGrid");
    const colorPickerResetBtn    = document.getElementById("colorPickerResetBtn");

    let domainGroups = [];
    let currentTabUrl = null;
    let normalizedCurrentHostname = null;

    const renderWrapper = (currentTabFullHostname) => {
        renderMainViewAliases(
            aliasesContainer,
            messageBox,
            domainGroups,
            currentTabFullHostname,
        );
    };

    const refreshCurrentTabInfo = async () => {
        currentTabUrl = await getCurrentTabUrl(messageBox);
        normalizedCurrentHostname = currentTabUrl
            ? cleanHostname(new URL(currentTabUrl).hostname)
            : null;
    };

    /** Returns { groupIndex, aliasIndex } for the alias matching the current page, or null. */
    const findCurrentAliasMatch = () => {
        if (!normalizedCurrentHostname) return null;
        for (let groupIndex = 0; groupIndex < domainGroups.length; groupIndex++) {
            const group = domainGroups[groupIndex];
            const aliases = group.aliases || [];
            for (let aliasIndex = 0; aliasIndex < aliases.length; aliasIndex++) {
                if (getAliasTargetHostname(aliases[aliasIndex], group.domain) === normalizedCurrentHostname) {
                    return { groupIndex, aliasIndex };
                }
            }
        }
        return null;
    };

    /** True if the current page already resolves to an existing alias in any group. */
    const isCurrentPageAlreadyAliased = () => Boolean(findCurrentAliasMatch());

    /** Shows the "Add current page" trigger only when the page isn't already saved as an alias. */
    const updateAddCurrentPageVisibility = () => {
        addCurrentPageBtn.style.display =
            normalizedCurrentHostname && !isCurrentPageAlreadyAliased() ? "flex" : "none";
    };

    /** Shows/wires the pencil icon beside the current alias name so it opens straight into that alias's editor. */
    const updateEditCurrentAliasButton = () => {
        const match = findCurrentAliasMatch();
        if (match) {
            editCurrentAliasBtn.style.display = "flex";
            editCurrentAliasBtn.style.color = currentUrlDisplay.style.color || "";
            editCurrentAliasBtn.dataset.groupIndex = String(match.groupIndex);
            editCurrentAliasBtn.dataset.aliasIndex = String(match.aliasIndex);
        } else {
            editCurrentAliasBtn.style.display = "none";
            delete editCurrentAliasBtn.dataset.groupIndex;
            delete editCurrentAliasBtn.dataset.aliasIndex;
        }
    };

    domainGroups = await loadDomainGroups(messageBox);
    await refreshCurrentTabInfo();

    updateCurrentUrlDisplay(currentUrlDisplay, currentUrlDisplayTable, messageBox, currentTabUrl, domainGroups);
    renderWrapper(normalizedCurrentHostname);
    updateAddCurrentPageVisibility();
    updateEditCurrentAliasButton();

    chrome.storage.sync.onChanged.addListener(async (changes) => {
        if (changes.domainGroups) {
            domainGroups = await loadDomainGroups(messageBox);
            await refreshCurrentTabInfo();
            renderWrapper(normalizedCurrentHostname);
            updateCurrentUrlDisplay(currentUrlDisplay, currentUrlDisplayTable, messageBox, currentTabUrl, domainGroups);
            updateAddCurrentPageVisibility();
            updateEditCurrentAliasButton();
        }
    });

    optionsIcon.addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });

    // Opens the options page straight into the editor for the alias matching the current page.
    editCurrentAliasBtn.addEventListener("click", () => {
        const { groupIndex, aliasIndex } = editCurrentAliasBtn.dataset;
        if (groupIndex === undefined || aliasIndex === undefined) return;
        const url = chrome.runtime.getURL(
            `options.html?editGroupIndex=${groupIndex}&editAliasIndex=${aliasIndex}`,
        );
        chrome.tabs.create({ url });
    });

    // ── Top menu: Feedback / GitHub ─────────────────────────────────────────

    feedbackIcon.addEventListener("click", () => {
        chrome.tabs.create({ url: FEEDBACK_URL });
    });

    githubIcon.addEventListener("click", () => {
        chrome.tabs.create({ url: GITHUB_URL });
    });

    // ── Add Current Page ─────────────────────────────────────────────────────

    /** Parses a raw string into a clean hostname, or null if invalid. */
    const parseHostnameInput = (raw) => {
        const trimmed = (raw || "").trim();
        if (!trimmed) return null;
        try {
            const url = new URL(`http://${trimmed}`);
            const hostname = cleanHostname(url.hostname);
            if (hostname !== cleanHostname(trimmed)) return null;
            return hostname;
        } catch {
            return null;
        }
    };

    /** Given a full hostname and a base domain it belongs to, returns the subdomain prefix. */
    const computeAliasPrefix = (hostname, domain) =>
        hostname === domain ? "" : hostname.slice(0, hostname.length - domain.length - 1);

    const setSelectedColor = (color, fromHexInput = false) =>
        domSetSelectedColor(color, newAliasColorHidden, newAliasColorDisplay, customHexInput, fromHexInput);

    /** The currently picked alias color, falling back to the default if the hex field is mid-edit/invalid. */
    const getSelectedAliasColor = () => {
        const hex = newAliasColorHidden.value;
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(hex) ? hex : DEFAULT_ALIAS_COLOR;
    };

    const toggleNewDomainInput = () => {
        const isNew = addCurrentDomainSelect.value === NEW_DOMAIN_OPTION;
        addCurrentNewDomainGroup.style.display = isNew ? "block" : "none";
        if (isNew && !addCurrentNewDomainInput.value) {
            addCurrentNewDomainInput.value = normalizedCurrentHostname || "";
        }
    };

    const populateAddCurrentDomainSelect = () => {
        addCurrentDomainSelect.innerHTML = "";
        let defaultIndex = null;

        domainGroups.forEach((group, index) => {
            const groupDomain = cleanHostname(group.domain);
            const fitsAsSubdomain = isSameOrSubdomain(normalizedCurrentHostname, groupDomain);
            const eligible = fitsAsSubdomain || group.allowCrossDomain;
            if (!eligible) return;

            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = groupDomain;
            addCurrentDomainSelect.appendChild(option);

            if (defaultIndex === null && fitsAsSubdomain) {
                defaultIndex = index;
            }
        });

        const newOption = document.createElement("option");
        newOption.value = NEW_DOMAIN_OPTION;
        newOption.textContent = "+ Add as new domain";
        addCurrentDomainSelect.appendChild(newOption);

        addCurrentDomainSelect.value = defaultIndex !== null ? String(defaultIndex) : NEW_DOMAIN_OPTION;
        toggleNewDomainInput();
    };

    const openAddCurrentView = async () => {
        await refreshCurrentTabInfo();
        updateAddCurrentPageVisibility();
        if (!normalizedCurrentHostname) {
            showMessage(messageBox, "Unable to detect the current page's URL.", "error");
            return;
        }
        if (isCurrentPageAlreadyAliased()) {
            showMessage(messageBox, "This page is already saved as an alias.", "error");
            return;
        }
        clearInputErrors();
        addCurrentHostDisplay.textContent = normalizedCurrentHostname;
        addCurrentAliasName.value = "";
        addCurrentNewDomainInput.value = "";
        populateAddCurrentDomainSelect();
        renderColorGrid(colorGrid, setSelectedColor, newAliasColorHidden);
        setSelectedColor(DEFAULT_ALIAS_COLOR);
        colorPickerDropdown.style.display = "none";
        mainView.style.display = "none";
        addCurrentView.style.display = "block";
    };

    const closeAddCurrentView = () => {
        colorPickerDropdown.style.display = "none";
        addCurrentView.style.display = "none";
        mainView.style.display = "block";
    };

    addCurrentPageBtn.addEventListener("click", openAddCurrentView);
    backFromAddCurrentBtn.addEventListener("click", closeAddCurrentView);
    addCurrentDomainSelect.addEventListener("change", toggleNewDomainInput);

    // ── Color picker ──────────────────────────────────────────────────────────

    newAliasColorDisplay.addEventListener("click", (e) => {
        e.stopPropagation();
        colorPickerDropdown.style.display =
            colorPickerDropdown.style.display === "block" ? "none" : "block";
        if (colorPickerDropdown.style.display === "block") {
            setSelectedColor(newAliasColorHidden.value);
            customHexInput.focus();
        }
    });

    colorPickerResetBtn.addEventListener("click", () => {
        setSelectedColor(DEFAULT_ALIAS_COLOR);
        colorPickerDropdown.style.display = "none";
    });

    customHexInput.addEventListener("input", () => {
        const hex = customHexInput.value.trim();
        if (/^#([A-Fa-f0-9]{0,6})$/i.test(hex)) {
            newAliasColorDisplay.style.backgroundColor = hex;
            newAliasColorHidden.value = hex;
            if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(hex)) clearInputErrors();
        }
    });

    customHexInput.addEventListener("blur", () => {
        const hex = customHexInput.value.trim();
        if (hex.length === 0) {
            setSelectedColor(DEFAULT_ALIAS_COLOR);
            clearInputErrors();
        } else if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(hex)) {
            showInputError(customHexInput, "Invalid hex code. Using default color.");
            setSelectedColor(DEFAULT_ALIAS_COLOR);
        } else {
            setSelectedColor(hex);
        }
    });

    document.addEventListener("click", (e) => {
        if (
            colorPickerDropdown.style.display === "block" &&
            !colorPickerDropdown.contains(e.target) &&
            !newAliasColorDisplay.contains(e.target) &&
            !customHexInput.contains(e.target)
        ) {
            colorPickerDropdown.style.display = "none";
        }
    });

    saveCurrentPageBtn.addEventListener("click", async () => {
        clearInputErrors();

        const name = addCurrentAliasName.value.trim();
        if (!name) {
            showInputError(addCurrentAliasName, "Alias name is required.");
            return;
        }
        if (!normalizedCurrentHostname) {
            showMessage(messageBox, "Unable to detect the current page's URL.", "error");
            return;
        }

        const selection = addCurrentDomainSelect.value;

        if (selection === NEW_DOMAIN_OPTION) {
            const rawDomain = addCurrentNewDomainInput.value.trim();
            const domain = parseHostnameInput(rawDomain);
            if (!domain) {
                showInputError(addCurrentNewDomainInput, "Enter a valid domain (e.g., example.com).");
                return;
            }
            if (domainGroups.some((g) => cleanHostname(g.domain) === domain)) {
                showInputError(addCurrentNewDomainInput, "This domain already exists — pick it from the list instead.");
                return;
            }

            const selectedColor = getSelectedAliasColor();
            const fitsAsSubdomain = isSameOrSubdomain(normalizedCurrentHostname, domain);
            const aliasPayload = fitsAsSubdomain
                ? {
                    name,
                    subdomain: computeAliasPrefix(normalizedCurrentHostname, domain),
                    color: selectedColor,
                }
                : {
                    name,
                    subdomain: "",
                    color: selectedColor,
                    targetHost: normalizedCurrentHostname,
                };

            domainGroups.push({
                domain,
                allowCrossDomain: !fitsAsSubdomain,
                aliases: [aliasPayload],
            });

            await saveDomainGroups(domainGroups, messageBox);
            showMessage(messageBox, `Domain "${domain}" created with this page saved as "${name}".`, "success");
            closeAddCurrentView();
            return;
        }

        const groupIndex = Number(selection);
        const group = domainGroups[groupIndex];
        if (!group) {
            showMessage(messageBox, "Please choose a domain to add to.", "error");
            return;
        }

        const aliases = group.aliases || [];

        if (aliases.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
            showInputError(addCurrentAliasName, "Alias name already exists in this domain.");
            return;
        }

        if (aliases.some((a) => getAliasTargetHostname(a, group.domain) === normalizedCurrentHostname)) {
            showMessage(messageBox, "This page is already saved as an alias.", "error");
            return;
        }

        const groupDomain = cleanHostname(group.domain);
        const selectedColor = getSelectedAliasColor();
        const fitsAsSubdomain = isSameOrSubdomain(normalizedCurrentHostname, groupDomain);
        const aliasPayload = fitsAsSubdomain
            ? {
                name,
                subdomain: computeAliasPrefix(normalizedCurrentHostname, groupDomain),
                color: selectedColor,
            }
            : {
                name,
                subdomain: "",
                color: selectedColor,
                targetHost: normalizedCurrentHostname,
            };

        group.aliases = aliases;
        group.aliases.push(aliasPayload);

        await saveDomainGroups(domainGroups, messageBox);
        showMessage(messageBox, `Added "${name}" to ${groupDomain}.`, "success");
        closeAddCurrentView();
    });
});