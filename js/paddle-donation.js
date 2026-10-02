/* KANHA SIMULATION — Paddle support */
(() => {
  "use strict";

  // Paddle client-side tokens are intended for frontend use.
  // Replace this placeholder with your LIVE client-side token.
  const PADDLE_CLIENT_SIDE_TOKEN = "live_9cc9eb9158aae539dcd93c3b9b4";

  const prices = {
    50: "pri_01m3xb9tgawjk64fep9704em5m",
    100: "pri_01m3xba69gghgvx8btqc5ktxbd",
    300: "pri_01m3xbajfzp4dh4vrvw9epa4dn",
    500: "pri_01m3xbbf95zkj94wrdvhdrcj43",
    700: "pri_01m3xbc6vzp945e0sr7jbfmd0z",
    1000: "pri_01m3xbdwbtvcp774cbwp9bbfc7"
  };

  const amountButtons = Array.from(document.querySelectorAll("[data-paddle-price]"));
  const selectedAmount = document.getElementById("support-selected-amount");
  const payButton = document.getElementById("support-pay");
  const status = document.getElementById("support-status");

  if (!amountButtons.length || !selectedAmount || !payButton || !status) return;

  let selected = 500;

  const setStatus = (message) => {
    status.textContent = message || "";
  };

  const selectAmount = (amount) => {
    if (!prices[amount]) return;
    selected = amount;
    amountButtons.forEach((button) => {
      const active = Number(button.dataset.paddlePrice) === selected;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    selectedAmount.textContent = amount === 1000 ? "₹1,000" : "₹" + amount.toLocaleString("en-IN");
    setStatus("");
  };

  amountButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.paddlePrice) === selected));
    button.addEventListener("click", () => selectAmount(Number(button.dataset.paddlePrice)));
  });

  payButton.addEventListener("click", () => {
    if (!window.Paddle) {
      setStatus("Paddle could not load. Please refresh and try again.");
      return;
    }

    if (!PADDLE_CLIENT_SIDE_TOKEN || PADDLE_CLIENT_SIDE_TOKEN.includes("PASTE_")) {
      setStatus("Paddle is ready, but the client-side token still needs to be added.");
      return;
    }

    const priceId = prices[selected];
    if (!priceId) {
      setStatus("That support amount is unavailable right now.");
      return;
    }

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en"
        }
      });
    } catch (error) {
      console.error("Paddle checkout error:", error);
      setStatus("Checkout could not be opened. Please try again.");
    }
  });

  try {
    window.Paddle.Initialize({
      token: PADDLE_CLIENT_SIDE_TOKEN,
      checkout: {
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en"
        }
      }
    });
  } catch (error) {
    console.error("Paddle initialization error:", error);
  }
})();
