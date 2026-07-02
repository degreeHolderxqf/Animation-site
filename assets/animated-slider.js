(function(){
  function initSplitSlider(root){
    if (root.dataset.initialized) return;
    root.dataset.initialized = 'true';

    const progressEl = root.querySelector('.autoplay-progress__svg');
    const progressImg = root.querySelector('.autoplay-progress__img');
    const currentEl = root.querySelector('.animated-slider__current');
    const totalEl = root.querySelector('.animated-slider__total');
    const prevBtn = root.querySelector('.swiper-button-prev');
    const nextBtn = root.querySelector('.swiper-button-next');
    const rawDuration = root.getAttribute('data-autoplay-duration') || root.querySelector('.swiper')?.getAttribute('data-autoplay-duration') || '5000';
    const autoplayDuration = Math.max(100, Number(parseInt(rawDuration, 10) || 5000));
    const slides = Array.from(root.querySelectorAll('.animated-slider__slide'));
    if(!slides.length) return;

    let currentIndex = 0;
    let progressRaf = null;
    let progressTimer = null;
    let animating = false;
    let progressStart = 0;

    function loadGsap(){
      return new Promise((resolve) => {
        if(typeof gsap !== 'undefined') return resolve();
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/gsap@3.12.2/dist/gsap.min.js';
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
      });
    }

    function updateMeta(){
      if(currentEl) currentEl.textContent = String(currentIndex + 1).padStart(2, '0');
      if(totalEl) totalEl.textContent = String(slides.length).padStart(2, '0');
    }

    function updateProgressThumb(){
      const nextThumb = slides[(currentIndex + 1) % slides.length].dataset.thumbSrc || '';
      if(progressImg) progressImg.src = nextThumb;
    }

    function prepareSlides(){
      slides.forEach((slide, index) => {
        slide.style.position = 'absolute';
        slide.style.left = '0';
        slide.style.top = '0';
        slide.style.width = '100%';
        slide.style.height = '100%';
        slide.style.opacity = index === currentIndex ? '1' : '0';
        slide.style.zIndex = index === currentIndex ? '3' : '1';
        slide.style.pointerEvents = index === currentIndex ? 'auto' : 'none';
        slide.style.visibility = index === currentIndex ? 'visible' : 'hidden';
        slide.classList.toggle('active', index === currentIndex);
        slide.classList.remove('revealed');
        const top = slide.querySelector('.split.top');
        const bottom = slide.querySelector('.split.bottom');
        if(top) {
          top.style.transition = 'none';
          top.style.transform = 'translateY(0)';
        }
        if(bottom) {
          bottom.style.transition = 'none';
          bottom.style.transform = 'translateY(0)';
        }
        const under = slide.querySelector('.slide-under');
        if(under) under.style.visibility = '';
      });
      if(progressEl) progressEl.style.setProperty('--progress', '0');
      updateProgressThumb();
      updateMeta();
    }

    function animateProgress(){
      if(progressRaf) cancelAnimationFrame(progressRaf);
      if(progressTimer) clearTimeout(progressTimer);
      if(progressEl) progressEl.style.setProperty('--progress', '0');
      progressStart = performance.now();
      function tick(now){
        const progress = Math.min(1, (now - progressStart) / autoplayDuration);
        if(progressEl) progressEl.style.setProperty('--progress', progress.toString());
        if(progress < 1) {
          progressRaf = requestAnimationFrame(tick);
        } else {
          progressRaf = null;
        }
      }
      progressRaf = requestAnimationFrame(tick);
      progressTimer = setTimeout(() => {
        progressRaf && cancelAnimationFrame(progressRaf);
        progressRaf = null;
        goTo(currentIndex + 1);
      }, autoplayDuration);
    }

    function goTo(index){
      if(animating) return;
      const targetIndex = (index + slides.length) % slides.length;
      if(targetIndex === currentIndex) return;
      animating = true;

      if(progressRaf){
        cancelAnimationFrame(progressRaf);
        progressRaf = null;
      }
      if(progressTimer){
        clearTimeout(progressTimer);
        progressTimer = null;
      }

      const currentSlide = slides[currentIndex];
      const targetSlide = slides[targetIndex];

      const topSplit = currentSlide.querySelector('.split.top');
      const bottomSplit = currentSlide.querySelector('.split.bottom');
      const targetTop = targetSlide.querySelector('.split.top');
      const targetBottom = targetSlide.querySelector('.split.bottom');
      const currentUnder = currentSlide.querySelector('.slide-under');

      // Make target slide visible behind the current slide
      targetSlide.style.visibility = 'visible';
      targetSlide.style.opacity = '1';
      targetSlide.style.zIndex = '2';
      targetSlide.style.pointerEvents = 'none';
      targetSlide.classList.remove('active');
      if(targetTop) {
        targetTop.style.transition = 'none';
        targetTop.style.transform = 'translateY(0)';
      }
      if(targetBottom) {
        targetBottom.style.transition = 'none';
        targetBottom.style.transform = 'translateY(0)';
      }

      // Hide current slide's under image so we see target slide directly behind it
      if(currentUnder) currentUnder.style.visibility = 'hidden';

      function finishTransition(){
        currentSlide.style.opacity = '0';
        currentSlide.style.zIndex = '1';
        currentSlide.style.pointerEvents = 'none';
        currentSlide.style.visibility = 'hidden';
        currentSlide.classList.remove('active','revealed');
        if(topSplit) {
          topSplit.style.transition = 'none';
          topSplit.style.transform = 'translateY(0)';
        }
        if(bottomSplit) {
          bottomSplit.style.transition = 'none';
          bottomSplit.style.transform = 'translateY(0)';
        }
        if(currentUnder) currentUnder.style.visibility = '';

        targetSlide.style.visibility = 'visible';
        targetSlide.style.opacity = '1';
        targetSlide.style.zIndex = '3';
        targetSlide.style.pointerEvents = 'auto';
        targetSlide.classList.add('active');
        targetSlide.classList.remove('revealed');
        if(targetTop) {
          targetTop.style.transition = 'none';
          targetTop.style.transform = 'translateY(0)';
        }
        if(targetBottom) {
          targetBottom.style.transition = 'none';
          targetBottom.style.transform = 'translateY(0)';
        }

        currentIndex = targetIndex;
        updateMeta();
        updateProgressThumb();
        animating = false;
        animateProgress();
      }

      if(typeof gsap !== 'undefined' && topSplit && bottomSplit){
        gsap.timeline({ onComplete: finishTransition })
          .set([topSplit, bottomSplit], { yPercent: 0 })
          .to(topSplit, { yPercent: -50, duration: 1.6, ease: 'power3.inOut' }, 0)
          .to(bottomSplit, { yPercent: 50, duration: 1.6, ease: 'power3.inOut' }, 0);
      } else {
        if(topSplit) topSplit.style.transition = 'transform 1.6s cubic-bezier(.25,.1,.25,1)';
        if(bottomSplit) bottomSplit.style.transition = 'transform 1.6s cubic-bezier(.25,.1,.25,1)';
        if(topSplit) topSplit.style.transform = 'translateY(-50%)';
        if(bottomSplit) bottomSplit.style.transform = 'translateY(50%)';
        setTimeout(finishTransition, 1620);
      }
    }

    prevBtn?.addEventListener('click', () => { goTo(currentIndex - 1); });
    nextBtn?.addEventListener('click', () => { goTo(currentIndex + 1); });
    
    const progressBtn = root.querySelector('.autoplay-progress');
    progressBtn?.addEventListener('click', () => { goTo(currentIndex + 1); });

    root.addEventListener('pointerdown', () => {
      if(progressTimer) clearTimeout(progressTimer);
      if(progressRaf) cancelAnimationFrame(progressRaf);
    });

    loadGsap().then(() => {
      prepareSlides();
      animateProgress();
    });
  }

  function initAll() {
    document.querySelectorAll('.animated-slider').forEach(initSplitSlider);
  }

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initAll();
  } else {
    document.addEventListener('DOMContentLoaded', initAll);
  }

  document.addEventListener('shopify:section:load', (event) => {
    const slider = event.target.querySelector('.animated-slider') || (event.target.classList.contains('animated-slider') ? event.target : null);
    if (slider) {
      initSplitSlider(slider);
    }
  });
})();
