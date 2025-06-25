/**
 * Contains functions for DOM manipulation and rendering UI elements.
 */

import {
    cleanHostname,
    adjustColorBrightness,
    getContrastTextColor,
    showInputError,
    clearInputErrors,
    showMessage,
    isSameOrSubdomain,
} from "./utils.js";
import { getCurrentTabUrl, saveAliases } from "./storage.js"; // Need saveAliases for delete operations

// Default color for new aliases/buttons if not specified
const defaultButtonColor = "#3b82f6";
// Define the default colors for the color picker grid (moved here as it's UI related)
const defaultColors = [
    // Grayscale
    "#000000",
    "#333333",
    "#666666",
    "#999999",
    "#CCCCCC",
    "#DDDDDD",
    "#EEEEEE",
    "#FFFFFF",
    // Red hues
    "#E53935",
    "#F44336",
    "#EF5350",
    "#FFCDD2",
    "#FFC107",
    "#FFEB3B",
    "#FFECB3",
    "#FFF9C4",
    // Orange/Yellow
    "#FB8C00",
    "#FF9800",
    "#FFA726",
    "#FFCC80",
    "#FFB300",
    "#FFCA28",
    "#FFE082",
    "#FFF59D",
    // Green hues
    "#43A047",
    "#4CAF50",
    "#66BB6A",
    "#C8E6C9",
    "#8BC34A",
    "#9CCC65",
    "#AED581",
    "#DCEDC8",
    // Blue hues
    "#1976D2",
    "#2196F3",
    "#42A5F5",
    "#BBDEFB",
    "#3F51B5",
    "#3F51B5",
    "#7986CB",
    "#C5CAE9",
    // Purple/Pink hues
    "#9C27B0",
    "#AB47BC",
    "#CE93D8",
    "#E1BEE7",
    "#E91E63",
    "#EC407A",
    "#F06292",
    "#F8BBD0",
];

/**
 * Updates the current URL display to show alias or url domain and applies color.
 * @param {HTMLElement} currentUrlDisplay - The DOM element to display the URL/alias.
 * @param {HTMLElement} currentUrlDisplayTable - The table container DOM element for styling.
 * @param {HTMLElement} messageBox - The message box DOM element.
 * @param {string} urlString - The full URL string of the current page.
 * @param {Array} aliases - The array of configured aliases.
 */
export function updateCurrentUrlDisplay(
    currentUrlDisplay,
    currentUrlDisplayTable,
    messageBox,
    urlString,
    aliases,
) {
    // Reset to default styles first
    currentUrlDisplay.textContent = "Loading...";
    currentUrlDisplay.style.color = "#555"; // Default text color for td content
    currentUrlDisplayTable.style.backgroundColor = "#f8fafc"; // Default table container background
    currentUrlDisplayTable.style.borderColor = "#e2e8f0"; // Default table container border color
    currentUrlDisplayTable.classList.remove("themed-table"); // Remove theme class

    if (!urlString) {
        currentUrlDisplay.textContent = "Unable to retrieve current URL.";
        currentUrlDisplay.style.color = "#ef4444"; // Error color for text
        currentUrlDisplayTable.style.borderColor = "#ef4444"; // Error color for border
        currentUrlDisplayTable.style.backgroundColor = "#fef2f2"; // Light red background for error
        return;
    }
    try {
        const url = new URL(urlString);
        // Extract full hostname (e.g., app.example.com)
        const currentFullHostname = url.hostname;

        let displayedText = currentFullHostname; // Default to showing just the full hostname
        let themeColor = null;

        // Check if current hostname matches any configured alias (alias.subdomain)
        const matchingAlias = aliases.find(
            (alias) =>
                cleanHostname(alias.subdomain) ===
                cleanHostname(currentFullHostname),
        );

        if (matchingAlias) {
            displayedText = matchingAlias.name; // Show alias name if a match is found
            themeColor = matchingAlias.color || defaultButtonColor;
        }

        currentUrlDisplay.textContent = displayedText;

        if (themeColor) {
            const textColor = getContrastTextColor(themeColor);
            currentUrlDisplay.style.color = textColor; // Set text color for the domain/alias name

            // Apply theme color to the whole table container
            currentUrlDisplayTable.style.backgroundColor = themeColor;
            currentUrlDisplayTable.style.borderColor = adjustColorBrightness(
                themeColor,
                -0.2,
            ); // Darker border
            currentUrlDisplayTable.classList.add("themed-table"); // Add class for transitions/specific overrides
        } else {
            // If no matching alias, ensure default styling (already reset at the start)
        }
    } catch (error) {
        console.error("Error parsing current URL for display:", error);
        currentUrlDisplay.textContent = "Invalid URL format.";
        currentUrlDisplay.style.color = "#ef4444"; // Error color
        currentUrlDisplayTable.style.borderColor = "#ef4444"; // Error color for table border
        currentUrlDisplayTable.style.backgroundColor = "#fef2f2"; // Light red background for error
    }
}

