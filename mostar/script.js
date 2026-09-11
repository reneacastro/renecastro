(() => {
  const section = document.querySelector(".cinema-scroll");
  const root = document.documentElement;
  const stage = document.querySelector(".stage");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const backStack = document.querySelector(".back-stack");
  const sightsTrack = document.querySelector(".sights-track");
  const sightsControls = document.querySelector(".sights-controls");
  const sightPrev = document.querySelector(".sight-prev");
  const sightNext = document.querySelector(".sight-next");
  const originalSightCards = Array.from(document.querySelectorAll(".sight-card"));
  const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
  const openingLayers = Array.from(document.querySelectorAll(".scene-img:not(.frame-two-img)"));
  const trainScene = document.querySelector(".trem-cena");
  const trainVideo = document.querySelector(".trem-video");
  const trainWindow = document.querySelector(".trem-janela");
  const musicScene = document.querySelector(".musica-cena");
  const musicVideo = document.querySelector(".musica-video");
  const musicBackdrop = document.querySelector(".musica-fundo");
  const navList = document.querySelector(".site-nav");

  if (!section || !stage || !backStack) {
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

  const OPENING = 1700; // the opening act (the cabin window) runs before Mostar's choreography
  const TRAIN_WARM_AT = 3200; // start fetching the carriage once the visitor reaches Roteiros
  const MUSIC_WARM_AT = 4900; // and the turntable once the carriage is on stage
  let trainWarmed = false;
  let trainShown = false;
  let musicWarmed = false;
  let musicShown = false;

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

  // Menu: highlight the scene on stage. Each scene lasts until the scroll distance next to it; the
  // breakpoints sit between the choreography segments, matching the scroll anchors #inicio (0),
  // #ponte (1100), #bazar (2340), #roteiros (3700), #trem (5300) and #musica (6900).
  const SCENES = [
    [700, "inicio"],
    [1700, "ponte"],
    [2700, "bazar"],
    [4450, "roteiros"],
    [6050, "trem"],
    [Infinity, "musica"],
  ];
  const sceneAt = (s) => SCENES.find(([end]) => s < end)[1];

  // On narrow screens the band's row scrolls sideways: keep the current item in view and mark the side
  // that has more items (it fades out in faixa.css).
  const updateNavEdges = () => {
    if (!navList) return;
    const hidden = navList.scrollWidth - navList.clientWidth;
    navList.classList.toggle("has-more-left", hidden > 1 && navList.scrollLeft > 1);
    navList.classList.toggle("has-more-right", hidden > 1 && navList.scrollLeft < hidden - 1);
  };

  const revealNavLink = (link) => {
    if (!navList || !link || navList.scrollWidth <= navList.clientWidth + 1) return;
    const left = link.getBoundingClientRect().left - navList.getBoundingClientRect().left + navList.scrollLeft;
    navList.scrollTo({
      left: left - (navList.clientWidth - link.offsetWidth) / 2,
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  };

  const updateNav = (s) => {
    const scene = sceneAt(s);
    if (scene === currentScene) return;
    currentScene = scene;
    navLinks.forEach((link) => {
      const isCurrent = link.hash === `#${scene}`;
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) {
        link.setAttribute("aria-current", "true");
        revealNavLink(link);
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  // Scene footage (train, turntable): nothing downloads until the visitor is a scene away (or lands on
  // it); then the poster (the video's first frame) and the footage load.
  const playVideo = (video) => {
    if (!video || reduceMotion.matches) return;
    const attempt = video.play();
    if (attempt) attempt.catch(() => {});
  };

  const warmVideo = (video) => {
    if (!video) return;
    if (video.dataset.poster) video.poster = video.dataset.poster;
    video.preload = "auto";
    video.load();
  };

  const warmTrain = () => {
    if (trainWarmed || !trainScene) return;
    trainWarmed = true;
    warmVideo(trainVideo);
    if (trainWindow && trainWindow.dataset.srcset) {
      trainWindow.srcset = trainWindow.dataset.srcset;
      trainWindow.src = trainWindow.dataset.src;
    }
  };

  const warmMusic = () => {
    if (musicWarmed || !musicScene) return;
    musicWarmed = true;
    warmVideo(musicVideo);
    if (musicBackdrop && musicBackdrop.dataset.src) musicBackdrop.src = musicBackdrop.dataset.src;
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

    // Mostar starts after the opening, so its whole choreography runs on its own scroll distance.
    const mostarScroll = smoothScroll - OPENING;
    const frame2 = segmentInOut(mostarScroll, 560, 900, 1300, 1620);
    const frame3 = segmentInOut(mostarScroll, 1760, 2140, 2540, 2700);
    const progress = clamp(mostarScroll / 2700);
    const introExit = smoothstep(90, 650, mostarScroll);
    const sightsEnterRaw = smoothstep(2760, 3560, mostarScroll);
    const sightsEnter = Math.pow(sightsEnterRaw, 1.55);
    const sightsControlsEnter = smoothstep(3360, 3660, mostarScroll);
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

    const motion = reduceMotion.matches ? 0 : 1;
    const blurScale = window.innerWidth <= 640 ? 0.7 : 1;
    // Abertura → Mostar: the window holds the question, the copy follows, and then the cabin pushes
    // forward and blurs while Mostar arrives from slightly closer.
    const openTitleOut = smoothstep(360, 760, smoothScroll);
    const openCopy = smoothstep(560, 900, smoothScroll);
    const openCopyOut = smoothstep(1150, 1450, smoothScroll);
    const openCopyOn = openCopy * (1 - openCopyOut);
    const openExit = smoothstep(1100, 1700, smoothScroll);
    const openFade = smoothstep(1320, 1700, smoothScroll);
    const worldEnter = smoothstep(1240, 1700, smoothScroll);
    const openBlur = openExit * 16 * blurScale * motion;
    // Roteiros → Trem: Mostar keeps pushing forward and blurs away while the carriage fades in from
    // closer and blurred, then settles sharp; the copy comes last, like in the other scenes.
    const worldExit = smoothstep(3950, 4550, mostarScroll);
    const worldFade = smoothstep(4350, 4700, mostarScroll);
    const trainIn = smoothstep(4250, 4600, mostarScroll);
    const trainSettle = smoothstep(4250, 4950, mostarScroll);
    const trainText = smoothstep(4800, 5150, mostarScroll);
    // Trem → Música: a sideways pan. The turntable pushes the carriage off to the left, overlapping it a
    // little so no seam opens between them, and both blur most at the fastest point of the move; with
    // reduced motion it is a plain crossfade. Then the title lines rise out of their masks.
    const pan = smoothstep(5650, 6450, mostarScroll);
    const panSwing = Math.sin(Math.PI * pan); // 0 at both ends, 1 halfway
    const musicLine1 = smoothstep(6350, 6750, mostarScroll);
    const musicLine2 = smoothstep(6430, 6830, mostarScroll);
    const worldBlur = (worldExit * 18 + (1 - worldEnter) * 14) * blurScale * motion;
    const trainBlur = ((1 - trainSettle) * 16 + panSwing * 18) * blurScale * motion;
    const musicBlur = panSwing * 18 * blurScale * motion;
    const trainOpacity = trainIn * (motion ? 1 : 1 - pan);
    const trainOnStage = trainOpacity > 0.001 && pan < 0.999;
    const musicOnStage = pan > 0.001;

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
    // The intro copy and its tags live outside .world, so they only show once Mostar itself is on stage.
    setVar("--intro-copy-opacity", worldEnter * (1 - introExit));
    setVar("--panel2-opacity", panel2Opacity);
    setVar("--panel2-y", `calc(-50% + ${-frame2.exit * 86 + (1 - frame2.enter) * 58}px)`);
    setVar("--panel3-opacity", panel3Opacity);
    setVar("--panel3-y", `calc(-50% + ${-frame3.exit * 86 + (1 - frame3.enter) * 58}px)`);
    // Faded-out panels must not keep catching clicks (the bazaar link sits over the sight cards).
    setVar("--panel2-visibility", panel2Opacity > 0.01 ? "visible" : "hidden");
    setVar("--panel3-visibility", panel3Opacity > 0.01 ? "visible" : "hidden");

    setVar("--sights-opacity", sightsEnter);
    setVar("--sights-controls-opacity", sightsControlsEnter);
    if (sightsControls) sightsControls.classList.toggle("is-ready", sightsControlsEnter > 0.98 && worldExit < 0.02);
    setVar("--sights-visibility", sightsEnter > 0.01 ? "visible" : "hidden");
    setVar("--sights-y", "0px");
    setVar("--sights-enter-x", `${(1 - sightsEnter) * 420}vw`);
    setVar("--sights-scale", 1 / backScale);
    setVar("--sights-top", `${sightsParentTop}px`);
    setVar("--sights-left", `${sightsParentLeft}px`);
    setVar("--sights-screen-top", `${sightsScreenTop}px`);

    setVar("--abertura-opacity", 1 - openFade);
    setVar("--abertura-visibility", openFade > 0.999 ? "hidden" : "visible");
    setVar("--abertura-scale", 1 + openExit * 0.2 * motion);
    setVar("--abertura-filter", openBlur > 0.05 ? `blur(${openBlur}px)` : "none");
    setVar("--abertura-titulo-opacity", 1 - openTitleOut);
    setVar("--abertura-titulo-y", `${openTitleOut * -70 * motion}px`);
    setVar("--abertura-manifesto-opacity", openCopyOn);
    setVar("--abertura-manifesto-y", `${((1 - openCopy) * 28 - openCopyOut * 46) * motion}px`);
    setVar("--abertura-veu", openCopyOn * 0.85);
    setVar("--world-scale", 1 + worldExit * 0.45 * motion + (1 - worldEnter) * 0.1 * motion);
    setVar("--world-filter", worldBlur > 0.05 ? `blur(${worldBlur}px)` : "none");
    setVar("--world-opacity", worldEnter * (1 - worldFade));
    setVar("--world-visibility", worldEnter < 0.001 || worldFade > 0.999 ? "hidden" : "visible");
    setVar("--trem-opacity", trainOpacity);
    setVar("--trem-visibility", trainOnStage ? "visible" : "hidden");
    setVar("--trem-filter", trainOnStage && trainBlur > 0.05 ? `blur(${trainBlur}px)` : "none");
    setVar("--trem-x", `${-pan * 100 * motion}vw`);
    setVar("--trem-bg-scale", 1 + (1 - trainSettle) * 0.18 * motion);
    setVar("--trem-frame-scale", 1 + (1 - trainSettle) * 0.6 * motion);
    setVar("--trem-text-opacity", trainText);
    setVar("--trem-text-y", `${(1 - trainText) * 24 * motion}px`);
    setVar("--musica-opacity", motion ? 1 : pan);
    setVar("--musica-visibility", musicOnStage ? "visible" : "hidden");
    setVar("--musica-filter", musicOnStage && musicBlur > 0.05 ? `blur(${musicBlur}px)` : "none");
    setVar("--musica-x", `${((1 - pan) * 100 - panSwing * 8) * motion}vw`);
    setVar("--musica-l1", musicLine1);
    setVar("--musica-l2", musicLine2);
    stage.classList.toggle("is-leaving", worldExit > 0.02);

    if (mostarScroll > TRAIN_WARM_AT) warmTrain();
    if (mostarScroll > MUSIC_WARM_AT) warmMusic();
    // Only the footage on stage plays.
    if (trainOnStage !== trainShown) {
      trainShown = trainOnStage;
      if (trainShown) playVideo(trainVideo);
      else if (trainVideo) trainVideo.pause();
    }
    if (musicOnStage !== musicShown) {
      musicShown = musicOnStage;
      if (musicShown) playVideo(musicVideo);
      else if (musicVideo) musicVideo.pause();
    }

    updateNav(mostarScroll);

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
    updateNavEdges();
    revealNavLink(navList && navList.querySelector(".is-current"));
    requestTick();
  });
  if (navList) navList.addEventListener("scroll", updateNavEdges, { passive: true });
  window.addEventListener(
    "pointermove",
    (event) => {
      targetMouseX = event.clientX / window.innerWidth - 0.5;
      targetMouseY = event.clientY / window.innerHeight - 0.5;
      requestTick();
    },
    { passive: true }
  );
  if (sightPrev) sightPrev.addEventListener("click", () => moveSightSlider(-1));
  if (sightNext) sightNext.addEventListener("click", () => moveSightSlider(1));

  // Reduced motion: the scenes show their posters instead of moving footage (the train window also stops
  // rocking, in CSS).
  const applyMotionPreference = () => {
    [
      [trainVideo, trainShown],
      [musicVideo, musicShown],
    ].forEach(([video, onStage]) => {
      if (!video) return;
      if (reduceMotion.matches) video.pause();
      else if (onStage) playVideo(video);
    });
    requestTick();
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", applyMotionPreference);

  setupSightSlider();
  updateNavEdges();
  requestTick();
})();
