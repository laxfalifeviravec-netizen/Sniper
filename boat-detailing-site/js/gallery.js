// "Boats We've Detailed" gallery — lightbox viewer

document.addEventListener('DOMContentLoaded', () => {
  const cards = Array.from(document.querySelectorAll('.boat-card'));
  if (!cards.length) return;

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');

  const photos = cards.map((card) => {
    const img = card.querySelector('img');
    const title = card.querySelector('h3')?.textContent || '';
    const desc = card.querySelector('figcaption p')?.textContent || '';
    return {
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      caption: [title, desc].filter(Boolean).join(' — '),
    };
  });

  let current = 0;

  function show(index) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.alt;
    lightboxCaption.textContent = photo.caption;
  }

  function open(index) {
    show(index);
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  cards.forEach((card, i) => {
    const btn = card.querySelector('.boat-card-btn');
    btn.addEventListener('click', () => open(i));
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(current - 1));
  nextBtn.addEventListener('click', () => show(current + 1));

  // Click outside the image/caption closes the lightbox
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
});
