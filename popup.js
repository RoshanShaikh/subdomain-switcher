// popup.js

document.addEventListener("DOMContentLoaded", async () => {
    // Main View Elements
    const mainView = document.getElementById("mainView");
    const aliasesContainer = document.getElementById("aliases-container");
    const currentUrlDisplay = document.getElementById("currentUrlDisplay");
    const currentUrlDisplayTable = document.getElementById(
        "currentUrlDisplayTable",
    ); // Get the table container
    const optionsIcon = document.getElementById("optionsIcon");
    const messageBox = document.getElementById("messageBox"); // Common message box

    // Config View Elements
    const configView = document.getElementById("configView");
    const configAliasesContainer = document.getElementById(
        "config-aliases-container",
    );
    const newAliasNameInput = document.getElementById("newAliasName");
    const newAliasDomainInput = document.getElementById("newAliasDomain");

    // Custom Color Picker Elements
    const newAliasColorDisplay = document.getElementById(
        "newAliasColorDisplay",
    ); // The div that shows current color and acts as toggle
    const newAliasColorHidden = document.getElementById("newAliasColorHidden"); // Hidden input to store selected color
    const customHexInput = document.getElementById("customHexInput"); // Primary hex input
    const colorPickerDropdown = document.getElementById("colorPickerDropdown");
    const colorGrid = document.getElementById("colorGrid");
    const colorPickerResetBtn = document.getElementById("colorPickerResetBtn");

    const addAliasBtn = document.getElementById("addAliasBtn");
    const resetAliasesBtn = document.getElementById("resetAliasesBtn");
    const backIcon = document.getElementById("backIcon");

    // New element for Cancel Edit button (will be added dynamically if not in HTML)
    let cancelEditBtn = document.getElementById("cancelEditBtn"); // Will be created if it doesn't exist

    // Modal elements
    const resetConfirmationModal = document.getElementById(
        "resetConfirmationModal",
    );
    const confirmResetBtn = document.getElementById("confirmResetBtn");
    const cancelResetBtn = document.getElementById("cancelResetBtn");

    let domainAliases = []; // This will hold the current aliases, loaded from storage
    let editingAliasIndex = -1; // -1 indicates no alias is being edited

    // Define the default colors for the color picker grid
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

    const defaultButtonColor = "#3b82f6"; // Default color for new aliases

    // --- Utility Functions ---

    /**
     * Displays a message in the message box.
     * @param {string} message - The message to display.
     * @param {string} type - The type of message (e.g., 'error', 'success').
     */
    function showMessage(message, type = "info") {
        messageBox.textContent = message;
        messageBox.style.display = "block";
        messageBox.className = "message-box"; // Reset classes
        if (type === "error") {
            messageBox.classList.add(
                "bg-red-100",
                "text-red-800",
                "border-red-400",
            );
        } else if (type === "success") {
            messageBox.classList.add(
                "bg-green-100",
                "text-green-800",
                "border-green-400",
            );
        } else {
            messageBox.classList.add(
                "bg-yellow-100",
                "text-yellow-800",
                "border-yellow-400",
            );
        }
        // Hide message after 3 seconds
        setTimeout(() => {
            messageBox.style.display = "none";
        }, 3000);
    }

    /**
     * Shows an error message next to an input field.
     * @param {HTMLElement} inputElement - The input field to show the error for.
     * @param {string} message - The error message to display.
     */
    function showInputError(inputElement, message) {
        // Remove existing error messages for this input
        const existingError = inputElement.nextElementSibling;
        if (
            existingError &&
            existingError.classList.contains("input-error-message")
        ) {
            existingError.remove();
        }

        const errorDiv = document.createElement("div");
        errorDiv.className = "input-error-message text-red-600 text-xs mt-1";
        errorDiv.textContent = message;
        inputElement.parentNode.insertBefore(
            errorDiv,
            inputElement.nextSibling,
        );

        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    /**
     * Clears all input error messages.
     */
    function clearInputErrors() {
        document
            .querySelectorAll(".input-error-message")
            .forEach((el) => el.remove());
    }

    /**
     * Normalizes a domain string by removing protocol and "www.".
     * @param {string} domain - The domain string to normalize.
     * @returns {string} The normalized domain.
     */
    function normalizeDomain(domain) {
        return domain.replace(/^(https?:\/\/)?(www\.)?/, "").toLowerCase();
    }

    /**
     * Loads aliases from Chrome storage.
     * @returns {Promise<Array>} Array of aliases.
     */
    async function loadAliases() {
        try {
            const result = await chrome.storage.sync.get("domainAliases");
            return result.domainAliases || []; // Return empty array if no aliases
        } catch (error) {
            console.error("Error loading aliases from storage:", error);
            showMessage("Error loading saved aliases.", "error");
            return [];
        }
    }

    /**
     * Saves aliases to Chrome storage.
     * @param {Array} aliases - The array of aliases to save.
     */
    async function saveAliases(aliases) {
        try {
            await chrome.storage.sync.set({ domainAliases: aliases });
            showMessage("Aliases saved successfully!", "success");
        } catch (error) {
            console.error("Error saving aliases to storage:", error);
            showMessage("Error saving aliases.", "error");
        }
    }

    /**
     * Gets the currently active tab's URL.
     * @returns {Promise<string|null>} The URL of the active tab, or null if an error occurs.
     */
    async function getCurrentTabUrl() {
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
                "Could not get current tab URL. Ensure necessary permissions.",
                "error",
            );
            return null;
        }
    }

    /**
     * Adjusts the brightness of a hex color to ensure good contrast for text.
     * @param {string} hex - The hex color code.
     * @param {number} percent - Percentage to lighten (positive) or darken (negative).
     * @returns {string} Adjusted hex color.
     */
    function adjustColorBrightness(hex, percent) {
        let f = parseInt(hex.slice(1), 16),
            t = percent < 0 ? 0 : 255,
            p = percent < 0 ? percent * -1 : percent,
            R = f >> 16,
            G = (f >> 8) & 0x00ff,
            B = f & 0x0000ff;
        return (
            "#" +
            (
                0x1000000 +
                (Math.round((t - R) * p) + R) * 0x10000 +
                (Math.round((t - G) * p) + G) * 0x100 +
                (Math.round((t - B) * p) + B)
            )
                .toString(16)
                .slice(1)
        );
    }

    /**
     * Determines if a hex color is light or dark for text contrast.
     * @param {string} hexColor - The hex color code.
     * @returns {string} 'dark' if the color is light, 'light' if the color is dark.
     */
    function getContrastTextColor(hexColor) {
        if (
            !hexColor ||
            hexColor.length < 7 ||
            hexColor.includes("undefined")
        ) {
            return "#2c3e50"; // Default dark text if color is invalid/missing
        }
        const r = parseInt(hexColor.substring(1, 3), 16);
        const g = parseInt(hexColor.substring(3, 5), 16);
        const b = parseInt(hexColor.substring(5, 7), 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 128 ? "#2c3e50" : "#ffffff"; // Use dark text for light backgrounds, white for dark backgrounds
    }

    /**
     * Updates the current URL display to show alias or domain and applies color.
     * @param {string} urlString - The full URL string of the current page.
     * @param {Array} aliases - The array of configured aliases.
     */
    function updateCurrentUrlDisplay(urlString, aliases) {
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
            const currentDomain = url.hostname;
            const normalizedCurrentDomain = normalizeDomain(currentDomain);

            let displayedText = currentDomain; // Default to showing just the domain
            let themeColor = null;

            // Check if current domain matches any configured alias
            const matchingAlias = aliases.find(
                (alias) =>
                    normalizeDomain(alias.domain) === normalizedCurrentDomain,
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
                currentUrlDisplayTable.style.borderColor =
                    adjustColorBrightness(themeColor, -0.2); // Darker border
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
     * Sets the selected color in the custom picker and updates display.
     * @param {string} color - The hex color code to set.
     * @param {boolean} fromHexInput - True if the call is originating from manual hex input.
     */
    function setSelectedColor(color, fromHexInput = false) {
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
            // If invalid, don't set the color in hidden input or swatch, just update the hex input field
            if (!fromHexInput) {
                customHexInput.value = ""; // Clear if coming from a swatch click that somehow results in invalid
            }
            // Do not show an error here, `onblur` will handle the final validation.
            return; // Don't update color if invalid
        }

        newAliasColorHidden.value = normalizedColor;
        newAliasColorDisplay.style.backgroundColor = normalizedColor;
        if (!fromHexInput) {
            // Only update hex input if change came from swatch or default reset
            customHexInput.value = normalizedColor;
            clearInputErrors(); // Clear errors if a valid color is selected from swatch/reset
        }

        // Update selected state in the grid
        document.querySelectorAll(".color-swatch").forEach((swatch) => {
            swatch.classList.remove("selected");
            const checkmark = swatch.querySelector(".checkmark");
            if (checkmark) checkmark.remove(); // Remove existing checkmarks
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
     * Renders the color grid in the custom color picker.
     */
    function renderColorGrid() {
        colorGrid.innerHTML = ""; // Clear existing swatches
        defaultColors.forEach((color) => {
            const swatch = document.createElement("div");
            swatch.className = "color-swatch";
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color.toUpperCase(); // Store color in dataset for easy lookup

            swatch.addEventListener("click", () => {
                setSelectedColor(color);
                colorPickerDropdown.style.display = "none"; // Close picker on selection
            });
            colorGrid.appendChild(swatch);
        });

        // Set initial selected color
        setSelectedColor(newAliasColorHidden.value);
    }

    /**
     * Resets the add/edit form to its default "Add Alias" state.
     */
    function resetAliasForm() {
        newAliasNameInput.value = "";
        newAliasDomainInput.value = "";
        setSelectedColor(defaultButtonColor); // Set color to default
        addAliasBtn.textContent = "Add Alias";
        addAliasBtn.classList.remove("bg-yellow-500", "hover:bg-yellow-700"); // Remove update styling
        addAliasBtn.classList.add("bg-green-500", "hover:bg-green-700"); // Re-add add styling
        editingAliasIndex = -1;
        clearInputErrors();
        if (cancelEditBtn) {
            cancelEditBtn.remove(); // Remove the cancel button if it exists
            cancelEditBtn = null; // Reset reference
        }
        colorPickerDropdown.style.display = "none"; // Ensure picker is closed
    }

    // --- View Rendering Functions ---

    /**
     * Renders the domain aliases as clickable buttons for the main view.
     * @param {string} currentTabDomain - The normalized domain of the currently active tab.
     */
    function renderMainViewAliases(currentTabDomain) {
        aliasesContainer.innerHTML = ""; // Clear existing content
        const aliasesToDisplay = domainAliases.filter((alias) => {
            return normalizeDomain(alias.domain) !== currentTabDomain;
        });

        if (aliasesToDisplay.length === 0) {
            aliasesContainer.textContent =
                "No other aliases configured or current page is already aliased.";
            return;
        }

        aliasesToDisplay.forEach((alias) => {
            const aliasButton = document.createElement("button");
            aliasButton.className = "alias-button";
            aliasButton.textContent = alias.name;
            aliasButton.value = alias.domain;

            // Apply custom color, defaulting to original blue if not set
            const buttonColor = alias.color || defaultButtonColor;
            aliasButton.style.backgroundColor = buttonColor;

            aliasButton.addEventListener("click", async () => {
                const targetDomain = aliasButton.value;
                const currentTabUrl = await getCurrentTabUrl();

                if (!currentTabUrl) {
                    return;
                }

                try {
                    const url = new URL(currentTabUrl);
                    const newUrl = `${url.protocol}//${targetDomain}${url.pathname}${url.search}${url.hash}`;

                    await chrome.tabs.create({ url: newUrl });
                    showMessage(`Opened in new tab: ${newUrl}`, "success");
                } catch (error) {
                    console.error(
                        "Error processing URL or opening new tab:",
                        error,
                    );
                    showMessage(
                        "Error processing URL. Please check the current URL format.",
                        "error",
                    );
                }
            });

            aliasesContainer.appendChild(aliasButton);
        });
    }

    /**
     * Renders the domain aliases in the configuration view with delete and edit options.
     */
    function renderConfigViewAliases() {
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
                editingAliasIndex = index;
                newAliasNameInput.value = alias.name;
                newAliasDomainInput.value = alias.domain;
                setSelectedColor(alias.color || defaultButtonColor); // Set color using custom picker logic
                addAliasBtn.textContent = "Update Alias";
                addAliasBtn.classList.remove(
                    "bg-green-500",
                    "hover:bg-green-700",
                );
                addAliasBtn.classList.add(
                    "bg-yellow-500",
                    "hover:bg-yellow-700",
                );
                clearInputErrors(); // Clear errors when editing

                // Create and append Cancel button if it doesn't exist
                if (!cancelEditBtn) {
                    cancelEditBtn = document.createElement("button");
                    cancelEditBtn.id = "cancelEditBtn";
                    cancelEditBtn.className =
                        "action-btn bg-gray-500 hover:bg-gray-700 mt-2"; // Using action-btn class for styling consistency
                    cancelEditBtn.textContent = "Cancel Edit";
                    cancelEditBtn.addEventListener("click", resetAliasForm);
                    addAliasBtn.parentNode.insertBefore(
                        cancelEditBtn,
                        addAliasBtn.nextSibling,
                    );
                }
            });

            const aliasInfo = document.createElement("span");
            aliasInfo.className = "alias-list-info";
            // Display alias name, domain, and color (as a swatch)
            const colorSwatch = document.createElement("span");
            colorSwatch.style.display = "inline-block";
            colorSwatch.style.width = "16px";
            colorSwatch.style.height = "16px";
            colorSwatch.style.borderRadius = "4px";
            colorSwatch.style.backgroundColor =
                alias.color || defaultButtonColor; // Use saved color or default blue
            colorSwatch.style.verticalAlign = "middle";
            colorSwatch.style.marginRight = "8px";
            colorSwatch.style.border = "1px solid #ccc";

            aliasInfo.appendChild(colorSwatch);
            aliasInfo.appendChild(
                document.createTextNode(`${alias.name} (${alias.domain})`),
            );

            // DELETE BUTTON (TEXT '✖')
            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-btn"; // Use delete-btn class for text '✖'
            deleteButton.textContent = "✖"; // Set text content to '✖'
            deleteButton.title = "Delete alias";
            deleteButton.addEventListener("click", async () => {
                // Remove the alias from the array
                domainAliases.splice(index, 1);
                await saveAliases(domainAliases); // Save updated list to storage
                renderConfigViewAliases(); // Re-render the aliases in config view
                // Also re-render main view aliases in case alias matched current page and was deleted
                const updatedCurrentUrl = await getCurrentTabUrl();
                const updatedCurrentDomain = updatedCurrentUrl
                    ? new URL(updatedCurrentUrl).hostname
                    : null;
                const normalizedUpdatedCurrentDomain = updatedCurrentDomain
                    ? normalizeDomain(updatedCurrentDomain)
                    : null;
                renderMainViewAliases(normalizedUpdatedCurrentDomain);
                updateCurrentUrlDisplay(updatedCurrentUrl, domainAliases);
                showMessage("Alias deleted successfully!", "success");
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
     * Switches between the main view and the configuration view.
     * @param {string} view - 'main' or 'config'.
     */
    function showView(view) {
        if (view === "main") {
            mainView.style.display = "block";
            configView.style.display = "none";
            resetAliasForm(); // Reset form when leaving config view
        } else if (view === "config") {
            mainView.style.display = "none";
            configView.style.display = "block";
            renderConfigViewAliases(); // Re-render config aliases when showing view
        }
    }

    // --- Initialization ---

    // Load aliases and update current URL display on popup load
    domainAliases = await loadAliases();
    const currentTabUrl = await getCurrentTabUrl();
    const currentDomain = currentTabUrl
        ? new URL(currentTabUrl).hostname
        : null;
    const normalizedCurrentDomain = currentDomain
        ? normalizeDomain(currentDomain)
        : null;

    updateCurrentUrlDisplay(currentTabUrl, domainAliases);
    renderMainViewAliases(normalizedCurrentDomain); // Pass normalized current domain
    renderColorGrid(); // Initialize the color picker grid

    // Listen for changes in storage (useful if multiple contexts could write to storage)
    chrome.storage.sync.onChanged.addListener(async (changes) => {
        if (changes.domainAliases) {
            domainAliases = changes.domainAliases.newValue || [];
            const updatedCurrentUrl = await getCurrentTabUrl();
            const updatedCurrentDomain = updatedCurrentUrl
                ? new URL(updatedCurrentUrl).hostname
                : null;
            const normalizedUpdatedCurrentDomain = updatedCurrentDomain
                ? normalizeDomain(updatedCurrentDomain)
                : null;

            // Re-render both views as data might have changed
            renderMainViewAliases(normalizedUpdatedCurrentDomain);
            renderConfigViewAliases();
            updateCurrentUrlDisplay(updatedCurrentUrl, domainAliases);
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
        setSelectedColor(defaultButtonColor);
        colorPickerDropdown.style.display = "none";
    });

    // Live update color when typing in hex input
    customHexInput.addEventListener("input", () => {
        const hex = customHexInput.value.trim();
        // Temporarily allow partial hex for live feedback
        const partialHexRegex = /^#([A-Fa-f0-9]{0,6})$/i; // Case-insensitive for user input

        if (partialHexRegex.test(hex)) {
            // If it's a valid *partial* hex, try to apply it to the swatch, but only save full valid ones.
            // This prevents the swatch from clearing while typing.
            newAliasColorDisplay.style.backgroundColor = hex;
            newAliasColorHidden.value = hex; // Temporarily store for swatch preview

            // Check if it's a *full* valid hex to clear errors.
            const fullHexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i;
            if (fullHexRegex.test(hex)) {
                clearInputErrors(); // Clear errors once a full valid hex is entered
            } else {
                // Do not show error while typing partial valid hex.
            }
        } else {
            // If it's completely invalid (e.g., "abc", "#zz"), don't update swatch/hidden input
            // Keep the previous valid color on display.
            // We'll show an error on blur for final validation.
        }
    });

    // Handle blur event for final validation/cleanup on hex input
    customHexInput.addEventListener("blur", () => {
        const hex = customHexInput.value.trim();
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i; // Case-insensitive for validation

        // If the hex input is empty or invalid on blur, reset to default and show error
        if (!hexRegex.test(hex) && hex.length > 0) {
            showInputError(
                customHexInput,
                "Invalid hex code. Using default color.",
            );
            setSelectedColor(defaultButtonColor); // Fallback to default if invalid on blur
        } else if (hex.length === 0) {
            setSelectedColor(defaultButtonColor); // If empty, set to default
            clearInputErrors(); // Clear any previous error if user intentionally cleared
        } else {
            // If a valid hex, ensure it's properly set (setSelectedColor handles normalization)
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
        clearInputErrors(); // Clear any previous errors

        const name = newAliasNameInput.value.trim();
        const domain = newAliasDomainInput.value.trim();
        const color = newAliasColorHidden.value; // Get color from hidden input

        let hasError = false;

        if (!name) {
            showInputError(newAliasNameInput, "Alias name is required.");
            hasError = true;
        }
        if (!domain) {
            showInputError(newAliasDomainInput, "Domain is required.");
            hasError = true;
        } else if (!domain.includes(".")) {
            showInputError(
                newAliasDomainInput,
                "Please enter a valid domain (e.g., example.com).",
            );
            hasError = true;
        }

        // Validate the final color before saving
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i;
        if (!hexRegex.test(color)) {
            showInputError(
                customHexInput,
                "Please provide a valid hex color code (e.g., #RRGGBB).",
            );
            hasError = true;
        }

        // Check for duplicate alias name (only if not editing the current alias)
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

        // Check for duplicate domain URL (only if not editing the current alias)
        const normalizedNewDomain = normalizeDomain(domain);
        if (
            domainAliases.some(
                (alias, i) =>
                    i !== editingAliasIndex &&
                    normalizeDomain(alias.domain) === normalizedNewDomain,
            )
        ) {
            showInputError(newAliasDomainInput, "Domain already exists.");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        if (editingAliasIndex !== -1) {
            // Update existing alias
            domainAliases[editingAliasIndex] = { name, domain, color };
            showMessage("Alias updated successfully!", "success");
        } else {
            // Add new alias
            const newAlias = { name, domain, color };
            domainAliases.push(newAlias);
            showMessage("New alias added successfully!", "success");
        }

        await saveAliases(domainAliases);
        renderConfigViewAliases();
        const currentTabUrlAfterSave = await getCurrentTabUrl();
        const currentDomainAfterSave = currentTabUrlAfterSave
            ? new URL(currentTabUrlAfterSave).hostname
            : null;
        const normalizedCurrentDomainAfterSave = currentDomainAfterSave
            ? normalizeDomain(currentDomainAfterSave)
            : null;
        renderMainViewAliases(normalizedCurrentDomainAfterSave); // Re-render with updated data and current domain filter
        resetAliasForm(); // Reset the form after add/update
        updateCurrentUrlDisplay(currentTabUrlAfterSave, domainAliases);
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

        domainAliases = []; // Clear all aliases
        await saveAliases(domainAliases);

        renderConfigViewAliases();
        const currentTabUrlAfterReset = await getCurrentTabUrl();
        const currentDomainAfterReset = currentTabUrlAfterReset
            ? new URL(currentTabUrlAfterReset).hostname
            : null;
        const normalizedCurrentDomainAfterReset = currentDomainAfterReset
            ? normalizeDomain(currentDomainAfterReset)
            : null;
        renderMainViewAliases(normalizedCurrentDomainAfterReset); // Re-render with no aliases
        showMessage("All aliases removed successfully!", "success");
        resetAliasForm(); // Reset form after reset

        updateCurrentUrlDisplay(currentTabUrlAfterReset, domainAliases);
    });

    // Cancel Reset action
    cancelResetBtn.addEventListener("click", () => {
        resetConfirmationModal.style.display = "none";
    });
});
