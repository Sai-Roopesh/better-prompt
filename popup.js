document.addEventListener("DOMContentLoaded", () => {
    // Select DOM elements
    const generateButton = document.getElementById("generatePrompt");
    const copyButton = document.getElementById("copyButton");
    const output = document.getElementById("output");
    const userInput = document.getElementById("userInput");

    // Ensure all elements are present
    if (!generateButton || !copyButton || !output || !userInput) {
        console.error("Required DOM elements not found.");
        return;
    }

    // State management flag
    let isGenerating = false;

    // Generate Prompt Event Listener
    generateButton.addEventListener("click", async () => {
        // Prevent multiple simultaneous requests
        if (isGenerating) return;

        // Validate input
        const prompt = userInput.value.trim();
        if (prompt === "") {
            showErrorMessage("Please enter some text.");
            return;
        }

        // Set generating state and show loading
        isGenerating = true;
        showLoadingState();

        try {
            // Fetch improved prompt from backend
            const response = await fetch('https://better-prompt.onrender.com/', { // Ensure the trailing slash is present
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            // Log the response status
            console.log(`Response Status: ${response.status}`);

            // Handle response
            if (response.ok) {
                const data = await response.json();
                const improvedPrompt = data.improvedPrompt || "";

                // Validate XML format
                if (improvedPrompt.startsWith('<Prompt>')) {
                    displayFormattedPrompt(improvedPrompt);
                } else {
                    throw new Error("Invalid response format.");
                }
            } else {
                // Attempt to parse error message from response
                let errorMsg = `Failed to generate prompt. Status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMsg += ` - ${errorData.error}`;
                    }
                } catch (e) {
                    // If response is not JSON
                }
                showErrorMessage(errorMsg);
            }
        } catch (error) {
            showErrorMessage(`Error: ${error.message}`);
            console.error("Full error:", error);
        } finally {
            // Reset generating state
            isGenerating = false;
        }
    });

    // Copy Prompt Event Listener
    copyButton.addEventListener("click", () => {
        const outputText = output.textContent;
        if (outputText && outputText.startsWith('<Prompt>')) {
            copyToClipboard(outputText);
        } else {
            showAlert("Nothing to copy!");
        }
    });

    // Helper Functions

    function showLoadingState() {
        output.innerHTML = '<div class="spinner"></div>';
        output.style.color = "black";
    }

    function showErrorMessage(message) {
        output.textContent = message;
        output.style.color = "red";
    }

    function displayFormattedPrompt(xmlPrompt) {
        output.textContent = formatXML(xmlPrompt);
        output.style.color = "black";
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => showAlert("Copied to clipboard!"))
            .catch(err => {
                showAlert("Failed to copy!");
                console.error("Copy error:", err);
            });
    }

    function showAlert(message) {
        // Simple fallback alert. Replace with a custom UI if desired.
        alert(message);
    }

    /**
     * Formats XML string with indentation for better readability.
     * @param {string} xml - The XML string to format.
     * @returns {string} - The formatted XML string.
     */
    function formatXML(xml) {
        const PADDING = 2; // Indent size
        const reg = /(>)(<)(\/*)/g;
        let formatted = '';
        let pad = 0;

        xml = xml.replace(reg, '$1\r\n$2$3');
        const lines = xml.split('\r\n');
        lines.forEach(line => {
            if (line.match(/.+<\/\w[^>]*>$/)) {
                // Closing tag at the end of the line
                formatted += ' '.repeat(PADDING * pad) + line + '\n';
            } else if (line.match(/^<\/\w/)) {
                // Closing tag
                pad -= 1;
                formatted += ' '.repeat(PADDING * pad) + line + '\n';
            } else if (line.match(/^<\w[^>]*[^\/]>.*$/)) {
                // Opening tag
                formatted += ' '.repeat(PADDING * pad) + line + '\n';
                pad += 1;
            } else {
                // Text content or empty line
                formatted += ' '.repeat(PADDING * pad) + line + '\n';
            }
        });

        return formatted;
    }
});
