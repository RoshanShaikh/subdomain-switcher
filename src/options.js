/**
 * Options page logic for the Subdomain Switcher.
 * Schema: domainGroups = [{ domain: string, aliases: [{ color, name, subdomain }] }]
 *
 * Views:
 *  - configView    : accordion list of all domains (home)
 *  - addAliasView  : alias editor (add / edit / duplicate)
 *  - addDomainView : new domain form
 */

import { loadDomainGroups, saveDomainGroups } from "./storage.js";
import {
    showMessage,
    showInputError,
    clearInputErrors,
    cleanHostname,
} from "./utils.js";
import {
    setSelectedColor as domSetSelectedColor,
    renderColorGrid,
    renderAccordionDomains,
    resetAliasForm as domResetAliasForm,
} from "./dom.js";

document.addEventListener("DOMContentLoaded", async () => {

    // ── DOM refs ─────────────────────────────────────────────────────────────

    const configView    = document.getElementById("configView");
    const addAliasView  = document.getElementById("addAliasView");
    const addDomainView = document.getElementById("addDomainView");

    // Config view
    const configDomainsContainer = document.getElementById("config-domains-container");
    const addDomainIcon          = document.getElementById("addDomainIcon");
    const actionsIcon            = document.getElementById("actionsIcon");
    const configActionsDropdown  = document.getElementById("configActionsDropdown");
    const exportAliasesBtn       = document.getElementById("exportAliasesBtn");
    const importAliasesBtn       = document.getElementById("importAliasesBtn");
    const importAliasesFile      = document.getElementById("importAliasesFile");
    const resetAliasesBtn        = document.getElementById("resetAliasesBtn");

    // Alias editor view
    const editorTitle              = document.getElementById("editorTitle");
    const backToAliasListBtn       = document.getElementById("backToAliasListBtn");
    const newAliasNameInput        = document.getElementById("newAliasName");
    const newAliasSubdomainPrefix  = document.getElementById("newAliasSubdomainPrefix");
    const subdomainSuffix          = document.getElementById("subdomainSuffix");
    const newAliasColorDisplay     = document.getElementById("newAliasColorDisplay");
    const newAliasColorHidden    = document.getElementById("newAliasColorHidden");
    const customHexInput         = document.getElementById("customHexInput");
    const colorPickerDropdown    = document.getElementById("colorPickerDropdown");
    const colorGrid              = document.getElementById("colorGrid");
    const colorPickerResetBtn    = document.getElementById("colorPickerResetBtn");
    const addAliasBtn            = document.getElementById("addAliasBtn");
    const cancelEditBtn          = document.getElementById("cancelEditBtn");

    // Add domain view
    const backFromAddDomainBtn = document.getElementById("backFromAddDomainBtn");
    const newDomainInput       = document.getElementById("newDomainInput");
    const createDomainBtn      = document.getElementById("createDomainBtn");

    // Message box & modals
    const messageBox = document.getElementById("messageBox");

    const resetConfirmationModal = document.getElementById("resetConfirmationModal");
    const confirmResetBtn        = document.getElementById("confirmResetBtn");
    const cancelResetBtn         = document.getElementById("cancelResetBtn");

    const importConfirmationModal = document.getElementById("importConfirmationModal");
    const confirmImportBtn        = document.getElementById("confirmImportBtn");
    const cancelImportBtn         = document.getElementById("cancelImportBtn");

    const deleteDomainModal      = document.getElementById("deleteDomainModal");
    const domainToDeleteName     = document.getElementById("domainToDeleteName");
    const confirmDeleteDomainBtn = document.getElementById("confirmDeleteDomainBtn");
    const cancelDeleteDomainBtn  = document.getElementById("cancelDeleteDomainBtn");

    const deleteAliasModal       = document.getElementById("deleteAliasModal");
    const aliasToDeleteName      = document.getElementById("aliasToDeleteName");
    const confirmDeleteAliasBtn  = document.getElementById("confirmDeleteAliasBtn");
    const cancelDeleteAliasBtn   = document.getElementById("cancelDeleteAliasBtn");

    // ── State ─────────────────────────────────────────────────────────────────

    let domainGroups          = [];
    let openAccordionIndices  = new Set();  // which domain accordions are expanded
    let activeDomainIndex     = -1;         // domain being edited into
    let editingAliasIndex     = -1;         // alias being edited (-1 = new)
    let editingDomainIndex    = -1;         // domain being renamed (-1 = creating new)
    let domainIndexToDelete   = -1;
    let aliasIndexToDelete    = -1;
    let groupIndexForAlias    = -1;         // which group the alias-to-delete belongs to
    let fileToImport          = null;

    // ── Helpers ───────────────────────────────────────────────────────────────

    const closeActionsDropdown = () => configActionsDropdown.classList.add("hidden");

    const setSelectedColor = (color, fromHexInput = false) =>
        domSetSelectedColor(color, newAliasColorHidden, newAliasColorDisplay, customHexInput, fromHexInput);

    const resetAliasForm = () =>
        domResetAliasForm(
            newAliasNameInput,
            newAliasSubdomainPrefix,
            setSelectedColor,
            addAliasBtn,
            (idx) => { editingAliasIndex = idx; },
            cancelEditBtn,
        );

    const redrawAccordion = () => {
        renderAccordionDomains(
            configDomainsContainer,
            domainGroups,
            openAccordionIndices,
            (idx) => {
                if (openAccordionIndices.has(idx)) {
                    openAccordionIndices.delete(idx);
                } else {
                    openAccordionIndices.add(idx);
                }
                redrawAccordion();
            },
            (groupIdx) => openAliasEditor(groupIdx, -1, { name: "", subdomain: "", color: "#3b82f6" }, "add"),
            (groupIdx, aliasIdx, aliasData, mode) => openAliasEditor(groupIdx, aliasIdx, aliasData, mode),
            (groupIdx, aliasIdx) => promptDeleteAlias(groupIdx, aliasIdx),
            (groupIdx) => openDomainEditor(groupIdx),
            (groupIdx) => promptDeleteDomain(groupIdx),
        );
    };

    // ── View navigation ───────────────────────────────────────────────────────

    const showView = (name) => {
        configView.style.display    = "none";
        addAliasView.style.display  = "none";
        addDomainView.style.display = "none";
        closeActionsDropdown();

        if (name === "config") {
            configView.style.display = "block";
            redrawAccordion();
        } else if (name === "addAlias") {
            addAliasView.style.display = "block";
        } else if (name === "addDomain") {
            addDomainView.style.display = "block";
            clearInputErrors();
            if (editingDomainIndex !== -1) {
                // Edit mode — pre-fill existing domain
                newDomainInput.value = domainGroups[editingDomainIndex].domain;
                document.querySelector("#addDomainView .header-title").textContent = "Edit Domain";
                createDomainBtn.textContent = "Save Changes";
            } else {
                // Create mode
                newDomainInput.value = "";
                document.querySelector("#addDomainView .header-title").textContent = "Add Domain";
                createDomainBtn.textContent = "Create Domain";
            }
        }
    };

    const openAliasEditor = (groupIdx, aliasIdx, aliasData, mode) => {
        activeDomainIndex = groupIdx;
        editingAliasIndex = aliasIdx;

        const domain = domainGroups[groupIdx].domain;
        // Update the suffix label
        subdomainSuffix.textContent = "." + domain;

        newAliasNameInput.value = aliasData.name || "";

        // alias.subdomain is stored as prefix only — use it directly
        newAliasSubdomainPrefix.value = aliasData.subdomain || "";

        setSelectedColor(aliasData.color || "#3b82f6");

        if (mode === "edit") {
            editorTitle.textContent     = "Edit Alias";
            addAliasBtn.textContent     = "Update Alias";
            addAliasBtn.classList.remove("bg-green-500", "hover:bg-green-700");
            addAliasBtn.classList.add("bg-yellow-500", "hover:bg-yellow-700");
            cancelEditBtn.style.display = "block";
        } else {
            editorTitle.textContent     = mode === "duplicate" ? "Duplicate Alias" : "Add New Alias";
            addAliasBtn.textContent     = "Add Alias";
            addAliasBtn.classList.remove("bg-yellow-500", "hover:bg-yellow-700");
            addAliasBtn.classList.add("bg-green-500", "hover:bg-green-700");
            cancelEditBtn.style.display = "none";
        }
        clearInputErrors();
        showView("addAlias");
    };

    // ── Delete prompts ────────────────────────────────────────────────────────

    const openDomainEditor = (idx) => {
        editingDomainIndex = idx;
        showView("addDomain");
    };

    const promptDeleteDomain = (idx) => {
        domainIndexToDelete = idx;
        domainToDeleteName.textContent = domainGroups[idx].domain;
        deleteDomainModal.style.display = "flex";
        deleteDomainModal.querySelector(".modal-content").classList.add("show");
    };

    const promptDeleteAlias = (groupIdx, aliasIdx) => {
        groupIndexForAlias  = groupIdx;
        aliasIndexToDelete  = aliasIdx;
        const alias = domainGroups[groupIdx].aliases[aliasIdx];
        aliasToDeleteName.textContent = alias.name;
        deleteAliasModal.style.display = "flex";
        deleteAliasModal.querySelector(".modal-content").classList.add("show");
    };

    // ── Init ──────────────────────────────────────────────────────────────────

    domainGroups = await loadDomainGroups(messageBox);
    showView("config");
    renderColorGrid(colorGrid, setSelectedColor, newAliasColorHidden);

    chrome.storage.sync.onChanged.addListener(async (changes) => {
        if (changes.domainGroups) {
            domainGroups = changes.domainGroups.newValue || [];
            if (configView.style.display === "block") redrawAccordion();
        }
    });

    // ── Config view events ────────────────────────────────────────────────────

    addDomainIcon.addEventListener("click", () => showView("addDomain"));

    actionsIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        configActionsDropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
        if (
            !configActionsDropdown.classList.contains("hidden") &&
            !actionsIcon.contains(e.target) &&
            !configActionsDropdown.contains(e.target)
        ) closeActionsDropdown();

        if (
            colorPickerDropdown.style.display === "block" &&
            !colorPickerDropdown.contains(e.target) &&
            !newAliasColorDisplay.contains(e.target) &&
            !customHexInput.contains(e.target)
        ) colorPickerDropdown.style.display = "none";
    });

    // ── Add Domain view events ────────────────────────────────────────────────

    backFromAddDomainBtn.addEventListener("click", () => {
        editingDomainIndex = -1;
        showView("config");
    });

    createDomainBtn.addEventListener("click", async () => {
        clearInputErrors();
        const raw = newDomainInput.value.trim();
        if (!raw) {
            showInputError(newDomainInput, "Domain is required.");
            return;
        }
        let domain;
        try {
            const url = new URL(`http://${raw}`);
            domain = cleanHostname(url.hostname);
            if (domain !== cleanHostname(raw)) throw new Error();
        } catch {
            showInputError(newDomainInput, "Please enter a valid hostname (e.g., app.example.com).");
            return;
        }

        if (editingDomainIndex !== -1) {
            // Edit mode — check for duplicate only against other groups
            if (domainGroups.some((g, i) => i !== editingDomainIndex && cleanHostname(g.domain) === domain)) {
                showInputError(newDomainInput, "This domain already exists.");
                return;
            }
            domainGroups[editingDomainIndex].domain = domain;
            await saveDomainGroups(domainGroups, messageBox);
            showMessage(messageBox, `Domain updated to "${domain}".`, "success");
            openAccordionIndices.add(editingDomainIndex);
            editingDomainIndex = -1;
        } else {
            // Create mode
            if (domainGroups.some((g) => cleanHostname(g.domain) === domain)) {
                showInputError(newDomainInput, "This domain already exists.");
                return;
            }
            domainGroups.push({ domain, aliases: [] });
            await saveDomainGroups(domainGroups, messageBox);
            showMessage(messageBox, `Domain "${domain}" created.`, "success");
            openAccordionIndices.add(domainGroups.length - 1);
        }
        showView("config");
    });

    // ── Alias editor events ───────────────────────────────────────────────────

    backToAliasListBtn.addEventListener("click", () => {
        resetAliasForm();
        showView("config");
    });

    cancelEditBtn.addEventListener("click", () => {
        resetAliasForm();
        showView("config");
    });

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
        setSelectedColor("#3b82f6");
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
            setSelectedColor("#3b82f6");
            clearInputErrors();
        } else if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(hex)) {
            showInputError(customHexInput, "Invalid hex code. Using default color.");
            setSelectedColor("#3b82f6");
        } else {
            setSelectedColor(hex);
        }
    });

    addAliasBtn.addEventListener("click", async () => {
        clearInputErrors();
        const name   = newAliasNameInput.value.trim();
        const prefix = newAliasSubdomainPrefix.value.trim();
        const color  = newAliasColorHidden.value;
        const group  = domainGroups[activeDomainIndex];
        let hasError = false;

        if (!name) {
            showInputError(newAliasNameInput, "Alias name is required.");
            hasError = true;
        }

        if (!prefix) {
            showInputError(newAliasSubdomainPrefix, "Subdomain prefix is required.");
            hasError = true;
        } else if (!/^[a-zA-Z0-9-]+$/.test(prefix)) {
            showInputError(newAliasSubdomainPrefix, "Only letters, numbers, and hyphens allowed.");
            hasError = true;
        }

        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(color)) {
            showInputError(customHexInput, "Please provide a valid hex color code.");
            hasError = true;
        }

        const aliases = group.aliases || [];

        if (aliases.some((a, i) => i !== editingAliasIndex && a.name.toLowerCase() === name.toLowerCase())) {
            showInputError(newAliasNameInput, "Alias name already exists.");
            hasError = true;
        }

        // Duplicate check: compare prefixes directly (domain is shared, so prefix uniqueness is enough)
        if (!hasError && aliases.some((a, i) => i !== editingAliasIndex && a.subdomain.toLowerCase() === prefix.toLowerCase())) {
            showInputError(newAliasSubdomainPrefix, "This subdomain already exists.");
            hasError = true;
        }

        if (hasError) return;

        // Store prefix only — full hostname is composed at runtime as prefix + "." + group.domain
        if (editingAliasIndex !== -1) {
            group.aliases[editingAliasIndex] = { name, subdomain: prefix, color };
            showMessage(messageBox, "Alias updated successfully!", "success");
        } else {
            group.aliases.push({ name, subdomain: prefix, color });
            showMessage(messageBox, "Alias added successfully!", "success");
        }

        await saveDomainGroups(domainGroups, messageBox);
        resetAliasForm();
        openAccordionIndices.add(activeDomainIndex);
        showView("config");
    });

    // ── Delete domain modal ───────────────────────────────────────────────────

    confirmDeleteDomainBtn.addEventListener("click", async () => {
        deleteDomainModal.style.display = "none";
        if (domainIndexToDelete !== -1) {
            openAccordionIndices.delete(domainIndexToDelete);
            // Shift down any open indices above the deleted one
            const shifted = new Set();
            openAccordionIndices.forEach((i) => shifted.add(i > domainIndexToDelete ? i - 1 : i));
            openAccordionIndices = shifted;

            domainGroups.splice(domainIndexToDelete, 1);
            await saveDomainGroups(domainGroups, messageBox);
            showMessage(messageBox, "Domain deleted.", "success");
            domainIndexToDelete = -1;
            showView("config");
        }
    });

    cancelDeleteDomainBtn.addEventListener("click", () => {
        deleteDomainModal.style.display = "none";
        domainIndexToDelete = -1;
    });

    // ── Delete alias modal ────────────────────────────────────────────────────

    confirmDeleteAliasBtn.addEventListener("click", async () => {
        deleteAliasModal.style.display = "none";
        if (aliasIndexToDelete !== -1 && groupIndexForAlias !== -1) {
            domainGroups[groupIndexForAlias].aliases.splice(aliasIndexToDelete, 1);
            await saveDomainGroups(domainGroups, messageBox);
            showMessage(messageBox, "Alias deleted.", "success");
            aliasIndexToDelete = -1;
            groupIndexForAlias = -1;
            showView("config");
        }
    });

    cancelDeleteAliasBtn.addEventListener("click", () => {
        deleteAliasModal.style.display = "none";
        aliasIndexToDelete = -1;
        groupIndexForAlias = -1;
    });

    // ── Reset modal ───────────────────────────────────────────────────────────

    resetAliasesBtn.addEventListener("click", () => {
        closeActionsDropdown();
        resetConfirmationModal.style.display = "flex";
        resetConfirmationModal.querySelector(".modal-content").classList.add("show");
    });

    confirmResetBtn.addEventListener("click", async () => {
        resetConfirmationModal.style.display = "none";
        domainGroups = [];
        openAccordionIndices = new Set();
        await saveDomainGroups(domainGroups, messageBox);
        showMessage(messageBox, "All data removed.", "success");
        showView("config");
    });

    cancelResetBtn.addEventListener("click", () => {
        resetConfirmationModal.style.display = "none";
    });

    // ── Export / Import ───────────────────────────────────────────────────────

    exportAliasesBtn.addEventListener("click", async () => {
        closeActionsDropdown();
        const json = JSON.stringify(domainGroups, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = "subdomain_switcher_config.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage(messageBox, "Configuration exported.", "success");
    });

    importAliasesBtn.addEventListener("click", () => {
        closeActionsDropdown();
        importConfirmationModal.style.display = "flex";
        importConfirmationModal.querySelector(".modal-content").classList.add("show");
    });

    confirmImportBtn.addEventListener("click", () => {
        importConfirmationModal.style.display = "none";
        importAliasesFile.click();
    });

    cancelImportBtn.addEventListener("click", () => {
        importConfirmationModal.style.display = "none";
        fileToImport = null;
    });

    importAliasesFile.addEventListener("change", (event) => {
        fileToImport = event.target.files[0];
        if (!fileToImport) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const isValid =
                    Array.isArray(data) &&
                    data.every(
                        (g) =>
                            typeof g.domain === "string" &&
                            Array.isArray(g.aliases) &&
                            g.aliases.every(
                                (a) =>
                                    typeof a.name === "string" &&
                                    typeof a.subdomain === "string" &&
                                    typeof a.color === "string" &&
                                    /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(a.color),
                            ),
                    );

                if (!isValid) {
                    showMessage(messageBox, "Invalid file format.", "error");
                    return;
                }

                domainGroups = data;
                openAccordionIndices = new Set();
                await saveDomainGroups(domainGroups, messageBox);
                showMessage(messageBox, "Configuration imported.", "success");
                showView("config");
            } catch {
                showMessage(messageBox, "Error reading file. Please check the JSON.", "error");
            } finally {
                event.target.value = "";
                fileToImport = null;
            }
        };
        reader.readAsText(fileToImport);
    });
});