/**
 * Renders the domain aliases as clickable buttons for the main view, grouped by domain.
 * @param {HTMLElement} aliasesContainer - The container for the alias buttons.
 * @param {HTMLElement} messageBox - The message box DOM element.
 * @param {Array} domainAliases - The array of domain aliases.
 * @param {string} currentTabFullHostname - The normalized full hostname (e.g., app.example.com) of the currently active tab.
 */
export function renderMainViewAliases(
    aliasesContainer,
    messageBox,
    domainAliases,
    currentTabFullHostname,
) {
    aliasesContainer.innerHTML = ""; // Clear existing content

    // Group aliases by their 'domain' field (which is now the grouping domain)
    const groupedAliases = domainAliases.reduce((acc, alias) => {
        const groupKey = cleanHostname(alias.domain); // Use the new 'domain' field for grouping
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(alias);
        return acc;
    }, {});

    const domainKeys = Object.keys(groupedAliases).sort();

    if (domainAliases.length === 0) {
        aliasesContainer.textContent =
            "No aliases configured. Click the settings icon to add some.";
        return;
    }

    let foundMatchingGroup = false; // Flag to check if any relevant group was rendered

    domainKeys.forEach((groupKey) => {
        // Use the new isSameOrSubdomain function for robust comparison
        if (
            currentTabFullHostname &&
            isSameOrSubdomain(currentTabFullHostname, groupKey)
        ) {
            foundMatchingGroup = true; // A relevant group is found

            const domainGroupDiv = document.createElement("div");
            domainGroupDiv.className = "domain-group";

            const groupHeader = document.createElement("h4");
            groupHeader.className = "domain-group-header";
            groupHeader.textContent = groupKey; // Display the grouping domain
            domainGroupDiv.appendChild(groupHeader);

            const buttonsContainer = document.createElement("div");
            buttonsContainer.className = "domain-group-buttons";

            groupedAliases[groupKey].forEach((alias) => {
                // Only display if alias.subdomain is NOT the current page's full hostname
                if (cleanHostname(alias.subdomain) !== currentTabFullHostname) {
                    const aliasButton = document.createElement("button");
                    aliasButton.className = "alias-button";
                    aliasButton.textContent = alias.name;
                    // Store the full target subdomain for navigation
                    aliasButton.value = alias.subdomain; // Use alias.subdomain as the target hostname

                    // Apply custom color, defaulting to original blue if not set
                    const buttonColor = alias.color || defaultButtonColor;
                    aliasButton.style.backgroundColor = buttonColor;

                    aliasButton.addEventListener("click", async () => {
                        const targetHostname = aliasButton.value; // This is the full hostname (e.g., sb1.exap.com)
                        const currentTabUrl = await getCurrentTabUrl(
                            messageBox,
                        );

                        if (!currentTabUrl) {
                            return;
                        }

                        try {
                            const url = new URL(currentTabUrl);
                            // Replace only the hostname part with the new target hostname
                            const newUrl = `${url.protocol}//${targetHostname}${url.pathname}${url.search}${url.hash}`;

                            await chrome.tabs.create({ url: newUrl });
                            showMessage(
                                messageBox,
                                `Opened in new tab: ${newUrl}`,
                                "success",
                            );
                        } catch (error) {
                            console.error(
                                "Error processing URL or opening new tab:",
                                error,
                            );
                            showMessage(
                                messageBox,
                                "Error processing URL. Please check the current URL format.",
                                "error",
                            );
                        }
                    });

                    buttonsContainer.appendChild(aliasButton);
                }
            });

            // Only append the group if it contains buttons after filtering
            if (buttonsContainer.children.length > 0) {
                domainGroupDiv.appendChild(buttonsContainer);
                aliasesContainer.appendChild(domainGroupDiv);
            }
        }
    });

    // If no aliases were configured OR no matching group was found for the current domain
    if (aliasesContainer.children.length === 0 && !foundMatchingGroup) {
        aliasesContainer.textContent =
            "No aliases configured for this domain, or current page is already aliased. Click the settings icon to add some.";
    } else if (aliasesContainer.children.length === 0 && foundMatchingGroup) {
        // This case would mean aliases exist for the domain, but all are the current page.
        aliasesContainer.textContent =
            "No other aliases to switch to on this domain.";
    }
}

