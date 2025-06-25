/**
 * Utility functions for the Subdomain Switcher extension.
 */

/**
 * Displays a message in the message box.
 * @param {HTMLElement} messageBox - The message box DOM element.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message (e.g., 'error', 'success', 'info').
 */
export function showMessage(messageBox, message, type = "info") {
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
export function showInputError(inputElement, message) {
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
    inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);

    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

/**
 * Clears all input error messages.
 */
export function clearInputErrors() {
    document
        .querySelectorAll(".input-error-message")
        .forEach((el) => el.remove());
}

/**
 * Cleans a hostname string by removing protocol and "www.".
 * @param {string} hostname - The hostname string to clean.
 * @returns {string} The cleaned hostname.
 */
export function cleanHostname(hostname) {
    return hostname.replace(/^(https?:\/\/)?(www\.)?/, "").toLowerCase();
}

/**
 * Checks if a candidate hostname is the same as a base domain or a subdomain of it.
 * e.g., isSameOrSubdomain('sub.example.com', 'example.com') returns true.
 * e.g., isSameOrSubdomain('example.com', 'example.com') returns true.
 * e.g., isSameOrSubdomain('test.com', 'example.com') returns false.
 * @param {string} candidateHostname - The full hostname to check (e.g., "sub.example.com").
 * @param {string} baseDomain - The base domain to compare against (e.g., "example.com").
 * @returns {boolean} True if candidateHostname is the same or a subdomain of baseDomain.
 */
export function isSameOrSubdomain(candidateHostname, baseDomain) {
    const cleanedCandidate = cleanHostname(candidateHostname);
    const cleanedBase = cleanHostname(baseDomain);

    // Case 1: Exact match (e.g., "example.com" and "example.com")
    if (cleanedCandidate === cleanedBase) {
        return true;
    }

    // Case 2: Subdomain match (e.g., "sub.example.com" and "example.com")
    // Ensure that 'sub.example.com' ends with '.example.com' to avoid matching 'b.com' to 'ab.com'
    return cleanedCandidate.endsWith("." + cleanedBase);
}

/**
 * Adjusts the brightness of a hex color to ensure good contrast for text.
 * @param {string} hex - The hex color code.
 * @param {number} percent - Percentage to lighten (positive) or darken (negative).
 * @returns {string} Adjusted hex color.
 */
export function adjustColorBrightness(hex, percent) {
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
export function getContrastTextColor(hexColor) {
    if (!hexColor || hexColor.length < 7 || hexColor.includes("undefined")) {
        return "#2c3e50"; // Default dark text if color is invalid/missing
    }
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#2c3e50" : "#ffffff"; // Use dark text for light backgrounds, white for dark backgrounds
}
