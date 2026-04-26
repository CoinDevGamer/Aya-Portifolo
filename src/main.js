const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (start, end, amount) => start + (end - start) * amount;

document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => document.body.classList.add('is-ready'));

  initAnchorScroll();
  initNavigationState();
  initReveals();
  initScrollEngine();
  initTiltCards();
  initMagneticButtons();
  initCustomCursor();
  initPortfolioFilters();
  initLightbox();

  if (!prefersReducedMotion) {
    initCosmicCanvas();
    initParallaxLayer();
  }
});

function initAnchorScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  });
}

function initNavigationState() {
  const nav = document.querySelector('.glass-nav');
  const links = [...document.querySelectorAll('.nav-links a')];
  const sections = [...document.querySelectorAll('[data-section][id]')];

  const updateNav = () => {
    nav?.classList.toggle('scrolled', window.scrollY > 24);
  };

  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  if (!sections.length || !links.length) return;

  const linkById = new Map(links.map((link) => [link.getAttribute('href')?.replace('#', ''), link]));

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      links.forEach((link) => link.classList.remove('is-active'));
      linkById.get(visible.target.id)?.classList.add('is-active');
    },
    {
      rootMargin: '-38% 0px -50% 0px',
      threshold: [0.08, 0.2, 0.4, 0.65],
    },
  );

  sections.forEach((section) => observer.observe(section));
}

function initReveals() {
  const revealSections = document.querySelectorAll('.reveal-section');
  if (!revealSections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.18,
    },
  );

  revealSections.forEach((section) => observer.observe(section));
}

function initScrollEngine() {
  const root = document.documentElement;
  const depthItems = [...document.querySelectorAll('[data-scroll-3d]')];
  const layers = [...document.querySelectorAll('[data-layer-depth]')];
  const readout = document.getElementById('scroll-readout');

  let targetScroll = window.scrollY;
  let smoothScroll = targetScroll;
  let mouseTargetX = 0;
  let mouseTargetY = 0;
  let mouseX = 0;
  let mouseY = 0;

  if (hasFinePointer && !prefersReducedMotion) {
    window.addEventListener(
      'pointermove',
      (event) => {
        mouseTargetX = (event.clientX / window.innerWidth - 0.5) * 2;
        mouseTargetY = (event.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true },
    );
  }

  const update = () => {
    const viewportHeight = Math.max(window.innerHeight, 1);
    const maxScroll = Math.max(document.documentElement.scrollHeight - viewportHeight, 1);

    targetScroll = window.scrollY;
    smoothScroll = lerp(smoothScroll, targetScroll, prefersReducedMotion ? 1 : 0.12);
    mouseX = lerp(mouseX, mouseTargetX, 0.08);
    mouseY = lerp(mouseY, mouseTargetY, 0.08);

    const progress = clamp(targetScroll / maxScroll, 0, 1);
    const heroProgress = clamp(smoothScroll / (viewportHeight * 0.95), 0, 1);

    root.style.setProperty('--progress-pct', `${(progress * 100).toFixed(2)}%`);
    root.style.setProperty('--scroll-progress', progress.toFixed(4));
    root.style.setProperty('--grid-y', `${(progress * 90).toFixed(2)}px`);
    root.style.setProperty('--hero-progress', heroProgress.toFixed(4));
    root.style.setProperty('--hero-copy-y', `${(heroProgress * -36).toFixed(2)}px`);
    root.style.setProperty('--hero-stage-y', `${(heroProgress * -42).toFixed(2)}px`);
    root.style.setProperty('--hero-stage-y-mobile', `${(heroProgress * -24).toFixed(2)}px`);
    root.style.setProperty('--scene-x-tilt', `${(mouseX * 7).toFixed(3)}deg`);
    root.style.setProperty('--scene-y-tilt', `${(mouseY * -8).toFixed(3)}deg`);
    root.style.setProperty('--scene-x-roll', `${(mouseX * 3).toFixed(3)}deg`);
    root.style.setProperty('--readout-x', `${(mouseX * -14).toFixed(2)}px`);
    root.style.setProperty('--readout-y', `${(mouseY * -14).toFixed(2)}px`);

    if (readout) {
      readout.textContent = `${Math.round(progress * 100)}%`;
    }

    if (!prefersReducedMotion) {
      updateHeroLayers(layers, heroProgress, mouseX, mouseY);
      updateDepthItems(depthItems, viewportHeight);
    }

    requestAnimationFrame(update);
  };

  update();
}

function updateHeroLayers(layers, heroProgress, mouseX, mouseY) {
  layers.forEach((layer) => {
    const depth = Number.parseFloat(layer.dataset.layerDepth || '1');
    const lift = heroProgress * -48 * depth;
    const x = mouseX * 18 * depth;
    const y = lift + mouseY * 14 * depth;

    layer.style.setProperty('--layer-x', `${x.toFixed(2)}px`);
    layer.style.setProperty('--layer-y', `${y.toFixed(2)}px`);
  });
}

function updateDepthItems(items, viewportHeight) {
  items.forEach((item) => {
    if (item.hidden) return;

    const rect = item.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const offset = clamp((center - viewportHeight / 2) / viewportHeight, -1, 1);
    const strength = Number.parseFloat(item.dataset.depth || '1');
    const presence = 1 - Math.abs(offset);

    item.style.setProperty('--scroll-y', `${(-offset * 24 * strength).toFixed(2)}px`);
    item.style.setProperty('--scroll-z', `${(presence * 18 * strength).toFixed(2)}px`);
    item.style.setProperty('--scroll-rx', `${(offset * -4 * strength).toFixed(3)}deg`);
    item.style.setProperty('--scroll-ry', `${(offset * 2.2 * strength).toFixed(3)}deg`);
    item.style.setProperty('--img-y', `${(offset * -12).toFixed(2)}px`);
    item.style.setProperty('--card-opacity', `${clamp(0.58 + presence * 0.58, 0.58, 1).toFixed(3)}`);
  });
}

function initTiltCards() {
  if (prefersReducedMotion || !hasFinePointer) return;

  const cards = document.querySelectorAll('[data-tilt-card]');
  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const x = localX / rect.width - 0.5;
      const y = localY / rect.height - 0.5;
      const intensity = card.classList.contains('portfolio-item') ? 9 : 6;

      card.classList.add('is-tilting');
      card.style.setProperty('--tilt-rx', `${(-y * intensity).toFixed(3)}deg`);
      card.style.setProperty('--tilt-ry', `${(x * intensity).toFixed(3)}deg`);
      card.style.setProperty('--tilt-x', `${(x * 6).toFixed(2)}px`);
      card.style.setProperty('--tilt-y', `${(y * 6).toFixed(2)}px`);
      card.style.setProperty('--tilt-scale', '1.018');
      card.style.setProperty('--glare-x', `${localX.toFixed(2)}px`);
      card.style.setProperty('--glare-y', `${localY.toFixed(2)}px`);
      card.style.setProperty('--glare-opacity', '1');
    });

    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--tilt-rx', '0deg');
      card.style.setProperty('--tilt-ry', '0deg');
      card.style.setProperty('--tilt-x', '0px');
      card.style.setProperty('--tilt-y', '0px');
      card.style.setProperty('--tilt-scale', '1');
      card.style.setProperty('--glare-opacity', '0');
    });
  });
}

