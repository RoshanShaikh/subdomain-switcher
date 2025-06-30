/**
 * Main application logic for the Subdomain Switcher popup.
 * This file orchestrates module interactions, manages state, and sets up event listeners.
 */

import { loadAliases, saveAliases, getCurrentTabUrl } from "./storage.js";
import {
    showMessage,
    showInputError,
    clearInputErrors,
    cleanHostname,
    isSameOrSubdomain,
} from "./utils.js";
import {
    setSelectedColor as domSetSelectedColor,
    renderColorGrid,
    updateCurrentUrlDisplay,
    renderMainViewAliases,
    renderConfigViewAliases,
    resetAliasForm as domResetAliasForm,
    showView as domShowView,
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
    const backIcon = document.getElementById("backIcon");

    // Action Menu Elements
    const actionsIcon = document.getElementById("actionsIcon");
    const configActionsDropdown = document.getElementById(
        "configActionsDropdown",
    );
    const exportAliasesBtn = document.getElementById("exportAliasesBtn");
    const importAliasesBtn = document.getElementById("importAliasesBtn");
    const importAliasesFile = document.getElementById("importAliasesFile");
    const resetAliasesBtn = document.getElementById("resetAliasesBtn"); // Moved from direct popup.html

    // Modals
    const resetConfirmationModal = document.getElementById(
        "resetConfirmationModal",
    );
    const confirmResetBtn = document.getElementById("confirmResetBtn");
    const cancelResetBtn = document.getElementById("cancelResetBtn");

    const importConfirmationModal = document.getElementById(
        "importConfirmationModal",
    );
    const confirmImportBtn = document.getElementById("confirmImportBtn");
    const cancelImportBtn = document.getElementById("cancelImportBtn");

    let cancelEditBtn = document.getElementById("cancelEditBtn"); // Will be created/removed dynamically
    let fileToImport = null; // Store the file temporarily for import confirmation

    // --- Application State ---
    let domainAliases = [];
    let editingAliasIndex = -1; // -1 indicates no alias is being edited

    // --- Callbacks/Helper Functions for DOM module ---
    // These functions need access to the module's state or local DOM elements
    // We create wrappers to pass the necessary context.

    /**
     * Closes the actions dropdown menu.
     */
    const closeActionsDropdown = () => {
        if (!configActionsDropdown.classList.contains("hidden")) {
            configActionsDropdown.classList.add("hidden");
        }
    };

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
        closeActionsDropdown(); // Ensure dropdown is closed when view changes
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
                ? cleanHostname(updatedCurrentHostname)
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

    // Close color picker and actions dropdown when clicking outside
    document.addEventListener("click", (event) => {
        // Close color picker
        if (
            colorPickerDropdown.style.display === "block" &&
            !colorPickerDropdown.contains(event.target) &&
            !newAliasColorDisplay.contains(event.target) &&
            !customHexInput.contains(event.target)
        ) {
            colorPickerDropdown.style.display = "none";
        }

        // Close actions dropdown
        if (
            !configActionsDropdown.classList.contains("hidden") &&
            !actionsIcon.contains(event.target) &&
            !configActionsDropdown.contains(event.target)
        ) {
            closeActionsDropdown();
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
                    cleanHostname(testUrl.hostname) !== cleanHostname(subdomain)
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
                if (cleanHostname(testUrl.hostname) !== cleanHostname(domain)) {
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
            const normalizedSubdomain = cleanHostname(subdomain);
            const normalizedDomain = cleanHostname(domain);

            if (normalizedSubdomain === normalizedDomain) {
                showInputError(
                    newAliasDomainInput,
                    "Domain cannot be same as subdomain.",
                );
                hasError = true;
            } else if (
                !isSameOrSubdomain(normalizedSubdomain, normalizedDomain)
            ) {
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

        const normalizedNewSubdomain = cleanHostname(subdomain);
        if (
            domainAliases.some((alias, i) => {
                return (
                    i !== editingAliasIndex &&
                    cleanHostname(alias.subdomain) === normalizedNewSubdomain
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
            ? cleanHostname(currentHostnameAfterSave)
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

    // --- Reset Aliases Functionality (via Actions Menu) ---
    resetAliasesBtn.addEventListener("click", () => {
        closeActionsDropdown(); // Close the dropdown immediately
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
            ? cleanHostname(currentHostnameAfterReset)
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

    // --- Export/Import Aliases Functionality (via Actions Menu) ---
    exportAliasesBtn.addEventListener("click", async () => {
        closeActionsDropdown(); // Close the dropdown immediately
        const aliasesToExport = await loadAliases(messageBox); // Get current aliases
        const jsonString = JSON.stringify(aliasesToExport, null, 2); // Pretty print JSON

        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "subdomain_switcher_aliases.json"; // Default filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage(messageBox, "Aliases exported successfully!", "success");
    });

    importAliasesBtn.addEventListener("click", () => {
        closeActionsDropdown(); // Close the dropdown immediately
        // Show import confirmation modal first
        importConfirmationModal.style.display = "flex";
        importConfirmationModal
            .querySelector(".modal-content")
            .classList.add("show");
    });

    confirmImportBtn.addEventListener("click", () => {
        importConfirmationModal.style.display = "none";
        importAliasesFile.click(); // Trigger the hidden file input click only after confirmation
    });

    cancelImportBtn.addEventListener("click", () => {
        importConfirmationModal.style.display = "none";
        importAliasesFile.value = ""; // Clear selected file if canceled
        fileToImport = null; // Clear the temporary file reference
    });

    importAliasesFile.addEventListener("change", (event) => {
        fileToImport = event.target.files[0]; // Store file reference
        if (!fileToImport) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // Basic validation of imported data structure
                const isValid =
                    Array.isArray(importedData) &&
                    importedData.every(
                        (alias) =>
                            typeof alias === "object" &&
                            alias !== null &&
                            typeof alias.name === "string" &&
                            typeof alias.subdomain === "string" &&
                            typeof alias.domain === "string" &&
                            typeof alias.color === "string" &&
                            /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(
                                alias.color,
                            ), // Validate color format
                    );

                if (!isValid) {
                    showMessage(
                        messageBox,
                        "Invalid JSON format or data structure in the imported file. Please ensure it's an array of alias objects.",
                        "error",
                    );
                    return;
                }

                domainAliases = importedData; // Replace current aliases
                await saveAliases(domainAliases, messageBox);
                renderConfigViewAliasesWrapper(); // Re-render the config view
                const currentTabUrlAfterImport = await getCurrentTabUrl(
                    messageBox,
                );
                const currentHostnameAfterImport = currentTabUrlAfterImport
                    ? new URL(currentTabUrlAfterImport).hostname
                    : null;
                const normalizedCurrentHostnameAfterImport =
                    currentHostnameAfterImport
                        ? cleanHostname(currentHostnameAfterImport)
                        : null;
                renderMainViewAliasesWrapper(
                    normalizedCurrentHostnameAfterImport,
                ); // Re-render main view
                showMessage(
                    messageBox,
                    "Aliases imported successfully!",
                    "success",
                );
            } catch (error) {
                console.error("Error parsing or importing aliases:", error);
                showMessage(
                    messageBox,
                    "Error importing aliases. Make sure the file is a valid JSON.",
                    "error",
                );
            } finally {
                // Clear the file input value so the same file can be selected again
                event.target.value = "";
                fileToImport = null; // Clear the temporary file reference
            }
        };
        reader.readAsText(fileToImport);
    });

    // --- Actions Icon Dropdown Toggle ---
    actionsIcon.addEventListener("click", (event) => {
        event.stopPropagation(); // Prevent document click from immediately closing it
        configActionsDropdown.classList.toggle("hidden");
    });
});
