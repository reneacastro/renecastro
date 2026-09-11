(() => {
  const section = document.querySelector(".cinema-scroll");
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const backStack = document.querySelector(".back-stack");
  const sightsTrack = document.querySelector(".sights-track");
  const sightsControls = document.querySelector(".sights-controls");
  const sightPrev = document.querySelector(".sight-prev");
  const sightNext = document.querySelector(".sight-next");
  const originalSightCards = Array.from(document.querySelectorAll(".sight-card"));
  const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
  const openingLayers = Array.from(document.querySelectorAll(".scene-img:not(.frame-two-img)"));

  if (!section || !backStack) {
    root.classList.remove("is-loading");
    return;
  }

  let targetMouseX = 0;
  let targetMouseY = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetScroll = 0;
  let smoothScroll = 0;
  let initialized = false;
  let rafPending = false;
  let sightCards = [];
  const originalSightCount = originalSightCards.length;
  let activeSight = originalSightCount;
  let currentScene = "";

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  const smoothstep = (edge0, edge1, value) => {
    const x = clamp((value - edge0) / (edge1 - edge0));
    return x * x * (3 - 2 * x);
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  const segmentInOut = (s, a, b, c, d) => {
    const enter = smoothstep(a, b, s);
    const exit = smoothstep(c, d, s);
    return { enter, exit, active: enter * (1 - exit) };
  };

  const getScrollDistance = () =>
    clamp(-section.getBoundingClientRect().top, 0, section.offsetHeight - window.innerHeight);

  const setVar = (name, value) => {
    root.style.setProperty(name, String(value));
  };

  // Menu: highlight the scene on stage. Breakpoints sit between the choreography segments,
  // matching the scroll anchors #inicio (0), #ponte (1100), #bazar (2340), #roteiros (3700).
  const sceneAt = (s) => (s < 700 ? "inicio" : s < 1700 ? "ponte" : s < 2700 ? "bazar" : "roteiros");

  const updateNav = (s) => {
    const scene = sceneAt(s);
    if (scene === currentScene) return;
    currentScene = scene;
    navLinks.forEach((link) => {
      const isCurrent = link.hash === `#${scene}`;
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  function requestTick() {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(update);
  }

  function update() {
    rafPending = false;

    targetScroll = getScrollDistance();
    if (!initialized || reduceMotion.matches) {
      smoothScroll = targetScroll;
      initialized = true;
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
    }
    if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll;

    // Reduced motion: pointer parallax is bypassed entirely (values snap to 0).
    if (reduceMotion.matches) {
      mouseX = 0;
      mouseY = 0;
    } else {
      mouseX = lerp(mouseX, targetMouseX, 0.12);
      mouseY = lerp(mouseY, targetMouseY, 0.12);
    }

    const frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620);
    const frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700);
    const progress = clamp(smoothScroll / 2700);
    const introExit = smoothstep(90, 650, smoothScroll);
    const sightsEnterRaw = smoothstep(2760, 3560, smoothScroll);
    const sightsEnter = Math.pow(sightsEnterRaw, 1.55);
    const sightsControlsEnter = smoothstep(3360, 3660, smoothScroll);
    const blurActive = clamp(frame2.active + frame3.active);
    const frame2Opacity = frame2.active * (1 - frame3.enter);
    const splitDrift = Math.pow(frame2.enter, 1.5);
    const panel2Opacity = frame2.active * (1 - frame2.exit);
    const panel3Opacity = frame3.active * (1 - frame3.exit);
    const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
    const sharedHeroY = progress * -74;
    const sharedHeroScale = progress * 0.23;
    const sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
    const sightsParentTop = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;
    // Horizontal counterpart of sightsParentTop: land the active card on the controls' 48px column
    // (the +18vw cancels the track's -18vw offset).
    const stackHalf = backStack.offsetWidth / 2;
    const sightsScreenLeft = 48 + window.innerWidth * 0.18;
    const sightsParentLeft = stackHalf + (sightsScreenLeft - backStack.offsetLeft - stackHalf) / backScale;

    setVar("--mx", (reduceMotion.matches ? 0 : mouseX).toFixed(4));
    setVar("--my", (reduceMotion.matches ? 0 : mouseY).toFixed(4));

    setVar("--back-opacity", 1 - frame2.active * 0.06);
    setVar("--back-x", `${mouseX * -12}px`);
    setVar("--back-y", `${mouseY * -4}px`);
    setVar("--back-scale", backScale);
    setVar("--four-y", `${10 + progress * 10}vh`);
    setVar("--four-scale", 0.78 + progress * 0.16);
    setVar("--bazaar-y", `${20 - progress * 8}vh`);
    setVar("--blur-px", `${blurActive * 14}px`);
    setVar("--back-brightness", 1 - blurActive * 0.255);
    setVar("--bazaar-blur-px", `${frame2.active * 14}px`);
    setVar("--bazaar-brightness", 1 - frame2.active * 0.255 - frame3.active * 0.06);
    setVar("--bazaar-saturation", 1 + frame3.active * 0.18);
    setVar("--shade-opacity", "1");
    setVar("--shade-z", frame2.active > 0.02 ? "2" : "0");
    setVar("--shade-top-alpha", blurActive * 0.465);
    setVar("--shade-mid-alpha", blurActive * 0.42);
    setVar("--shade-bottom-alpha", blurActive * 0.51);

    setVar("--title-y", `${introExit * -210}px`);
    setVar("--title-scale", 1 - introExit * 0.08);
    setVar("--title-opacity", 1 - introExit);

    setVar("--bridge-x", `calc(-50% + ${mouseX * 18}px)`);
    setVar("--bridge-y", `${mouseY * 8 + sharedHeroY - frame2.exit * 760}px`);
    setVar("--bridge-bottom", `${5 - frame2.enter * 13}vh`);
    setVar("--bridge-width", `${67.2 + frame2.enter * 37.8}vw`);
    setVar("--bridge-scale", 1.02 + sharedHeroScale + frame2.exit * 0.46);

    setVar("--split-left-x", `calc(-50% + ${-splitDrift * 46}vw + ${mouseX * 22}px)`);
    setVar("--split-left-y", `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`);
    setVar("--split-left-scale", 1 + sharedHeroScale + frame2.enter * 0.74);
    setVar("--split-right-x", `calc(-50% + ${splitDrift * 46}vw + ${mouseX * 22}px)`);
    setVar("--split-right-y", `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`);
    setVar("--split-right-scale", 1 + sharedHeroScale + frame2.enter * 0.74);

    setVar("--frame2-opacity", frame2Opacity);
    setVar("--frame2-x", `calc(-50% + ${mouseX * 10}px)`);
    setVar("--frame2-y", `calc(-50% + ${mouseY * 8 - frame2.exit * 150}px)`);
    setVar("--frame2-scale", 1.06 + frame2.enter * 0.08 + frame2.exit * 0.08);

    setVar("--intro-copy-y", `${introExit * 90}px`);
    setVar("--intro-copy-opacity", 1 - introExit);
    setVar("--panel2-opacity", panel2Opacity);
    setVar("--panel2-y", `calc(-50% + ${-frame2.exit * 86 + (1 - frame2.enter) * 58}px)`);
    setVar("--panel3-opacity", panel3Opacity);
    setVar("--panel3-y", `calc(-50% + ${-frame3.exit * 86 + (1 - frame3.enter) * 58}px)`);
    // Faded-out panels must not keep catching clicks (the bazaar link sits over the sight cards).
    setVar("--panel2-visibility", panel2Opacity > 0.01 ? "visible" : "hidden");
    setVar("--panel3-visibility", panel3Opacity > 0.01 ? "visible" : "hidden");

    setVar("--sights-opacity", sightsEnter);
    setVar("--sights-controls-opacity", sightsControlsEnter);
    if (sightsControls) sightsControls.classList.toggle("is-ready", sightsControlsEnter > 0.98);
    setVar("--sights-visibility", sightsEnter > 0.01 ? "visible" : "hidden");
    setVar("--sights-y", "0px");
    setVar("--sights-enter-x", `${(1 - sightsEnter) * 420}vw`);
    setVar("--sights-scale", 1 / backScale);
    setVar("--sights-top", `${sightsParentTop}px`);
    setVar("--sights-left", `${sightsParentLeft}px`);
    setVar("--sights-screen-top", `${sightsScreenTop}px`);

    updateNav(smoothScroll);

    const scrollSettling = Math.abs(smoothScroll - targetScroll) > 0.08;
    const mouseSettling =
      !reduceMotion.matches &&
      (Math.abs(mouseX - targetMouseX) > 0.001 || Math.abs(mouseY - targetMouseY) > 0.001);
    if (scrollSettling || mouseSettling) requestTick();
  }

  // Infinite slider: 3 identical sets of cards; activeSight always stays inside the middle set.
  const getSightSlot = () =>
    sightCards[0].offsetWidth + (parseFloat(getComputedStyle(sightsTrack).columnGap || "0") || 0);

  const updateSightSlider = () => {
    if (!sightsTrack || !sightCards.length) return;
    setVar("--sights-shift", `${-getSightSlot() * activeSight}px`);
    sightCards.forEach((card, index) => card.classList.toggle("is-active", index === activeSight));
  };

  // A target outside the middle set first re-bases the in-flight track position by one full set
  // (identical cards, so the swap is invisible) and then animates from there — rapid clicks can
  // never run past the cloned cards.
  const goToSight = (target) => {
    if (!sightsTrack || !sightCards.length) return;
    const count = originalSightCount;
    const rebase = target < count ? count : target >= count * 2 ? -count : 0;
    if (rebase) {
      const currentX = new DOMMatrixReadOnly(getComputedStyle(sightsTrack).transform).m41;
      sightsTrack.classList.add("is-jumping");
      sightsTrack.style.transform = `translate3d(${currentX - rebase * getSightSlot()}px, 0, 0)`;
      void sightsTrack.offsetWidth;
      sightsTrack.style.transform = "";
      sightsTrack.classList.remove("is-jumping");
    }
    activeSight = target + rebase;
    updateSightSlider();
  };

  const moveSightSlider = (direction) => goToSight(activeSight + direction);

  const selectSightCard = (card) => {
    const index = Number(card.dataset.sightIndex);
    if (Number.isFinite(index)) goToSight(index);
  };

  const setupSightSlider = () => {
    if (!sightsTrack || !originalSightCount) return;
    sightsTrack.replaceChildren();
    for (let setIndex = 0; setIndex < 3; setIndex += 1) {
      originalSightCards.forEach((card, cardIndex) => {
        const clone = card.cloneNode(true);
        clone.dataset.sightIndex = String(setIndex * originalSightCount + cardIndex);
        sightsTrack.appendChild(clone);
      });
    }
    sightCards = Array.from(sightsTrack.querySelectorAll(".sight-card"));
    activeSight = originalSightCount;
    sightCards.forEach((card) => {
      card.addEventListener("click", () => selectSightCard(card));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectSightCard(card);
        }
      });
    });
    updateSightSlider();
  };

  // Fade the scene in once the opening layers are decoded, instead of letting them pop in one by
  // one. Capped at 3s so a slow or failed image never keeps the page hidden.
  Promise.race([
    Promise.all(openingLayers.map((img) => (img.decode ? img.decode().catch(() => {}) : null))),
    new Promise((resolve) => window.setTimeout(resolve, 3000)),
  ]).then(() => root.classList.remove("is-loading"));

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", () => {
    updateSightSlider();
    requestTick();
  });
  window.addEventListener(
    "pointermove",
    (event) => {
      targetMouseX = event.clientX / window.innerWidth - 0.5;
      targetMouseY = event.clientY / window.innerHeight - 0.5;
      requestTick();
    },
    { passive: true }
  );
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", requestTick);
  if (sightPrev) sightPrev.addEventListener("click", () => moveSightSlider(-1));
  if (sightNext) sightNext.addEventListener("click", () => moveSightSlider(1));

  setupSightSlider();
  requestTick();
})();