function initMagneticButtons() {
  if (prefersReducedMotion || !hasFinePointer) return;

  document.querySelectorAll('[data-magnetic]').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      button.style.setProperty('--magnetic-x', `${(x * 14).toFixed(2)}px`);
      button.style.setProperty('--magnetic-y', `${(y * 10).toFixed(2)}px`);
    });

    button.addEventListener('pointerleave', () => {
      button.style.setProperty('--magnetic-x', '0px');
      button.style.setProperty('--magnetic-y', '0px');
    });
  });
}

function initCustomCursor() {
  if (!hasFinePointer) return;

  const cursorOutline = document.getElementById('cursor-outline');
  const cursorDot = document.getElementById('cursor-dot');
  if (!cursorOutline || !cursorDot) return;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let outlineX = targetX;
  let outlineY = targetY;

  const setTransform = (element, x, y) => {
    element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      setTransform(cursorDot, targetX, targetY);
      cursorOutline.classList.remove('cursor-hidden');
      cursorDot.classList.remove('cursor-hidden');
    },
    { passive: true },
  );

  document.addEventListener('pointerleave', () => {
    cursorOutline.classList.add('cursor-hidden');
    cursorDot.classList.add('cursor-hidden');
  });

  document.addEventListener('pointerover', (event) => {
    if (event.target.closest('a, button, [data-tilt-card], .lightbox-backdrop')) {
      document.body.classList.add('cursor-hover');
    }
  });

  document.addEventListener('pointerout', (event) => {
    if (event.target.closest('a, button, [data-tilt-card], .lightbox-backdrop')) {
      document.body.classList.remove('cursor-hover');
    }
  });

  const render = () => {
    outlineX = lerp(outlineX, targetX, 0.16);
    outlineY = lerp(outlineY, targetY, 0.16);
    setTransform(cursorOutline, outlineX, outlineY);
    requestAnimationFrame(render);
  };

  render();
}

function initPortfolioFilters() {
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.portfolio-item')];
  if (!filterButtons.length || !cards.length) return;

  const timers = new WeakMap();

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'all';

      filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));

      cards.forEach((card, index) => {
        const matches = filter === 'all' || card.dataset.category === filter;
        const timer = timers.get(card);
        if (timer) window.clearTimeout(timer);

        if (matches) {
          card.hidden = false;
          card.style.transitionDelay = `${Math.min(index * 28, 180)}ms`;
          requestAnimationFrame(() => card.classList.remove('is-filtering-out'));
          return;
        }

        card.style.transitionDelay = '0ms';
        card.classList.add('is-filtering-out');
        timers.set(
          card,
          window.setTimeout(() => {
            card.hidden = true;
            card.style.transitionDelay = '0ms';
          }, 260),
        );
      });
    });
  });
}

