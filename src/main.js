/**
 * Main application logic for the Domain Changer popup.
 * This file orchestrates module interactions, manages state, and sets up event listeners.
 */

import { loadAliases, saveAliases, getCurrentTabUrl } from "./storage.js";
import {
    showMessage,
    showInputError,
    clearInputErrors, // Now correctly imported from utils.js
    normalizeDomain,
} from "./utils.js";
import {
    setSelectedColor as domSetSelectedColor, // Alias to avoid naming conflict
    renderColorGrid,
    updateCurrentUrlDisplay,
    renderMainViewAliases,
    renderConfigViewAliases,
    resetAliasForm as domResetAliasForm, // Alias to avoid naming conflict
    showView as domShowView, // Alias to avoid naming conflict
} from "./dom.js";

document.addEventListener("DOMContentLoaded", async () => {
    // --- DOM Element References ---
    const mainView = document.getElementById("mainView");
    const aliasesContainer = document.getElementById("aliases-container");
    const currentUrlDisplay = document.getElementById("currentUrlDisplay");
    const currentUrlDisplayTable = document.getElementById(
        "currentUrlDisplayTable",
    );
    const optionsIcon = document.getElementById("optionsIcon");
    const messageBox = document.getElementById("messageBox");

    const configView = document.getElementById("configView");
    const configAliasesContainer = document.getElementById(
        "config-aliases-container",
    );
    const newAliasNameInput = document.getElementById("newAliasName");
    const newAliasSubdomainInput = document.getElementById("newAliasSubdomain");
    const newAliasDomainInput = document.getElementById("newAliasDomain");

    const newAliasColorDisplay = document.getElementById(
        "newAliasColorDisplay",
    );
    const newAliasColorHidden = document.getElementById("newAliasColorHidden");
    const customHexInput = document.getElementById("customHexInput");
    const colorPickerDropdown = document.getElementById("colorPickerDropdown");
    const colorGrid = document.getElementById("colorGrid");
    const colorPickerResetBtn = document.getElementById("colorPickerResetBtn");

    const addAliasBtn = document.getElementById("addAliasBtn");
    const resetAliasesBtn = document.getElementById("resetAliasesBtn");
    const backIcon = document.getElementById("backIcon");

    const resetConfirmationModal = document.getElementById(
        "resetConfirmationModal",
    );
    const confirmResetBtn = document.getElementById("confirmResetBtn");
    const cancelResetBtn = document.getElementById("cancelResetBtn");

    let cancelEditBtn = document.getElementById("cancelEditBtn"); // Will be created/removed dynamically

    // --- Application State ---
    let domainAliases = [];
    let editingAliasIndex = -1; // -1 indicates no alias is being edited

    // --- Callbacks/Helper Functions for DOM module ---
    // These functions need access to the module's state or local DOM elements
    // We create wrappers to pass the necessary context.

    /**
     * Wrapper for setSelectedColor from dom.js to pass local DOM elements.
     * @param {string} color - The hex color code to set.
     * @param {boolean} fromHexInput - True if the call is originating from manual hex input.
     */
    const setSelectedColor = (color, fromHexInput = false) => {
        domSetSelectedColor(
            color,
            newAliasColorHidden,
            newAliasColorDisplay,
            customHexInput,
            fromHexInput,
        );
    };

    /**
     * Wrapper for resetAliasForm from dom.js to pass local DOM elements and callbacks.
     */
    const resetAliasForm = () => {
        domResetAliasForm(
            newAliasNameInput,
            newAliasSubdomainInput,
            newAliasDomainInput,
            setSelectedColor, // Pass the local setSelectedColor wrapper
            addAliasBtn,
            (index) => {
                editingAliasIndex = index;
            }, // Callback to update editingAliasIndex in main.js
            cancelEditBtn, // Pass the cancelEditBtn reference
        );
        // After resetting, ensure the cancelEditBtn reference is updated correctly if it was removed
        cancelEditBtn = document.getElementById("cancelEditBtn");
    };

    /**
     * Wrapper for renderMainViewAliases from dom.js.
     * @param {string} currentTabFullHostname - The normalized full hostname of the current tab.
     */
    const renderMainViewAliasesWrapper = (currentTabFullHostname) => {
        renderMainViewAliases(
            aliasesContainer,
            messageBox,
            domainAliases,
            currentTabFullHostname,
        );
    };

    /**
     * Wrapper for renderConfigViewAliases from dom.js.
     */
    const renderConfigViewAliasesWrapper = () => {
        renderConfigViewAliases(
            configAliasesContainer,
            domainAliases,
            (index) => {
                editingAliasIndex = index;
            }, // Callback to update editingAliasIndex
            newAliasNameInput,
            newAliasSubdomainInput,
            newAliasDomainInput,
            setSelectedColor, // Pass the local setSelectedColor wrapper
            addAliasBtn,
            messageBox,
            resetAliasForm, // Pass the local resetAliasForm wrapper
            renderMainViewAliasesWrapper, // Pass callback for re-rendering main view on delete
            currentUrlDisplay,
            currentUrlDisplayTable,
        );

        // Logic to create/append Cancel button when editing starts (moved here from dom.js)
        if (editingAliasIndex !== -1 && !cancelEditBtn) {
            cancelEditBtn = document.createElement("button");
            cancelEditBtn.id = "cancelEditBtn";
            cancelEditBtn.className =
                "action-btn bg-gray-500 hover:bg-gray-700 mt-2";
            cancelEditBtn.textContent = "Cancel Edit";
            cancelEditBtn.addEventListener("click", resetAliasForm);
            addAliasBtn.parentNode.insertBefore(
                cancelEditBtn,
                addAliasBtn.nextSibling,
            );
        }
    };

    /**
     * Wrapper for showView from dom.js.
     * @param {string} view - 'main' or 'config'.
     */
    const showView = (view) => {
        domShowView(
            mainView,
            configView,
            renderConfigViewAliasesWrapper,
            resetAliasForm,
        );
    };

    // --- Initialization ---
    domainAliases = await loadAliases(messageBox);
    const currentTabUrl = await getCurrentTabUrl(messageBox);
    const currentHostname = currentTabUrl
        ? new URL(currentTabUrl).hostname
        : null;
    const normalizedCurrentHostname = currentHostname
        ? normalizeDomain(currentHostname)
        : null;

    updateCurrentUrlDisplay(
        currentUrlDisplay,
        currentUrlDisplayTable,
        messageBox,
        currentTabUrl,
        domainAliases,
    );
    renderMainViewAliasesWrapper(normalizedCurrentHostname);
    renderColorGrid(colorGrid, setSelectedColor, newAliasColorHidden); // Pass elements and callback

    // Listen for changes in storage (useful if multiple contexts could write to storage)
    chrome.storage.sync.onChanged.addListener(async (changes) => {
        if (changes.domainAliases) {
            domainAliases = changes.domainAliases.newValue || [];
            const updatedCurrentUrl = await getCurrentTabUrl(messageBox);
            const updatedCurrentHostname = updatedCurrentUrl
                ? new URL(updatedCurrentUrl).hostname
                : null;
            const normalizedUpdatedCurrentHostname = updatedCurrentHostname
                ? normalizeDomain(updatedCurrentHostname)
                : null;

            renderMainViewAliasesWrapper(normalizedUpdatedCurrentHostname);
            renderConfigViewAliasesWrapper(); // Re-render config view if visible
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

    // Switch to config view
    optionsIcon.addEventListener("click", () => {
        showView("config");
    });

    // Switch back to main view
    backIcon.addEventListener("click", () => {
        showView("main");
    });

    // Toggle color picker dropdown with the small color swatch (newAliasColorDisplay)
    newAliasColorDisplay.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevent click from bubbling to document and closing immediately
        colorPickerDropdown.style.display =
            colorPickerDropdown.style.display === "block" ? "none" : "block";
        if (colorPickerDropdown.style.display === "block") {
            setSelectedColor(newAliasColorHidden.value); // Ensure correct color is selected when opening
            customHexInput.focus(); // Focus on the hex input when opening
        }
    });

    // Handle "Reset" click in color picker
    colorPickerResetBtn.addEventListener("click", () => {
        setSelectedColor("#3b82f6"); // Default color
        colorPickerDropdown.style.display = "none";
    });

    // Live update color when typing in hex input
    customHexInput.addEventListener("input", () => {
        const hex = customHexInput.value.trim();
        const partialHexRegex = /^#([A-Fa-f0-9]{0,6})$/i;

        if (partialHexRegex.test(hex)) {
            newAliasColorDisplay.style.backgroundColor = hex;
            newAliasColorHidden.value = hex;
            const fullHexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i;
            if (fullHexRegex.test(hex)) {
                clearInputErrors();
            }
        }
    });

    // Handle blur event for final validation/cleanup on hex input
    customHexInput.addEventListener("blur", () => {
        const hex = customHexInput.value.trim();
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i;

        if (!hexRegex.test(hex) && hex.length > 0) {
            showInputError(
                customHexInput,
                "Invalid hex code. Using default color.",
            );
            setSelectedColor("#3b82f6");
        } else if (hex.length === 0) {
            setSelectedColor("#3b82f6");
            clearInputErrors();
        } else {
            setSelectedColor(hex);
        }
    });

    // Close color picker when clicking outside
    document.addEventListener("click", (event) => {
        if (
            colorPickerDropdown.style.display === "block" &&
            !colorPickerDropdown.contains(event.target) &&
            !newAliasColorDisplay.contains(event.target) &&
            !customHexInput.contains(event.target)
        ) {
            colorPickerDropdown.style.display = "none";
        }
    });

    // Add/Update Alias functionality
    addAliasBtn.addEventListener("click", async () => {
        clearInputErrors();

        const name = newAliasNameInput.value.trim();
        const subdomain = newAliasSubdomainInput.value.trim();
        const domain = newAliasDomainInput.value.trim();
        const color = newAliasColorHidden.value;

        let hasError = false;

        if (!name) {
            showInputError(newAliasNameInput, "Alias name is required.");
            hasError = true;
        }

        if (!subdomain) {
            showInputError(
                newAliasSubdomainInput,
                "Subdomain (full hostname) is required (e.g., app.example.com).",
            );
            hasError = true;
        } else {
            try {
                const testUrl = new URL(`http://${subdomain}`);
                if (
                    normalizeDomain(testUrl.hostname) !==
                    normalizeDomain(subdomain)
                ) {
                    showInputError(
                        newAliasSubdomainInput,
                        "Please enter a valid hostname format (e.g., app.example.com).",
                    );
                    hasError = true;
                }
            } catch (e) {
                showInputError(
                    newAliasSubdomainInput,
                    "Please enter a valid hostname format (e.g., app.example.com).",
                );
                hasError = true;
            }
        }

        if (!domain) {
            showInputError(
                newAliasDomainInput,
                "Domain is required (e.g., example.com).",
            );
            hasError = true;
        } else {
            try {
                const testUrl = new URL(`http://${domain}`);
                if (
                    normalizeDomain(testUrl.hostname) !==
                    normalizeDomain(domain)
                ) {
                    showInputError(
                        newAliasDomainInput,
                        "Please enter a valid domain format (e.g., example.com).",
                    );
                    hasError = true;
                }
            } catch (e) {
                showInputError(
                    newAliasDomainInput,
                    "Please enter a valid domain format (e.g., example.com).",
                );
                hasError = true;
            }
        }

        if (!hasError && subdomain && domain) {
            const normalizedSubdomain = normalizeDomain(subdomain);
            const normalizedDomain = normalizeDomain(domain);

            if (normalizedSubdomain === normalizedDomain) {
                showInputError(
                    newAliasDomainInput,
                    "Domain cannot be same as subdomain.",
                );
                hasError = true;
            } else if (!normalizedSubdomain.endsWith(normalizedDomain)) {
                // Corrected: Only show this error on the subdomain input
                showInputError(
                    newAliasSubdomainInput,
                    `Subdomain '${subdomain}' must belong to the '${domain}' domain.`,
                );
                hasError = true;
            }
        }

        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i;
        if (!hexRegex.test(color)) {
            showInputError(
                customHexInput,
                "Please provide a valid hex color code (e.g., #RRGGBB).",
            );
            hasError = true;
        }

        if (
            domainAliases.some(
                (alias, i) =>
                    i !== editingAliasIndex &&
                    alias.name.toLowerCase() === name.toLowerCase(),
            )
        ) {
            showInputError(newAliasNameInput, "Alias name already exists.");
            hasError = true;
        }

        const normalizedNewSubdomain = normalizeDomain(subdomain);
        if (
            domainAliases.some((alias, i) => {
                return (
                    i !== editingAliasIndex &&
                    normalizeDomain(alias.subdomain) === normalizedNewSubdomain
                );
            })
        ) {
            showInputError(
                newAliasSubdomainInput,
                "This Subdomain (full hostname) already exists.",
            );
            hasError = true;
        }

        if (hasError) {
            return;
        }

        if (editingAliasIndex !== -1) {
            domainAliases[editingAliasIndex] = {
                name,
                subdomain,
                domain,
                color,
            };
            showMessage(messageBox, "Alias updated successfully!", "success");
        } else {
            const newAlias = { name, subdomain, domain, color };
            domainAliases.push(newAlias);
            showMessage(messageBox, "New alias added successfully!", "success");
        }

        await saveAliases(domainAliases, messageBox);
        renderConfigViewAliasesWrapper();
        const currentTabUrlAfterSave = await getCurrentTabUrl(messageBox);
        const currentHostnameAfterSave = currentTabUrlAfterSave
            ? new URL(currentTabUrlAfterSave).hostname
            : null;
        const normalizedCurrentHostnameAfterSave = currentHostnameAfterSave
            ? normalizeDomain(currentHostnameAfterSave)
            : null;
        renderMainViewAliasesWrapper(normalizedCurrentHostnameAfterSave);
        resetAliasForm();
        updateCurrentUrlDisplay(
            currentUrlDisplay,
            currentUrlDisplayTable,
            messageBox,
            currentTabUrlAfterSave,
            domainAliases,
        );
    });

    // Reset All Aliases functionality (opens confirmation modal)
    resetAliasesBtn.addEventListener("click", () => {
        resetConfirmationModal.style.display = "flex";
        resetConfirmationModal
            .querySelector(".modal-content")
            .classList.add("show");
    });

    // Confirm Reset action
    confirmResetBtn.addEventListener("click", async () => {
        resetConfirmationModal.style.display = "none";

        domainAliases = [];
        await saveAliases(domainAliases, messageBox);

        renderConfigViewAliasesWrapper();
        const currentTabUrlAfterReset = await getCurrentTabUrl(messageBox);
        const currentHostnameAfterReset = currentTabUrlAfterReset
            ? new URL(currentTabUrlAfterReset).hostname
            : null;
        const normalizedCurrentHostnameAfterReset = currentHostnameAfterReset
            ? normalizeDomain(currentHostnameAfterReset)
            : null;
        renderMainViewAliasesWrapper(normalizedCurrentHostnameAfterReset);
        showMessage(messageBox, "All aliases removed successfully!", "success");
        resetAliasForm();

        updateCurrentUrlDisplay(
            currentUrlDisplay,
            currentUrlDisplayTable,
            messageBox,
            currentTabUrlAfterReset,
            domainAliases,
        );
    });

    // Cancel Reset action
    cancelResetBtn.addEventListener("click", () => {
        resetConfirmationModal.style.display = "none";
    });
});
