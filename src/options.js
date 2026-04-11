/**
 * Options page logic for the Subdomain Switcher.
 * Manages alias configuration (add, edit, delete, import, export, reset).
 */

import { loadAliases, saveAliases } from "./storage.js";
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
    renderConfigViewAliases,
    resetAliasForm as domResetAliasForm,
} from "./dom.js";

document.addEventListener("DOMContentLoaded", async () => {
    // --- DOM Element References ---
    const configView = document.getElementById("configView");
    const configAliasesContainer = document.getElementById(
        "config-aliases-container",
    );
    const addAliasIcon = document.getElementById("addAliasIcon");
    const messageBox = document.getElementById("messageBox");

    // Add/Edit Alias View Elements
    const addAliasView = document.getElementById("addAliasView");
    const backToAddAliasBtn = document.getElementById("backToAddAliasBtn");

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
    const cancelEditBtn = document.getElementById("cancelEditBtn");

    // Action Menu Elements
    const actionsIcon = document.getElementById("actionsIcon");
    const configActionsDropdown = document.getElementById(
        "configActionsDropdown",
    );
    const exportAliasesBtn = document.getElementById("exportAliasesBtn");
    const importAliasesBtn = document.getElementById("importAliasesBtn");
    const importAliasesFile = document.getElementById("importAliasesFile");
    const resetAliasesBtn = document.getElementById("resetAliasesBtn");

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

    const deleteConfirmationModal = document.getElementById(
        "deleteConfirmationModal",
    );
    const aliasToDeleteName = document.getElementById("aliasToDeleteName");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

    let fileToImport = null;
    let aliasIndexToDelete = -1;

    // --- Application State ---
    let domainAliases = [];
    let editingAliasIndex = -1;

    // --- Callbacks/Helper Functions ---

    const closeActionsDropdown = () => {
        if (!configActionsDropdown.classList.contains("hidden")) {
            configActionsDropdown.classList.add("hidden");
        }
    };

    const setSelectedColor = (color, fromHexInput = false) => {
        domSetSelectedColor(
            color,
            newAliasColorHidden,
            newAliasColorDisplay,
            customHexInput,
            fromHexInput,
        );
    };

    const resetAliasForm = () => {
        domResetAliasForm(
            newAliasNameInput,
            newAliasSubdomainInput,
            newAliasDomainInput,
            setSelectedColor,
            addAliasBtn,
            (index) => {
                editingAliasIndex = index;
            },
            cancelEditBtn,
        );
    };

    const renderConfigViewAliasesWrapper = () => {
        renderConfigViewAliases(
            configAliasesContainer,
            domainAliases,
            (index, aliasData) => {
                editingAliasIndex = index;
                newAliasNameInput.value = aliasData.name;
                newAliasSubdomainInput.value = aliasData.subdomain || "";
                newAliasDomainInput.value = aliasData.domain || "";
                setSelectedColor(aliasData.color || "#3b82f6");
                addAliasBtn.textContent =
                    index !== -1 ? "Update Alias" : "Add Alias";
                addAliasBtn.classList.remove(
                    "bg-green-500",
                    "hover:bg-green-700",
                    "bg-yellow-500",
                    "hover:bg-yellow-700",
                );
                addAliasBtn.classList.add(
                    index !== -1 ? "bg-yellow-500" : "bg-green-500",
                    index !== -1 ? "hover:bg-yellow-700" : "hover:bg-green-700",
                );
                if (index !== -1) {
                    cancelEditBtn.style.display = "block";
                } else {
                    cancelEditBtn.style.display = "none";
                }
                clearInputErrors();
                showView("addAlias");
            },
            messageBox,
            undefined, // renderMainViewAliasesCallback - not needed on options page
            undefined, // currentUrlDisplay - not needed on options page
            undefined, // currentUrlDisplayTable - not needed on options page
            deleteConfirmationModal,
            aliasToDeleteName,
            (index) => {
                aliasIndexToDelete = index;
            },
        );
    };

    /**
     * Manages which view (config, addAlias) is currently displayed.
     * @param {string} viewName - The name of the view to show ('config' or 'addAlias').
     */
    const showView = (viewName) => {
        configView.style.display = "none";
        addAliasView.style.display = "none";

        if (viewName === "config") {
            configView.style.display = "block";
            renderConfigViewAliasesWrapper();
            resetAliasForm();
        } else if (viewName === "addAlias") {
            addAliasView.style.display = "block";
        }
        closeActionsDropdown();
    };

    // --- Initialization ---
    domainAliases = await loadAliases(messageBox);
    showView("config");
    renderColorGrid(colorGrid, setSelectedColor, newAliasColorHidden);

    // Listen for changes in storage (sync across contexts)
    chrome.storage.sync.onChanged.addListener(async (changes) => {
        if (changes.domainAliases) {
            domainAliases = changes.domainAliases.newValue || [];
            if (configView.style.display === "block") {
                renderConfigViewAliasesWrapper();
            }
        }
    });

    // --- Event Listeners ---

    // Switch to addAliasView from config view
    addAliasIcon.addEventListener("click", () => {
        resetAliasForm();
        showView("addAlias");
    });

    // Switch back to config view from addAliasView
    backToAddAliasBtn.addEventListener("click", () => {
        showView("config");
    });

    // Toggle color picker dropdown
    newAliasColorDisplay.addEventListener("click", (event) => {
        event.stopPropagation();
        colorPickerDropdown.style.display =
            colorPickerDropdown.style.display === "block" ? "none" : "block";
        if (colorPickerDropdown.style.display === "block") {
            setSelectedColor(newAliasColorHidden.value);
            customHexInput.focus();
        }
    });

    // Handle "Reset" click in color picker
    colorPickerResetBtn.addEventListener("click", () => {
        setSelectedColor("#3b82f6");
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

    // Handle blur event for final validation on hex input
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
        if (
            colorPickerDropdown.style.display === "block" &&
            !colorPickerDropdown.contains(event.target) &&
            !newAliasColorDisplay.contains(event.target) &&
            !customHexInput.contains(event.target)
        ) {
            colorPickerDropdown.style.display = "none";
        }

        if (
            !configActionsDropdown.classList.contains("hidden") &&
            !actionsIcon.contains(event.target) &&
            !configActionsDropdown.contains(event.target)
        ) {
            closeActionsDropdown();
        }
    });

    // Add/Update Alias
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
        showView("config");
        resetAliasForm();
    });

    // Cancel Edit button
    cancelEditBtn.addEventListener("click", () => {
        resetAliasForm();
        showView("config");
    });

    // --- Reset Aliases Functionality ---
    resetAliasesBtn.addEventListener("click", () => {
        closeActionsDropdown();
        resetConfirmationModal.style.display = "flex";
        resetConfirmationModal
            .querySelector(".modal-content")
            .classList.add("show");
    });

    confirmResetBtn.addEventListener("click", async () => {
        resetConfirmationModal.style.display = "none";

        domainAliases = [];
        await saveAliases(domainAliases, messageBox);

        renderConfigViewAliasesWrapper();
        showMessage(messageBox, "All aliases removed successfully!", "success");
        resetAliasForm();
    });

    cancelResetBtn.addEventListener("click", () => {
        resetConfirmationModal.style.display = "none";
    });

    // --- Export/Import Aliases Functionality ---
    exportAliasesBtn.addEventListener("click", async () => {
        closeActionsDropdown();
        const aliasesToExport = await loadAliases(messageBox);
        const jsonString = JSON.stringify(aliasesToExport, null, 2);

        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "subdomain_switcher_aliases.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage(messageBox, "Aliases exported successfully!", "success");
    });

    importAliasesBtn.addEventListener("click", () => {
        closeActionsDropdown();
        importConfirmationModal.style.display = "flex";
        importConfirmationModal
            .querySelector(".modal-content")
            .classList.add("show");
    });

    confirmImportBtn.addEventListener("click", () => {
        importConfirmationModal.style.display = "none";
        importAliasesFile.click();
    });

    cancelImportBtn.addEventListener("click", () => {
        importConfirmationModal.style.display = "none";
        importAliasesFile.value = "";
        fileToImport = null;
    });

    importAliasesFile.addEventListener("change", (event) => {
        fileToImport = event.target.files[0];
        if (!fileToImport) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

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
                            ),
                    );

                if (!isValid) {
                    showMessage(
                        messageBox,
                        "Invalid JSON format or data structure in the imported file. Please ensure it's an array of alias objects.",
                        "error",
                    );
                    return;
                }

                domainAliases = importedData;
                await saveAliases(domainAliases, messageBox);
                renderConfigViewAliasesWrapper();
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
                event.target.value = "";
                fileToImport = null;
            }
        };
        reader.readAsText(fileToImport);
    });

    // --- Delete Alias Confirmation Logic ---
    confirmDeleteBtn.addEventListener("click", async () => {
        deleteConfirmationModal.style.display = "none";
        if (aliasIndexToDelete !== -1) {
            domainAliases.splice(aliasIndexToDelete, 1);
            await saveAliases(domainAliases, messageBox);

            renderConfigViewAliasesWrapper();
            showMessage(messageBox, "Alias deleted successfully!", "success");
            resetAliasForm();
            aliasIndexToDelete = -1;
        }
    });

    cancelDeleteBtn.addEventListener("click", () => {
        deleteConfirmationModal.style.display = "none";
        aliasIndexToDelete = -1;
    });

    // --- Actions Icon Dropdown Toggle ---
    actionsIcon.addEventListener("click", (event) => {
        event.stopPropagation();
        configActionsDropdown.classList.toggle("hidden");
    });
});