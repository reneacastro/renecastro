(() => {
  const trem = document.querySelector(".trem");
  const videos = Array.from(document.querySelectorAll(".trem-video"));
  const buttons = Array.from(document.querySelectorAll(".trem-cenas button"));
  const switcher = document.querySelector(".trem-cenas");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!trem || !switcher || videos.length !== buttons.length) return;

  const FADE_MS = 1000; // same as the CSS crossfade: clicks are ignored until it ends
  const DARK_SCENE = 2; // "Mata fechada": hero content turns #182C41
  let active = 0;
  let isTransitioning = false;

  // Only the opening scene downloads up front. The others start when a mouse/keyboard user reaches
  // for the switcher, or when someone picks them. Each poster is the video's first frame, so the
  // crossfade never lands on an empty frame while a scene is still buffering.
  const warm = (video) => {
    if (video.preload === "auto") return;
    video.preload = "auto";
    video.load();
  };

  const play = (video) => {
    if (reduceMotion.matches) return;
    const attempt = video.play();
    if (attempt) attempt.catch(() => {});
  };

  const select = (index) => {
    if (index === active || isTransitioning) return;
    isTransitioning = true;
    const previous = videos[active];
    const next = videos[index];
    warm(next);
    play(next);
    active = index;
    videos.forEach((video, i) => video.classList.toggle("is-active", i === index));
    buttons.forEach((button, i) => {
      button.classList.toggle("is-active", i === index);
      button.setAttribute("aria-pressed", String(i === index));
    });
    trem.classList.toggle("is-escuro", index === DARK_SCENE);
    window.setTimeout(() => {
      previous.pause();
      isTransitioning = false;
    }, FADE_MS);
  };

  buttons.forEach((button, index) => button.addEventListener("click", () => select(index)));

  // Touch devices skip this warm-up: on a phone only the scene that is tapped gets downloaded.
  const warmAll = () => videos.forEach(warm);
  if (window.matchMedia("(hover: hover)").matches) {
    switcher.addEventListener("pointerenter", warmAll, { once: true });
  }
  switcher.addEventListener("focusin", (event) => {
    if (event.target.matches(":focus-visible")) warmAll();
  });

  // Reduced motion: posters instead of moving footage (the window's rocking stops in CSS).
  const applyMotionPreference = () => {
    if (reduceMotion.matches) videos.forEach((video) => video.pause());
    else play(videos[active]);
  };
  applyMotionPreference();
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", applyMotionPreference);
})();