/**
 * Renders the domain aliases in the configuration view with delete and edit options.
 * @param {HTMLElement} configAliasesContainer - The container for the config aliases.
 * @param {Array} domainAliases - The array of domain aliases.
 * @param {Function} setEditingAliasIndex - Callback to set the index of the alias being edited.
 * @param {HTMLElement} newAliasNameInput - The input for the alias name.
 * @param {HTMLElement} newAliasSubdomainInput - The input for the subdomain.
 * @param {HTMLElement} newAliasDomainInput - The input for the domain.
 * @param {Function} setSelectedColor - Function to set the selected color in the picker.
 * @param {HTMLElement} addAliasBtn - The add/update alias button.
 * @param {HTMLElement} messageBox - The message box DOM element.
 * @param {Function} resetAliasForm - Function to reset the alias form.
 * @param {Function} renderMainViewAliasesCallback - Callback to re-render main view aliases.
 * @param {HTMLElement} currentUrlDisplay - The DOM element to display the URL/alias.
 * @param {HTMLElement} currentUrlDisplayTable - The table container DOM element for styling.
 */
export function renderConfigViewAliases(
    configAliasesContainer,
    domainAliases,
    setEditingAliasIndex,
    newAliasNameInput,
    newAliasSubdomainInput,
    newAliasDomainInput,
    setSelectedColor,
    addAliasBtn,
    messageBox,
    resetAliasForm,
    renderMainViewAliasesCallback,
    currentUrlDisplay,
    currentUrlDisplayTable,
) {
    configAliasesContainer.innerHTML = ""; // Clear existing content
    if (domainAliases.length === 0) {
        configAliasesContainer.textContent =
            "No aliases configured. Add one below.";
        return;
    }

    domainAliases.forEach((alias, index) => {
        const aliasItem = document.createElement("div");
        aliasItem.className = "alias-list-item"; // Use specific class for config view

        // EDIT BUTTON (ICON)
        const editButton = document.createElement("button");
        editButton.className = "icon-btn edit-icon-btn"; // Use base icon-btn class
        editButton.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>'; // SVG for edit icon (pencil)
        editButton.title = "Edit alias";
        editButton.addEventListener("click", () => {
            setEditingAliasIndex(index); // Set the index for the main module
            newAliasNameInput.value = alias.name;
            newAliasSubdomainInput.value = alias.subdomain || ""; // Populate subdomain
            newAliasDomainInput.value = alias.domain || ""; // Populate domain
            setSelectedColor(alias.color || defaultButtonColor); // Set color using custom picker logic
            addAliasBtn.textContent = "Update Alias";
            addAliasBtn.classList.remove("bg-green-500", "hover:bg-green-700");
            addAliasBtn.classList.add("bg-yellow-500", "hover:bg-yellow-700");
            clearInputErrors(); // Clear errors when editing

            // Logic to create/append Cancel button is handled in main.js now
        });

        const aliasInfo = document.createElement("span");
        aliasInfo.className = "alias-list-info";
        // Display alias name, subdomain, and domain, and color (as a swatch)
        const colorSwatch = document.createElement("span");
        colorSwatch.style.display = "inline-block";
        colorSwatch.style.width = "16px";
        colorSwatch.style.height = "16px";
        colorSwatch.style.borderRadius = "4px";
        colorSwatch.style.backgroundColor = alias.color || defaultButtonColor; // Use saved color or default blue
        colorSwatch.style.verticalAlign = "middle";
        colorSwatch.style.marginRight = "8px";
        colorSwatch.style.border = "1px solid #ccc";

        aliasInfo.appendChild(colorSwatch);
        aliasInfo.appendChild(
            document.createTextNode(
                `${alias.name} (${alias.subdomain}) - ${alias.domain}`,
            ),
        );

        // DELETE BUTTON (TEXT '✖')
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn"; // Use delete-btn class for text '✖'
        deleteButton.textContent = "✖"; // Set text content to '✖'
        deleteButton.title = "Delete alias";
        deleteButton.addEventListener("click", async () => {
            // Remove the alias from the array
            domainAliases.splice(index, 1);
            await saveAliases(domainAliases, messageBox); // Save updated list to storage

            // Re-render aliases in config view and main view
            renderConfigViewAliases(
                configAliasesContainer,
                domainAliases,
                setEditingAliasIndex,
                newAliasNameInput,
                newAliasSubdomainInput,
                newAliasDomainInput,
                setSelectedColor,
                addAliasBtn,
                messageBox,
                resetAliasForm,
                renderMainViewAliasesCallback,
                currentUrlDisplay,
                currentUrlDisplayTable,
            );

            const updatedCurrentUrl = await getCurrentTabUrl(messageBox);
            const updatedCurrentHostname = updatedCurrentUrl
                ? new URL(updatedCurrentUrl).hostname
                : null;
            const normalizedCurrentHostname = updatedCurrentHostname
                ? cleanHostname(updatedCurrentHostname)
                : null;
            renderMainViewAliasesCallback(normalizedCurrentHostname); // Use the callback from main.js
            updateCurrentUrlDisplay(
                currentUrlDisplay,
                currentUrlDisplayTable,
                messageBox,
                updatedCurrentUrl,
                domainAliases,
            );
            showMessage(messageBox, "Alias deleted successfully!", "success");
            resetAliasForm(); // Reset form if deleted the one being edited
        });

        // Append elements in the desired order: Edit Icon -> Alias Info -> Delete Button
        aliasItem.appendChild(editButton);
        aliasItem.appendChild(aliasInfo);
        aliasItem.appendChild(deleteButton);
        configAliasesContainer.appendChild(aliasItem);
    });
}

