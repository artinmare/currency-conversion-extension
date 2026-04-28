// Create the popup element
const popup = document.createElement("div");
popup.id = "text-highlight-popup";
popup.style.display = "none";
document.body.appendChild(popup);

// Function to extract currency code and value from text
function extractCurrencyData(text) {
  // Pattern to match currency with values (uppercase only)
  const currencyPattern =
    /([$€£¥₹₽¢₩₪₦₱₡₨₲₴₵]\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*[A-Z]{3}|[A-Z]{3}\s*[\d,]+(?:\.\d{1,2})?)/g;

  const matches = text.match(currencyPattern);

  if (matches) {
    return matches.map((m) => m.trim());
  }

  return null;
}

// Function to parse currency code and value
function parseCurrency(currencyString) {
  // Match symbol with value: $50
  const symbolPattern = /([$€£¥₹₽¢₩₪₦₱₡₨₲₴₵])\s*([\d,]+(?:\.\d{1,2})?)/;
  const symbolMatch = currencyString.match(symbolPattern);

  if (symbolMatch) {
    const symbol = symbolMatch[1];
    const value = parseFloat(symbolMatch[2].replace(/,/g, ""));

    // Map symbols to currency codes
    const symbolMap = {
      $: "USD",
      "€": "EUR",
      "£": "GBP",
      "¥": "JPY",
      "₹": "INR",
      "₽": "RUB",
      "¢": "USD",
      "₩": "KRW",
      "₪": "ILS",
      "₦": "NGN",
      "₱": "PHP",
      "₡": "CRC",
      "₨": "PKR",
      "₲": "PYG",
      "₴": "UAH",
      "₵": "GHS",
    };

    return { code: symbolMap[symbol], value: value };
  }

  // Match value with code: 100 USD or USD 100
  const codePattern =
    /([\d,]+(?:\.\d{1,2})?)\s*([A-Z]{3})|([A-Z]{3})\s*([\d,]+(?:\.\d{1,2})?)/;
  const codeMatch = currencyString.match(codePattern);

  if (codeMatch) {
    const value = codeMatch[1]
      ? parseFloat(codeMatch[1].replace(/,/g, ""))
      : parseFloat(codeMatch[4].replace(/,/g, ""));
    const code = codeMatch[2] || codeMatch[3];
    return { code: code, value: value };
  }

  return null;
}

// Function to format number with dot separators
function formatNumber(num) {
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Function to convert currency to IDR using frankfurter.dev new API
async function convertToIDR(currencyData) {
  if (!currencyData || currencyData.code === "IDR") {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rates?base=${currencyData.code}&quotes=IDR`,
    );
    const data = await response.json();

    if (data && data.length > 0 && data[0].rate) {
      const rate = data[0].rate;
      const convertedValue = currencyData.value * rate;
      return {
        original: `${currencyData.value} ${currencyData.code}`,
        converted: `${formatNumber(convertedValue)} IDR`,
      };
    }
  } catch (error) {
    console.error("Error converting currency:", error);
  }

  return null;
}

// Listen for text selection
document.addEventListener("mouseup", async function () {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText.length > 0) {
    // Check if currency with value exists in selected text
    const currencyMatches = extractCurrencyData(selectedText);

    if (currencyMatches && currencyMatches.length > 0) {
      // Get the selection range to position the popup
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Parse the first currency found
        const currencyData = parseCurrency(currencyMatches[0]);

        if (currencyData) {
          // Show loading state
          popup.textContent = "Converting...";
          popup.style.display = "block";
          popup.style.left = rect.left + window.scrollX + "px";
          popup.style.top = rect.top + window.scrollY - 40 + "px";

          // Convert to IDR
          const conversion = await convertToIDR(currencyData);

          if (conversion) {
            popup.textContent = `${conversion.original} = ${conversion.converted}`;
          } else if (currencyData.code === "IDR") {
            popup.textContent = `${currencyData.value} IDR`;
          } else {
            popup.textContent = currencyMatches[0];
          }
        } else {
          popup.style.display = "none";
        }
      }
    } else {
      // No currency found, hide popup
      popup.style.display = "none";
    }
  }
});

// Hide popup on any click
document.addEventListener("mousedown", function () {
  popup.style.display = "none";
});
