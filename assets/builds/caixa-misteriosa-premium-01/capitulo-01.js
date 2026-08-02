(() => {
  const root = document.querySelector("[data-premium-chapter]");
  if (!root) return;

  const bia = root.querySelector("[data-premium-bia]");
  const biaIdle = root.querySelector("[data-bia-idle-video]");
  const biaSpeaking = root.querySelector("[data-bia-speaking-video]");
  const balloon = root.querySelector("[data-premium-balloon]");
  const startButton = root.querySelector("[data-premium-start]");
  const introLayer = root.querySelector("[data-premium-intro-layer]");
  const introVideo = root.querySelector("[data-premium-intro-video]");
  const loopingVideos = root.querySelectorAll("[data-premium-loop]");

  loopingVideos.forEach((video) => {
    video.play?.().catch(() => {});
  });

  window.setTimeout(() => {
    biaIdle?.play?.().catch(() => {});
  }, 1500);

  window.setTimeout(() => {
    bia?.classList.add("is-speaking");
    balloon?.classList.add("is-visible");
    if (biaSpeaking) {
      biaSpeaking.currentTime = 0;
      biaSpeaking.play?.().catch(() => {});
    }
  }, 4000);

  const finishIntro = () => {
    introVideo?.pause?.();
    introLayer?.classList.remove("is-active");
    root.classList.add("is-box-ready");
    loopingVideos.forEach((video) => video.play?.().catch(() => {}));
  };

  startButton?.addEventListener("click", () => {
    if (!introLayer || !introVideo) return;
    introLayer.classList.add("is-active");
    loopingVideos.forEach((video) => video.pause?.());
    introVideo.currentTime = 0;
    introVideo.play?.().catch(() => {
      window.setTimeout(finishIntro, 1200);
    });
  });

  introVideo?.addEventListener("ended", finishIntro);
  introVideo?.addEventListener("error", finishIntro);
})();
