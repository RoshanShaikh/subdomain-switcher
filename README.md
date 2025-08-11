# Subdomain Switcher Chrome Extension

This Chrome extension provides a quick and easy way to switch between different subdomains for the current active tab, while preserving the rest of the URL path, query parameters, and hash. It's ideal for developers, QA engineers, or anyone who frequently works with multiple environments (e.g., development, staging, production) of the same application.

## Features

* **Quick Subdomain Switching:** Instantly navigate to a different subdomain of the current domain.

* **Path Preservation:** Keeps the existing URL path, query parameters, and URL hash intact during the switch.

* **Configurable Aliases:** Set up custom names and target subdomains (full hostnames) for your environments.

* **Domain Grouping:** Aliases are automatically grouped by their base domain, making it easy to find relevant switches for the current site.

* **Custom Colors:** Assign a unique color to each alias for quick visual identification.

* **Intuitive UI:** A clean and user-friendly popup interface.

## Installation

To install the Subdomain Switcher extension:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/RoshanShaikh/subdomain-switcher
    cd subdomain-switcher
    ```

2.  **Open Chrome Extensions Page:**
    * Open Google Chrome.
    * Navigate to `chrome://extensions` in your browser.

3.  **Enable Developer Mode:**
    * In the top-right corner of the Extensions page, toggle on "Developer mode".

4.  **Load Unpacked:**
    * Click on the "Load unpacked" button that appears.
    * Browse to the directory where you cloned this repository (e.g., `subdomain-switcher/`) and select it.

5.  **Pin the Extension (Optional but Recommended):**
    * Click the puzzle piece icon (Extensions icon) in your Chrome toolbar.
    * Find "Subdomain Switcher" and click the pin icon next to it to make it easily accessible in your toolbar.

## Usage

1.  **Open the Extension:** Click the "Subdomain Switcher" icon in your Chrome toolbar while on any webpage.

2.  **Current URL Display:** The top section will show the current URL's hostname. If it matches a configured alias, it will display the alias name with its assigned color.

3.  **Switch Environments:**
    * Below the current URL, you will see a list of configured aliases relevant to the current domain.
    * Click on any alias button to open a new tab with the current page's path but with the chosen alias's subdomain.

4.  **Configure Aliases:**
    * Click the settings (gear) icon in the top right of the popup.
    * In the configuration view:
        * **Saved Aliases:** View, edit, or delete your existing aliases.
        * **Add New Alias:**
            * **Alias Name:** A friendly name (e.g., "Production", "Staging QA").
            * **Subdomain:** The *full hostname* you want to switch to (e.g., `app.prod.example.com`, `qa.staging.example.com`, `localhost:3000`).
            * **Domain:** The *base domain* that this alias belongs to (e.g., `example.com`, `test.org`). This is used for grouping buttons.
            * **Button Color:** Choose a custom color for the button.
        * **Reset All Aliases:** Clear all saved aliases after a confirmation.
    * Click the back arrow icon to return to the main switcher view.

## Technologies Used

* HTML

* CSS (with Tailwind CSS for utility classes)

* JavaScript (ES Modules)

* Chrome Extension APIs (`activeTab`, `scripting`, `storage`)

**This README file and the initial structure of this Chrome extension were created with the assistance of Gemini.**