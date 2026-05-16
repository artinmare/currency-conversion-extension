// Create the popup element
const popup = document.createElement("div");
popup.id = "text-highlight-popup";
popup.style.display = "none";
document.body.appendChild(popup);

// Function to extract currency code and value from text
function extractCurrencyData(text) {
  // Pattern to match currency with values (uppercase only)
  // Matches: NZ$450.00, $50, 100 USD, USD 100, $420 NZD, etc.
  const currencyPattern =
    /([A-Z]{2,3}[$€£¥₹₽¢₩₪₦₱₡₨₲₴₵]\s*[\d,]+(?:\.\d{1,2})?|[$€£¥₹₽¢₩₪₦₱₡₨₲₴₵]\s*[\d,]+(?:\.\d{1,2})?\s*[A-Z]{3}|[$€£¥₹₽¢₩₪₦₱₡₨₲₴₵]\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*[A-Z]{3}|[A-Z]{3}\s*[\d,]+(?:\.\d{1,2})?)/g;

  const matches = text.match(currencyPattern);

  if (matches) {
    return matches.map((m) => m.trim());
  }

  return null;
}

// Function to parse currency code and value
function parseCurrency(currencyString) {
  // First, check if there's a currency code in the string (takes precedence)
  const codePattern = /([A-Z]{3})/;
  const codeMatch = currencyString.match(codePattern);

  // console.log("PT1 :" + codeMatch);
  if (codeMatch) {
    // Extract the code
    const code = codeMatch[1];

    // Extract the value (can be before or after the code)
    const valuePattern = /([\d,]+(?:\.\d{1,2})?)/;
    const valueMatch = currencyString.match(valuePattern);

    if (valueMatch) {
      const value = parseFloat(valueMatch[1].replace(/,/g, ""));
      return { code: code, value: value };
    }
  }

  // If no code found, try code+symbol format: NZ$450.00
  const codeSymbolPattern =
    /([A-Z]{2,3})([$€£¥₹₽¢₩₪₦₱₡₨₲₴₵])\s*([\d,]+(?:\.\d{1,2})?)/;
  const codeSymbolMatch = currencyString.match(codeSymbolPattern);

  // console.log("PT2 :" + codeSymbolMatch);
  if (codeSymbolMatch) {
    let code = codeSymbolMatch[1];
    if (codeSymbolMatch[2] == "$") {
      code += "D";
    }
    const value = parseFloat(codeSymbolMatch[3].replace(/,/g, ""));
    return { code: code, value: value };
  }

  // If still no code, try symbol mapping: $50
  const symbolPattern = /([$€£¥₹₽¢₩₪₦₱₡₨₲₴₵])\s*([\d,]+(?:\.\d{1,2})?)/;
  const symbolMatch = currencyString.match(symbolPattern);

  // console.log("PT3 :" + symbolMatch);
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
