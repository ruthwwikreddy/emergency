(function(){
  const form = document.getElementById('emergencyForm');
  const result = document.getElementById('result');
  const linkEl = document.getElementById('cardLink');
  const copyBtn = document.getElementById('copyLink');
  const viewBtn = document.getElementById('viewCard');
  const toastContainer = document.getElementById('toastContainer');
  const bulkForm = document.getElementById('bulkForm');
  const bulkFile = document.getElementById('bulkFile');
  const bulkSubmit = document.getElementById('bulkSubmit');
  const bulkResult = document.getElementById('bulkResult');
  const bulkLinks = document.getElementById('bulkLinks');
  const bulkExport = document.getElementById('bulkExport');

  const showToast = (msg) => {
    if (!toastContainer) return alert(msg);
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    toastContainer.appendChild(div);
    setTimeout(() => {
      div.remove();
    }, 2000);
  };

  // Track the currently detected hotline info and approximate location
  let CURRENT_HOTLINE = { title: 'Emergency Hotlines', general: '100' };
  let LAST_COORDS = null; // { latitude, longitude } or null
  let LAST_APPROX = null; // string or null

  if (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.vehicleLast4 = (data.vehicleLast4 || '').trim();

      // Basic phone validation with country code
      if (!/^\+?[0-9]{7,15}$/.test(data.emergencyContactNumber)) {
        showToast('Please enter a valid emergency contact number with country code');
        const phoneInput = document.getElementById('emergencyContactNumber');
        if (phoneInput) { phoneInput.focus(); phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }
      // Vehicle last 4 validation
      if (!/^\d{4}$/.test(String(data.vehicleLast4 || '').trim())) {
        showToast('Please enter the last 4 digits of the vehicle number');
        const v4Input = document.getElementById('vehicleLast4');
        if (v4Input) { v4Input.focus(); v4Input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }

  // Export CSV of created IDs
  if (bulkExport && bulkLinks) {
    bulkExport.addEventListener('click', () => {
      const rows = [['fullName', 'uniqueId', 'url']];
      bulkLinks.querySelectorAll('li').forEach((li) => {
        const a = li.querySelector('a');
        if (!a) return;
        const text = a.textContent || '';
        const parts = text.split(' — ');
        const name = parts[0] || '';
        const url = a.href;
        const id = url.split('/').pop();
        rows.push([name, id, url]);
      });
      const csv = rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'created-cards.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

      try {
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Generating...'; }
        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create card');
        const card = await res.json();
        const url = `${location.origin}/${card.uniqueId}`;
        if (linkEl) linkEl.textContent = url, linkEl.href = url;
        if (viewBtn) viewBtn.href = url;
        if (result) result.style.display = 'block';
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        if (bulkLinks) {
          bulkLinks.innerHTML = '';
          (data.records || []).forEach((r) => {
            const li = document.createElement('li');
            const url = `${location.origin}/${r.id}`;
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.textContent = `${r.fullName || 'Card'} — ${url}`;
            li.appendChild(a);
            bulkLinks.appendChild(li);
          });
          if (bulkResult) bulkResult.style.display = 'block';
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
        showToast('Emergency card created');
      } catch (err) {
        console.error(err);
        showToast('Error generating card. Please try again.');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Generate Emergency Card'; }
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const href = linkEl?.href || '';
      if (!href) return;
      try {
        await navigator.clipboard.writeText(href);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy Link'), 1500);
        showToast('Link copied to clipboard');
      } catch (e) {
        showToast('Unable to copy link');
      }
    });
  }

  // Card page logic
  const cardSection = document.getElementById('cardSection');
  if (cardSection) {
    const id = location.pathname.replace('/', '')
      .split('?')[0].split('#')[0];

    const nameEl = document.getElementById('name');
    const uidEl = document.getElementById('uid');
    const insEl = document.getElementById('insurance');
    const bloodEl = document.getElementById('bloodType');
    const allergiesEl = document.getElementById('allergies');
    const medsEl = document.getElementById('medication');
    const hospEl = document.getElementById('hospitals');
    const docEl = document.getElementById('doctor');
    const contactEl = document.getElementById('contact');

    const renderChips = (el, arr, critical) => {
      const items = (arr || []).filter(Boolean);
      if (!el) return;
      if (!items.length) { el.textContent = critical ? 'None' : '—'; return; }
      el.innerHTML = '';
      el.classList.add('chip-list');
      items.forEach((item) => {
        const span = document.createElement('span');
        span.className = 'chip' + (critical ? ' critical' : '');
        span.textContent = item;
        el.appendChild(span);
      });
    };

    // Passcode modal elements
    const passModal = document.getElementById('passcodeModal');
    const passInput = document.getElementById('passcodeInput');
    const passSubmit = document.getElementById('passcodeSubmit');
    const passClose = document.getElementById('passcodeClose');

    const openPassModal = () => { if (passModal) { passModal.style.display = 'flex'; document.body.classList.add('modal-open'); setTimeout(() => passInput && passInput.focus(), 50); } };
    const closePassModal = () => { if (passModal) { passModal.style.display = 'none'; document.body.classList.remove('modal-open'); } };

    const getStoredV4 = () => sessionStorage.getItem('v4:' + id);
    const storeV4 = (v4) => sessionStorage.setItem('v4:' + id, v4);
    const clearV4 = () => sessionStorage.removeItem('v4:' + id);

    const ensurePasscode = async () => {
      let v4 = (getStoredV4() || '').trim();
      if (!/^\d{4}$/.test(v4)) {
        openPassModal();
        await new Promise((resolve) => {
          const handler = () => {
            const val = (passInput && passInput.value.trim()) || '';
            if (!/^\d{4}$/.test(val)) { showToast('Enter exactly 4 digits'); return; }
            storeV4(val);
            closePassModal();
            passSubmit && passSubmit.removeEventListener('click', handler);
            resolve();
          };
          passSubmit && passSubmit.addEventListener('click', handler);
          passClose && passClose.addEventListener('click', () => { /* keep modal open to enforce entry */ });
        });
        v4 = getStoredV4() || '';
      }
      return v4;
    };

    const fetchCard = async () => {
      const v4 = await ensurePasscode();
      const res = await fetch(`/api/cards/${id}?v4=${encodeURIComponent(v4)}`);
      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          clearV4();
          showToast('Incorrect or missing passcode. Please try again.');
          return null;
        }
        showToast('Card not found');
        return null;
      }
      return res.json();
    };

    fetchCard().then((card) => {
      if (!card) return;
      nameEl.textContent = card.fullName;
      uidEl.textContent = card.uniqueId;
      insEl.textContent = `Insurance: ${card.insuranceStatus}`;
      const status = (card.insuranceStatus || '').toLowerCase();
      insEl.classList.remove('valid', 'invalid', 'expired');
      if (status === 'valid') insEl.classList.add('valid');
      if (status === 'invalid') insEl.classList.add('invalid');
      if (status === 'expired') insEl.classList.add('expired');
      bloodEl.textContent = card.bloodType;
      renderChips(allergiesEl, card.allergies, true);
      renderChips(medsEl, card.currentMedication, false);
      renderChips(hospEl, card.preferredHospitals, false);
      docEl.textContent = card.familyDoctorName || '—';
      const tel = String(card.emergencyContactNumber || '').replace(/\s+/g,'');
      contactEl.textContent = tel;
      if (contactEl.tagName === 'A') {
        contactEl.href = `tel:${tel}`;
      }
      // Generate QR code
      const qrEl = document.getElementById('qrContainer');
      if (qrEl && window.QRCode) {
        qrEl.innerHTML = '';
        const url = `${location.origin}/${card.uniqueId}`;
        new QRCode(qrEl, { text: url, width: 140, height: 140 });
      }
      // Initialize geolocation + hotlines + alert workflow
      initEmergencyFlow(card);
    }).catch(() => showToast('Error loading card'));

    // PDF
    const downloadBtn = document.getElementById('downloadPdf');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const opt = {
          margin:       10,
          filename:     `emergency-card-${id}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2 },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        const target = document.getElementById('cardSection');
        window.html2pdf().set(opt).from(target).save();
        showToast('Preparing PDF...');
      });
    }

    // Share
    const shareBtn = document.getElementById('shareLink');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const url = location.href;
        try {
          if (navigator.share) {
            await navigator.share({ title: 'My Emergency Card', url });
          } else {
            await navigator.clipboard.writeText(url);
            shareBtn.textContent = 'Link Copied!';
            setTimeout(() => (shareBtn.textContent = 'Share Link'), 1500);
            showToast('Link copied to clipboard');
          }
        } catch (e) {
          // ignore
        }
      });
    }
  }

  // === Emergency Flow: Geolocation, Country Hotlines, Alert ===
  const hotlineEl = {
    box: () => document.getElementById('hotlinesBox'),
    title: () => document.getElementById('hotlineTitle'),
    general: () => document.getElementById('hotlineGeneral'),
    police: () => document.getElementById('hotlinePolice'),
    ambulance: () => document.getElementById('hotlineAmbulance'),
    fire: () => document.getElementById('hotlineFire'),
    callBtn: () => document.getElementById('callHotline'),
    note: () => document.getElementById('locationNote'),
    alertBtn: () => document.getElementById('alertNow')
  };

  const HOTLINES = {
    IN: { title: 'Emergency Hotlines (India)', general: '112', police: '100', ambulance: '102 / 108', fire: '101', women: '1091', child: '1098' },
    US: { title: 'Emergency Hotlines (United States)', general: '911' },
    CA: { title: 'Emergency Hotlines (Canada)', general: '911' },
    GB: { title: 'Emergency Hotlines (United Kingdom)', general: '999' },
    AU: { title: 'Emergency Hotlines (Australia)', general: '000' },
    EU: { title: 'Emergency Hotlines (EU)', general: '112' },
    DEFAULT: { title: 'Emergency Hotlines', general: '112' }
  };

  function setHotlinesForCountry(countryCode) {
    const h = HOTLINES[countryCode] || HOTLINES.DEFAULT;
    CURRENT_HOTLINE = h;
    if (!hotlineEl.box()) return;
    if (hotlineEl.title()) hotlineEl.title().textContent = h.title;
    if (hotlineEl.general()) hotlineEl.general().textContent = `General Emergency: ${h.general}`;
    // Optional sub-lines
    if (hotlineEl.police()) {
      if (h.police) { hotlineEl.police().style.display = ''; hotlineEl.police().textContent = `Police: ${h.police}`; }
      else hotlineEl.police().style.display = 'none';
    }
    if (hotlineEl.ambulance()) {
      if (h.ambulance) { hotlineEl.ambulance().style.display = ''; hotlineEl.ambulance().textContent = `Ambulance: ${h.ambulance}`; }
      else hotlineEl.ambulance().style.display = 'none';
    }
    if (hotlineEl.fire()) {
      if (h.fire) { hotlineEl.fire().style.display = ''; hotlineEl.fire().textContent = `Fire: ${h.fire}`; }
      else hotlineEl.fire().style.display = 'none';
    }
    // India extras
    const womenEl = document.getElementById('hotlineWomen');
    const childEl = document.getElementById('hotlineChild');
    if (womenEl) {
      if (h.women) { womenEl.style.display = ''; womenEl.textContent = `Women Helpline: ${h.women}`; }
      else womenEl.style.display = 'none';
    }
    if (childEl) {
      if (h.child) { childEl.style.display = ''; childEl.textContent = `Child Helpline: ${h.child}`; }
      else childEl.style.display = 'none';
    }
    // Wire call button
    if (hotlineEl.callBtn()) {
      hotlineEl.callBtn().onclick = () => {
        const tel = h.general || '112';
        window.location.href = `tel:${tel.replace(/\s+/g,'')}`;
      };
    }
  }

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('Geocode failed');
      return res.json();
    } catch (e) {
      return null;
    }
  }

  function getBrowserLocaleCountryFallback() {
    // Try navigator.language like en-IN -> IN
    const lang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    const m = /-([A-Z]{2})/i.exec(lang);
    return m ? m[1].toUpperCase() : null;
  }

  function composeAlertMessage(card, coords, address) {
    const name = card.fullName || 'the person';
    const latLon = coords ? `${Number(coords.latitude).toFixed(5)},${Number(coords.longitude).toFixed(5)}` : '';
    const intro = `EMERGENCY ALERT: ${name} appears to be in DANGER.`;
    const helper = `\nThis message was sent by a nearby helper who scanned the Emergency QR code and opened this website to notify you.`;

    // Read option toggles if present (default true)
    const includeLoc = document.getElementById('optIncludeLocation') ? document.getElementById('optIncludeLocation').checked : true;
    const includeMedical = document.getElementById('optIncludeMedical') ? document.getElementById('optIncludeMedical').checked : true;
    const includeHotline = document.getElementById('optIncludeHotline') ? document.getElementById('optIncludeHotline').checked : true;
    const includeCard = document.getElementById('optIncludeCard') ? document.getElementById('optIncludeCard').checked : true;

    // Optional helper identity
    const helperName = (document.getElementById('helperName') && document.getElementById('helperName').value.trim()) || '';
    const helperPhone = (document.getElementById('helperPhone') && document.getElementById('helperPhone').value.trim()) || '';
    const helperLine = (helperName || helperPhone) ? `\nHelper: ${[helperName, helperPhone].filter(Boolean).join(' | ')}` : '';

    const blood = includeMedical && card.bloodType ? `\nBlood: ${card.bloodType}` : '';
    const allergies = includeMedical && (card.allergies && card.allergies.length) ? `\nAllergies: ${card.allergies.join(', ')}` : '';
    const meds = includeMedical && (card.currentMedication && card.currentMedication.length) ? `\nMeds: ${card.currentMedication.join(', ')}` : '';
    const coordsLine = includeLoc && coords ? `\nCoordinates: ${latLon}` : '';
    const maps = includeLoc && coords ? `\nLocation: https://maps.google.com/?q=${coords.latitude},${coords.longitude}` : '';
    const place = includeLoc && address ? `\nApprox: ${address}` : '';
    const hotline = includeHotline && CURRENT_HOTLINE && CURRENT_HOTLINE.general ? `\nLocal Hotline: ${CURRENT_HOTLINE.general}` : '';
    const cardUrl = includeCard && (typeof location !== 'undefined' && location.href) ? `\nCard: ${location.href}` : '';

    return `${intro}${helper}${helperLine}${coordsLine}${maps}${place}${blood}${allergies}${meds}${hotline}${cardUrl}`;
  }

  function openSms(phone, message) {
    const body = encodeURIComponent(message);
    const num = phone.replace(/\s+/g,'');
    // iOS vs Android differ in query parameter handling for SMS deep links
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // iOS prefers: sms:number&body=... ; Android prefers: sms:number?body=...
    const href = isiOS ? `sms:${encodeURIComponent(num)}&body=${body}` : `sms:${encodeURIComponent(num)}?body=${body}`;
    window.location.href = href;
  }

  function openWhatsApp(phone, message) {
    const text = encodeURIComponent(message);
    const num = phone.replace(/\D/g,'');
    const href = `https://wa.me/${num}?text=${text}`;
    window.open(href, '_blank');
  }

  function openEmail(email, subject, message) {
    const sub = encodeURIComponent(subject || 'Emergency Alert');
    const body = encodeURIComponent(message || '');
    const href = `mailto:${encodeURIComponent(email)}?subject=${sub}&body=${body}`;
    window.location.href = href;
  }

  function setAlertHandler(alertBtn, card, coords, approx) {
    if (!alertBtn || !card) return;
    // Reuse modal if present; otherwise fallback to confirm flow
    const modal = document.getElementById('alertModal');
    const primaryInput = document.getElementById('alertPrimaryContact');
    const additionalInput = document.getElementById('alertAdditionalContact');
    const messageInput = document.getElementById('alertMessage');
    const sendSmsBtn = document.getElementById('sendSms');
    const sendWaBtn = document.getElementById('sendWhatsApp');
    const sendEmailBtn = document.getElementById('sendEmail');
    const callPrimaryBtn = document.getElementById('callPrimaryModal');
    const callHotlineBtn = document.getElementById('callHotlineModal');
    const optLoc = document.getElementById('optIncludeLocation');
    const optMed = document.getElementById('optIncludeMedical');
    const optHot = document.getElementById('optIncludeHotline');
    const optCard = document.getElementById('optIncludeCard');
    const smsCounter = document.getElementById('smsCounter');
    const resetBtn = document.getElementById('resetMessage');
    const closeBtn = document.getElementById('alertModalClose');
    const footerCloseBtn = document.getElementById('alertCloseFooter');
    const moreToggle = document.getElementById('moreOptionsToggle');
    const advanced = document.getElementById('advancedOptions');
    const helperNameEl = document.getElementById('helperName');
    const helperPhoneEl = document.getElementById('helperPhone');

    let escHandler = null;
    const openModal = () => {
      if (modal) modal.style.display = 'flex';
      if (document && document.body) document.body.classList.add('modal-open');
      // Default collapsed advanced options
      if (advanced && !advanced.classList.contains('open')) advanced.classList.remove('open');
      if (moreToggle) moreToggle.textContent = 'More options ▾';
      // Autofocus message and move cursor to end
      setTimeout(() => {
        if (messageInput) {
          const val = messageInput.value;
          messageInput.focus();
          messageInput.setSelectionRange(val.length, val.length);
        }
      }, 50);
      // Load helper identity from localStorage
      try {
        const hn = localStorage.getItem('helperName');
        const hp = localStorage.getItem('helperPhone');
        if (helperNameEl && hn) helperNameEl.value = hn;
        if (helperPhoneEl && hp) helperPhoneEl.value = hp;
      } catch (_) {}
      // ESC key to close
      escHandler = (ev) => {
        if (ev.key === 'Escape') closeModal();
      };
      document.addEventListener('keydown', escHandler);
    };
    const closeModal = () => {
      if (modal) modal.style.display = 'none';
      if (document && document.body) document.body.classList.remove('modal-open');
      if (escHandler) {
        document.removeEventListener('keydown', escHandler);
        escHandler = null;
      }
    };

    const updateMessage = () => {
      const msg = composeAlertMessage(card, LAST_COORDS || coords, LAST_APPROX || approx);
      if (messageInput) messageInput.value = msg;
      updateCounter();
    };

    const updateCounter = () => {
      if (!smsCounter || !messageInput) return;
      const len = messageInput.value.length;
      // Basic SMS segmentation estimate (GSM-7 assumed): 160 single, 153 concatenated
      const segments = len <= 160 ? 1 : Math.ceil(len / 153);
      smsCounter.textContent = `${len} chars · ~${segments} SMS segment${segments>1?'s':''}`;
    };

    if (alertBtn) {
      alertBtn.onclick = () => {
        // Prefill primary with card contact
        if (primaryInput) primaryInput.value = (card.emergencyContactNumber || '').trim();
        if (additionalInput) additionalInput.value = '';
        updateMessage();
        if (modal) openModal(); else {
          // Fallback old flow
          const contact = card.emergencyContactNumber || '';
          if (!contact) { showToast('No emergency contact saved'); return; }
          const msg = composeAlertMessage(card, coords, approx);
          const choice = window.confirm('Send SMS to emergency contact? (Cancel to use WhatsApp)');
          if (choice) openSms(contact, msg); else openWhatsApp(contact, msg);
        }
      };
    }

    // More options collapse toggle
    if (moreToggle && advanced) {
      // Start collapsed by default
      advanced.classList.remove('open');
      moreToggle.onclick = () => {
        const willOpen = !advanced.classList.contains('open');
        advanced.classList.toggle('open', willOpen);
        moreToggle.textContent = willOpen ? 'Less options ▴' : 'More options ▾';
      };
    }

    // Persist helper fields
    if (helperNameEl) helperNameEl.addEventListener('input', () => {
      try { localStorage.setItem('helperName', helperNameEl.value); } catch (_) {}
      updateMessage();
    });
    if (helperPhoneEl) helperPhoneEl.addEventListener('input', () => {
      try { localStorage.setItem('helperPhone', helperPhoneEl.value); } catch (_) {}
      updateMessage();
    });

    if (closeBtn) closeBtn.onclick = closeModal;
    if (footerCloseBtn) footerCloseBtn.onclick = closeModal;
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Respond to toggle changes and message edits
    [optLoc, optMed, optHot, optCard].forEach(el => el && el.addEventListener('change', updateMessage));
    if (messageInput) messageInput.addEventListener('input', updateCounter);
    if (resetBtn) resetBtn.addEventListener('click', updateMessage);

    // Rate limiting to prevent accidental double sends
    let lastSendAt = 0;
    const canSend = () => {
      const now = Date.now();
      if (now - lastSendAt < 10000) { // 10s window
        showToast('Please wait a few seconds before sending again.');
        return false;
      }
      lastSendAt = now;
      return true;
    };

    if (sendSmsBtn) {
      sendSmsBtn.onclick = () => {
        const p = (primaryInput && primaryInput.value || '').trim();
        if (!/^\+?[0-9]{7,15}$/.test(p)) { showToast('Enter a valid primary number with country code'); primaryInput && primaryInput.focus(); primaryInput && primaryInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        const fallbackMsg = composeAlertMessage(card, LAST_COORDS || coords, LAST_APPROX || approx);
        const msg = (messageInput && messageInput.value.trim()) || fallbackMsg;
        if (!canSend()) return;
        openSms(p, msg);
        closeModal();
      };
    }

    if (sendWaBtn) {
      sendWaBtn.onclick = () => {
        const p = (primaryInput && primaryInput.value || '').trim();
        const a = (additionalInput && additionalInput.value || '').trim();
        if (!/^\+?[0-9]{7,15}$/.test(p)) { showToast('Enter a valid primary number with country code'); primaryInput && primaryInput.focus(); primaryInput && primaryInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        const fallbackMsg = composeAlertMessage(card, LAST_COORDS || coords, LAST_APPROX || approx);
        const msg = (messageInput && messageInput.value.trim()) || fallbackMsg;
        if (!canSend()) return;
        const list = [p].concat(a.split(',').map(s => s.trim()).filter(Boolean)).map(n => n.replace(/\s+/g,'')).filter((n, i, arr) => arr.indexOf(n) === i);
        list.forEach((num, idx) => setTimeout(() => openWhatsApp(num, msg), 300 * idx));
        closeModal();
      };
    }

    if (sendEmailBtn) {
      sendEmailBtn.onclick = () => {
        const fallbackMsg = composeAlertMessage(card, LAST_COORDS || coords, LAST_APPROX || approx);
        const msg = (messageInput && messageInput.value.trim()) || fallbackMsg;
        const email = prompt('Enter email address to notify:');
        if (!email) return;
        if (!canSend()) return;
        openEmail(email, 'Emergency Alert', msg);
        closeModal();
      };
    }

    if (callPrimaryBtn) {
      callPrimaryBtn.onclick = () => {
        const p = (primaryInput && primaryInput.value || '').trim();
        if (!/^\+?[0-9]{7,15}$/.test(p)) { showToast('Enter a valid primary number with country code'); return; }
        window.location.href = `tel:${p.replace(/\s+/g,'')}`;
      };
    }

    if (callHotlineBtn) {
      callHotlineBtn.onclick = () => {
        const tel = (CURRENT_HOTLINE && CURRENT_HOTLINE.general) ? CURRENT_HOTLINE.general : '112';
        window.location.href = `tel:${String(tel).replace(/\s+/g,'')}`;
      };
    }
  }

  function initEmergencyFlow(card) {
    // Default while we detect - prioritize India
    setHotlinesForCountry('IN');
    if (hotlineEl.note()) hotlineEl.note().style.display = '';

    // Geolocate
    const alertBtn = hotlineEl.alertBtn();
    if (alertBtn) {
      alertBtn.classList.add('pulse');
      // Make the button functional immediately (prefilled modal)
      setAlertHandler(alertBtn, card, null, null);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords || {};
        let countryCode = null, approx = '';
        const geo = await reverseGeocode(latitude, longitude);
        if (geo) {
          countryCode = (geo.countryCode || '').toUpperCase();
          approx = [geo.city || geo.locality || geo.principalSubdivision, geo.countryName].filter(Boolean).join(', ');
        }
        if (!countryCode) {
          countryCode = getBrowserLocaleCountryFallback();
        }
        setHotlinesForCountry(countryCode || 'IN');
        LAST_COORDS = { latitude, longitude };
        LAST_APPROX = approx || null;
        if (hotlineEl.note()) hotlineEl.note().textContent = approx ? `Approximate location: ${approx}` : 'Location permission may improve routing.';

        // Wire Alert button now that we have possible coords
        const updatedAlertBtn = hotlineEl.alertBtn();
        if (updatedAlertBtn) {
          setAlertHandler(updatedAlertBtn, card, { latitude, longitude }, approx);
        }
      }, (err) => {
        // Geolocation denied or failed
        const cc = getBrowserLocaleCountryFallback();
        setHotlinesForCountry(cc || 'IN');
        LAST_COORDS = null;
        LAST_APPROX = null;
        if (hotlineEl.note()) hotlineEl.note().textContent = 'Location access denied. Using default country hotlines.';
        const fallbackAlertBtn = hotlineEl.alertBtn();
        if (fallbackAlertBtn) {
          setAlertHandler(fallbackAlertBtn, card, null, null);
        }
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
    } else {
      const cc = getBrowserLocaleCountryFallback();
      setHotlinesForCountry(cc || 'IN');
      LAST_COORDS = null;
      LAST_APPROX = null;
      if (hotlineEl.note()) hotlineEl.note().textContent = 'Geolocation not supported. Using default hotlines.';
    }
  }
})();