function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const image = document.getElementById('lightbox-image');
  const caption = document.getElementById('lightbox-caption');
  const closeButton = document.getElementById('lightbox-close');
  const previousButton = document.querySelector('.lightbox-prev');
  const nextButton = document.querySelector('.lightbox-next');
  const backdrop = document.querySelector('.lightbox-backdrop');
  const cards = [...document.querySelectorAll('.portfolio-item')];

  if (!lightbox || !image || !caption || !closeButton || !cards.length) return;

  let visibleCards = cards;
  let activeIndex = 0;

  const refreshVisibleCards = () => {
    visibleCards = cards.filter((card) => !card.hidden);
    if (!visibleCards.length) visibleCards = cards;
  };

  const getCardDetails = (card) => {
    const img = card.querySelector('img');
    const title = card.querySelector('h3')?.textContent?.trim() || 'Portfolio project';
    const type = card.querySelector('.portfolio-info span')?.textContent?.trim() || 'Project';
    const description = card.querySelector('p')?.textContent?.trim() || '';

    return {
      src: img?.src || '',
      alt: img?.alt || title,
      title,
      type,
      description,
    };
  };

  const renderLightbox = () => {
    const card = visibleCards[activeIndex];
    if (!card) return;

    const details = getCardDetails(card);
    image.src = details.src;
    image.alt = details.alt;
    caption.textContent = `${details.title} · ${details.type} · ${activeIndex + 1}/${visibleCards.length}${details.description ? ` · ${details.description}` : ''}`;
  };

  const openLightbox = (card) => {
    refreshVisibleCards();
    activeIndex = Math.max(visibleCards.indexOf(card), 0);
    renderLightbox();
    lightbox.classList.add('active');
    document.body.classList.add('is-locked');
    lightbox.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.classList.remove('is-locked');
    window.setTimeout(() => {
      if (!lightbox.classList.contains('active')) {
        image.removeAttribute('src');
      }
    }, 300);
  };

  const showRelative = (offset) => {
    refreshVisibleCards();
    activeIndex = (activeIndex + offset + visibleCards.length) % visibleCards.length;
    renderLightbox();
  };

  cards.forEach((card) => {
    card.addEventListener('click', () => openLightbox(card));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openLightbox(card);
    });
  });

  closeButton.addEventListener('click', closeLightbox);
  backdrop?.addEventListener('click', closeLightbox);
  previousButton?.addEventListener('click', () => showRelative(-1));
  nextButton?.addEventListener('click', () => showRelative(1));

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('active')) return;

    if (event.key === 'Escape') {
      closeLightbox();
      return;
    }

    if (event.key === 'ArrowLeft') {
      showRelative(-1);
    }

    if (event.key === 'ArrowRight') {
      showRelative(1);
    }
  });
}

function initParallaxLayer() {
  const parallaxLayers = document.querySelectorAll('.parallax-layer');
  if (!parallaxLayers.length) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const lastScrollY = window.scrollY;
        parallaxLayers.forEach((layer) => {
          const speed = parseFloat(layer.getAttribute('data-speed')) || 0.1;
          const yPos = -(lastScrollY * speed);
          layer.style.transform = `translate3d(0px, ${yPos}px, 0px)`;
        });
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

function initCosmicCanvas() {
  const canvas = document.getElementById('cosmic-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  
  const stars = [];
  const shootingStars = [];
  
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createStars();
  });

  function createStars() {
    stars.length = 0;
    const numStars = Math.floor((width * height) / 2000); 
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.1,
        alpha: Math.random(),
        speed: Math.random() * 0.05 + 0.01
      });
    }
  }

  function drawCosmic() {
    ctx.clearRect(0, 0, width, height);
    
    // Draw Nebula Gradient softly moving
    const gradient = ctx.createRadialGradient(
      width * 0.8 + Math.sin(Date.now() * 0.0002) * 100, height * 0.1, 0,
      width * 0.5, height * 0.5, width * 0.8
    );
    gradient.addColorStop(0, 'rgba(217, 70, 239, 0.08)');
    gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Update and draw stars
    stars.forEach(star => {
      star.alpha += star.speed;
      if (star.alpha > 1 || star.alpha < 0) {
        star.speed = -star.speed;
      }
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(star.alpha)})`;
      ctx.fill();
    });

    // Random Shooting Star
    if (Math.random() < 0.03) {
      shootingStars.push({
        x: Math.random() * width,
        y: 0,
        length: Math.random() * 80 + 20,
        speed: Math.random() * 10 + 5,
        opacity: 1
      });
    }

    // Update and draw shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      let ss = shootingStars[i];
      ss.x -= ss.speed;
      ss.y += ss.speed;
      ss.opacity -= 0.02;

      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x + ss.length, ss.y - ss.length);
      ctx.strokeStyle = `rgba(255, 255, 255, ${ss.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (ss.opacity <= 0) {
        shootingStars.splice(i, 1);
      }
    }

    requestAnimationFrame(drawCosmic);
  }

  createStars();
  drawCosmic();
}
