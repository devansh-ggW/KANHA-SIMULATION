/* KANHA SIMULATION — Paddle donations */
(() => {
  "use strict";

  const PADDLE_CLIENT_SIDE_TOKEN = "live_9cc9eb9158aae539dcd93c3b9b4";
  const prices = {
    50: "pri_01m3xb9tgawjk64fep9704em5m",
    100: "pri_01m3xba69gghgvx8btqc5ktxbd",
    300: "pri_01m3xbajfzp4dh4vrvw9epa4dn",
    500: "pri_01m3xbbf95zkj94wrdvhdrcj43",
    700: "pri_01m3xbc6vzp945e0sr7jbfmd0z",
    1000: "pri_01m3xbdwbtvcp774cbwp9bbfc7"
  };

  const loadPaddle = () => {
    if (window.Paddle) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-kanha-paddle]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async = true;
      script.dataset.kanhaPaddle = "true";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  let navButtons = document.querySelectorAll("[data-kanha-donate]");
  if (!navButtons.length) {
    document.querySelectorAll(".nav-actions").forEach((nav) => {
      if (nav.querySelector("[data-kanha-donate]")) return;
      const button = document.createElement("button");
      button.className = "nav-btn donate-btn";
      button.type = "button";
      button.dataset.kanhaDonate = "true";
      button.textContent = "Donate";
      nav.appendChild(button);
    });
    navButtons = document.querySelectorAll("[data-kanha-donate]");
  }
  if (!navButtons.length) return;

  const modal = document.createElement("div");
  modal.className = "donate-modal-backdrop";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="donate-modal" role="dialog" aria-modal="true" aria-labelledby="donate-title">
      <button class="donate-close" type="button" aria-label="Close donation window">×</button>
      <div class="donate-eyebrow">Support the project</div>
      <h2 id="donate-title">Donate to KANHA SIMULATION</h2>
      <p>Choose a one-time amount to support the free physics labs.</p>
      <div class="donate-options" role="group" aria-label="Donation amount">
        <button type="button" data-donate-amount="50">₹50</button>
        <button type="button" data-donate-amount="100">₹100</button>
        <button type="button" data-donate-amount="300">₹300</button>
        <button type="button" data-donate-amount="500">₹500</button>
        <button type="button" data-donate-amount="700">₹700</button>
        <button type="button" data-donate-amount="1000">₹1,000</button>
      </div>
      <div class="donate-note">Secure checkout powered by Paddle · INR</div>
      <p class="donate-status" id="donate-status" role="status" aria-live="polite"></p>
    </div>
  `;
  document.body.appendChild(modal);

  const closeButton = modal.querySelector(".donate-close");
  const status = modal.querySelector(".donate-status");

  const openModal = () => {
    modal.hidden = false;
    document.body.classList.add("donate-modal-open");
    status.textContent = "";
    requestAnimationFrame(() => modal.classList.add("is-open"));
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    document.body.classList.remove("donate-modal-open");
    window.setTimeout(() => { modal.hidden = true; }, 150);
  };

  let paddleReady = false;
  let paddleInitError = null;

  const initializePaddle = async () => {
    if (paddleReady) return true;
    try {
      await loadPaddle();
      if (!PADDLE_CLIENT_SIDE_TOKEN || PADDLE_CLIENT_SIDE_TOKEN.includes("PASTE_")) {
        paddleInitError = "Paddle client-side token is missing.";
        return false;
      }

      window.Paddle.Initialize({
        token: PADDLE_CLIENT_SIDE_TOKEN,
        checkout: {
          settings: {
            displayMode: "overlay",
            theme: "light",
            locale: "en"
          }
        },
        eventCallback: (event) => {
          if (event?.name === "checkout.error") {
            console.error("Paddle checkout.error:", event);
          }
        }
      });

      paddleReady = true;
      return true;
    } catch (error) {
      paddleInitError = error;
      console.error("Paddle initialization error:", error);
      return false;
    }
  };

  const openCheckout = async (amount) => {
    const priceId = prices[amount];
    if (!priceId) return;

    const ready = await initializePaddle();
    if (!ready) {
      status.textContent = "Paddle could not initialize. Check the checkout settings in Paddle.";
      return;
    }

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          theme: "light",
          locale: "en"
        }
      });
      closeModal();
    } catch (error) {
      console.error("Paddle checkout open error:", error);
      status.textContent = paddleInitError
        ? "Paddle could not initialize. Please check the Paddle checkout settings."
        : "Checkout could not be opened. Please try again.";
    }
  };

  initializePaddle().catch(() => {});

  navButtons.forEach((button) => button.addEventListener("click", openModal));
  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
  modal.querySelectorAll("[data-donate-amount]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => selectAmount(Number(button.dataset.donateAmount)));
  });
})();