/**
 * Renders the color grid in the custom color picker.
 * @param {HTMLElement} colorGrid - The container for color swatches.
 * @param {Function} setSelectedColor - Callback function to set the selected color.
 * @param {HTMLElement} newAliasColorHidden - The hidden input storing the selected color.
 */
export function renderColorGrid(
    colorGrid,
    setSelectedColor,
    newAliasColorHidden,
) {
    colorGrid.innerHTML = ""; // Clear existing swatches
    defaultColors.forEach((color) => {
        const swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color.toUpperCase(); // Store color in dataset for easy lookup

        swatch.addEventListener("click", () => {
            setSelectedColor(color);
            // This is specific to the dropdown closing, so it needs to be passed or handled externally
            // For now, it will be handled by the main module's listener, or main will pass a closer callback.
            document.getElementById("colorPickerDropdown").style.display =
                "none";
        });
        colorGrid.appendChild(swatch);
    });

    // Set initial selected color
    setSelectedColor(newAliasColorHidden.value);
}

/**
 * Sets the selected color in the custom picker and updates display.
 * @param {string} color - The hex color code to set.
 * @param {HTMLElement} newAliasColorHidden - The hidden input to store the color.
 * @param {HTMLElement} newAliasColorDisplay - The swatch display element.
 * @param {HTMLElement} customHexInput - The hex input field.
 * @param {boolean} fromHexInput - True if the call is originating from manual hex input.
 */
