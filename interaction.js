(() => {
  'use strict';

  const initialize = () => {
    const cards = [...document.querySelectorAll('.project-card')];
    const hero = document.getElementById('hero');
    const trail = document.getElementById('image-trail');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const galleries = Object.create(null);
    const galleryData = document.getElementById('project-galleries');
    if (galleryData) {
      try {
        const data = JSON.parse(galleryData.textContent || '{}');
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          Object.entries(data).forEach(([id, gallery]) => {
            if (!gallery || !Array.isArray(gallery.images)) return;
            const images = gallery.images.filter(image => image && typeof image.src === 'string' && image.src.trim());
            if (images.length) galleries[id] = { images, note: typeof gallery.note === 'string' ? gallery.note : '' };
          });
        }
      } catch {
        // Keep the original single-image previews usable if gallery data is absent or invalid.
      }
    }

    // The images are decoration; the project buttons remain the accessible content.
    if (hero && trail && cards.length) {
      const gallerySources = Object.values(galleries).flatMap(gallery => gallery.images.map(image => image.thumb || image.src));
      const urls = gallerySources.length ? gallerySources : cards.map(card => card.querySelector('img')).filter(Boolean).slice(0, 10).map(image => image.currentSrc || image.src);
      const sources = [...new Set(urls)].map(url => {
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
        return image;
      });
      let imageIndex = 0;
      let lastPoint = null;
      let lastTime = -Infinity;

      trail.setAttribute('aria-hidden', 'true');
      trail.style.pointerEvents = 'none';
      trail.style.overflow = 'hidden';

      const resetTrail = () => {
        lastPoint = null;
        lastTime = -Infinity;
        for (const image of trail.children) {
          image.getAnimations?.().forEach(animation => animation.cancel());
        }
        trail.replaceChildren();
      };

      const addImage = (x, y, bounds) => {
        let source;
        for (let attempt = 0; attempt < sources.length; attempt += 1) {
          const candidate = sources[imageIndex % sources.length];
          imageIndex += 1;
          if (candidate.complete && candidate.naturalWidth > 0) {
            source = candidate;
            break;
          }
        }
        if (!source) return;
        const url = source.currentSrc || source.src;
        if (!url) return;

        const image = new Image();
        const ratio = source.naturalWidth / source.naturalHeight;
        const width = Math.min(300, Math.max(156, bounds.width * 0.22), bounds.height * 0.48 * ratio);
        const height = width / ratio;
        const rotation = (Math.random() - 0.5) * 8;
        const padding = 24;
        const halfWidth = width / 2 + padding;
        const halfHeight = height / 2 + padding;
        const centerX = Math.max(halfWidth, Math.min(bounds.width - halfWidth, x));
        const centerY = Math.max(halfHeight, Math.min(bounds.height - halfHeight, y));

        image.className = 'trail-image';
        image.src = url;
        image.alt = '';
        image.draggable = false;
        image.decoding = 'async';
        Object.assign(image.style, {
          position: 'absolute',
          left: `${centerX - width / 2}px`,
          top: `${centerY - height / 2}px`,
          width: `${width}px`,
          height: `${height}px`,
          objectFit: 'cover',
          filter: 'none',
          borderRadius: '0',
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        });

        while (trail.children.length >= 9) {
          const oldest = trail.firstElementChild;
          oldest.getAnimations?.().forEach(animation => animation.cancel());
          oldest.remove();
        }
        trail.append(image);

        if (typeof image.animate !== 'function') {
          image.style.transform = `rotate(${rotation}deg)`;
          window.setTimeout(() => image.remove(), 1000);
          return;
        }

        const animation = image.animate([
          { opacity: 0, transform: `translateY(12px) rotate(${rotation}deg) scale(0.86)`, offset: 0, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
          { opacity: 0.95, transform: `translateY(0) rotate(${rotation}deg) scale(1)`, offset: 0.3 },
          { opacity: 0.95, transform: `translateY(0) rotate(${rotation}deg) scale(1)`, offset: 0.63, easing: 'cubic-bezier(0.4, 0, 1, 1)' },
          { opacity: 0, transform: `translateY(-8px) rotate(${rotation}deg) scale(0.92)`, offset: 1 },
        ], { duration: 1120, fill: 'both' });
        animation.finished.then(() => image.remove(), () => image.remove());
      };

      hero.addEventListener('pointermove', event => {
        if (!sources.length || !finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
        const bounds = hero.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return;
        const now = performance.now();
        if (lastPoint && (Math.hypot(x - lastPoint.x, y - lastPoint.y) < 100 || now - lastTime < 90)) return;
        addImage(x, y, bounds);
        lastPoint = { x, y };
        lastTime = now;
      }, { passive: true });

      hero.addEventListener('pointerleave', () => {
        lastPoint = null;
        lastTime = -Infinity;
      });
      reducedMotion.addEventListener('change', resetTrail);
      finePointer.addEventListener('change', resetTrail);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) resetTrail();
      });
    }

    const dialog = document.getElementById('project-dialog');
    if (dialog && cards.length && typeof dialog.showModal === 'function') {
      const detailImage = document.getElementById('detail-image');
      const detailTitle = document.getElementById('detail-title');
      const detailCategory = document.getElementById('detail-category');
      const detailDescription = document.getElementById('detail-description');
      const detailCount = document.getElementById('detail-count');
      const detailCompany = document.getElementById('detail-company');
      const detailPeriod = document.getElementById('detail-period');
      const detailRole = document.getElementById('detail-role');
      const detailImageNote = dialog.querySelector('.detail-image-note');
      const defaultImageNote = detailImageNote?.textContent || '';
      const galleryStage = document.getElementById('gallery-stage');
      const galleryToolbar = document.getElementById('gallery-toolbar');
      const galleryPrevious = document.getElementById('gallery-prev');
      const galleryNext = document.getElementById('gallery-next');
      const galleryStatus = document.getElementById('gallery-status');
      const galleryThumbnails = document.getElementById('gallery-thumbnails');
      const galleryCaption = document.getElementById('gallery-caption');
      const previous = document.getElementById('detail-prev');
      const next = document.getElementById('detail-next');
      const close = document.getElementById('detail-close');
      let activeIndex = 0;
      let openedFrom = null;
      let bodyStyles = null;
      let activeImages = [];
      let activeImageIndex = 0;
      let imageRequest = 0;
      let touchStart = null;

      const renderImage = index => {
        if (!activeImages.length) return;
        activeImageIndex = (index + activeImages.length) % activeImages.length;
        const image = activeImages[activeImageIndex];
        const caption = image.caption || image.alt || '';
        const request = ++imageRequest;
        if (galleryStatus) galleryStatus.textContent = activeImages.length > 1 ? `${activeImageIndex + 1} / ${activeImages.length}` : '';
        if (galleryCaption) galleryCaption.textContent = caption;
        galleryThumbnails?.querySelectorAll('button').forEach((button, thumbnailIndex) => {
          button.setAttribute('aria-pressed', String(thumbnailIndex === activeImageIndex));
        });
        const selectedThumbnail = galleryThumbnails?.children[activeImageIndex];
        if (selectedThumbnail && dialog.open) {
          const stripBounds = galleryThumbnails.getBoundingClientRect();
          const thumbnailBounds = selectedThumbnail.getBoundingClientRect();
          if (thumbnailBounds.left < stripBounds.left + 4 || thumbnailBounds.right > stripBounds.right - 4) {
            galleryThumbnails.scrollTo({
              left: galleryThumbnails.scrollLeft + thumbnailBounds.left - stripBounds.left - (stripBounds.width - thumbnailBounds.width) / 2,
              behavior: reducedMotion.matches ? 'auto' : 'smooth',
            });
          }
        }
        if (!detailImage) return;
        detailImage.hidden = true;
        detailImage.alt = '';
        galleryStage?.setAttribute('aria-busy', 'true');
        const loadedImage = new Image();
        loadedImage.decoding = 'async';
        let settled = false;
        const finish = success => {
          if (settled) return;
          settled = true;
          if (request !== imageRequest) return;
          galleryStage?.setAttribute('aria-busy', 'false');
          if (success) {
            detailImage.src = image.src;
            detailImage.alt = image.alt || caption;
            detailImage.hidden = false;
          } else {
            detailImage.removeAttribute('src');
            if (galleryCaption) galleryCaption.textContent = `${caption ? `${caption} · ` : ''}图片暂时无法加载，请切换其他图片。`;
          }
        };
        loadedImage.onload = () => finish(true);
        loadedImage.onerror = () => finish(false);
        loadedImage.src = image.src;
        if (loadedImage.complete) finish(loadedImage.naturalWidth > 0);
      };

      const renderThumbnails = () => {
        if (!galleryThumbnails) return;
        galleryThumbnails.replaceChildren();
        if (activeImages.length < 2) return;
        const fragment = document.createDocumentFragment();
        activeImages.forEach((image, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'gallery-thumbnail';
          button.setAttribute('aria-label', `查看第 ${index + 1} 张：${image.caption || image.alt || cards[activeIndex].dataset.title || '项目效果图'}`);
          button.setAttribute('aria-pressed', String(index === activeImageIndex));
          const thumbnail = new Image();
          thumbnail.loading = 'lazy';
          thumbnail.decoding = 'async';
          thumbnail.alt = '';
          thumbnail.width = 180;
          thumbnail.height = 121;
          thumbnail.addEventListener('error', () => { thumbnail.hidden = true; }, { once: true });
          thumbnail.src = image.thumb || image.src;
          button.append(thumbnail);
          button.addEventListener('click', () => renderImage(index));
          fragment.append(button);
        });
        galleryThumbnails.append(fragment);
        galleryThumbnails.scrollLeft = 0;
      };

      const renderProject = index => {
        activeIndex = (index + cards.length) % cards.length;
        const card = cards[activeIndex];
        const image = card.querySelector('img');
        const gallery = galleries[card.id];
        activeImages = gallery?.images || (image ? [{ src: image.currentSrc || image.src, alt: image.alt || card.dataset.title || '', caption: '' }] : []);
        activeImageIndex = 0;
        touchStart = null;
        const hasMultipleImages = activeImages.length > 1;
        if (galleryToolbar) galleryToolbar.hidden = !hasMultipleImages;
        if (galleryThumbnails) galleryThumbnails.hidden = !hasMultipleImages;
        if (galleryPrevious) galleryPrevious.disabled = !hasMultipleImages;
        if (galleryNext) galleryNext.disabled = !hasMultipleImages;
        if (galleryCaption) {
          galleryCaption.hidden = !gallery;
          galleryCaption.textContent = '';
        }
        if (galleryStatus) galleryStatus.textContent = '';
        if (detailImageNote) detailImageNote.textContent = gallery?.note || defaultImageNote;
        renderThumbnails();
        if (activeImages.length) {
          renderImage(0);
        } else if (detailImage) {
          imageRequest += 1;
          detailImage.hidden = true;
          detailImage.alt = '';
          detailImage.removeAttribute('src');
          galleryStage?.setAttribute('aria-busy', 'false');
        }
        if (detailTitle) detailTitle.textContent = card.dataset.title || '';
        if (detailCategory) detailCategory.textContent = card.dataset.category || '';
        if (detailDescription) detailDescription.textContent = card.dataset.description || '';
        if (detailCount) detailCount.textContent = `${activeIndex + 1} / ${cards.length}`;
        if (detailCompany) detailCompany.textContent = card.dataset.company || '';
        if (detailPeriod) detailPeriod.textContent = card.dataset.period || '';
        if (detailRole) detailRole.textContent = card.dataset.role || '';
      };

      const lockScroll = () => {
        bodyStyles = {
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
        };
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
          const existingPadding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
          document.body.style.paddingRight = `${existingPadding + scrollbarWidth}px`;
        }
        document.body.style.overflow = 'hidden';
      };

      cards.forEach((card, index) => {
        card.addEventListener('click', () => {
          if (dialog.open) return;
          openedFrom = card;
          renderProject(index);
          dialog.showModal();
          lockScroll();
          close?.focus({ preventScroll: true });
        });
      });

      previous?.addEventListener('click', () => renderProject(activeIndex - 1));
      next?.addEventListener('click', () => renderProject(activeIndex + 1));
      galleryPrevious?.addEventListener('click', () => renderImage(activeImageIndex - 1));
      galleryNext?.addEventListener('click', () => renderImage(activeImageIndex + 1));
      close?.addEventListener('click', () => dialog.close());
      if (previous) previous.disabled = cards.length < 2;
      if (next) next.disabled = cards.length < 2;

      dialog.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.target instanceof Element && event.target.closest('#gallery-thumbnails, #detail-prev, #detail-next, input, textarea, select, [contenteditable="true"]')) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          const direction = event.key === 'ArrowLeft' ? -1 : 1;
          if (activeImages.length > 1) renderImage(activeImageIndex + direction);
          else renderProject(activeIndex + direction);
        }
      });

      galleryStage?.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch' || !event.isPrimary || activeImages.length < 2) return;
        touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }, { passive: true });
      galleryStage?.addEventListener('pointerup', event => {
        if (!touchStart || touchStart.id !== event.pointerId) return;
        const deltaX = event.clientX - touchStart.x;
        const deltaY = event.clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(deltaX) >= 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          renderImage(activeImageIndex + (deltaX < 0 ? 1 : -1));
        }
      }, { passive: true });
      galleryStage?.addEventListener('pointercancel', () => { touchStart = null; }, { passive: true });

      // Native dialogs implement Escape and focus trapping. Only clicks outside
      // the dialog rectangle count as backdrop clicks, not empty inner padding.
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
          dialog.close();
        }
      });

      dialog.addEventListener('close', () => {
        touchStart = null;
        if (bodyStyles) {
          document.body.style.overflow = bodyStyles.overflow;
          document.body.style.paddingRight = bodyStyles.paddingRight;
          bodyStyles = null;
        }
        openedFrom?.focus({ preventScroll: true });
      });
    }

    const menuToggle = document.getElementById('menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    if (menuToggle && mobileNav) {
      const setMenu = expanded => {
        menuToggle.setAttribute('aria-expanded', String(expanded));
        mobileNav.hidden = !expanded;
      };
      menuToggle.addEventListener('click', () => {
        setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
      });
      mobileNav.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', () => setMenu(false));
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !mobileNav.hidden) {
          setMenu(false);
          menuToggle.focus({ preventScroll: true });
        }
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
