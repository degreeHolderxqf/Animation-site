/**
 * Arc Shape Wheel Slider Component
 * Uses GSAP and Draggable to create a tactile arc-shaped portfolio carousel.
 */

function initArcSlider(section) {
  const wheelWrapper = section.querySelector(".arc-slider__wheel-wrapper");
  const wheel = section.querySelector(".arc-slider__wheel");
  const cards = gsap.utils.toArray(".arc-slider__card", section);
  
  if (!wheelWrapper || !wheel || cards.length === 0) return;

  const prevBtn = section.querySelector(".arc-slider__nav-btn--prev");
  const nextBtn = section.querySelector(".arc-slider__nav-btn--next");
  const activeCaption = section.querySelector(".arc-slider__active-caption");
  const activeTitle = section.querySelector(".arc-slider__active-title");
  const activeDescription = section.querySelector(".arc-slider__active-description");
  const cursor = section.querySelector(".arc-slider__cursor");

  const desktopRadius = parseInt(section.dataset.desktopRadius) || 3000;
  const mobileRadius = parseInt(section.dataset.mobileRadius) || 1200;
  
  let slice = 10; // Dynamically computed spacing angle
  let isRotating = false;
  let lastActiveIndex = -1;
  let draggableInstance = null;

  // 1. Position cards along the arc
  function setup() {
    const isMobile = window.innerWidth < 750;
    const radius = isMobile ? mobileRadius : desktopRadius;
    const center = radius;
    const DEG2RAD = Math.PI / 180;
    const wheelSize = radius * 2;

    // Card width and outer screen margins
    const cardWidth = isMobile ? 180 : 320;
    const margin = isMobile ? 15 : 40;

    // D is the horizontal distance from center to screen edge minus outer margins
    const D = (window.innerWidth - cardWidth) / 2 - margin;

    // Calculate slice angle dynamically so the side cards sit exactly at the screen edges
    const ratio = Math.max(0, Math.min(0.99, D / radius));
    slice = Math.asin(ratio) * (180 / Math.PI);

    // Size wrapper container absolutely to avoid transform conflict on the rotating wheel
    // Shift the wheel down to prevent cards from clipping at the top viewport boundary
    gsap.set(wheelWrapper, {
      width: wheelSize,
      height: wheelSize,
      top: isMobile ? 150 : 260
    });

    // Place each card around the circular perimeter using negative angles (-i * slice)
    // This maps dragging to the right to animate to the next slide
    gsap.set(cards, {
      x: i => center + radius * Math.sin(-i * slice * DEG2RAD),
      y: i => center - radius * Math.cos(-i * slice * DEG2RAD),
      rotation: i => -i * slice,
      xPercent: -50,
      yPercent: -50
    });

    // Set dragging bounds based on slice angles to prevent rotating into empty space
    // Since cards are positioned at negative angles, rotation goes from 0 to (len - 1)*slice
    const minRotation = 0;
    const maxRotation = (cards.length - 1) * slice;

    // Centered start: Rotate wheel to center the second card (index 1) on load so left, middle, right are visible
    if (lastActiveIndex === -1 && cards.length > 1) {
      gsap.set(wheel, { rotation: slice });
    }

    if (draggableInstance) {
      draggableInstance.applyBounds({
        minRotation: minRotation,
        maxRotation: maxRotation
      });
      draggableInstance.update();
    } else {
      initDraggable(minRotation, maxRotation);
    }
  }

  // 2. Identify the active (centered) card and update UI states
  function updateActiveCard() {
    const currentRot = gsap.getProperty(wheel, "rotation") || 0;
    
    // Calculate index from positive rotation values
    let rawIndex = currentRot / slice;
    let activeIndex = Math.round(rawIndex);
    
    // Constraint index to valid blocks
    activeIndex = Math.max(0, Math.min(cards.length - 1, activeIndex));

    // Toggle active state only (no fade-in/fade-out transitions, visibility handled by screen overflow)
    cards.forEach((card, i) => {
      if (i === activeIndex) {
        card.classList.add("is-active");
      } else {
        card.classList.remove("is-active");
      }
    });

    if (lastActiveIndex !== activeIndex) {
      const activeCard = cards[activeIndex];
      
      // Animate transition of active slide text details
      const title = activeCard.dataset.title || "";
      const caption = activeCard.dataset.caption || "";
      const description = activeCard.dataset.description || "";

      if (lastActiveIndex !== -1) {
        const detailsContainer = activeCaption.closest(".arc-slider__active-details");
        if (detailsContainer) {
          // Trigger slide-up exit and fade-out animation by adding exit class
          detailsContainer.classList.remove("active");
          detailsContainer.classList.add("exit");

          // After exit completes (250ms), update content and trigger reveal
          setTimeout(() => {
            // Disable transitions temporarily to reset the new text position to the bottom instantly
            detailsContainer.classList.add("no-transition");
            detailsContainer.classList.remove("exit");

            // Update text content
            activeCaption.textContent = caption;
            activeTitle.textContent = title;
            activeDescription.textContent = description;

            detailsContainer.offsetHeight; // trigger browser reflow

            // Re-enable transitions and trigger slide up + fade in
            detailsContainer.classList.remove("no-transition");
            detailsContainer.classList.add("active");
          }, 250);
        }
      } else {
        // Initial load (no fade transition needed, elements already have active class)
        activeCaption.textContent = caption;
        activeTitle.textContent = title;
        activeDescription.textContent = description;
      }

      lastActiveIndex = activeIndex;
    }
  }

  // 3. Smoothly rotate the wheel to center a specific card
  function rotateToCard(index, duration = 0.5) {
    if (isRotating) return;
    isRotating = true;

    const currentRot = gsap.getProperty(wheel, "rotation") || 0;
    const targetRot = index * slice;

    // Calculate shortest path rotation (avoid full-circle spins on wrap around)
    let diff = (targetRot - currentRot) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    gsap.to(wheel, {
      rotation: currentRot + diff,
      duration: duration,
      ease: "power2.out",
      onUpdate: updateActiveCard,
      onComplete: () => {
        isRotating = false;
        if (draggableInstance) {
          draggableInstance.update();
        }
      }
    });
  }

  // 4. Initialize Draggable with snapping and bounds
  function initDraggable(minRot, maxRot) {
    const hasInertia = typeof InertiaPlugin !== 'undefined';
    
    draggableInstance = Draggable.create(wheel, {
      type: "rotation",
      inertia: hasInertia,
      force3D: true, // Forces 3D hardware acceleration for maximum rendering smoothness
      bounds: {
        minRotation: minRot,
        maxRotation: maxRot
      },
      onDrag: () => {
        isRotating = true;
        updateActiveCard();
      },
      onThrowUpdate: updateActiveCard,
      onDragStart: () => {
        isRotating = true;
      },
      onDragEnd: () => {
        isRotating = false;
      },
      onThrowComplete: () => {
        isRotating = false;
      },
      snap: {
        rotation: gsap.utils.snap(slice)
      }
    })[0];
  }

  // 5. Setup event listeners and Custom follow cursor
  function initEvents() {
    window.addEventListener("resize", setup);

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        let targetIndex = lastActiveIndex - 1;
        if (targetIndex < 0) targetIndex = cards.length - 1;
        rotateToCard(targetIndex);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        let targetIndex = lastActiveIndex + 1;
        if (targetIndex >= cards.length) targetIndex = 0;
        rotateToCard(targetIndex);
      });
    }

    cards.forEach(card => {
      card.addEventListener("click", (e) => {
        // Prevent click events if we are currently rotating
        if (isRotating) {
          e.preventDefault();
          return;
        }

        const clickedIndex = parseInt(card.dataset.index);

        if (clickedIndex === lastActiveIndex) {
          // If clicking the active center card, follow its link
          const link = card.dataset.link;
          if (link && link !== "#" && link !== "") {
            window.location.href = link;
          }
        } else {
          // If clicking an adjacent/background card, center it first
          e.preventDefault();
          rotateToCard(clickedIndex);
        }
      });
    });

    // Custom follow cursor logic
    if (cursor) {
      const container = section.querySelector(".arc-slider__container");
      
      container.addEventListener("mousemove", (e) => {
        gsap.to(cursor, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.08, // Quicker mouse following duration for crisp visual response
          ease: "power2.out",
          overwrite: "auto"
        });
      });

      container.addEventListener("mouseenter", () => {
        gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.2 });
      });

      container.addEventListener("mouseleave", () => {
        gsap.to(cursor, { scale: 0, opacity: 0, duration: 0.2 });
      });
    }
  }

  // Trigger setup, first active slide sync, and events
  setup();
  updateActiveCard();
  initEvents();
}

// Wait for libraries to load before initializing sliders
function initWhenReady() {
  if (typeof gsap !== 'undefined' && typeof Draggable !== 'undefined' && typeof InertiaPlugin !== 'undefined') {
    gsap.registerPlugin(Draggable, InertiaPlugin);
    
    const sections = document.querySelectorAll(".arc-slider-section");
    sections.forEach(initArcSlider);
  } else {
    setTimeout(initWhenReady, 50);
  }
}

initWhenReady();
