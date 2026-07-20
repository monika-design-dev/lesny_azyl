document.addEventListener('DOMContentLoaded', () => {

    // ─── elementy DOM ──────────────────────────────────────────────────────────
    const calendarGrid        = document.getElementById('calendar-grid');
    const currentMonthDisplay = document.getElementById('current-month-display');
    const prevMonthBtn        = document.getElementById('prev-month');
    const nextMonthBtn        = document.getElementById('next-month');
    const detailsCard         = document.getElementById('reservation-details');
    const detailsDateSpan     = document.getElementById('details-date');
    const detailsWorkshopInfo = document.getElementById('details-workshop-info');
    const detailsStayInfo     = document.getElementById('details-stay-info');
    const navBackground       = document.querySelector('.nav-background');
    const filosofiaSection    = document.getElementById('filozofia');
    const hamburgerBtn        = document.getElementById('menu-toggle-btn');
    const mainMenu            = document.querySelector('.nav-links');
    const audio               = document.getElementById('background-audio');
    const toggleLink          = document.getElementById('toggle-sound-btn');

    let currentYear  = new Date().getFullYear();
    let currentMonth = new Date().getMonth();

    const monthNames = [
        "Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
        "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"
    ];

    // ─── helpers ───────────────────────────────────────────────────────────────
    function getNextDayEvent(dateString) {
        const d = new Date(dateString);
        d.setDate(d.getDate() + 1);
        return eventData[formatDate(d)] || null;
    }
    function getPrevDayEvent(dateString) {
        const d = new Date(dateString);
        d.setDate(d.getDate() - 1);
        return eventData[formatDate(d)] || null;
    }
    function spotsLabel(ev) {
        if (!ev || ev.type !== 'workshop') return '';
        const free = ev.spotsTotal - ev.spotsTaken;
        if (free <= 0) return `<span class="spots spots-full">Brak miejsc</span>`;
        if (free <= 2) return `<span class="spots spots-low">Ostatnie ${free} miejsce${free > 1 ? 'a' : ''}!</span>`;
        return `<span class="spots spots-ok">Wolne miejsca: ${free} / ${ev.spotsTotal}</span>`;
    }

    // ─── nawigacja – cień ─────────────────────────────────────────────────────
    if (navBackground && filosofiaSection) {
        const toggleShadow = () => {
            const threshold = filosofiaSection.offsetTop - (navBackground.offsetHeight || 80);
            navBackground.classList.toggle('scrolled', window.scrollY >= threshold);
        };
        toggleShadow();
        window.addEventListener('scroll', toggleShadow, { passive: true });
    }

    // ─── kalendarz ─────────────────────────────────────────────────────────────
    function renderCalendar(year, month) {
        if (!calendarGrid) return;
        currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;

        while (calendarGrid.children.length > 7) calendarGrid.removeChild(calendarGrid.lastChild);

        const firstDow    = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startIndex  = firstDow === 0 ? 6 : firstDow - 1;

        for (let i = 0; i < startIndex; i++) {
            const el = document.createElement('div');
            el.classList.add('day', 'empty');
            calendarGrid.appendChild(el);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date    = new Date(year, month, day);
            const dateStr = formatDate(date);
            const ev      = eventData[dateStr];
            const dow     = date.getDay();
            const el      = document.createElement('div');
            el.classList.add('day');
            el.textContent  = day;
            el.dataset.date = dateStr;

            if (ev) {
                if (ev.type === 'unavailable') {
                    el.classList.add('unavailable');
                    el.title = ev.description;
                } else if (ev.type === 'workshop') {
                    const free = ev.spotsTotal - ev.spotsTaken;
                    if (free <= 0) {
                        el.classList.add('unavailable');
                        el.title = `${ev.name} – brak miejsc`;
                    } else {
                        el.classList.add('has-event');
                        if (free <= 2) el.classList.add('spots-critical');
                        // ikona noclegu na sobocie gdy nazajutrz też warsztat
                        if (dow === 6) {
                            const nextEv = getNextDayEvent(dateStr);
                            if (nextEv && nextEv.type === 'workshop') el.classList.add('has-stay');
                        }
                        el.title = ev.name;
                    }
                }
            }

            calendarGrid.appendChild(el);
        }

        if (detailsCard) detailsCard.style.display = 'none';
    }

    function selectDay(dayDiv) {
        const dateStr = dayDiv.dataset.date;
        const ev      = eventData[dateStr];
        const dow     = new Date(dateStr).getDay();
        const nextEv  = getNextDayEvent(dateStr);
        const prevEv  = getPrevDayEvent(dateStr);

        document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
        dayDiv.classList.add('selected');

        detailsDateSpan.textContent   = dateStr;
        detailsCard.style.display     = 'block';
        detailsWorkshopInfo.innerHTML = '';
        detailsStayInfo.innerHTML     = '';

        let bookingType = '', isBookingAvailable = true;

        if (ev && ev.type === 'workshop') {
            bookingType = ev.name;
            detailsWorkshopInfo.innerHTML =
                `<h4>${ev.name}</h4><p>${ev.description}</p>${spotsLabel(ev)}`;

            // Nocleg tylko gdy sob+nd — oba warsztaty z rzędu
            const nextIsWorkshop = nextEv && nextEv.type === 'workshop';
            const prevIsWorkshop = prevEv && prevEv.type === 'workshop';

            if (dow === 6 && nextIsWorkshop) {
                // Sobota — jest jutro warsztat niedzielny
                detailsStayInfo.innerHTML = `
                    <div class="stay-info-box">
                        <h5>🏕 Pakiet weekendowy z noclegiem</h5>
                        <p>Rezerwując ten warsztat razem z niedzielnym (<strong>${nextEv.name}</strong>), otrzymujesz nocleg między zajęciami — własny namiot lub wiata z materacami, wieczorne ognisko i poranna herbata z ziół.</p>
                        <label class="stay-checkbox-label">
                            <input type="checkbox" id="add-stay-checkbox">
                            Chcę zarezerwować oba warsztaty weekendowe z noclegiem
                        </label>
                    </div>`;
            } else if (dow === 0 && prevIsWorkshop) {
                // Niedziela — poprzedni dzień to sobotni warsztat
                detailsStayInfo.innerHTML = `
                    <div class="stay-info-box stay-info-note">
                        <h5>🏕 Pakiet weekendowy z noclegiem</h5>
                        <p>Jeśli rezerwujesz oba warsztaty weekendowe (sobota + niedziela), nocleg między zajęciami jest wliczony w pakiet. Zaznacz tę opcję przy rezerwacji sobotniego warsztatu lub skontaktuj się z nami.</p>
                    </div>`;
            } else {
                detailsStayInfo.innerHTML = `<p class="stay-note-single">Nocleg dostępny wyłącznie przy rezerwacji obu warsztatów weekendowych (sobota + niedziela) z rzędu.</p>`;
            }

        } else if (ev && ev.type === 'unavailable') {
            detailsWorkshopInfo.innerHTML = `<h4>Termin Niedostępny</h4><p>${ev.description}</p>`;
            isBookingAvailable = false;

        } else {
            bookingType = 'Pobyt Własny';
            detailsWorkshopInfo.innerHTML = `<h4>Dzień wolny od warsztatów</h4><p>Brak zaplanowanych warsztatów w tym dniu. W sprawie pobytu własnego prosimy o kontakt.</p>`;
        }

        if (isBookingAvailable) {
            detailsStayInfo.innerHTML += `<button id="reserve-btn" class="btn small-btn">Zarezerwuj Termin</button>`;
        }

        const reserveBtn = document.getElementById('reserve-btn');
        if (reserveBtn) {
            reserveBtn.addEventListener('click', () => {
                const hasStay = document.getElementById('add-stay-checkbox')?.checked || false;
                const stayNote = hasStay ? '\nChciałbym/Chciałabym zarezerwować pakiet weekendowy z noclegiem (sob + nd).\n' : '';
                const subject  = encodeURIComponent(`Rezerwacja: ${bookingType} – ${dateStr}`);
                const body     = encodeURIComponent(
                    `Dzień dobry,\n\nChciałbym/Chciałabym zarezerwować termin:\nData: ${dateStr}\nRodzaj: ${bookingType}` +
                    stayNote + `\n\nProszę o potwierdzenie dostępności.\n\nPozdrawiam`
                );
                window.location.href = `mailto:kontakt@lesnyazyl.pl?subject=${subject}&body=${body}`;
            });
        }
    }

    // ─── nawigacja kalendarza ──────────────────────────────────────────────────
    prevMonthBtn?.addEventListener('click', () => {
        if (--currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar(currentYear, currentMonth);
    });
    nextMonthBtn?.addEventListener('click', () => {
        if (++currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar(currentYear, currentMonth);
    });

    calendarGrid?.addEventListener('click', e => {
        const d = e.target.closest('.day');
        if (d && !d.classList.contains('empty') && !d.classList.contains('unavailable'))
            selectDay(d);
    });

    renderCalendar(currentYear, currentMonth);

    // ─── logo scroll ───────────────────────────────────────────────────────────
    document.getElementById('logo-top-link')?.addEventListener('click', e => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ─── dźwięk ────────────────────────────────────────────────────────────────

    if (toggleLink && audio) {
        const icon = toggleLink.querySelector('i');

        const updateIcon = (playing) => {
            if (playing) {
                icon.classList.replace('fa-volume-mute', 'fa-volume-up');
                toggleLink.classList.remove('muted');
                toggleLink.setAttribute('aria-label', 'Wyłącz muzykę');
                toggleLink.setAttribute('aria-pressed', 'true');
            } else {
                icon.classList.replace('fa-volume-up', 'fa-volume-mute');
                toggleLink.classList.add('muted');
                toggleLink.setAttribute('aria-label', 'Włącz muzykę');
                toggleLink.setAttribute('aria-pressed', 'false');
            }
        };

        audio.pause();
        toggleLink.setAttribute('aria-pressed', 'false');

        // start po pierwszym kliknięciu gdziekolwiek na stronie
        document.addEventListener('click', () => {
            if (audio.paused) {
                audio.play().then(() => updateIcon(true)).catch(() => console.warn("Autoplay zablokowany."));
            }
        }, { once: true });
        // Funkcja, która uruchamia dźwięk
        const startAudio = () => {
            if (audio.paused) {
                audio.play().then(() => updateIcon(true)).catch(() => console.warn("Autoplay zablokowany."));
            }
        };

        // Podpinamy to samo pod dwa różne zdarzenia
        document.addEventListener('click', startAudio, { once: true });
        window.addEventListener('scroll', startAudio, { once: true });

                // ręczny toggle z przycisku głośności (działa też jako mute/unmute)
                toggleLink.addEventListener('click', e => {
                    e.preventDefault();
                    if (audio.paused) {
                        audio.play().catch(() => console.warn("Autoplay zablokowany."));
                        updateIcon(true);
                    } else {
                        audio.pause();
                        updateIcon(false);
                    }
                });
            }   

    // ─── modal źródła ─────────────────────────────────────────────────────────
    const modal   = document.getElementById('modal-zrodla');
    const openBtn = document.getElementById('open-zrodla-modal');
    const closeBtn= document.getElementById('close-zrodla-modal');

    openBtn?.addEventListener('click',  e => { e.preventDefault(); modal.classList.add('is-active'); });
    closeBtn?.addEventListener('click', e => { e.preventDefault(); modal.classList.remove('is-active'); });
    modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('is-active'); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') modal?.classList.remove('is-active');
    });

    // ─── hamburger ─────────────────────────────────────────────────────────────
    if (hamburgerBtn && mainMenu) {
        hamburgerBtn.addEventListener('click', function () {
            mainMenu.classList.toggle('is-active');
            this.classList.toggle('is-active');
            this.setAttribute('aria-expanded', mainMenu.classList.contains('is-active'));
        });
        mainMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
            mainMenu.classList.remove('is-active');
            hamburgerBtn.classList.remove('is-active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        }));
    }

    // ─── opinie – infinite loop, 1 / 2 / 3 kafelki obok siebie ───────────────
    const track  = document.querySelector('.opinions-track');
    const prevOp = document.getElementById('prev-opinion');
    const nextOp = document.getElementById('next-opinion');
    const slider = document.querySelector('.opinions-slider');

    if (track) {
        const GAP = 16;

        function visibleCount() {
            if (window.innerWidth >= 900) return 3;
            if (window.innerWidth >= 671) return 2;
            return 1;
        }

        const origSlides = Array.from(track.children);
        const total      = origSlides.length;

        // Klonuj — jeden zestaw przed i po oryginałach
        origSlides.forEach(s => track.appendChild(s.cloneNode(true)));
        origSlides.forEach(s => track.insertBefore(s.cloneNode(true), track.firstChild));

        let current        = total; // start na oryginalnych
        let isTransitioning = false;

        function calcSlideWidth() {
            const vc   = visibleCount();
            const wrap = track.parentElement.offsetWidth;
            return (wrap - GAP * (vc - 1)) / vc;
        }

        function applyWidths() {
            const sw = calcSlideWidth();
            Array.from(track.children).forEach(s => {
                s.style.width    = sw + 'px';
                s.style.minWidth = sw + 'px';
                s.style.maxWidth = sw + 'px';
            });
        }

        function setPos(animated) {
            const sw = calcSlideWidth();
            const x  = current * (sw + GAP);
            track.style.transition = animated ? 'transform .5s ease' : 'none';
            track.style.transform  = `translateX(-${x}px)`;
        }

        function updateDots() {
            const realIdx = ((current - total) % total + total) % total;
            document.querySelectorAll('.opinion-dot').forEach((d, i) =>
                d.classList.toggle('active', i === realIdx)
            );
        }

        function go(dir) {
            if (isTransitioning) return;
            isTransitioning = true;
            current += dir;
            setPos(true);
            updateDots();
        }

        track.addEventListener('transitionend', () => {
            isTransitioning = false;
            if (current >= total * 2) { current = total;         setPos(false); }
            if (current < total)      { current = total * 2 - 1; setPos(false); }
        });

        applyWidths();
        setPos(false);
        updateDots();

        prevOp?.addEventListener('click', () => go(-1));
        nextOp?.addEventListener('click', () => go(1));
        document.querySelectorAll('.opinion-dot').forEach((d, i) => {
            d.addEventListener('click', () => {
                if (isTransitioning) return;
                current = total + i;
                isTransitioning = true;
                setPos(true);
                updateDots();
                setTimeout(() => { isTransitioning = false; }, 520);
            });
        });

        let opTimer = setInterval(() => go(1), 6000);
        slider?.addEventListener('mouseenter', () => clearInterval(opTimer));
        slider?.addEventListener('mouseleave', () => { opTimer = setInterval(() => go(1), 6000); });

        // ─── swipe na dotyk (mobile) ───────────────────────────────────────
        let touchStartX = 0;
        let touchEndX   = 0;

        track.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        track.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            const THRESHOLD = 40; // min. px, żeby uznać to za swipe

            if (Math.abs(diff) > THRESHOLD) {
                clearInterval(opTimer);
                go(diff > 0 ? 1 : -1); // przesunięcie w lewo = następny, w prawo = poprzedni
                opTimer = setInterval(() => go(1), 6000);
            }
        }, { passive: true });

        window.addEventListener('resize', () => { applyWidths(); setPos(false); });
    }

    // ─── FAQ ───────────────────────────────────────────────────────────────────
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item   = btn.parentElement;
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });

    // ─── formularz kontaktowy ─────────────────────────────────────────────────
    const contactForm = document.getElementById('contact-form');
    contactForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn    = contactForm.querySelector('button[type="submit"]');
        const status = document.getElementById('form-status');
        btn.disabled    = true;
        btn.textContent = 'Wysyłanie…';

        try {
            const res = await fetch('https://formspree.io/f/TWOJ_KOD', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: new FormData(contactForm)
            });
            if (res.ok) {
                status.textContent = '✓ Wiadomość wysłana! Odezwiemy się wkrótce.';
                status.className   = 'form-status success';
                contactForm.reset();
            } else { throw new Error(); }
        } catch {
            status.textContent = '✗ Coś poszło nie tak. Napisz bezpośrednio na kontakt@lesnyazyl.pl';
            status.className   = 'form-status error';
        }
        btn.disabled    = false;
        btn.textContent = 'Wyślij Wiadomość';
        status.style.display = 'block';
    });

    // ─── galeria lightbox ──────────────────────────────────────────────────────
    const lightbox     = document.getElementById('lightbox');
    const lbImg        = document.getElementById('lightbox-img');
    const lbCaption    = document.getElementById('lightbox-caption');
    const lbClose      = document.getElementById('lightbox-close');
    const lbPrev       = document.getElementById('lightbox-prev');
    const lbNext       = document.getElementById('lightbox-next');
    const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
    let lbIndex        = 0;

    function openLightbox(i) {
        lbIndex    = i;
        const item = galleryItems[i];
        lbImg.src  = item.dataset.full || item.querySelector('img')?.src || '';
        lbCaption.textContent = item.dataset.caption || '';
        lightbox.classList.add('is-active');
        document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
        lightbox.classList.remove('is-active');
        document.body.style.overflow = '';
    }

    galleryItems.forEach((item, i) => item.addEventListener('click', () => openLightbox(i)));
    lbClose?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    lbPrev?.addEventListener('click', () => openLightbox((lbIndex - 1 + galleryItems.length) % galleryItems.length));
    lbNext?.addEventListener('click', () => openLightbox((lbIndex + 1) % galleryItems.length));
    document.addEventListener('keydown', e => {
        if (!lightbox?.classList.contains('is-active')) return;
        if (e.key === 'Escape')      closeLightbox();
        if (e.key === 'ArrowLeft')   lbPrev?.click();
        if (e.key === 'ArrowRight')  lbNext?.click();
    });
});

// ─── video w kartach ───────────────────────────────────────────────────────────
document.querySelectorAll('.card-video').forEach(card => {
    const video = card.querySelector('video');
    const btn   = card.querySelector('.video-play-btn');
    if (!video || !btn) return;

    const toggle = () => {
        if (video.paused) {
            video.muted = false; video.play();
            card.classList.add('is-playing');
        } else {
            video.pause();
            card.classList.remove('is-playing');
        }
    };
    btn.addEventListener('click', toggle);
    video.addEventListener('click', toggle);
    video.addEventListener('ended', () => { video.currentTime = 0; card.classList.remove('is-playing'); });
});