export function setSelectedColor(
    color,
    newAliasColorHidden,
    newAliasColorDisplay,
    customHexInput,
    fromHexInput = false,
) {
    // Normalize color to uppercase hex #RRGGBB format for consistency
    let normalizedColor = color.toUpperCase();
    if (normalizedColor.length === 4 && normalizedColor.startsWith("#")) {
        // #RGB to #RRGGBB
        normalizedColor =
            "#" +
            normalizedColor[1] +
            normalizedColor[1] +
            normalizedColor[2] +
            normalizedColor[2] +
            normalizedColor[3] +
            normalizedColor[3];
    }

    // Validate the hex code
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(normalizedColor)) {
        if (!fromHexInput) {
            customHexInput.value = "";
        }
        return;
    }

    newAliasColorHidden.value = normalizedColor;
    newAliasColorDisplay.style.backgroundColor = normalizedColor;
    if (!fromHexInput) {
        customHexInput.value = normalizedColor;
        clearInputErrors();
    }

    // Update selected state in the grid
    document.querySelectorAll(".color-swatch").forEach((swatch) => {
        swatch.classList.remove("selected");
        const checkmark = swatch.querySelector(".checkmark");
        if (checkmark) checkmark.remove();
    });

    // Find and mark the selected swatch
    const selectedSwatch = document.querySelector(
        `.color-swatch[data-color="${normalizedColor}"]`,
    );
    if (selectedSwatch) {
        selectedSwatch.classList.add("selected");
        // Add checkmark SVG
        const checkmarkSVG = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
        );
        checkmarkSVG.setAttribute("viewBox", "0 0 24 24");
        checkmarkSVG.setAttribute("fill", "white");
        checkmarkSVG.classList.add("checkmark");
        checkmarkSVG.innerHTML =
            '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>';
        selectedSwatch.appendChild(checkmarkSVG);
    }
}

/**
 * Resets the add/edit form to its default "Add Alias" state.
 * @param {HTMLElement} newAliasNameInput
 * @param {HTMLElement} newAliasSubdomainInput
 * @param {HTMLElement} newAliasDomainInput
 * @param {Function} setSelectedColorCallback - Callback to set the color.
 * @param {HTMLElement} addAliasBtn
 * @param {Function} setEditingAliasIndex - Callback to reset editing index.
 * @param {HTMLElement} cancelEditBtn - The cancel edit button element.
 */
export function resetAliasForm(
    newAliasNameInput,
    newAliasSubdomainInput,
    newAliasDomainInput,
    setSelectedColorCallback,
    addAliasBtn,
    setEditingAliasIndex,
    cancelEditBtn,
) {
    newAliasNameInput.value = "";
    newAliasSubdomainInput.value = "";
    newAliasDomainInput.value = "";
    setSelectedColorCallback(defaultButtonColor); // Set color to default
    addAliasBtn.textContent = "Add Alias";
    addAliasBtn.classList.remove("bg-yellow-500", "hover:bg-yellow-700");
    addAliasBtn.classList.add("bg-green-500", "hover:bg-green-700");
    setEditingAliasIndex(-1); // Reset the index in the main module
    clearInputErrors(); // Corrected: This is now imported from utils.js
    if (cancelEditBtn && cancelEditBtn.parentNode) {
        // Check if it exists and has a parent
        cancelEditBtn.remove();
    }
    document.getElementById("colorPickerDropdown").style.display = "none"; // Ensure picker is closed
}

/**
 * Switches between the main view and the configuration view.
 * @param {HTMLElement} mainView - The main view DOM element.
 * @param {HTMLElement} configView - The config view DOM element.
 * @param {Function} renderConfigViewAliasesCallback - Callback to re-render config aliases.
 * @param {Function} resetAliasFormCallback - Callback to reset the alias form.
 */
export function showView(
    mainView,
    configView,
    renderConfigViewAliasesCallback,
    resetAliasFormCallback,
) {
    if (configView.style.display === "none") {
        // Currently in mainView, switching to configView
        mainView.style.display = "none";
        configView.style.display = "block";
        renderConfigViewAliasesCallback(); // Re-render config aliases when showing view
    } else {
        // Currently in configView, switching to mainView
        mainView.style.display = "block";
        configView.style.display = "none";
        resetAliasFormCallback(); // Reset form when leaving config view
    }
}
