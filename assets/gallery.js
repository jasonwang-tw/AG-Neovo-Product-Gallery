(function ($) {
  'use strict';
  const labels = window.agneovoGalleryLabels || {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const transitionDuration = 700;

  function installLightboxAnimation() {
    const NativeUI = window.PhotoSwipeUI_Default;
    if (typeof NativeUI !== 'function' || NativeUI.agneovoGalleryAnimation) return;
    function AGNeovoPhotoSwipeUI(instance, framework) {
      const root = instance.template;
      if (root && root.id === 'photoswipe-fullscreen-dialog' && document.body.classList.contains('agneovo-product-gallery-active')) {
        // WooCommerce defaults both durations to zero. Use PhotoSwipe's opacity
        // transition for opening/closing, without zooming to/from a thumbnail.
        instance.options.showHideOpacity = !reducedMotion.matches;
        instance.options.showAnimationDuration = instance.options.hideAnimationDuration = reducedMotion.matches ? 0 : transitionDuration;
        instance.options.getThumbBoundsFn = function () { return undefined; };
        // WooCommerce omits PhotoSwipe's preview source. Reuse an already-loaded
        // matching product image while the full-resolution image is loading.
        instance.listen('gettingData', function (index, item) {
          if (!item.src || item.msrc) return;
          const preview = Array.from(document.querySelectorAll('.agneovo-product-gallery .woocommerce-product-gallery__image img[data-large_image]')).find(function (image) {
            return image.dataset.large_image === item.src && image.complete && image.naturalWidth > 1;
          });
          if (preview) item.msrc = preview.currentSrc || preview.src;
        });
        const container = root.querySelector('.pswp__container');
        const nativeGoTo = instance.goTo.bind(instance);
        let animations = [];
        let outgoing = null;
        let changing = false;
        let closed = false;
        function cleanup() {
          animations.forEach(function (animation) { animation.cancel(); });
          animations = [];
          if (outgoing) outgoing.remove();
          outgoing = null;
          if (container) {
            container.classList.remove('agneovo-pswp-sliding');
            container.querySelectorAll('.agneovo-pswp-current').forEach(function (holder) { holder.classList.remove('agneovo-pswp-current'); });
          }
          changing = false;
          delete root.dataset.agneovoTransition;
          delete root.dataset.agneovoDirection;
        }
        // PhotoSwipe v4's public goTo() is immediate. Slide the previous frame
        // beside the new one without replacing PhotoSwipe's own transform state.
        instance.goTo = function (index) {
          if (closed) return;
          if (changing || index === instance.getCurrentIndex()) return;
          if (reducedMotion.matches || !container || typeof container.animate !== 'function' || !window.CSS || !CSS.supports('translate', '1px')) {
            nativeGoTo(index);
            return;
          }
          const current = instance.getCurrentIndex();
          const total = instance.options.getNumItemsFn();
          if ((index % total + total) % total === current) return;
          const previousFrame = instance.currItem && instance.currItem.container;
          const distance = instance.scrollWrap.clientWidth;
          if (!previousFrame || !distance) {
            nativeGoTo(index);
            return;
          }
          // Follow the requested navigation direction, including first/last wrapping.
          const direction = index > current ? 1 : -1;
          outgoing = document.createElement('div');
          outgoing.className = 'agneovo-pswp-transition';
          outgoing.setAttribute('aria-hidden', 'true');
          outgoing.setAttribute('inert', '');
          const snapshot = previousFrame.cloneNode(true);
          snapshot.querySelectorAll('[id]').forEach(function (node) { node.removeAttribute('id'); });
          snapshot.querySelectorAll('video').forEach(function (video) { video.removeAttribute('autoplay'); video.muted = true; });
          outgoing.append(snapshot);
          instance.scrollWrap.append(outgoing);
          changing = true;
          root.dataset.agneovoTransition = 'slide';
          root.dataset.agneovoDirection = index > current ? 'next' : 'previous';
          nativeGoTo(index);
          const incomingHolder = instance.currItem.container && instance.currItem.container.closest('.pswp__item');
          if (incomingHolder) {
            incomingHolder.classList.add('agneovo-pswp-current');
            container.classList.add('agneovo-pswp-sliding');
          }
          // Reach 80% of the distance at 210ms, then ease through the last 20%
          // over 490ms. Segment slopes match at the handoff to avoid a pause.
          const fastEasing = 'cubic-bezier(0.33, 0.5, 0.67, 0.84)';
          const slowEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
          const timing = {duration: transitionDuration, easing: 'linear', fill: 'forwards'};
          animations = [
            container.animate([
              {offset: 0, translate: (direction * distance) + 'px 0', opacity: 0, easing: fastEasing},
              {offset: 0.3, translate: (direction * distance * 0.2) + 'px 0', opacity: 0.8, easing: slowEasing},
              {offset: 1, translate: '0px 0', opacity: 1},
            ], timing),
            outgoing.animate([
              {offset: 0, translate: '0px 0', opacity: 1, easing: fastEasing},
              {offset: 0.3, translate: (-direction * distance * 0.8) + 'px 0', opacity: 0.2, easing: slowEasing},
              {offset: 1, translate: (-direction * distance) + 'px 0', opacity: 0},
            ], timing),
          ];
          Promise.all(animations.map(function (animation) { return animation.finished; })).catch(function () {
            // Closing the dialog cancels an in-flight browser animation.
          }).finally(cleanup);
        };
        instance.listen('close', function () { closed = true; cleanup(); });
      }
      return new NativeUI(instance, framework);
    }
    AGNeovoPhotoSwipeUI.prototype = NativeUI.prototype;
    AGNeovoPhotoSwipeUI.agneovoGalleryAnimation = true;
    window.PhotoSwipeUI_Default = AGNeovoPhotoSwipeUI;
  }
  installLightboxAnimation();

  function enhance(gallery) {
    const rail = gallery.querySelector('.flex-control-thumbs');
    if (!rail || rail.dataset.agneovoReady) return;
    rail.dataset.agneovoReady = 'true';
    const thumbs = Array.from(rail.querySelectorAll('li img'));
    if (!thumbs.length) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'agneovo-gallery-thumbnails';
    rail.before(wrapper);
    wrapper.append(rail);

    function select(index) {
      const slider = $(gallery).data('flexslider');
      if (!slider || slider.animating) return;
      slider.flexAnimate((index + thumbs.length) % thumbs.length, true);
    }

    function arrow(direction) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'agneovo-gallery-arrow agneovo-gallery-arrow--' + direction;
      button.setAttribute('aria-label', direction === 'previous' ? labels.previous : labels.next);
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + (direction === 'previous' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>';
      button.addEventListener('click', function () {
        const slider = $(gallery).data('flexslider');
        if (slider) select(slider.currentSlide + (direction === 'previous' ? -1 : 1));
      });
      wrapper.append(button);
      return button;
    }

    const previous = arrow('previous');
    const next = arrow('next');
    function sync() {
      const active = rail.querySelector('img.flex-active');
      thumbs.forEach((thumb) => thumb.setAttribute('aria-pressed', String(thumb === active)));
      const slots = Number(getComputedStyle(gallery).getPropertyValue('--agneovo-gallery-slots')) || 4;
      previous.hidden = next.hidden = thumbs.length <= slots;
      if (!active) return;
      const bounds = rail.getBoundingClientRect();
      const item = active.closest('li').getBoundingClientRect();
      const left = item.left < bounds.left ? item.left - bounds.left : (item.right > bounds.right ? item.right - bounds.right : 0);
      if (left) rail.scrollBy({left, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    }

    thumbs.forEach((thumb, index) => {
      thumb.setAttribute('role', 'button');
      thumb.setAttribute('tabindex', '0');
      thumb.setAttribute('aria-label', (labels.image || '') + ' ' + (index + 1) + ' / ' + thumbs.length);
      thumb.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(index);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          const target = (index + (event.key === 'ArrowLeft' ? -1 : 1) + thumbs.length) % thumbs.length;
          select(target);
          thumbs[target].focus({preventScroll: true});
        }
      });
    });
    new MutationObserver(sync).observe(rail, {attributes:true, attributeFilter:['class'], subtree:true});
    if (window.ResizeObserver) new ResizeObserver(sync).observe(rail);
    else window.addEventListener('resize', sync, {passive:true});
    sync();
  }

  function initialize(gallery) {
    // This theme does not print body_class(); retain the same scope in its DOM.
    document.body.classList.add('agneovo-product-gallery-active');
    gallery.classList.add('agneovo-gallery-initialized');
    enhance(gallery);
    if (!gallery.querySelector('.flex-control-thumbs') && !gallery.dataset.agneovoWatching) {
      gallery.dataset.agneovoWatching = 'true';
      const observer = new MutationObserver(function () {
        if (gallery.querySelector('.flex-control-thumbs')) {
          observer.disconnect();
          enhance(gallery);
        }
      });
      observer.observe(gallery, {childList:true, subtree:true});
    }
  }
  $(document).on('wc-product-gallery-after-init.agneovoGallery', '.agneovo-product-gallery', function () { initialize(this); });
  $(function () { installLightboxAnimation(); document.querySelectorAll('.agneovo-product-gallery').forEach(initialize); });
})(jQuery);
