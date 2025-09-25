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

  if (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());

      // Basic phone validation with country code
      if (!/^\+?[0-9]{7,15}$/.test(data.emergencyContactNumber)) {
        showToast('Please enter a valid emergency contact number with country code');
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

    const fetchCard = async () => {
      const res = await fetch(`/api/cards/${id}`);
      if (!res.ok) {
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
      contactEl.textContent = card.emergencyContactNumber;
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
    const name = card.fullName || 'Emergency';
    const blood = card.bloodType ? `\nBlood: ${card.bloodType}` : '';
    const allergies = (card.allergies && card.allergies.length) ? `\nAllergies: ${card.allergies.join(', ')}` : '';
    const meds = (card.currentMedication && card.currentMedication.length) ? `\nMeds: ${card.currentMedication.join(', ')}` : '';
    const maps = coords ? `\nLocation: https://maps.google.com/?q=${coords.latitude},${coords.longitude}` : '';
    const place = address ? `\nApprox: ${address}` : '';
    return `ALERT: ${name} may need help.${blood}${allergies}${meds}${maps}${place}`;
  }

  function openSms(phone, message) {
    const body = encodeURIComponent(message);
    const num = phone.replace(/\s+/g,'');
    // iOS vs Android differences - try generic first
    const href = `sms:${encodeURIComponent(num)}?&body=${body}`;
    window.location.href = href;
  }

  function openWhatsApp(phone, message) {
    const text = encodeURIComponent(message);
    const num = phone.replace(/\D/g,'');
    const href = `https://wa.me/${num}?text=${text}`;
    window.open(href, '_blank');
  }

  function initEmergencyFlow(card) {
    // Default while we detect - prioritize India
    setHotlinesForCountry('IN');
    if (hotlineEl.note()) hotlineEl.note().style.display = '';

    // Geolocate
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
        if (hotlineEl.note()) hotlineEl.note().textContent = approx ? `Approximate location: ${approx}` : 'Location permission may improve routing.';

        // Wire Alert button now that we have possible coords
        const alertBtn = hotlineEl.alertBtn();
        if (alertBtn) {
          alertBtn.classList.add('pulse');
          alertBtn.onclick = () => {
            const msg = composeAlertMessage(card, { latitude, longitude }, approx);
            const contact = card.emergencyContactNumber || '';
            if (!contact) { showToast('No emergency contact saved'); return; }
            // Offer choices
            const choice = window.confirm('Send SMS to emergency contact? (Cancel to use WhatsApp)');
            if (choice) openSms(contact, msg); else openWhatsApp(contact, msg);
          };
        }
      }, (err) => {
        // Geolocation denied or failed
        const cc = getBrowserLocaleCountryFallback();
        setHotlinesForCountry(cc || 'IN');
        if (hotlineEl.note()) hotlineEl.note().textContent = 'Location access denied. Using default country hotlines.';
        const alertBtn = hotlineEl.alertBtn();
        if (alertBtn) {
          alertBtn.classList.add('pulse');
          alertBtn.onclick = () => {
            const msg = composeAlertMessage(card, null, null);
            const contact = card.emergencyContactNumber || '';
            if (!contact) { showToast('No emergency contact saved'); return; }
            const choice = window.confirm('Send SMS to emergency contact? (Cancel to use WhatsApp)');
            if (choice) openSms(contact, msg); else openWhatsApp(contact, msg);
          };
        }
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
    } else {
      const cc = getBrowserLocaleCountryFallback();
      setHotlinesForCountry(cc || 'IN');
      if (hotlineEl.note()) hotlineEl.note().textContent = 'Geolocation not supported. Using default hotlines.';
    }
  }
})();
