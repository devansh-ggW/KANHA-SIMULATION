/* KANHA SIMULATION — Paddle donations */
(() => {
  "use strict";

  const PADDLE_CLIENT_SIDE_TOKEN = "live_9cc9eb9158aae539dcd93c3b9b4";

  // Lightweight responsive signature starfield.
  // Desktop: static base + tiny cursor interaction.
  // Touch/mobile: static base only, with reduced pixel work and fewer stars.
  const initSignatureStarfield = () => {
    if (document.querySelector(".signature-starfield-canvas")) return;

    const isTouch = window.matchMedia("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 680;

    const base = document.createElement("canvas");
    const interactive = isTouch ? null : document.createElement("canvas");

    base.className = "signature-starfield-canvas";
    base.setAttribute("aria-hidden", "true");
    document.body.prepend(base);

    if (interactive) {
      interactive.className = "signature-starfield-interactive";
      interactive.setAttribute("aria-hidden", "true");
      document.body.prepend(interactive);
    }

    const bctx = base.getContext("2d", { alpha: true });
    const ictx = interactive ? interactive.getContext("2d", { alpha: true }) : null;
    if (!bctx || (interactive && !ictx)) return;

    const stars = [];
    let rand = 48271;
    const nextRandom = () => {
      rand = (rand * 16807) % 2147483647;
      return (rand - 1) / 2147483646;
    };

    const starCount = () => {
      if (isTouch) return window.innerWidth <= 420 ? 46 : 58;
      return Math.min(104, Math.max(76, Math.floor(window.innerWidth / 13)));
    };

    const makeStars = () => {
      stars.length = 0;
      for (let i = 0; i < starCount(); i++) {
        stars.push({
          x: nextRandom(),
          y: nextRandom(),
          size: 0.55 + nextRandom() * (isTouch ? 0.9 : 1.15),
          alpha: 0.3 + nextRandom() * 0.5,
          tint: i % 12 === 0 ? "gold" : i % 8 === 0 ? "teal" : "white"
        });
      }
    };

    let lastWidth = 0;
    let lastHeight = 0;
    let resizeFrame = 0;

    const resize = () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Ignore small mobile viewport-height changes from browser UI appearing/disappearing.
        const widthChanged = Math.abs(width - lastWidth) > 24;
        const heightChanged = Math.abs(height - lastHeight) > 160;
        if (lastWidth && !widthChanged && !heightChanged) return;

        lastWidth = width;
        lastHeight = height;

        // Lower internal resolution on touch devices; stars are tiny so the visual cost is minimal.
        const renderScale = isTouch ? 0.62 : Math.min(window.devicePixelRatio || 1, 1);
        const canvasWidth = Math.max(1, Math.floor(width * renderScale));
        const canvasHeight = Math.max(1, Math.floor(height * renderScale));

        base.width = canvasWidth;
        base.height = canvasHeight;
        base.style.width = width + "px";
        base.style.height = height + "px";
        bctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        bctx.clearRect(0, 0, width, height);

        if (ictx && interactive) {
          interactive.width = canvasWidth;
          interactive.height = canvasHeight;
          interactive.style.width = width + "px";
          interactive.style.height = height + "px";
          ictx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
          ictx.clearRect(0, 0, width, height);
        }

        makeStars();

        for (const star of stars) {
          const x = Math.round(star.x * width);
          const y = Math.round(star.y * height);
          bctx.globalAlpha = star.alpha;
          bctx.fillStyle = star.tint === "gold"
            ? "#d8b86f"
            : star.tint === "teal"
              ? "#78e0d4"
              : "#ffffff";

          if (star.size < 0.95) {
            bctx.fillRect(x, y, 1, 1);
          } else {
            bctx.beginPath();
            bctx.arc(x, y, star.size, 0, Math.PI * 2);
            bctx.fill();
          }

          if (!isTouch && star.size > 1.35) {
            bctx.globalAlpha = star.alpha * 0.34;
            bctx.fillRect(x - 1.7, y, 3.4, 1);
            bctx.fillRect(x, y - 1.7, 1, 3.4);
          }
        }
        bctx.globalAlpha = 1;
      });
    };

    if (ictx && interactive) {
      let lastRegion = null;
      let pointerFrame = 0;
      let lastPointerX = -9999;
      let lastPointerY = -9999;

      const drawInteraction = (x, y) => {
        if (Math.abs(x - lastPointerX) < 12 && Math.abs(y - lastPointerY) < 12) return;
        lastPointerX = x;
        lastPointerY = y;

        if (pointerFrame) cancelAnimationFrame(pointerFrame);
        pointerFrame = requestAnimationFrame(() => {
          pointerFrame = 0;
          const radius = 175;

          if (lastRegion) {
            ictx.clearRect(
              lastRegion.x - radius - 10,
              lastRegion.y - radius - 10,
              radius * 2 + 20,
              radius * 2 + 20
            );
          }
          ictx.clearRect(x - radius - 10, y - radius - 10, radius * 2 + 20, radius * 2 + 20);

          const nearby = [];
          for (const star of stars) {
            const sx = star.x * window.innerWidth;
            const sy = star.y * window.innerHeight;
            const dx = sx - x;
            const dy = sy - y;
            const distance = Math.hypot(dx, dy);
            if (distance < radius) nearby.push({ star, sx, sy, dx, dy, distance });
          }

          for (const item of nearby) {
            const strength = 1 - item.distance / radius;
            const shift = strength * 6;
            const inv = item.distance > 0 ? 1 / item.distance : 0;
            const px = Math.round(item.sx + item.dx * inv * shift);
            const py = Math.round(item.sy + item.dy * inv * shift);

            ictx.globalAlpha = 0.25 + strength * 0.6;
            ictx.fillStyle = item.star.tint === "gold"
              ? "#e9cb82"
              : item.star.tint === "teal"
                ? "#9af4e8"
                : "#ffffff";
            ictx.beginPath();
            ictx.arc(px, py, item.star.size + strength * 1.25, 0, Math.PI * 2);
            ictx.fill();
          }

          ictx.globalAlpha = 1;
          lastRegion = { x, y };
        });
      };

      window.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse") return;
        drawInteraction(event.clientX, event.clientY);
      }, { passive: true });

      window.addEventListener("pointerleave", () => {
        if (!lastRegion) return;
        const r = 185;
        ictx.clearRect(lastRegion.x - r, lastRegion.y - r, r * 2, r * 2);
        lastRegion = null;
      }, { passive: true });
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
  };

  initSignatureStarfield();

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
    button.addEventListener("click", () => openCheckout(Number(button.dataset.donateAmount)));
  });
})();
