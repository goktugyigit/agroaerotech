// AgroAeroTech Main JavaScript

// Global değişkenler
let submitLock = false; // çoklu tık engeli (global scope)

// === Ultra Katı Doğrulama Başlangıç ===
(function () {
  const STRICT_LIMITS = {
    name: { min: 2, max: 80, re: /^[A-Za-zÇĞİÖŞÜçğıöşü\s'.-]+$/ },
    email: { min: 6, max: 100, re: /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/ },
    // Telefon: E.164 mantığına normalize ederek kontrol edeceğiz
    phone: { minDigits: 10, maxDigits: 15, reE164: /^\+?[1-9]\d{9,14}$/ },
    address: { min: 10, max: 200 },
    message: { min: 10, max: 500 }
  };

  const PAGE_LOAD_TS = Date.now();

  // Yardımcılar
  const text = (el) => (el?.value || '').trim();
  const setInvalid = (el, msg) => {
    if (!el) return;
    el.classList.remove('is-valid');
    el.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    const fb = el.parentElement?.querySelector('.invalid-feedback');
    if (fb) fb.textContent = msg || 'Geçerli bir değer giriniz.';
  };
  const setValid = (el) => {
    if (!el) return;
    el.classList.remove('is-invalid');
    el.classList.add('is-valid');
    el.setAttribute('aria-invalid', 'false');
    const fb = el.parentElement?.querySelector('.invalid-feedback');
    if (fb) fb.textContent = ''; // Hata metnini temizle
  };
  const countDigits = (s) => (s.replace(/\D/g, '').length);
  const normalizePhone = (s) => {
    // + hariç tüm olmayan rakamları temizle, + başa alınmışsa koru
    s = s.trim();
    const plus = s.startsWith('+') ? '+' : '';
    const digits = s.replace(/\D/g, '');
    return plus + digits;
  };
  const hasURL = (s) => /https?:\/\/|www\./i.test(s);
  const excessiveRepeat = (s) => /(.)\1\1/.test(s); // aynı karakter 3+
  const onlySymbols = (s) => /^[\W_]+$/.test(s); // sadece sembol/boşluk
  const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  // Email ekstra kurallar
  function validateEmail(el) {
    const v = text(el);
    if (v.length < STRICT_LIMITS.email.min || v.length > STRICT_LIMITS.email.max) {
      return setInvalid(el, 'E-posta uzunluğu geçersiz.');
    }
    if (!STRICT_LIMITS.email.re.test(v)) {
      return setInvalid(el, 'Geçerli bir e-posta giriniz (örnek: ad@alan.com).');
    }
    // Ardışık iki nokta ve etrafında nokta tire hataları
    const [local, domain] = v.split('@');
    if (!local || !domain) return setInvalid(el, 'Geçerli bir e-posta giriniz.');
    if (/\.\./.test(local) || /\.\./.test(domain)) {
      return setInvalid(el, 'E-postada ardışık iki nokta olamaz.');
    }
    const labels = domain.split('.');
    if (labels.some(lbl => !lbl.length || lbl.startsWith('-') || lbl.endsWith('-'))) {
      return setInvalid(el, 'Alan adında tire hatası var.');
    }
    setValid(el);
  }

  // İsim
  function validateName(el) {
    const v = text(el);
    if (v.length < STRICT_LIMITS.name.min || v.length > STRICT_LIMITS.name.max) {
      return setInvalid(el, 'Ad Soyad en az 2, en çok 80 karakter olmalı.');
    }
    if (!STRICT_LIMITS.name.re.test(v)) {
      return setInvalid(el, 'Sadece harf, boşluk, nokta, apostrof ve tire kullanılabilir.');
    }
    if (excessiveRepeat(v)) {
      return setInvalid(el, 'Aynı karakter art arda 3 defadan fazla kullanılamaz.');
    }
    if (onlySymbols(v)) {
      return setInvalid(el, 'Geçerli bir ad giriniz.');
    }
    setValid(el);
  }

  // Telefon
  function validatePhone(el) {
    let v = normalizePhone(text(el));
    const digits = countDigits(v);
    if (digits < STRICT_LIMITS.phone.minDigits || digits > STRICT_LIMITS.phone.maxDigits) {
      return setInvalid(el, 'Telefon 10 ile 15 rakam arasında olmalı.');
    }
    if (!STRICT_LIMITS.phone.reE164.test(v)) {
      return setInvalid(el, 'Telefon numarasını ülke kodu ile giriniz (örnek: +905xxxxxxxxx).');
    }
    // Aynı rakamdan oluşan numaraları engelle
    if (/^(\+)?([0-9])\2+$/.test(v)) {
      return setInvalid(el, 'Geçerli bir telefon numarası giriniz.');
    }
    // Normalize edilmiş değeri geri yaz (giriş temizliği)
    el.value = v;
    setValid(el);
  }

  // Adres ve Mesaj
  function validateTextArea(el, limits, fieldLabel) {
    const v = text(el);
    if (v.length < limits.min || v.length > limits.max) {
      return setInvalid(el, `${fieldLabel} en az ${limits.min}, en çok ${limits.max} karakter olmalı.`);
    }
    if (hasURL(v)) {
      return setInvalid(el, `${fieldLabel} içine URL yazmayın.`);
    }
    if (excessiveRepeat(v)) {
      return setInvalid(el, `${fieldLabel} içinde tekrarlayan karakter kullanımı çok fazla.`);
    }
    if (onlySymbols(v)) {
      return setInvalid(el, `${fieldLabel} sadece sembollerden oluşamaz.`);
    }
    setValid(el);
  }

  // İsteğe bağlı textarea validasyonu (adres için)
  function validateOptionalTextArea(el, limits, fieldLabel) {
    const v = text(el);
    // Eğer boşsa geçerli kabul et (isteğe bağlı)
    if (v.length === 0) {
      el.classList.remove('is-invalid', 'is-valid');
      return;
    }
    // Eğer doldurulduysa normal kontrolleri yap (min kontrolü hariç)
    if (v.length > limits.max) {
      return setInvalid(el, `${fieldLabel} en çok ${limits.max} karakter olmalı.`);
    }
    if (hasURL(v)) {
      return setInvalid(el, `${fieldLabel} içine URL yazmayın.`);
    }
    if (excessiveRepeat(v)) {
      return setInvalid(el, `${fieldLabel} içinde tekrarlayan karakter kullanımı çok fazla.`);
    }
    if (onlySymbols(v)) {
      return setInvalid(el, `${fieldLabel} sadece sembollerden oluşamaz.`);
    }
    setValid(el);
  }

  // Karakter sayacı
  function updateCounter(textarea) {
    const name = textarea.getAttribute('name');
    const counter = textarea.closest('form')?.querySelector(`.char-counter[data-for="${name}"]`);
    if (!counter) return;
    const max = parseInt(textarea.getAttribute('maxlength') || '0', 10);
    const len = textarea.value.length;
    counter.textContent = `${len}/${max}`;
  }

  // Turnstile token kontrolü (varsa)
  function validTurnstileToken(form) {
    const widget = form.querySelector('.cf-turnstile');
    if (!widget) return true; // yoksa sorun değil
    // Token inputu genelde "cf-turnstile-response" adıyla eklenir
    const tokenInput = form.querySelector('input[name="cf-turnstile-response"]');
    return !!(tokenInput && tokenInput.value && tokenInput.value.length > 5);
  }

  // Checkbox doğrulama fonksiyonu (sadece form submit sırasında kullanılır)
  function validateCheckbox(checkbox, errorMessage) {
    const invalidFeedback = checkbox.parentElement?.querySelector('.invalid-feedback');

    if (!checkbox.checked) {
      checkbox.classList.add('is-invalid');
      checkbox.classList.remove('is-valid');
      if (invalidFeedback) {
        invalidFeedback.textContent = errorMessage;
        invalidFeedback.style.display = 'block';
        invalidFeedback.classList.add('d-block');
      }
      return false;
    } else {
      // Checkbox işaretliyse normal haline döndür (yeşil değil)
      checkbox.classList.remove('is-invalid', 'is-valid');
      if (invalidFeedback) {
        invalidFeedback.style.display = 'none';
        invalidFeedback.classList.remove('d-block');
      }
      return true;
    }
  }

  // Form seviyesinde doğrulama ve bağlama
  function bindStrictForm(form) {
    const name = form.querySelector('[name="name"]');
    const email = form.querySelector('[name="email"]');
    const phone = form.querySelector('[name="phone"]');
    const address = form.querySelector('[name="address"]');
    // message veya note olabiliyor
    const message = form.querySelector('[name="message"]') || form.querySelector('[name="note"]');
    const honeypot = form.querySelector('[name="website"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Checkbox'ları bul
    const kvkkCheckbox = form.querySelector('#kvkk');
    const privacyCheckbox = form.querySelector('#privacy');
    const gdprCheckbox = form.querySelector('#gdpr');

    // Canlı doğrulama
    name && name.addEventListener('input', () => validateName(name));
    email && email.addEventListener('input', () => validateEmail(email));
    phone && phone.addEventListener('input', () => validatePhone(phone));
    address && address.addEventListener('input', () => { validateOptionalTextArea(address, STRICT_LIMITS.address, 'Adres'); updateCounter(address); });
    message && message.addEventListener('input', () => { validateTextArea(message, STRICT_LIMITS.message, 'Mesaj'); updateCounter(message); });

    // Checkbox'lar için canlı doğrulama
    kvkkCheckbox && kvkkCheckbox.addEventListener('change', () => {
      const invalidFeedback = kvkkCheckbox.parentElement?.querySelector('.invalid-feedback');
      if (kvkkCheckbox.checked) {
        // Checkbox işaretliyse hata mesajını gizle
        kvkkCheckbox.classList.remove('is-invalid', 'is-valid');
        if (invalidFeedback) {
          invalidFeedback.style.display = 'none';
          invalidFeedback.classList.remove('d-block');
        }
      } else {
        // Checkbox işaretli değilse hata mesajını göster
        kvkkCheckbox.classList.add('is-invalid');
        kvkkCheckbox.classList.remove('is-valid');
        if (invalidFeedback) {
          invalidFeedback.textContent = getTranslation('legal-kvkk-error');
          invalidFeedback.style.display = 'block';
          invalidFeedback.classList.add('d-block');
        }
      }
    });
    privacyCheckbox && privacyCheckbox.addEventListener('change', () => {
      const invalidFeedback = privacyCheckbox.parentElement?.querySelector('.invalid-feedback');
      if (privacyCheckbox.checked) {
        // Checkbox işaretliyse hata mesajını gizle
        privacyCheckbox.classList.remove('is-invalid', 'is-valid');
        if (invalidFeedback) {
          invalidFeedback.style.display = 'none';
          invalidFeedback.classList.remove('d-block');
        }
      } else {
        // Checkbox işaretli değilse hata mesajını göster
        privacyCheckbox.classList.add('is-invalid');
        privacyCheckbox.classList.remove('is-valid');
        if (invalidFeedback) {
          invalidFeedback.textContent = getTranslation('legal-privacy-error');
          invalidFeedback.style.display = 'block';
          invalidFeedback.classList.add('d-block');
        }
      }
    });
    gdprCheckbox && gdprCheckbox.addEventListener('change', () => {
      const invalidFeedback = gdprCheckbox.parentElement?.querySelector('.invalid-feedback');
      if (gdprCheckbox.checked) {
        // Checkbox işaretliyse hata mesajını gizle
        gdprCheckbox.classList.remove('is-invalid', 'is-valid');
        if (invalidFeedback) {
          invalidFeedback.style.display = 'none';
          invalidFeedback.classList.remove('d-block');
        }
      } else {
        // Checkbox işaretli değilse hata mesajını göster
        gdprCheckbox.classList.add('is-invalid');
        gdprCheckbox.classList.remove('is-valid');
        if (invalidFeedback) {
          invalidFeedback.textContent = getTranslation('legal-gdpr-error');
          invalidFeedback.style.display = 'block';
          invalidFeedback.classList.add('d-block');
        }
      }
    });

    // İlk yükte sayaçları güncelle
    address && updateCounter(address);
    message && updateCounter(message);

    form.addEventListener('submit', (e) => {
      console.log('bindStrictForm: Form submit event yakalandı, form ID:', form.id);

      // Çok hızlı doldurma engeli (min 3 sn) - GEÇİCİ OLARAK DEVRE DIŞI
      const timeSinceLoad = Date.now() - PAGE_LOAD_TS;
      console.log('Sayfa yüklendiğinden beri geçen süre:', timeSinceLoad, 'ms');
      if (timeSinceLoad < 3000) {
        console.log('bindStrictForm: Çok hızlı doldurma engeli aktif - DEVRE DIŞI BİRAKILIYOR');
        // e.preventDefault();
        // alert('Formu çok hızlı doldurdunuz. Lütfen tekrar deneyin.');
        // return;
      }

      // Çoklu tık engeli
      if (submitLock) {
        e.preventDefault();
        return;
      }

      // Honeypot - GEÇİCİ OLARAK DEVRE DIŞI
      if (honeypot && text(honeypot).length > 0) {
        console.log('bindStrictForm: Honeypot tespit edildi - DEVRE DIŞI BİRAKILIYOR');
        // e.preventDefault();
        // alert('İşlem tamamlanamadı.'); // bot sessizce engellensin
        // return;
      }

      // Alan bazlı kontrol
      let ok = true;
      if (name) { validateName(name); ok = ok && !name.classList.contains('is-invalid'); }
      if (email) { validateEmail(email); ok = ok && !email.classList.contains('is-invalid'); }
      if (phone) { validatePhone(phone); ok = ok && !phone.classList.contains('is-invalid'); }
      if (address) { validateOptionalTextArea(address, STRICT_LIMITS.address, 'Adres'); ok = ok && !address.classList.contains('is-invalid'); }
      if (message) { validateTextArea(message, STRICT_LIMITS.message, 'Mesaj'); ok = ok && !message.classList.contains('is-invalid'); }

      // Checkbox kontrolleri
      if (kvkkCheckbox) {
        const kvkkValid = validateCheckbox(kvkkCheckbox, getTranslation('legal-kvkk-error'));
        ok = ok && kvkkValid;
      }
      if (privacyCheckbox) {
        const privacyValid = validateCheckbox(privacyCheckbox, getTranslation('legal-privacy-error'));
        ok = ok && privacyValid;
      }
      if (gdprCheckbox) {
        const gdprValid = validateCheckbox(gdprCheckbox, getTranslation('legal-gdpr-error'));
        ok = ok && gdprValid;
      }

      // E-posta içinde @ yoksa özel mesaj
      if (email && !looksLikeEmail(text(email))) {
        e.preventDefault();
        setInvalid(email, 'E-postada @ işareti yok. Geçerli bir e-posta giriniz.');
        ok = false;
      }

      // Turnstile kontrolü
      if (!validTurnstileToken(form)) {
        e.preventDefault();
        alert('Güvenlik doğrulaması gerekiyor.');
        ok = false;
      }

      if (!ok) {
        e.preventDefault();
        // Hatalı alan varsa formu göndermeyi durdur
        return;
      }

      // Eğer tüm doğrulamalar başarılıysa, formu gönderme işlemini başlat
      e.preventDefault(); // Sayfanın yeniden yüklenmesini engelle

      // leadForm için özel işlem - handleLeadForm fonksiyonunu çağır
      if (form.id === 'leadForm' && typeof handleLeadForm === 'function') {
        handleLeadForm(e);
        return;
      }

      // serviceForm için özel işlem - handleServiceForm fonksiyonunu çağır
      if (form.id === 'serviceForm' && typeof handleServiceForm === 'function') {
        console.log('bindStrictForm: serviceForm tespit edildi, handleServiceForm çağrılıyor');
        handleServiceForm(e);
        return;
      }

      // Diğer formlar için normal işlem
      submitLock = true;
      submitBtn && (submitBtn.disabled = true);
    });
  }

  function attachStrictValidation() {
    const forms = document.querySelectorAll('form[data-validate="strict"]');
    console.log('attachStrictValidation: Bulunan strict formlar:', forms.length);
    forms.forEach((form, index) => {
      console.log(`Form ${index + 1}: ID=${form.id}, data-validate=${form.getAttribute('data-validate')}`);
      bindStrictForm(form);
    });
  }

  // DOM hazır
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachStrictValidation);
  } else {
    attachStrictValidation();
  }

  // Global olarak normalize phone fonksiyonunu dışa aktar
  window.normalizePhone = normalizePhone;
})();
// === Ultra Katı Doğrulama Bitiş ===

// Initialize AOS
AOS.init({
  duration: 800,
  once: true,
  offset: 100
});

// WhatsApp Widget
function createWhatsAppWidget() {
  // WhatsApp widget'ı zaten varsa oluşturma
  if (document.querySelector('.whatsapp-widget')) {
    return;
  }

  const whatsappWidget = document.createElement('a');
  whatsappWidget.href = 'https://wa.me/994103314875';
  whatsappWidget.target = '_blank';
  whatsappWidget.rel = 'noopener noreferrer';
  whatsappWidget.className = 'whatsapp-widget';
  whatsappWidget.setAttribute('aria-label', 'WhatsApp ile iletişime geç');
  whatsappWidget.title = 'WhatsApp ile iletişime geç';

  const icon = document.createElement('i');
  icon.className = 'fab fa-whatsapp';

  whatsappWidget.appendChild(icon);
  document.body.appendChild(whatsappWidget);
}

// WhatsApp widget'ını sayfa yüklendiğinde oluştur
document.addEventListener('DOMContentLoaded', createWhatsAppWidget);

// Eğer DOM zaten yüklenmişse hemen oluştur
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createWhatsAppWidget);
} else {
  createWhatsAppWidget();
}

// Multi-language System
const translations = {
  tr: {
    // Navbar - Mevcut Türkçe metinler korunuyor
    'nav-home': 'Anasayfa',
    'nav-services': 'Hizmetlerimiz',
    'nav-education': 'Eğitim',
    'nav-corporate': 'Kurumsal',
    'nav-certificate': 'Sertifika Sorgulama',
    'nav-contact': 'Bize Ulaşın',
    'nav-about': 'Hakkımızda ve Tarihçemiz',
    'nav-references': 'Referanslarımız',
    'nav-blog': 'Blog',
    'nav-agricultural-solutions': 'Drone ile Tarımsal Çözümler',
    'nav-industrial-solutions': 'Drone ile Endüstriyel Çözümler',
    'nav-event-services': 'Drone ile Etkinlik Hizmetleri',
    'nav-technical-service': 'Drone Teknik Servis ve Bakım',
    'nav-certification-education': 'Sertifikasyon Eğitimi',
    'nav-agricultural-drone-education': 'Tarımsal Drone Eğitimi',
    'nav-drone-pilot-education': 'Drone Pilot Eğitimi',

    // Hero Section - Mevcut Türkçe metinler korunuyor
    'hero-title': 'İHA Teknolojilerinde Geleceği Şekillendiriyoruz',
    'hero-subtitle': 'AgroAero Tech MMC, tarım, endüstri ve güvenlik sektörlerinde yenilikçi insansız hava aracı (İHA) çözümleri ile geleceğin standartlarını belirliyor.',
    'hero-cta-service': 'Tarım Hizmeti Al',
    'hero-cta-education': 'Drone Eğitimi Al',

    // Services Section - Mevcut Türkçe metinler korunuyor
    'services-title': 'Hizmetlerimiz',
    'services-subtitle': 'Tarımsal verimliliği artıran drone teknolojileri',
    'services-main-title': 'Drone ile Tarımsal Çözümler',
    'service-spraying-title': 'Drone ile İlaçlama Çözümleri',
    'service-spraying-desc': 'Tarımsal üretimde yüksek verimlilik, düşük maliyet ve çevre dostu uygulamalar için akıllı İHA (drone) teknolojileri ile hassas ilaçlama hizmeti sunuyoruz.',
    'service-spraying-cta': 'Drone ile İlaçlama Hizmeti Al',
    'service-fertilizing-title': 'Drone ile Gübreleme ve Tohumlama Çözümleri',
    'service-fertilizing-desc': 'Modern tarımda yüksek verim ve düşük maliyet için drone destekli gübreleme çözümleri sunuyoruz.',
    'service-fertilizing-cta': 'Gübreleme ve Tohumlama Hizmeti Al',
    'service-analysis-title': 'Bitki Sağlığı ve Verimlilik Analizi',
    'service-analysis-desc': 'Tarımda verimliliği artırmak ve ürün kayıplarını en aza indirmek için multispektral kamera teknolojisi ile bitki sağlığı analizi yapıyoruz.',
    'service-analysis-cta': 'Bitki Sağlığı ve Verimlilik Analizi Hizmeti Al',

    // Service Details
    'service-spraying-feature1': 'Hassas İlaçlama Teknolojisi',
    'service-spraying-feature1-desc': 'DJI Agras serisi tarım dronlarımız, bitkinin ihtiyacına göre hassas ilaçlama yaparak ilaçların en doğru şekilde uygulanmasını sağlar',
    'service-spraying-feature2': '%30\'a Kadar Kimyasal Tasarrufu',
    'service-spraying-feature2-desc': 'Akıllı ilaçlama sistemleri sayesinde tarım ilacı ve pestisit kullanımı en aza indirgenir',
    'service-spraying-feature3': 'Hızlı ve Etkili Uygulama',
    'service-spraying-feature3-desc': 'Geniş alanların kısa sürede ilaçlanması, engebeli arazilerde bile eşit dağılım',
    'service-spraying-feature4': 'Çevre Dostu ve Sürdürülebilir Tarım',
    'service-spraying-feature4-desc': 'Doğru dozaj ve kontrollü uygulama ile çevreye verilen zarar en aza iner',
    'service-spraying-footer': 'AgroAero Tech MMC, modern drone teknolojisi ile çiftçilerimize daha güvenli, verimli ve kazançlı bir tarım geleceği sunuyor.',

    'service-fertilizing-feature1': 'Hassas Dağılım Teknolojisi',
    'service-fertilizing-feature1-desc': 'GPS ve akıllı serpme sistemleri ile her karışıma eşit gübre uygulanmasını sağlar',
    'service-fertilizing-feature2': 'Maliyet ve Kaynak Tasarrufu',
    'service-fertilizing-feature2-desc': 'Geleneksel yöntemlere kıyasla %20\'ye kadar daha az gübre kullanımı, iş gücü ve zaman tasarrufu',
    'service-fertilizing-feature3': 'Hızlı ve Verimli Uygulama',
    'service-fertilizing-feature3-desc': 'Büyük araziler kısa sürede gübrelenir, engebeli arazilerde dahi sorunsuz çalışma',
    'service-fertilizing-feature4': 'Sürdürülebilir Tarım Çözümü',
    'service-fertilizing-feature4-desc': 'Doğru dozaj, doğru zamanlama ve çevre dostu yaklaşım ile toprak yapısı korunur',
    'service-fertilizing-footer': 'AgroAero Tech MMC, drone ile gübreleme çözümleri sayesinde çiftçilerimize daha yüksek verim, daha düşük maliyet ve sürdürülebilir bir tarım geleceği sunuyor.',

    'service-analysis-feature1': 'Multispektral Görüntüleme',
    'service-analysis-feature1-desc': 'Bitkilerin fotosentez kapasitesi, su stresi ve besin eksiklikleri farklı ışık spektrumlarıyla görüntülenir',
    'service-analysis-feature2': 'Erken Hastalık ve Zararlı Teşhisi',
    'service-analysis-feature2-desc': 'Gözle fark edilmeden önce yapraklardaki stres belirtileri saptanır',
    'service-analysis-feature3': 'Verim Optimizasyonu ve Tahmin',
    'service-analysis-feature3-desc': 'Verim tahminleri ve alan bazlı uygulama planları oluşturulur',
    'service-analysis-feature4': 'Sürdürülebilir Tarım Çözümleri',
    'service-analysis-feature4-desc': 'Daha az ilaç ve gübre kullanımı ile çevre korunur',
    'service-analysis-footer': 'AgroAero Tech MMC, akıllı tarım teknolojileriyle çiftçilerimize daha sağlıklı ürünler ve yüksek verim için güçlü bir yol arkadaşıdır.',

    // Education Section
    'education-title': 'Eğitim Hizmetleri',
    'education-drone-pilot': 'Drone Pilotu Eğitimi',
    'education-drone-pilot-desc': 'Onaylı drone pilotu eğitimlerimiz ile sertifikalı pilot olun. Teorik ve pratik eğitimlerle profesyonel drone operatörü olma yolunda ilk adımı atın.',
    'education-certified-program': 'Onaylı Sertifika Programı',
    'education-theory-practice': 'Teorik ve Pratik Dersler',
    'education-expert-instructors': 'Uzman Eğitmen Kadrosu',

    // References Section
    'references-title': 'Referanslarımız',
    'references-subtitle': 'Güvenilir iş ortaklarımız.',

    // Tarimsal Cozumler Page
    'page-spraying-title': 'Drone ile İlaçlama Hizmeti',
    'page-spraying-desc': 'AgroAero Tech olarak kullandığımız DJI Agras T50 tarım dronlarıyla, sahalarınıza hassas, hızlı ve çevre dostu ilaçlama hizmeti sunuyoruz.',
    'page-fertilizing-title': 'Gübreleme ve Tohumlama Hizmeti',
    'page-fertilizing-desc': 'AgroAero Tech\'in DJI Agras T50 dronları sayesinde gübre ve tohum serpme işlemleri artık çok daha hızlı, hassas ve verimli.',
    'page-analysis-title': 'Bitki Sağlığı ve Verimlilik Analizi',
    'page-analysis-desc': 'AgroAero Tech\'in multispektral drone teknolojisi sayesinde, bitkilerinizin sağlığını ve tarla durumunu en detaylı şekilde analiz ediyoruz.',
    'page-form-title': 'Tarımsal Hizmet Başvurusu',

    // Service Benefits
    'spraying-benefit1': '%90\'a kadar su tasarrufu – Geleneksel yöntemlere kıyasla çok daha düşük su tüketimi.',
    'spraying-benefit2': '%50\'ye varan zaman tasarrufu – Yüzlerce hektar alan kısa sürede tamamlanır.',
    'spraying-benefit3': 'Çevreye duyarlı uygulama – Doğru dozaj, doğru nokta, minimum çevresel etki.',
    'spraying-benefit4': 'Verimlilik artışı – Daha sağlıklı bitkiler, daha güçlü ürünler.',

    'fertilizing-benefit1': 'Eşit Dağılım – Gelişmiş hassasiyet sensörleri sayesinde gübre ve tohumlar tarlanın her noktasına homojen şekilde dağıtılır.',
    'fertilizing-benefit2': 'Zaman Tasarrufu – Geleneksel yöntemlere kıyasla çok daha kısa sürede geniş alanlar tamamlanır.',
    'fertilizing-benefit3': 'Maliyet Avantajı – Daha az iş gücü, daha düşük yakıt ve ekipman maliyeti.',
    'fertilizing-benefit4': 'Maksimum Verimlilik – Doğru dozaj ile ürünlerinizin gelişimi hızlanır, verim artar.',

    'analysis-benefit1': 'Erken Teşhis – Bitkilerde stres, hastalık veya besin eksikliğini gözle görülmeden önce tespit edin.',
    'analysis-benefit2': 'Verim Artışı – Doğru gübreleme, sulama ve ilaçlama kararlarıyla mahsulünüzün gelişimini hızlandırın.',
    'analysis-benefit3': 'Maliyet Tasarrufu – Gereksiz ilaçlama ve sulamadan kaçınarak üretim maliyetinizi azaltın.',
    'analysis-benefit4': 'Kesin Veriler – NDVI, NDRE ve diğer spektral haritalar ile tarlanızın durumunu sayısal verilerle görün.',
    'analysis-benefit5': 'Sürdürülebilir Tarım – Daha az kaynak kullanımı ile çevreyi koruyun.',

    // Form Fields
    'form-service-type': 'Hizmet Türü *',
    'form-name': 'Ad Soyad *',
    'form-phone': 'Telefon *',
    'form-email': 'E-posta *',
    'form-address': 'Adres *',
    'form-field-size': 'Tarla Büyüklüğü (Hektar) *',
    'form-crop-type': 'Ürün Türü *',
    'form-message': 'Mesaj',
    'form-submit': 'Başvuruyu Gönder',
    'form-select': 'Seçiniz',

    // Crop Types
    'crop-cotton': 'Pamuk',
    'crop-corn': 'Mısır',
    'crop-rice': 'Çeltik',
    'crop-wheat': 'Buğday',
    'crop-other': 'Diğer',

    // Service Details
    'spraying-detail': 'DJI Agras T50\'nin yüksek kapasiteli tankları ve akıllı ilaçlama sistemleri sayesinde, bir günde yüzlerce hektar alanı en verimli şekilde ilaçlıyoruz.',
    'spraying-cta-text': 'AgroAero Tech ile iş birliği yaparak, daha düşük maliyet, daha yüksek verim ve daha sürdürülebilir tarım elde edin.',
    'fertilizing-detail': 'Drone teknolojisi sayesinde hem gübreleme hem de tohum serpme işlemlerinde doğayı koruyan, çiftçiye kazandıran modern çözümler sunuyoruz.',
    'fertilizing-cta-text': 'AgroAero Tech ile tarımda geleceği yakalayın!',
    'analysis-detail': 'Multispektral analiz ile hangi bölgenin daha fazla gübreye, suya veya müdahaleye ihtiyacı olduğunu tespit ediyor, size bilimsel verilere dayalı tarım yönetimi sunuyoruz.',
    'analysis-cta-text': 'AgroAero Tech ile artık kararlarınız tahmine değil, teknolojiye ve veriye dayanacak.',

    // Service Types
    'service-type-spraying': 'İlaçlama Hizmeti',
    'service-type-fertilizing': 'Gübreleme ve Tohumlama',
    'service-type-analysis': 'Bitki Sağlığı ve Verim Analizi',
    'service-type-all': 'Tüm Hizmetler',

    // Form Elements
    'legal-approvals': 'Yasal Onaylar *',
    'form-message-placeholder': 'Hizmet hakkında özel taleplerinizi belirtiniz...',

    // Legal Texts
    'legal-kvkk-link': 'KVKK Aydınlatma Metni',
    'legal-kvkk-text': '\'ni okudum ve anladım.',
    'legal-privacy-link': 'Gizlilik Politikası',
    'legal-privacy-text': '\'nı okudum ve kabul ediyorum.',
    'legal-gdpr-link': 'GDPR Kapsamında Açık Rıza Metni',
    'legal-gdpr-text': '\'ni onaylıyorum.',

    // Legal Error Messages
    'legal-kvkk-error': 'KVKK metnini onaylamalısınız.',
    'legal-privacy-error': 'Gizlilik politikasını kabul etmelisiniz.',
    'legal-gdpr-error': 'GDPR rıza metnini onaylamalısınız.',

    // Footer Section
    'footer-company-desc': 'İHA teknolojilerinde öncü, eğitimde güvenilir. Geleceğin havacılık teknolojilerini bugünden deneyimleyin.',
    'footer-quick-menu': 'Hızlı Menü',
    'footer-contact': 'İletişim',
    'footer-social-media': 'Sosyal Medya',
    'footer-social-desc': 'Güncel haberler ve gelişmeler için bizi takip edin.',
    'footer-copyright': 'Tüm hakları saklıdır.',
    'footer-privacy': 'Gizlilik Politikası',

    // Certification Education Page
    'cert-hero-title': 'Onaylı Drone Pilotu Sertifikasyon Eğitimi',
    'cert-hero-subtitle': 'Azerbaycan\'da faaliyet gösteren AgroAero Tech MMC olarak, <strong>onaylı drone sertifikası</strong> ile uluslararası standartlara uygun profesyonel drone pilotu eğitimleri sunuyoruz.',
    'cert-apply-btn': 'Başvur',
    'cert-why-title': 'Neden Bizimle Drone Pilotu Eğitimi?',
    'cert-feature1-title': 'Teorik ve Pratik Eğitim',
    'cert-feature1-desc': 'Katılımcılar, hem sınıf ortamında hem de sahada uygulamalı eğitimle profesyonel bilgi edinir.',
    'cert-feature2-title': 'Uluslararası Standartlar',
    'cert-feature2-desc': 'Eğitim içeriklerimiz ICAO ve bölgesel havacılık otoritelerinin düzenlemelerine uygun şekilde hazırlanır.',
    'cert-feature3-title': 'Geniş Kapsam',
    'cert-feature3-desc': 'Tarımsal ilaçlama dronları (DJI Agras T50/T40 vb.), endüstriyel keşif ve görüntüleme dronları ile kapsamlı eğitim.',
    'cert-feature4-title': 'Onaylı Drone Sertifikası',
    'cert-feature4-desc': 'Eğitimi başarıyla tamamlayan katılımcılara <strong>onaylı Drone Pilotu Sertifikası</strong> verilir ve sertifika sorgulanabilir.',
    'cert-who-title': 'Kimler Katılabilir?',
    'cert-req1': '18 yaşını doldurmuş Azerbaycan vatandaşları',
    'cert-req2': 'En az lise mezunu',
    'cert-req3': 'İngilizce temel seviye',
    'cert-target1': 'Tarım sektöründe çalışan çiftçiler ve ziraat mühendisleri',
    'cert-target2': 'Endüstriyel alanda drone kullanmak isteyen teknik uzmanlar',
    'cert-target3': 'Yeni bir meslek edinmek isteyen genç girişimciler',
    'cert-info-title': 'Eğitim Bilgileri',
    'cert-duration-title': 'Süre',
    'cert-duration-desc': 'Drone Pilotu Eğitimi (36 Saat)<br>16 saat teorik + 8 saat teknik + 12 saat pratik',
    'cert-capacity-title': 'Sınıf Mevcudu',
    'cert-capacity-desc': 'Maksimum 16 Kişi<br>(minimum katılım 10 kişi)',
    'cert-dates-title': 'Eğitim Tarihleri',
    'cert-dates-desc': 'Yeterli sayıya ulaştığımız her hafta<br>Minimum katılımcı sayısına göre planlanır',
    'cert-countries-title': 'Ülkeler',
    'cert-countries-desc': 'Azerbaycan',
    'cert-program-title': 'Eğitim Programı',
    'cert-theory-title': 'Teorik Eğitim (16 Saat)',
    'cert-theory1': '• Havacılık Mevzuatı',
    'cert-theory2': '• İHA Sistemleri',
    'cert-theory3': '• Meteoroloji',
    'cert-theory4': '• Navigasyon',
    'cert-theory5': '• Hava Sahası',
    'cert-theory6': '• Güvenlik Prosedürleri',
    'cert-theory7': '• Acil Durum Yönetimi',
    'cert-theory8': '• İnsan Faktörleri',
    'cert-technical-title': 'Teknik Eğitim (8 Saat)',
    'cert-tech1': '• İHA Donanım Bilgisi',
    'cert-tech2': '• Motor ve Pervane Sistemleri',
    'cert-tech3': '• Batarya Teknolojileri',
    'cert-tech4': '• Sensör Sistemleri',
    'cert-tech5': '• Bakım ve Onarım',
    'cert-tech6': '• Arıza Tespiti',
    'cert-practical-title': 'Pratik Eğitim (12 Saat)',
    'cert-prac1': '• Uçuş Öncesi Kontroller',
    'cert-prac2': '• Temel Uçuş Manevraları',
    'cert-prac3': '• Otonom Uçuş',
    'cert-prac4': '• Acil Durum Prosedürleri',
    'cert-prac5': '• Sınav Hazırlığı',
    'cert-prac6': '• Sertifika Sınavı',
    'cert-form-title': 'Sertifikasyon Başvuru Formu',
    'cert-form-subtitle': 'Aşağıdaki formu doldurarak bizimle iletişime geçebilirsiniz. En kısa sürede size dönüş yapacağız.',
    'cert-fin-label': 'FIN Kodu *',
    'cert-fin-placeholder': 'Örnek: 1AB2C3D',
    'cert-phone-placeholder': '+994 xx xxx xx xx',
    'cert-photo-label': 'Vesikalık Fotoğraf *',
    'cert-judicial-label': 'Adli Sicil Belgesi *',
    'cert-population-label': 'Nüfus Kayıt Örneği *',
    'cert-file-format': 'JPG, PNG, PDF formatında, maksimum 5MB',
    'cert-submit-btn': 'Başvuruyu Gönder',

    // Agricultural Drone Education Page
    'agri-hero-title': 'Tarımsal Drone Eğitimi',
    'agri-hero-subtitle': 'Hobi amaçlı ve kişisel gelişim odaklı drone eğitimi ile tarımsal uygulamalarda drone kullanımını öğrenin.',
    'agri-apply-btn': 'Başvur',
    'agri-hobby-title': 'Hobi Amaçlı Drone Eğitimi',
    'agri-hobby-desc': 'Tarımsal uygulamalarda drone kullanımını öğrenmek isteyenler için <strong>hobi amaçlı eğitim programı</strong>. Azerbaycan\'da faaliyet gösteren AgroAero Tech MMC olarak, kişisel gelişim ve hobi odaklı drone eğitimleri sunuyoruz. Bu eğitim sonunda sadece katılım belgesi verilmekte olup, herhangi bir onay veya resmiyet içermez.',
    'agri-why-title': 'Neden Bizimle Hobi Amaçlı Drone Eğitimi?',
    'agri-feature1-title': 'Teorik ve Pratik Eğitim',
    'agri-feature1-desc': 'Katılımcılar, hem sınıf ortamında hem de sahada uygulamalı eğitimle profesyonel bilgi edinir.',
    'agri-feature2-title': 'Uluslararası Standartlar',
    'agri-feature2-desc': 'Eğitim içeriklerimiz ICAO ve bölgesel havacılık otoritelerinin düzenlemelerine uygun şekilde hazırlanır.',
    'agri-feature3-title': 'Geniş Kapsam',
    'agri-feature3-desc': 'Tarımsal ilaçlama dronları (DJI Agras T50/T40 vb.), endüstriyel keşif ve görüntüleme dronları ile kapsamlı eğitim.',
    'agri-feature4-title': 'Katılım Belgesi',
    'agri-feature4-desc': 'Eğitimi başarıyla tamamlayan katılımcılara sadece <strong>katılım belgesi</strong> verilir. Bu belge onaylı sertifika değildir ve herhangi bir resmiyet taşımaz.',
    'agri-who-title': 'Kimler Katılabilir?',
    'agri-requirements-title': 'Genel Şartlar',
    'agri-req1': '18 yaşını doldurmuş Azerbaycan vatandaşları',
    'agri-req2': 'En az lise mezunu',
    'agri-req3': 'İngilizce temel seviye (ICAO Level 2)',
    'agri-target-title': 'Hedef Kitle',
    'agri-target1': 'Tarım sektöründe çalışan çiftçiler ve ziraat mühendisleri',
    'agri-target2': 'Endüstriyel alanda drone kullanmak isteyen teknik uzmanlar',
    'agri-target3': 'Yeni bir meslek edinmek isteyen genç girişimciler',
    'agri-target4': 'Hobi amaçlı drone kullanımı öğrenmek isteyen herkes',
    'agri-program-title': '📌 Eğitim Programı',
    'agri-theory-title': 'Teorik Eğitim (16 Saat)',
    'agri-theory1': '• Havacılık Mevzuatı',
    'agri-theory2': '• İHA Sistemleri',
    'agri-theory3': '• Meteoroloji',
    'agri-theory4': '• Navigasyon',
    'agri-theory5': '• Hava Sahası',
    'agri-theory6': '• Güvenlik Prosedürleri',
    'agri-theory7': '• Acil Durum Yönetimi',
    'agri-theory8': '• İnsan Faktörleri',
    'agri-technical-title': 'Teknik Eğitim (8 Saat)',
    'agri-tech1': '• İHA Donanım Bilgisi',
    'agri-tech2': '• Motor ve Pervane Sistemleri',
    'agri-tech3': '• Batarya Teknolojileri',
    'agri-tech4': '• Sensör Sistemleri',
    'agri-tech5': '• Bakım ve Onarım',
    'agri-tech6': '• Arıza Tespiti',
    'agri-practical-title': 'Pratik Eğitim (12 Saat)',
    'agri-prac1': '• Uçuş Öncesi Kontroller',
    'agri-prac2': '• Temel Uçuş Manevraları',
    'agri-prac3': '• Otonom Uçuş',
    'agri-prac4': '• Acil Durum Prosedürleri',
    'agri-prac5': '• Sınav Hazırlığı',
    'agri-prac6': '• Değerlendirme Testi',
    'agri-form-title': 'Tarımsal Drone Eğitimi Başvuru Formu',
    'agri-form-subtitle': 'Aşağıdaki formu doldurarak bizimle iletişime geçebilirsiniz. En kısa sürede size dönüş yapacağız.',
    'agri-phone-placeholder': '+994 xx xxx xx xx',
    'agri-message-placeholder': 'Eğitim hakkında sorularınız veya özel istekleriniz...',
    'agri-submit-btn': 'Başvuruyu Gönder',

    // Drone Pilot Education Page
    'pilot-select-btn': 'Seç',

    // Corporate Page
    'corporate-page-title': 'Hakkımızda & Tarihçemiz',
    'corporate-page-subtitle': 'Azerbaycan\'da tarımsal dijital dönüşümün öncüsü',
    'corporate-about-title': 'Hakkımızda',
    'corporate-about-desc1': 'AgroAero Tech MMC, 2024 yılında Azerbaycan\'da tarımsal ilaçlama hizmetlerini modern drone teknolojileriyle buluşturmak amacıyla kurulmuştur. Şirketimiz, çiftçilere yüksek verim, düşük maliyet ve çevre dostu çözümler sunarak tarımda yeni bir dönemin öncüsü olmayı hedeflemektedir.',
    'corporate-about-desc2': 'Kullandığımız DJI Agras T50 dronları, pamuk, mısır, çeltik ve diğer stratejik ürünlerde ilaçlamayı en hassas ve verimli şekilde gerçekleştirmektedir. Gelişmiş ilaçlama sistemleriyle tek seferde yüzlerce hektar alan kısa sürede ilaçlanabilmekte, böylece hem zaman hem de maliyet avantajı sağlanmaktadır.',
    'corporate-feature1': '%90 Su Tasarrufu',
    'corporate-feature2': 'DJI Agras T50 Filosu',
    'corporate-feature3': '7/24 Profesyonel Destek',
    'corporate-feature4': 'NDVI Multispektral Analiz',
    'corporate-mission-title': 'Misyonumuz',
    'corporate-mission-desc': 'Misyonumuz, gelişmiş drone teknolojileriyle hızlı, güvenli ve verimli ilaçlama hizmetleri sunarak çiftçilerin üretim gücünü artırmaktır.',
    'corporate-mission1': 'Tarımsal ilaçlamada yenilikçi yöntemler geliştirmek',
    'corporate-mission2': 'Çiftçilere zaman ve maliyet avantajı sağlamak',
    'corporate-mission3': 'Çevreye duyarlı, sürdürülebilir tarım uygulamalarını desteklemek',
    'corporate-mission4': 'Drone pilotluğu eğitimleri ile sektöre nitelikli uzmanlar kazandırmak',
    'corporate-vision-title': 'Vizyonumuz',
    'corporate-vision-desc': 'AgroAero Tech olarak vizyonumuz, Azerbaycan\'da ve bölgede tarımda dijital dönüşümün lideri olmak, modern drone teknolojileriyle tarımsal üretimde verimliliği en üst seviyeye çıkarmaktır. Daha az su ve ilaç kullanarak çevre dostu çözümler sunmak, çiftçilerimizin maliyetlerini azaltırken sürdürülebilir tarımı desteklemek temel hedefimizdir.',
    'corporate-history-title': 'Tarihçemiz',
    'corporate-history-subtitle': '"Daha verimli tarım, daha güçlü gelecek" anlayışıyla yolculuğumuz',
    'corporate-timeline1-title': '2024 - Kuruluş',
    'corporate-timeline1-desc': 'AgroAero Tech MMC, tarımda yenilikçi teknolojilerin uygulanması amacıyla 2024 yılında kurulmuştur. Azerbaycan\'da tarımsal üretimde verimliliği artırmak, su ve ilaç kullanımında tasarruf sağlamak ve modern tarım yöntemlerini çiftçilerle buluşturmak vizyonuyla yola çıkmıştır.',
    'corporate-timeline2-title': '2024 - DJI Agras T50 Filosu',
    'corporate-timeline2-desc': 'Kuruluşundan kısa süre sonra, dünyanın en gelişmiş tarım dronlarından biri olan DJI Agras T50 filosunu devreye alarak pamuk, mısır, çeltik ve diğer stratejik bitkilerde ilaçlama çalışmalarına başlamıştır. Modern ilaçlama sistemleri sayesinde %90\'a kadar su tasarrufu sağlanırken, aynı zamanda çevreye verilen zarar minimuma indirilmiştir.',
    'corporate-timeline3-title': '2024 - Saha Operasyonları',
    'corporate-timeline3-desc': '2024 yılı içerisinde, AgroAero Tech ülke genelinde birçok rayonda tarımsal ilaçlama hizmeti sunarak, çiftçilerle güvene dayalı iş birlikleri geliştirmiştir.',
    'corporate-timeline4-title': '2025 - Teknolojiye Yön Veren Eğitimler',
    'corporate-timeline4-desc': 'Saha operasyonlarındaki tecrübemizi eğitimle taçlandırıyoruz! 2025 yılı itibarıyla, Azerbaycan\'da teknolojik tarımın ve insansız sistemlerin geleceğini inşa etmek adına profesyonel eğitim faaliyetlerimize başladık.',
    'corporate-timeline5-title': '2025 - Stratejik Ortaklıklar',
    'corporate-timeline5-desc': 'Aynı yıl, MKT İstehsalat Kommersiya MMC gibi büyük tarımsal üretim şirketleriyle stratejik anlaşmalar yapılarak hizmet ağımız genişletilmiştir. Böylece, hem özel sektör hem de çiftçi birlikleriyle güçlü bir iş birliği modeli oluşturulmuştur.',
    'corporate-services-title': 'Hizmet Alanlarımız',
    'corporate-services-subtitle': 'Bugün AgroAero Tech, Azerbaycan\'ın en güvenilir tarım teknolojileri şirketlerinden biri olarak faaliyet göstermektedir',
    'corporate-service1-title': 'Drone İle Tarımsal Çözümler',
    'corporate-service1-desc': 'Hassas ilaçlama, bitki sağlığı analizi ve verim optimizasyonu ile çiftçilerimizin yanındayız',
    'corporate-service2-title': 'Drone ile Endüstriyel Çözümler',
    'corporate-service2-desc': 'Enerji, güvenlik, haritalama ve denetim alanlarında profesyonel drone hizmetleri',
    'corporate-service3-title': 'Drone Pilot Eğitimi',
    'corporate-service3-desc': 'Sertifikalı eğitmenlerle profesyonel drone pilotu yetiştiriyoruz',
    'corporate-team-title': 'Eğitmenlerimiz',
    'corporate-team-subtitle': 'Alanında uzman, deneyimli eğitmen kadromuz',
    'corporate-instructor1-title': 'İHA 2 PİLOTU',
    'corporate-instructor1-desc': '50.000 Hektar Dronla İlaçlama Deneyimi',
    'corporate-instructor2-title': 'İHA 2 EĞİTMENİ',
    'corporate-instructor2-desc': 'Eğitmen - 10 Yıllık Havacılık Tecrübesi',

    // References Page
    'references-page-title': 'Referanslarımız',
    'references-page-subtitle': 'Güvenilir iş ortaklarımız.',
    'references-cta-title': 'Siz de Referanslarımıza Katılın',
    'references-cta-desc': 'İHA teknolojileri ile işinizi bir üst seviyeye taşımak için bizimle iletişime geçin ve özel çözümlerimizi keşfedin.',
    'references-cta-quote': 'Teklif Al',
    'references-cta-call': 'Hemen Ara',

    // Blog Page
    'blog-loading': 'Yükleniyor...',
    'blog-loading-text': 'Blog yazıları yükleniyor...',
    'blog-js-warning': 'Blog yazılarını görüntülemek için lütfen JavaScript\'i etkinleştirin.',
    'blog-no-posts': 'Henüz blog yazısı yok.',
    'blog-error': 'Blog yazıları yüklenirken bir hata oluştu.',
    'blog-read-more': 'Devamını Oku',

    // Common
    'learn-more': 'Detaylı Bilgi Al',
    'get-service': 'Hizmet Al',
    'contact-us': 'Bize Ulaşın',

    // Contact Page
    'contact-page-title': 'Bize Ulaşın',
    'contact-page-subtitle': 'İHA eğitimi ve hizmetlerimiz hakkında bilgi almak için bizimle iletişime geçin',
    'contact-form-title': 'İletişim Formu',
    'contact-form-subtitle': 'Aşağıdaki formu doldurarak bizimle iletişime geçebilirsiniz. En kısa sürede size dönüş yapacağız.',
    'form-address-optional': 'Adres (İsteğe Bağlı)',
    'form-phone-placeholder': '+994 xx xxx xx xx',
    'form-message-placeholder': 'Mesajınızı giriniz...',
    'location-section-title': 'Konumumuz',
    'location-view-on-map': 'Haritada Görüntüle',
    'location-get-directions': 'Yol Tarifi Al',

    // Industrial Solutions Page
    'ind-inspection-title': 'Endüstriyel Denetim ve Analiz',
    'ind-inspection-desc': 'Yüksek teknoloji drone sistemleri ile endüstriyel tesislerinizin kapsamlı denetim ve analiz hizmetleri.',
    'ind-inspection-cta': 'Denetim ve Analiz Hizmeti Al',
    'ind-energy-title': 'Enerji Altyapısı Kontrolü',
    'ind-energy-desc': 'Enerji sektörü için kapsamlı drone denetim ve kontrol çözümleri.',
    'ind-energy-cta': 'Enerji Kontrolü Hizmeti Al',
    'ind-security-title': 'Güvenlik Çözümleri',
    'ind-security-desc': 'Yapay zeka destekli drone güvenlik sistemleri ile tesislerinizi 7/24 koruma altına alın.',
    'ind-security-cta': 'Güvenlik Çözümü Al',
    'ind-digital-title': 'Dijital Çözümler',
    'ind-digital-desc': '3D modelleme, dijital ikiz teknolojisi ve akıllı gayrimenkul çözümleri.',
    'ind-digital-cta': 'Dijital Çözüm Al',
    'ind-form-title': 'Endüstriyel Hizmet Başvurusu',
    'ind-service-inspection': 'Denetim ve Analiz',
    'ind-service-energy': 'Enerji Altyapısı Kontrolü',
    'ind-service-security': 'Güvenlik Çözümleri',
    'ind-service-digital': 'Dijital Çözümler',
    'form-company': 'Şirket Adı',
    'form-project-area': 'Proje Alanı (m²)',
    'form-sector': 'Sektör *',
    'sector-energy': 'Enerji',
    'sector-construction': 'İnşaat',
    'sector-mining': 'Madencilik',
    'sector-manufacturing': 'Üretim',
    'sector-realestate': 'Gayrimenkul',
    'sector-events': 'Etkinlik/Organizasyon',
    'sector-other': 'Diğer',
    'ind-mapping-title': 'Haritalama ve Arazi Ölçümleme:',
    'ind-mapping-desc': 'Yüksek çözünürlüklü kameralar ve LIDAR sistemleri ile arazilerin 3D modellerinin, eğim haritalarının ve ölçüm raporlarının hazırlanması.',
    'ind-air-title': 'Hava Analizi (Sniffer):',
    'ind-air-desc': 'Dronelara entegre sensörler ile endüstriyel tesislerde gaz kaçaklarının tespiti ve çevresel kalite ölçümleri.',
    'ind-inspection-footer': 'LIDAR teknolojisi ile santimetre hassasiyetinde ölçümler, multispektral kameralar ile detaylı analizler sunuyoruz.',
    'ind-powerline-title': 'Elektrik Dağıtım Hattı Kontrolü:',
    'ind-powerline-desc': 'Enerji hatlarının yüksek çözünürlüklü görseller ve termal verilerle denetlenmesi.',
    'ind-wind-title': 'Rüzgar Türbini Denetimi:',
    'ind-wind-desc': 'Türbin kanatlarındaki çatlak, paslanma gibi yapısal sorunların termal kameralarla tespiti.',
    'ind-solar-title': 'Güneş Paneli Denetimi:',
    'ind-solar-desc': 'Termal kameralar ile panellerdeki sıcaklık farklarının ölçülmesi ve arızalı hücrelerin tespiti.',
    'ind-energy-footer': 'Enerji altyapınızın güvenliğini ve verimliliğini drone teknolojisi ile maksimize edin.',
    'ind-autonomous-title': 'Otonom Güvenlik Sistemleri:',
    'ind-autonomous-desc': 'Sınır bölgeleri ve fabrikalar gibi alanlarda 7/24 devriye gezen, tehditleri algılayan yapay zeka destekli drone sistemleri.',
    'ind-fire-title': 'Yangın Güvenliği:',
    'ind-fire-desc': 'Termal kameralarla yangın riskli bölgelerin erken tespiti ve yangın anında hızlı müdahale desteği.',
    'ind-security-footer': 'Gelişmiş sensörler ve yapay zeka algoritmaları ile proaktif güvenlik çözümleri sunuyoruz.',
    'ind-3d-title': '3D Modelleme:',
    'ind-3d-desc': 'Bina ve tesislerin dijital kopyalarının yüksek hassasiyetle oluşturulması.',
    'ind-twin-title': 'Dijital İkiz (Digital Twin):',
    'ind-twin-desc': 'Fiziksel varlıkların IoT sensörleri ile entegre edilerek canlı verilerle yönetilen sanal kopyalarının oluşturulması.',
    'ind-tour-title': 'Sanal Tur:',
    'ind-tour-desc': 'Mekanların 360 derece etkileşimli olarak hem havadan hem yerden gezilebilmesini sağlayan dijital turlar.',
    'ind-realestate-title': 'Akıllı Gayrimenkul Satış Platformu:',
    'ind-realestate-desc': '3D modeller ve yapay zeka botları ile desteklenen gayrimenkul satış ve sunum platformu.',

    // Drone Event Services Page
    'event-swarm-title': 'Drone ile Etkinlik Hizmetleri',
    'event-swarm-desc': 'Gökyüzünü tuvalinize çevirin! Yüzlerce drone ile senkronize ışık şovları ve dev ekran reklamları.',
    'event-swarm-cta': 'Drone ile Etkinlik Hizmetleri Teklifi Al',
    'event-screen-title': 'Perde Ekranlı Drone Reklamcılığı',
    'event-screen-desc': 'Gökyüzünde dev bir ekran! Dronelar ile video ve logo yansıtma.',
    'event-screen-cta': 'Drone Reklamcılık Teklifi Al',
    'event-form-title': 'Etkinlik Hizmeti Başvurusu',
    'event-service-swarm': 'Işıklı Sürü Drone Gösterisi',
    'event-service-screen': 'Perde Ekranlı Drone Reklamcılığı',
    'event-service-both': 'Her İki Hizmet',
    'form-event-date': 'Etkinlik Tarihi *',
    'form-event-type': 'Etkinlik Türü *',
    'form-event-location': 'Etkinlik Lokasyonu *',
    'form-event-details': 'Etkinlik Detayları ve Özel İstekler',
    'form-event-location-placeholder': 'Şehir, mekan adı',
    'form-event-details-placeholder': 'Etkinliğiniz hakkında detaylı bilgi, gösterilmesini istediğiniz logo/yazı/animasyon vb.',
    'form-project-details-placeholder': 'Projeniz hakkında detaylı bilgi veriniz...',
    'event-type-opening': 'Açılış Töreni',
    'event-type-festival': 'Festival / Konser',
    'event-type-corporate': 'Kurumsal Etkinlik',
    'event-type-wedding': 'Düğün / Özel Gün',
    'event-type-launch': 'Ürün Lansmanı',
    'event-type-sports': 'Spor Etkinliği',
    'event-type-other': 'Diğer',
    'event-swarm-sync': 'Senkronize Hareket:',
    'event-swarm-sync-desc': 'Özel yazılımlarla koordine edilen yüzlerce drone, gökyüzünde mükemmel uyum içinde hareket eder.',
    'event-swarm-design': 'Özel Tasarımlar:',
    'event-swarm-design-desc': 'Logolar, şekiller, yazılar ve animasyonlar gökyüzünde canlanır.',
    'event-swarm-events': 'Her Etkinlik İçin:',
    'event-swarm-events-desc': 'Açılışlar, festivaller, kutlamalar, kurumsal etkinlikler ve özel günler.',
    'event-swarm-safe': 'Güvenli ve Çevre Dostu:',
    'event-swarm-safe-desc': 'Havai fişeklere alternatif, sessiz ve çevre dostu gösteri.',
    'event-swarm-footer': 'Unutulmaz anlar yaratın, markanızı gökyüzüne taşıyın!',
    'event-screen-giant': 'Dev Ekran Oluşturma:',
    'event-screen-giant-desc': 'Dronelar gökyüzünde dev bir LED perde oluşturarak video ve görsel yansıtır.',
    'event-screen-impact': 'Maksimum Etki:',
    'event-screen-impact-desc': 'Geleneksel reklamcılığın ötesinde, dikkat çekici ve viral potansiyeli yüksek tanıtım.',
    'event-screen-video': 'Video Yayını:',
    'event-screen-video-desc': 'Logolar, tanıtım videoları, mesajlar ve animasyonlar gökyüzünde yayınlanır.',
    'event-screen-reach': 'Geniş Kitleye Ulaşım:',
    'event-screen-reach-desc': 'Açık hava etkinliklerinde binlerce kişiye aynı anda ulaşın.',
    'event-screen-footer': 'Reklamcılıkta yeni bir çağ başlatın!',

    // Page Titles
    'industrial-page-title': 'Endüstriyel Drone Çözümleri | Denetim, Haritalama, Güvenlik - AgroAeroTech',
    'event-page-title': 'Drone ile Etkinlik Hizmetleri | Sürü Drone Gösterisi, Drone Reklamcılık - AgroAeroTech',

    // Legal Pages
    'legal-kvkk-page-title': 'KVKK Aydınlatma Metni | AgroAeroTech',
    'legal-kvkk-title': 'KVKK Aydınlatma Metni',
    'legal-kvkk-subtitle': '6698 sayılı Kişisel Verilerin Korunması Kanunu Kapsamında Bilgilendirme.',
    'legal-kvkk-content': 'Kişisel verilerimin, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında; eğitim başvurusu, kayıt, sertifikasyon ve bilgilendirme süreçlerinin yürütülmesi amacıyla işlenmesine ve gerekli durumlarda ilgili resmi kurumlarla paylaşılmasına onay veriyorum.',
    'legal-privacy-page-title': 'Gizlilik Politikası | AgroAeroTech',
    'legal-privacy-title': 'Gizlilik Politikası',
    'legal-privacy-subtitle': 'Kişisel verilerinizin gizliliğini ve güvenliğini korumayı taahhüt ediyoruz.',
    'legal-privacy-intro': 'AgroAero Tech MMC olarak, kişisel verilerinizin gizliliğini ve güvenliğini korumayı taahhüt ediyoruz.',
    'legal-privacy-section1-title': '1. Toplanan Kişisel Bilgiler',
    'legal-privacy-section1-content': 'Başvuru sürecinde ad, soyad, telefon, e-posta, adres ve eğitim bilgilerinizi talep edebiliriz.',
    'legal-privacy-section2-title': '2. Verilerin Kullanım Amaçları',
    'legal-privacy-section2-content': 'Eğitim kayıtları, sertifika hazırlama ve bilgilendirme amacıyla kullanılır.',
    'legal-privacy-section3-title': '3. Verilerin Korunması',
    'legal-privacy-section3-content': 'Veriler güvenli sunucularda şifrelenmiş olarak saklanır.',
    'legal-privacy-section4-title': '4. İletişim',
    'legal-gdpr-page-title': 'GDPR Kapsamında Açık Rıza Metni | AgroAeroTech',
    'legal-gdpr-title': 'GDPR Kapsamında Açık Rıza Metni',
    'legal-gdpr-subtitle': 'Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) Uyarınca Bilgilendirme.',
    'legal-gdpr-content': 'Kişisel verilerimin, Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) uyarınca; yalnızca eğitim kaydı, sertifikasyon ve bilgilendirme amacıyla toplanmasına, saklanmasına ve gerektiğinde resmi kurumlarla paylaşılmasına açık rızamı veriyorum.',
    'legal-consent-title': 'Açık Rıza Beyanı',
    'legal-approve-btn': 'Okudum, Onaylıyorum',
    'legal-back-btn': 'Geri Dön',

    // Technical Service Page
    'ts-hero-title': 'DJI Drone Teknik Servis, Bakım ve Yerinde Destek Merkezi',
    'ts-hero-desc': 'AgroAero Tech MMC, DJI\'nin yetkili bayisi ve teknik servis ortağı olarak, tüm DJI drone modelleri için profesyonel bakım, onarım ve yerinde teknik destek hizmetleri sunmaktadır. 10 yılı aşkın sektör deneyimimiz, uzman mühendis kadromuz ve geniş yedek parça stoğumuzla, drone filonuzun kesintisiz ve yüksek performansla çalışmasını sağlıyoruz.',
    'ts-hero-cta': 'Servis Talep Et',
    'ts-models-title': 'Servis Verdiğimiz DJI Modelleri',
    'ts-model-agras': 'DJI Agras Serisi',
    'ts-model-mavic': 'DJI Mavic Serisi',
    'ts-model-matrice': 'DJI Matrice Serisi',
    'ts-scope-title': 'Hizmet Kapsamımız',
    'ts-scope-1-title': 'Periyodik Bakım ve Arıza Tespiti',
    'ts-scope-1-desc': 'Uçuş sistemleri, sensörler, GPS ve kontrol ünitelerinin detaylı analizi',
    'ts-scope-2-title': 'Mekanik Onarım',
    'ts-scope-2-desc': 'Gövde, kol, motor, pervane, iniş takımı ve montaj bileşenlerinin değişimi',
    'ts-scope-3-title': 'Elektronik Sistem Servisi',
    'ts-scope-3-desc': 'ESC, IMU, gimbal, kamera, anten ve sensör modüllerinin tamiri',
    'ts-scope-4-title': 'Kalibrasyon & Test Uçuşları',
    'ts-scope-4-desc': 'Onarım sonrası uçuş dengeleme, yazılım optimizasyonu ve performans kontrolü',
    'ts-scope-5-title': 'Batarya ve Güç Ünitesi Servisi',
    'ts-scope-5-desc': 'Hücre testi, kapasite ölçümü ve yenileme işlemleri',
    'ts-scope-6-title': 'Firmware ve Yazılım Güncellemeleri',
    'ts-scope-6-desc': 'DJI standartlarına uygun en güncel sistem kurulumu',
    'ts-scope-7-title': 'Yerinde Teknik Destek',
    'ts-scope-7-desc': 'Tarla, tesis veya operasyon sahasında hızlı müdahale ve arıza giderimi',
    'ts-scope-8-title': 'Yedek Parça Temini',
    'ts-scope-8-desc': 'Orijinal DJI yedek parçaları ile hızlı tedarik, profesyonel montaj ve garanti kapsamı',
    'ts-why-title': 'Neden AgroAero Tech?',
    'ts-why-1-title': 'DJI Yetkili Bayisi ve Servis Ortağı',
    'ts-why-1-desc': 'Resmi yetkilendirme ile orijinal parça ve standart servis garantisi',
    'ts-why-2-title': '10 Yıllık Deneyim',
    'ts-why-2-desc': 'İleri mühendislik uzmanlığı ve sektörel tecrübe',
    'ts-why-3-title': 'Orijinal Yedek Parça Stoğu',
    'ts-why-3-desc': 'Sürekli stok avantajı ile hızlı teslimat',
    'ts-why-4-title': 'Garanti Kapsamlı Servis',
    'ts-why-4-desc': 'Test uçuşu sonrası belgeli teslimat',
    'ts-why-5-title': 'Şeffaf Servis Süreci',
    'ts-why-5-desc': 'Hızlı ve belgeli işlem takibi',
    'ts-why-6-title': 'Yerinde Teknik Destek',
    'ts-why-6-desc': 'Saha desteği ile kesintisiz operasyon garantisi',
    'ts-stock-title': 'Hazır Stok Avantajı',
    'ts-stock-desc': 'AgroAero Tech, sık kullanılan DJI bileşenlerini (motor, pervane, kol, sensör, gimbal, batarya vb.) sürekli stokta bulundurarak, bakım ve onarım işlemlerini minimum sürede tamamlar.',
    'ts-form-title': 'Servis Talep Formu',
    'ts-form-subtitle': 'Drone\'unuzda bakım veya onarım mı gerekiyor? Formu doldurarak cihazınızın durumunu bize bildirin. Ekibimiz, cihazınızın durumunu inceleyip 24 saat içinde arıza raporu ve fiyat teklifini tarafınıza iletecektir.',
    'ts-drone-model': 'Drone Modeli <span class="text-danger">*</span>',
    'ts-service-type': 'Servis Türü <span class="text-danger">*</span>',
    'ts-problem-desc': 'Arıza/Sorun Açıklaması <span class="text-danger">*</span>',
    'ts-address': 'Adres',
    'ts-other': 'Diğer',
    'ts-stype-maintenance': 'Periyodik Bakım',
    'ts-stype-diagnosis': 'Arıza Tespiti',
    'ts-stype-mechanical': 'Mekanik Onarım',
    'ts-stype-electronic': 'Elektronik Sistem Servisi',
    'ts-stype-calibration': 'Kalibrasyon',
    'ts-stype-battery': 'Batarya Servisi',
    'ts-stype-firmware': 'Firmware Güncelleme',
    'ts-stype-onsite': 'Yerinde Teknik Destek',
    'ts-problem-placeholder': 'Drone\'unuzda yaşadığınız sorunu detaylı olarak açıklayın...',
    'ts-address-placeholder': 'Yerinde servis için adres bilgisi (opsiyonel)'
  },

  en: {
    // Navbar
    'nav-home': 'Home',
    'nav-services': 'Our Services',
    'nav-education': 'Education',
    'nav-corporate': 'Corporate',
    'nav-certificate': 'Certificate Verification',
    'nav-contact': 'Contact Us',
    'nav-about': 'About Us & History',
    'nav-references': 'References',
    'nav-blog': 'Blog',
    'nav-agricultural-solutions': 'Agricultural Drone Solutions',
    'nav-industrial-solutions': 'Industrial Drone Solutions',
    'nav-event-services': 'Drone Event Services',
    'nav-technical-service': 'Drone Technical Service',
    'nav-certification-education': 'Certification Training',
    'nav-agricultural-drone-education': 'Agricultural Drone Training',
    'nav-drone-pilot-education': 'Drone Pilot Training',

    // Hero Section
    'hero-title': 'Shaping the Future in UAV Technologies',
    'hero-subtitle': 'AgroAero Tech MMC sets the standards of the future with innovative unmanned aerial vehicle (UAV) solutions in agriculture, industry and security sectors.',
    'hero-cta-service': 'Get Agricultural Service',
    'hero-cta-education': 'Get Drone Training',

    // Services Section
    'services-title': 'Our Services',
    'services-subtitle': 'Drone technologies that increase agricultural productivity',
    'services-main-title': 'Agricultural Drone Solutions',
    'service-spraying-title': 'Drone Spraying Solutions',
    'service-spraying-desc': 'We offer precise spraying services with smart UAV (drone) technologies for high efficiency, low cost and environmentally friendly applications in agricultural production.',
    'service-spraying-cta': 'Get Drone Spraying Service',
    'service-fertilizing-title': 'Drone Fertilizing and Seeding Solutions',
    'service-fertilizing-desc': 'We offer drone-supported fertilizing solutions for high yield and low cost in modern agriculture.',
    'service-fertilizing-cta': 'Get Fertilizing and Seeding Service',
    'service-analysis-title': 'Plant Health and Productivity Analysis',
    'service-analysis-desc': 'We perform plant health analysis with multispectral camera technology to increase productivity in agriculture and minimize crop losses.',
    'service-analysis-cta': 'Get Plant Health and Productivity Analysis Service',

    // Service Details
    'service-spraying-feature1': 'Precision Spraying Technology',
    'service-spraying-feature1-desc': 'Our DJI Agras series agricultural drones provide precise spraying according to plant needs, ensuring the most accurate application of pesticides',
    'service-spraying-feature2': 'Up to 30% Chemical Savings',
    'service-spraying-feature2-desc': 'Smart spraying systems minimize the use of agricultural chemicals and pesticides',
    'service-spraying-feature3': 'Fast and Effective Application',
    'service-spraying-feature3-desc': 'Quick spraying of large areas, even distribution on rough terrain',
    'service-spraying-feature4': 'Environmentally Friendly and Sustainable Agriculture',
    'service-spraying-feature4-desc': 'Environmental damage is minimized through proper dosage and controlled application',
    'service-spraying-footer': 'AgroAero Tech MMC offers farmers a safer, more efficient and profitable agricultural future with modern drone technology.',

    'service-fertilizing-feature1': 'Precision Distribution Technology',
    'service-fertilizing-feature1-desc': 'GPS and smart spraying systems ensure equal fertilizer application to every area',
    'service-fertilizing-feature2': 'Cost and Resource Savings',
    'service-fertilizing-feature2-desc': 'Up to 20% less fertilizer use compared to traditional methods, labor and time savings',
    'service-fertilizing-feature3': 'Fast and Efficient Application',
    'service-fertilizing-feature3-desc': 'Large areas are fertilized quickly, trouble-free operation even on rough terrain',
    'service-fertilizing-feature4': 'Sustainable Agriculture Solution',
    'service-fertilizing-feature4-desc': 'Soil structure is preserved with proper dosage, correct timing and environmentally friendly approach',
    'service-fertilizing-footer': 'AgroAero Tech MMC offers farmers higher yield, lower cost and a sustainable agricultural future through drone fertilization solutions.',

    'service-analysis-feature1': 'Multispectral Imaging',
    'service-analysis-feature1-desc': 'Plants\' photosynthesis capacity, water stress and nutrient deficiencies are imaged with different light spectrums',
    'service-analysis-feature2': 'Early Disease and Pest Detection',
    'service-analysis-feature2-desc': 'Stress symptoms on leaves are detected before they are visible to the naked eye',
    'service-analysis-feature3': 'Yield Optimization and Prediction',
    'service-analysis-feature3-desc': 'Yield predictions and area-based application plans are created',
    'service-analysis-feature4': 'Sustainable Agriculture Solutions',
    'service-analysis-feature4-desc': 'Environment is protected with less pesticide and fertilizer use',
    'service-analysis-footer': 'AgroAero Tech MMC is a strong companion for farmers for healthier products and high yield with smart agricultural technologies.',

    // Education Section
    'education-title': 'Training Services',
    'education-drone-pilot': 'Drone Pilot Training',
    'education-drone-pilot-desc': 'Become a certified pilot with our approved drone pilot training. Take the first step towards becoming a professional drone operator with theoretical and practical training.',
    'education-certified-program': 'Approved Certificate Program',
    'education-theory-practice': 'Theoretical and Practical Lessons',
    'education-expert-instructors': 'Expert Instructor Staff',

    // References Section
    'references-title': 'Our References',
    'references-subtitle': 'Our trusted business partners.',

    // Tarimsal Cozumler Page
    'page-spraying-title': 'Drone Spraying Service',
    'page-spraying-desc': 'As AgroAero Tech, we provide precise, fast and environmentally friendly spraying service to your fields with our DJI Agras T50 agricultural drones.',
    'page-fertilizing-title': 'Fertilizing and Seeding Service',
    'page-fertilizing-desc': 'Thanks to AgroAero Tech\'s DJI Agras T50 drones, fertilizer and seed spreading operations are now much faster, more precise and efficient.',
    'page-analysis-title': 'Plant Health and Productivity Analysis',
    'page-analysis-desc': 'Thanks to AgroAero Tech\'s multispectral drone technology, we analyze the health of your plants and field condition in the most detailed way.',
    'page-form-title': 'Agricultural Service Application',

    // Service Benefits
    'spraying-benefit1': 'Up to 90% water savings – Much lower water consumption compared to traditional methods.',
    'spraying-benefit2': 'Up to 50% time savings – Hundreds of hectares completed in a short time.',
    'spraying-benefit3': 'Environmentally sensitive application – Right dosage, right spot, minimum environmental impact.',
    'spraying-benefit4': 'Productivity increase – Healthier plants, stronger products.',

    'fertilizing-benefit1': 'Equal Distribution – Thanks to advanced precision sensors, fertilizers and seeds are distributed homogeneously to every point of the field.',
    'fertilizing-benefit2': 'Time Savings – Large areas are completed in much shorter time compared to traditional methods.',
    'fertilizing-benefit3': 'Cost Advantage – Less labor, lower fuel and equipment costs.',
    'fertilizing-benefit4': 'Maximum Efficiency – With the right dosage, your crops develop faster and yield increases.',

    'analysis-benefit1': 'Early Diagnosis – Detect stress, disease or nutrient deficiency in plants before they are visible to the eye.',
    'analysis-benefit2': 'Yield Increase – Accelerate the development of your crops with correct fertilization, irrigation and spraying decisions.',
    'analysis-benefit3': 'Cost Savings – Reduce your production costs by avoiding unnecessary spraying and irrigation.',
    'analysis-benefit4': 'Precise Data – See the condition of your field with numerical data through NDVI, NDRE and other spectral maps.',
    'analysis-benefit5': 'Sustainable Agriculture – Protect the environment with less resource use.',

    // Form Fields
    'form-service-type': 'Service Type *',
    'form-name': 'Full Name *',
    'form-phone': 'Phone *',
    'form-email': 'Email *',
    'form-address': 'Address *',
    'form-field-size': 'Field Size (Hectare) *',
    'form-crop-type': 'Crop Type *',
    'form-message': 'Message',
    'form-submit': 'Submit Application',
    'form-select': 'Select',

    // Crop Types
    'crop-cotton': 'Cotton',
    'crop-corn': 'Corn',
    'crop-rice': 'Rice',
    'crop-wheat': 'Wheat',
    'crop-other': 'Other',

    // Service Details
    'spraying-detail': 'Thanks to DJI Agras T50\'s high-capacity tanks and smart spraying systems, we spray hundreds of hectares of area most efficiently in one day.',
    'spraying-cta-text': 'By collaborating with AgroAero Tech, achieve lower cost, higher yield and more sustainable agriculture.',
    'fertilizing-detail': 'Thanks to drone technology, we offer modern solutions that protect nature and benefit farmers in both fertilization and seed spreading operations.',
    'fertilizing-cta-text': 'Catch the future in agriculture with AgroAero Tech!',
    'analysis-detail': 'With multispectral analysis, we detect which area needs more fertilizer, water or intervention, and offer you scientific data-based agricultural management.',
    'analysis-cta-text': 'With AgroAero Tech, your decisions will now be based on technology and data, not estimation.',

    // Service Types
    'service-type-spraying': 'Spraying Service',
    'service-type-fertilizing': 'Fertilizing and Seeding',
    'service-type-analysis': 'Plant Health and Yield Analysis',
    'service-type-all': 'All Services',

    // Form Elements
    'legal-approvals': 'Legal Approvals *',
    'form-message-placeholder': 'Please specify your special requests about the service...',

    // Legal Texts
    'legal-kvkk-link': 'KVKK Disclosure Text',
    'legal-kvkk-text': ' I have read and understood.',
    'legal-privacy-link': 'Privacy Policy',
    'legal-privacy-text': ' I have read and accept.',
    'legal-gdpr-link': 'GDPR Explicit Consent Text',
    'legal-gdpr-text': ' I approve.',

    // Footer Section
    'footer-company-desc': 'Pioneer in UAV technologies, reliable in education. Experience the aviation technologies of the future today.',
    'footer-quick-menu': 'Quick Menu',
    'footer-contact': 'Contact',
    'footer-social-media': 'Social Media',
    'footer-social-desc': 'Follow us for current news and developments.',
    'footer-copyright': 'All rights reserved.',
    'footer-privacy': 'Privacy Policy',

    // Legal Texts
    'legal-kvkk-link': 'KVKK Information Text',
    'legal-kvkk-text': 'I have read and understood.',
    'legal-privacy-link': 'Privacy Policy',
    'legal-privacy-text': 'I have read and accept.',
    'legal-gdpr-link': 'GDPR Open Consent Text',
    'legal-gdpr-text': 'I approve.',

    // Legal Error Messages
    'legal-kvkk-error': 'You must approve the KVKK text.',
    'legal-privacy-error': 'You must accept the privacy policy.',
    'legal-gdpr-error': 'You must approve the GDPR consent text.',

    // Certification Education Page
    'cert-hero-title': 'Approved Drone Pilot Certification Training',
    'cert-hero-subtitle': 'As AgroAero Tech MMC operating in Azerbaijan, we offer professional drone pilot training in accordance with international standards with <strong>approved drone certificate</strong>.',
    'cert-apply-btn': 'Apply',
    'cert-why-title': 'Why Drone Pilot Training with Us?',
    'cert-feature1-title': 'Theoretical and Practical Training',
    'cert-feature1-desc': 'Participants gain professional knowledge through hands-on training both in the classroom and in the field.',
    'cert-feature2-title': 'International Standards',
    'cert-feature2-desc': 'Our training content is prepared in accordance with ICAO and regional aviation authorities regulations.',
    'cert-feature3-title': 'Wide Coverage',
    'cert-feature3-desc': 'Comprehensive training with agricultural spraying drones (DJI Agras T50/T40 etc.), industrial exploration and imaging drones.',
    'cert-feature4-title': 'Approved Drone Certificate',
    'cert-feature4-desc': 'Participants who successfully complete the training are given <strong>approved Drone Pilot Certificate</strong> and the certificate can be verified.',
    'cert-who-title': 'Who Can Participate?',
    'cert-req1': 'Azerbaijani citizens who have completed 18 years of age',
    'cert-req2': 'At least high school graduate',
    'cert-req3': 'Basic level English',
    'cert-target1': 'Farmers and agricultural engineers working in the agricultural sector',
    'cert-target2': 'Technical experts who want to use drones in the industrial field',
    'cert-target3': 'Young entrepreneurs who want to acquire a new profession',
    'cert-info-title': 'Training Information',
    'cert-duration-title': 'Duration',
    'cert-duration-desc': 'Drone Pilot Training (36 Hours)<br>16 hours theoretical + 8 hours technical + 12 hours practical',
    'cert-capacity-title': 'Class Capacity',
    'cert-capacity-desc': 'Maximum 16 People<br>(minimum participation 10 people)',
    'cert-dates-title': 'Training Dates',
    'cert-dates-desc': 'Every week when we reach sufficient numbers<br>Planned according to minimum number of participants',
    'cert-countries-title': 'Countries',
    'cert-countries-desc': 'Azerbaijan',
    'cert-program-title': 'Training Program',
    'cert-theory-title': 'Theoretical Training (16 Hours)',
    'cert-theory1': '• Aviation Legislation',
    'cert-theory2': '• UAV Systems',
    'cert-theory3': '• Meteorology',
    'cert-theory4': '• Navigation',
    'cert-theory5': '• Airspace',
    'cert-theory6': '• Safety Procedures',
    'cert-theory7': '• Emergency Management',
    'cert-theory8': '• Human Factors',
    'cert-technical-title': 'Technical Training (8 Hours)',
    'cert-tech1': '• UAV Hardware Knowledge',
    'cert-tech2': '• Motor and Propeller Systems',
    'cert-tech3': '• Battery Technologies',
    'cert-tech4': '• Sensor Systems',
    'cert-tech5': '• Maintenance and Repair',
    'cert-tech6': '• Fault Detection',
    'cert-practical-title': 'Practical Training (12 Hours)',
    'cert-prac1': '• Pre-flight Checks',
    'cert-prac2': '• Basic Flight Maneuvers',
    'cert-prac3': '• Autonomous Flight',
    'cert-prac4': '• Emergency Procedures',
    'cert-prac5': '• Exam Preparation',
    'cert-prac6': '• Certificate Exam',
    'cert-form-title': 'Certification Application Form',
    'cert-form-subtitle': 'You can contact us by filling out the form below. We will get back to you as soon as possible.',
    'cert-fin-label': 'FIN Code *',
    'cert-fin-placeholder': 'Example: 1AB2C3D',
    'cert-phone-placeholder': '+994 xx xxx xx xx',
    'cert-photo-label': 'ID Photo *',
    'cert-judicial-label': 'Criminal Record Certificate *',
    'cert-population-label': 'Population Registration Sample *',
    'cert-file-format': 'JPG, PNG, PDF format, maximum 5MB',
    'cert-submit-btn': 'Submit Application',

    // Agricultural Drone Education Page
    'agri-hero-title': 'Agricultural Drone Training',
    'agri-hero-subtitle': 'Learn to use drones in agricultural applications with hobby-oriented and personal development-focused drone training.',
    'agri-apply-btn': 'Apply',
    'agri-hobby-title': 'Hobby-Oriented Drone Training',
    'agri-hobby-desc': '<strong>Hobby-oriented training program</strong> for those who want to learn drone use in agricultural applications. As AgroAero Tech MMC operating in Azerbaijan, we offer personal development and hobby-oriented drone training. At the end of this training, only a participation certificate is given and does not contain any approval or formality.',
    'agri-why-title': 'Why Hobby-Oriented Drone Training with Us?',
    'agri-feature1-title': 'Theoretical and Practical Training',
    'agri-feature1-desc': 'Participants gain professional knowledge through hands-on training both in the classroom and in the field.',
    'agri-feature2-title': 'International Standards',
    'agri-feature2-desc': 'Our training content is prepared in accordance with ICAO and regional aviation authorities regulations.',
    'agri-feature3-title': 'Wide Coverage',
    'agri-feature3-desc': 'Comprehensive training with agricultural spraying drones (DJI Agras T50/T40 etc.), industrial exploration and imaging drones.',
    'agri-feature4-title': 'Participation Certificate',
    'agri-feature4-desc': 'Participants who successfully complete the training are given only a <strong>participation certificate</strong>. This certificate is not an approved certificate and does not carry any formality.',
    'agri-who-title': 'Who Can Participate?',
    'agri-requirements-title': 'General Requirements',
    'agri-req1': 'Azerbaijani citizens who have completed 18 years of age',
    'agri-req2': 'At least high school graduate',
    'agri-req3': 'Basic level English (ICAO Level 2)',
    'agri-target-title': 'Target Audience',
    'agri-target1': 'Farmers and agricultural engineers working in the agricultural sector',
    'agri-target2': 'Technical experts who want to use drones in the industrial field',
    'agri-target3': 'Young entrepreneurs who want to acquire a new profession',
    'agri-target4': 'Anyone who wants to learn hobby drone use',
    'agri-program-title': '📌 Training Program',
    'agri-theory-title': 'Theoretical Training (16 Hours)',
    'agri-theory1': '• Aviation Legislation',
    'agri-theory2': '• UAV Systems',
    'agri-theory3': '• Meteorology',
    'agri-theory4': '• Navigation',
    'agri-theory5': '• Airspace',
    'agri-theory6': '• Safety Procedures',
    'agri-theory7': '• Emergency Management',
    'agri-theory8': '• Human Factors',
    'agri-technical-title': 'Technical Training (8 Hours)',
    'agri-tech1': '• UAV Hardware Knowledge',
    'agri-tech2': '• Motor and Propeller Systems',
    'agri-tech3': '• Battery Technologies',
    'agri-tech4': '• Sensor Systems',
    'agri-tech5': '• Maintenance and Repair',
    'agri-tech6': '• Fault Detection',
    'agri-practical-title': 'Practical Training (12 Hours)',
    'agri-prac1': '• Pre-flight Checks',
    'agri-prac2': '• Basic Flight Maneuvers',
    'agri-prac3': '• Autonomous Flight',
    'agri-prac4': '• Emergency Procedures',
    'agri-prac5': '• Exam Preparation',
    'agri-prac6': '• Assessment Test',
    'agri-form-title': 'Agricultural Drone Training Application Form',
    'agri-form-subtitle': 'You can contact us by filling out the form below. We will get back to you as soon as possible.',
    'agri-phone-placeholder': '+994 xx xxx xx xx',
    'agri-message-placeholder': 'Your questions or special requests about the training...',
    'agri-submit-btn': 'Submit Application',

    // Drone Pilot Education Page
    'pilot-select-btn': 'Select',

    // Corporate Page
    'corporate-page-title': 'About Us & Our History',
    'corporate-page-subtitle': 'Pioneer of agricultural digital transformation in Azerbaijan',
    'corporate-about-title': 'About Us',
    'corporate-about-desc1': 'AgroAero Tech MMC was established in 2024 in Azerbaijan to bring together agricultural spraying services with modern drone technologies. Our company aims to be the pioneer of a new era in agriculture by providing farmers with high efficiency, low cost and environmentally friendly solutions.',
    'corporate-about-desc2': 'Our DJI Agras T50 drones perform spraying in cotton, corn, rice and other strategic crops in the most precise and efficient way. With advanced spraying systems, hundreds of hectares of area can be sprayed in a short time in one go, thus providing both time and cost advantages.',
    'corporate-feature1': '90% Water Savings',
    'corporate-feature2': 'DJI Agras T50 Fleet',
    'corporate-feature3': '24/7 Professional Support',
    'corporate-feature4': 'NDVI Multispectral Analysis',
    'corporate-mission-title': 'Our Mission',
    'corporate-mission-desc': 'Our mission is to increase the production power of farmers by providing fast, safe and efficient spraying services with advanced drone technologies.',
    'corporate-mission1': 'Developing innovative methods in agricultural spraying',
    'corporate-mission2': 'Providing time and cost advantages to farmers',
    'corporate-mission3': 'Supporting environmentally sensitive, sustainable agricultural practices',
    'corporate-mission4': 'Bringing qualified experts to the sector with drone piloting training',
    'corporate-vision-title': 'Our Vision',
    'corporate-vision-desc': 'As AgroAero Tech, our vision is to be the leader of digital transformation in agriculture in Azerbaijan and the region, to maximize efficiency in agricultural production with modern drone technologies. Our main goal is to provide environmentally friendly solutions using less water and pesticides, to reduce the costs of our farmers while supporting sustainable agriculture.',
    'corporate-history-title': 'Our History',
    'corporate-history-subtitle': 'Our journey with the understanding of "More efficient agriculture, stronger future"',
    'corporate-timeline1-title': '2024 - Foundation',
    'corporate-timeline1-desc': 'AgroAero Tech MMC was established in 2024 for the purpose of implementing innovative technologies in agriculture. It started its journey with the vision of increasing efficiency in agricultural production in Azerbaijan, saving water and pesticide use, and bringing modern agricultural methods together with farmers.',
    'corporate-timeline2-title': '2024 - DJI Agras T50 Fleet',
    'corporate-timeline2-desc': 'Shortly after its establishment, it started spraying operations on cotton, corn, rice and other strategic plants by putting the DJI Agras T50 fleet, one of the world\'s most advanced agricultural drones, into operation. Thanks to modern spraying systems, up to 90% water savings are achieved while minimizing environmental damage.',
    'corporate-timeline3-title': '2024 - Field Operations',
    'corporate-timeline3-desc': 'During 2024, AgroAero Tech provided agricultural spraying services in many districts across the country, developing trust-based collaborations with farmers.',
    'corporate-timeline4-title': '2025 - Technology-Driven Training',
    'corporate-timeline4-desc': 'We crown our field experience with education! As of 2025, we have started our professional training activities to build the future of technological agriculture and unmanned systems in Azerbaijan.',
    'corporate-timeline5-title': '2025 - Strategic Partnerships',
    'corporate-timeline5-desc': 'In the same year, our service network was expanded by making strategic agreements with large agricultural production companies such as MKT Production Commerce MMC. Thus, a strong cooperation model was created with both the private sector and farmer associations.',
    'corporate-services-title': 'Our Service Areas',
    'corporate-services-subtitle': 'Today, AgroAero Tech operates as one of Azerbaijan\'s most reliable agricultural technology companies',
    'corporate-service1-title': 'Agricultural Drone Solutions',
    'corporate-service1-desc': 'We are with our farmers with precision spraying, plant health analysis and yield optimization',
    'corporate-service2-title': 'Industrial Drone Solutions',
    'corporate-service2-desc': 'Professional drone services in energy, security, mapping and inspection fields',
    'corporate-service3-title': 'Drone Pilot Training',
    'corporate-service3-desc': 'We train professional drone pilots with certified instructors',
    'corporate-team-title': 'Our Instructors',
    'corporate-team-subtitle': 'Our experienced instructor staff who are experts in their field',
    'corporate-instructor1-title': 'UAV 2 PILOT',
    'corporate-instructor1-desc': '50,000 Hectares Drone Spraying Experience',
    'corporate-instructor2-title': 'UAV 2 INSTRUCTOR',
    'corporate-instructor2-desc': 'Instructor - 10 Years Aviation Experience',

    // References Page
    'references-page-title': 'Our References',
    'references-page-subtitle': 'Our trusted business partners.',
    'references-cta-title': 'Join Our References',
    'references-cta-desc': 'Contact us to take your business to the next level with UAV technologies and discover our special solutions.',
    'references-cta-quote': 'Get Quote',
    'references-cta-call': 'Call Now',

    // Blog Page
    'blog-loading': 'Loading...',
    'blog-loading-text': 'Loading blog posts...',
    'blog-js-warning': 'Please enable JavaScript to view blog posts.',
    'blog-no-posts': 'No blog posts yet.',
    'blog-error': 'An error occurred while loading blog posts.',
    'blog-read-more': 'Read More',

    // Common
    'learn-more': 'Get Detailed Information',
    'get-service': 'Get Service',
    'contact-us': 'Contact Us',

    // Contact Page
    'contact-page-title': 'Contact Us',
    'contact-page-subtitle': 'Contact us to get information about our UAV training and services',
    'contact-form-title': 'Contact Form',
    'contact-form-subtitle': 'You can contact us by filling out the form below. We will get back to you as soon as possible.',
    'form-address-optional': 'Address (Optional)',
    'form-phone-placeholder': '+994 xx xxx xx xx',
    'form-message-placeholder': 'Enter your message...',
    'location-section-title': 'Our Location',
    'location-view-on-map': 'View on Map',
    'location-get-directions': 'Get Directions',

    // Industrial Solutions Page
    'ind-inspection-title': 'Industrial Inspection and Analysis',
    'ind-inspection-desc': 'Comprehensive inspection and analysis services for your industrial facilities with high-tech drone systems.',
    'ind-inspection-cta': 'Get Inspection and Analysis Service',
    'ind-energy-title': 'Energy Infrastructure Control',
    'ind-energy-desc': 'Comprehensive drone inspection and control solutions for the energy sector.',
    'ind-energy-cta': 'Get Energy Control Service',
    'ind-security-title': 'Security Solutions',
    'ind-security-desc': 'Protect your facilities 24/7 with AI-powered drone security systems.',
    'ind-security-cta': 'Get Security Solution',
    'ind-digital-title': 'Digital Solutions',
    'ind-digital-desc': '3D modeling, digital twin technology and smart real estate solutions.',
    'ind-digital-cta': 'Get Digital Solution',
    'ind-form-title': 'Industrial Service Application',
    'ind-service-inspection': 'Inspection and Analysis',
    'ind-service-energy': 'Energy Infrastructure Control',
    'ind-service-security': 'Security Solutions',
    'ind-service-digital': 'Digital Solutions',
    'form-company': 'Company Name',
    'form-project-area': 'Project Area (m²)',
    'form-sector': 'Sector *',
    'sector-energy': 'Energy',
    'sector-construction': 'Construction',
    'sector-mining': 'Mining',
    'sector-manufacturing': 'Manufacturing',
    'sector-realestate': 'Real Estate',
    'sector-events': 'Events/Organization',
    'sector-other': 'Other',
    'ind-mapping-title': 'Mapping and Land Surveying:',
    'ind-mapping-desc': 'Preparation of 3D models, slope maps and measurement reports of terrains with high-resolution cameras and LIDAR systems.',
    'ind-air-title': 'Air Analysis (Sniffer):',
    'ind-air-desc': 'Detection of gas leaks and environmental quality measurements in industrial facilities with sensors integrated into drones.',
    'ind-inspection-footer': 'We offer centimeter-precision measurements with LIDAR technology and detailed analyses with multispectral cameras.',
    'ind-powerline-title': 'Power Distribution Line Control:',
    'ind-powerline-desc': 'Inspection of energy lines with high-resolution images and thermal data.',
    'ind-wind-title': 'Wind Turbine Inspection:',
    'ind-wind-desc': 'Detection of structural problems such as cracks and corrosion on turbine blades with thermal cameras.',
    'ind-solar-title': 'Solar Panel Inspection:',
    'ind-solar-desc': 'Measurement of temperature differences in panels and detection of faulty cells with thermal cameras.',
    'ind-energy-footer': 'Maximize the safety and efficiency of your energy infrastructure with drone technology.',
    'ind-autonomous-title': 'Autonomous Security Systems:',
    'ind-autonomous-desc': 'AI-powered drone systems that patrol 24/7 in areas such as border regions and factories, detecting threats.',
    'ind-fire-title': 'Fire Safety:',
    'ind-fire-desc': 'Early detection of fire-risk areas with thermal cameras and rapid response support during fires.',
    'ind-security-footer': 'We offer proactive security solutions with advanced sensors and AI algorithms.',
    'ind-3d-title': '3D Modeling:',
    'ind-3d-desc': 'High-precision creation of digital copies of buildings and facilities.',
    'ind-twin-title': 'Digital Twin:',
    'ind-twin-desc': 'Creation of virtual copies of physical assets integrated with IoT sensors and managed with live data.',
    'ind-tour-title': 'Virtual Tour:',
    'ind-tour-desc': 'Digital tours that allow 360-degree interactive exploration of spaces from both air and ground.',
    'ind-realestate-title': 'Smart Real Estate Sales Platform:',
    'ind-realestate-desc': 'Real estate sales and presentation platform supported by 3D models and AI bots.',

    // Drone Event Services Page
    'event-swarm-title': 'Drone Event Services',
    'event-swarm-desc': 'Turn the sky into your canvas! Synchronized light shows and giant screen ads with hundreds of drones.',
    'event-swarm-cta': 'Get Drone Event Service Quote',
    'event-screen-title': 'Screen Drone Advertising',
    'event-screen-desc': 'A giant screen in the sky! Video and logo projection with drones.',
    'event-screen-cta': 'Get Drone Advertising Quote',
    'event-form-title': 'Event Service Application',
    'event-service-swarm': 'Light Swarm Drone Show',
    'event-service-screen': 'Screen Drone Advertising',
    'event-service-both': 'Both Services',
    'form-event-date': 'Event Date *',
    'form-event-type': 'Event Type *',
    'form-event-location': 'Event Location *',
    'form-event-details': 'Event Details and Special Requests',
    'form-event-location-placeholder': 'City, venue name',
    'form-event-details-placeholder': 'Detailed information about your event, logo/text/animation you want to display, etc.',
    'form-project-details-placeholder': 'Please provide detailed information about your project...',
    'event-type-opening': 'Opening Ceremony',
    'event-type-festival': 'Festival / Concert',
    'event-type-corporate': 'Corporate Event',
    'event-type-wedding': 'Wedding / Special Day',
    'event-type-launch': 'Product Launch',
    'event-type-sports': 'Sports Event',
    'event-type-other': 'Other',
    'event-swarm-sync': 'Synchronized Movement:',
    'event-swarm-sync-desc': 'Hundreds of drones coordinated with special software move in perfect harmony in the sky.',
    'event-swarm-design': 'Custom Designs:',
    'event-swarm-design-desc': 'Logos, shapes, texts and animations come to life in the sky.',
    'event-swarm-events': 'For Every Event:',
    'event-swarm-events-desc': 'Openings, festivals, celebrations, corporate events and special days.',
    'event-swarm-safe': 'Safe and Eco-Friendly:',
    'event-swarm-safe-desc': 'Alternative to fireworks, silent and environmentally friendly show.',
    'event-swarm-footer': 'Create unforgettable moments, take your brand to the sky!',
    'event-screen-giant': 'Giant Screen Creation:',
    'event-screen-giant-desc': 'Drones create a giant LED screen in the sky to project video and visuals.',
    'event-screen-impact': 'Maximum Impact:',
    'event-screen-impact-desc': 'Beyond traditional advertising, eye-catching promotion with high viral potential.',
    'event-screen-video': 'Video Broadcast:',
    'event-screen-video-desc': 'Logos, promotional videos, messages and animations are broadcast in the sky.',
    'event-screen-reach': 'Wide Audience Reach:',
    'event-screen-reach-desc': 'Reach thousands of people at once at outdoor events.',
    'event-screen-footer': 'Start a new era in advertising!',

    // Page Titles
    'industrial-page-title': 'Industrial Drone Solutions | Inspection, Mapping, Security - AgroAeroTech',
    'event-page-title': 'Drone Event Services | Swarm Drone Show, Drone Advertising - AgroAeroTech',

    // Legal Pages
    'legal-kvkk-page-title': 'KVKK Disclosure Text | AgroAeroTech',
    'legal-kvkk-title': 'KVKK Disclosure Text',
    'legal-kvkk-subtitle': 'Information within the scope of Law No. 6698 on Protection of Personal Data.',
    'legal-kvkk-content': 'I consent to the processing of my personal data within the scope of Law No. 6698 on Protection of Personal Data for the purposes of education application, registration, certification and information processes, and sharing with relevant official institutions when necessary.',
    'legal-privacy-page-title': 'Privacy Policy | AgroAeroTech',
    'legal-privacy-title': 'Privacy Policy',
    'legal-privacy-subtitle': 'We are committed to protecting the privacy and security of your personal data.',
    'legal-privacy-intro': 'As AgroAero Tech MMC, we are committed to protecting the privacy and security of your personal data.',
    'legal-privacy-section1-title': '1. Personal Information Collected',
    'legal-privacy-section1-content': 'During the application process, we may request your name, surname, phone, email, address and education information.',
    'legal-privacy-section2-title': '2. Purposes of Data Use',
    'legal-privacy-section2-content': 'Used for education records, certificate preparation and information purposes.',
    'legal-privacy-section3-title': '3. Data Protection',
    'legal-privacy-section3-content': 'Data is stored encrypted on secure servers.',
    'legal-privacy-section4-title': '4. Contact',
    'legal-gdpr-page-title': 'GDPR Explicit Consent Text | AgroAeroTech',
    'legal-gdpr-title': 'GDPR Explicit Consent Text',
    'legal-gdpr-subtitle': 'Information pursuant to the European Union General Data Protection Regulation (GDPR).',
    'legal-gdpr-content': 'I give my explicit consent for my personal data to be collected, stored and shared with official institutions when necessary, pursuant to the European Union General Data Protection Regulation (GDPR), solely for the purposes of education registration, certification and information.',
    'legal-consent-title': 'Explicit Consent Statement',
    'legal-approve-btn': 'I have read and approve',
    'legal-back-btn': 'Go Back',

    // Technical Service Page
    'ts-hero-title': 'DJI Drone Technical Service, Maintenance and On-Site Support Center',
    'ts-hero-desc': 'As DJI\'s authorized dealer and technical service partner, AgroAero Tech MMC provides professional maintenance, repair and on-site technical support services for all DJI drone models. With over 10 years of industry experience, our expert engineering team and extensive spare parts inventory, we ensure your drone fleet operates seamlessly and at peak performance.',
    'ts-hero-cta': 'Request Service',
    'ts-models-title': 'DJI Models We Service',
    'ts-model-agras': 'DJI Agras Series',
    'ts-model-mavic': 'DJI Mavic Series',
    'ts-model-matrice': 'DJI Matrice Series',
    'ts-scope-title': 'Our Service Scope',
    'ts-scope-1-title': 'Periodic Maintenance & Fault Detection',
    'ts-scope-1-desc': 'Detailed analysis of flight systems, sensors, GPS and control units',
    'ts-scope-2-title': 'Mechanical Repair',
    'ts-scope-2-desc': 'Replacement of body, arms, motors, propellers, landing gear and mounting components',
    'ts-scope-3-title': 'Electronic System Service',
    'ts-scope-3-desc': 'Repair of ESC, IMU, gimbal, camera, antenna and sensor modules',
    'ts-scope-4-title': 'Calibration & Test Flights',
    'ts-scope-4-desc': 'Post-repair flight balancing, software optimization and performance check',
    'ts-scope-5-title': 'Battery & Power Unit Service',
    'ts-scope-5-desc': 'Cell testing, capacity measurement and renewal procedures',
    'ts-scope-6-title': 'Firmware & Software Updates',
    'ts-scope-6-desc': 'Latest system installation compliant with DJI standards',
    'ts-scope-7-title': 'On-Site Technical Support',
    'ts-scope-7-desc': 'Rapid intervention and troubleshooting at field, facility or operation sites',
    'ts-scope-8-title': 'Spare Parts Supply',
    'ts-scope-8-desc': 'Fast procurement with original DJI spare parts, professional installation and warranty coverage',
    'ts-why-title': 'Why AgroAero Tech?',
    'ts-why-1-title': 'DJI Authorized Dealer & Service Partner',
    'ts-why-1-desc': 'Original parts and standard service guarantee with official authorization',
    'ts-why-2-title': '10 Years of Experience',
    'ts-why-2-desc': 'Advanced engineering expertise and industry experience',
    'ts-why-3-title': 'Original Spare Parts Stock',
    'ts-why-3-desc': 'Fast delivery with continuous stock advantage',
    'ts-why-4-title': 'Warranty-Covered Service',
    'ts-why-4-desc': 'Documented delivery after test flights',
    'ts-why-5-title': 'Transparent Service Process',
    'ts-why-5-desc': 'Fast and documented process tracking',
    'ts-why-6-title': 'On-Site Technical Support',
    'ts-why-6-desc': 'Uninterrupted operation guarantee with field support',
    'ts-stock-title': 'Ready Stock Advantage',
    'ts-stock-desc': 'AgroAero Tech keeps frequently used DJI components (motors, propellers, arms, sensors, gimbals, batteries, etc.) in continuous stock, completing maintenance and repair operations in minimum time.',
    'ts-form-title': 'Service Request Form',
    'ts-form-subtitle': 'Does your drone need maintenance or repair? Fill out the form to inform us about your device\'s condition. Our team will review your device and send you a fault report and price quote within 24 hours.',
    'ts-drone-model': 'Drone Model <span class="text-danger">*</span>',
    'ts-service-type': 'Service Type <span class="text-danger">*</span>',
    'ts-problem-desc': 'Fault/Problem Description <span class="text-danger">*</span>',
    'ts-address': 'Address',
    'ts-other': 'Other',
    'ts-stype-maintenance': 'Periodic Maintenance',
    'ts-stype-diagnosis': 'Fault Detection',
    'ts-stype-mechanical': 'Mechanical Repair',
    'ts-stype-electronic': 'Electronic System Service',
    'ts-stype-calibration': 'Calibration',
    'ts-stype-battery': 'Battery Service',
    'ts-stype-firmware': 'Firmware Update',
    'ts-stype-onsite': 'On-Site Technical Support',
    'ts-problem-placeholder': 'Describe the problem with your drone in detail...',
    'ts-address-placeholder': 'Address for on-site service (optional)'
  },

  ru: {
    // Navbar
    'nav-home': 'Главная',
    'nav-services': 'Наши услуги',
    'nav-education': 'Обучение',
    'nav-corporate': 'Корпоративная',
    'nav-certificate': 'Проверка сертификата',
    'nav-contact': 'Связаться с нами',
    'nav-about': 'О нас и наша история',
    'nav-references': 'Наши рекомендации',
    'nav-blog': 'Блог',
    'nav-agricultural-solutions': 'Сельскохозяйственные решения с дронами',
    'nav-industrial-solutions': 'Промышленные решения с дронами',
    'nav-event-services': 'Услуги мероприятий с дронами',
    'nav-technical-service': 'Техническое обслуживание дронов',
    'nav-certification-education': 'Сертификационное обучение',
    'nav-agricultural-drone-education': 'Обучение сельскохозяйственным дронам',
    'nav-drone-pilot-education': 'Обучение пилотов дронов',

    // Hero Section
    'hero-title': 'Формируем будущее в технологиях БПЛА',
    'hero-subtitle': 'AgroAero Tech MMC определяет стандарты будущего с инновационными решениями беспилотных летательных аппаратов (БПЛА) в сельском хозяйстве, промышленности и секторах безопасности.',
    'hero-cta-service': 'Получить сельскохозяйственную услугу',
    'hero-cta-education': 'Получить обучение дронам',

    // Services Section
    'services-title': 'Наши услуги',
    'services-subtitle': 'Технологии дронов, повышающие продуктивность сельского хозяйства',
    'services-main-title': 'Сельскохозяйственные решения с дронами',
    'service-spraying-title': 'Решения для опрыскивания дронами',
    'service-spraying-desc': 'Мы предлагаем точные услуги опрыскивания с помощью интеллектуальных технологий БПЛА (дронов) для высокой эффективности, низких затрат и экологически чистых применений в сельскохозяйственном производстве.',
    'service-spraying-cta': 'Получить услугу опрыскивания дронами',
    'service-fertilizing-title': 'Решения для удобрения и посева дронами',
    'service-fertilizing-desc': 'Мы предлагаем решения для удобрения с поддержкой дронов для высокой урожайности и низких затрат в современном сельском хозяйстве.',
    'service-fertilizing-cta': 'Получить услугу удобрения и посева',
    'service-analysis-title': 'Анализ здоровья растений и продуктивности',
    'service-analysis-desc': 'Мы проводим анализ здоровья растений с помощью технологии мультиспектральной камеры для повышения продуктивности в сельском хозяйстве и минимизации потерь урожая.',
    'service-analysis-cta': 'Получить услугу анализа здоровья растений и продуктивности',

    // Service Details
    'service-spraying-feature1': 'Технология точного опрыскивания',
    'service-spraying-feature1-desc': 'Наши сельскохозяйственные дроны серии DJI Agras обеспечивают точное опрыскивание в соответствии с потребностями растений, гарантируя наиболее точное применение пестицидов',
    'service-spraying-feature2': 'Экономия химикатов до 30%',
    'service-spraying-feature2-desc': 'Интеллектуальные системы опрыскивания минимизируют использование сельскохозяйственных химикатов и пестицидов',
    'service-spraying-feature3': 'Быстрое и эффективное применение',
    'service-spraying-feature3-desc': 'Быстрое опрыскивание больших площадей, равномерное распределение даже на пересеченной местности',
    'service-spraying-feature4': 'Экологически чистое и устойчивое сельское хозяйство',
    'service-spraying-feature4-desc': 'Ущерб окружающей среде минимизируется за счет правильной дозировки и контролируемого применения',
    'service-spraying-footer': 'AgroAero Tech MMC предлагает фермерам более безопасное, эффективное и прибыльное сельскохозяйственное будущее с современными технологиями дронов.',

    'service-fertilizing-feature1': 'Технология точного распределения',
    'service-fertilizing-feature1-desc': 'GPS и интеллектуальные системы опрыскивания обеспечивают равномерное внесение удобрений на каждую область',
    'service-fertilizing-feature2': 'Экономия затрат и ресурсов',
    'service-fertilizing-feature2-desc': 'До 20% меньше использования удобрений по сравнению с традиционными методами, экономия труда и времени',
    'service-fertilizing-feature3': 'Быстрое и эффективное применение',
    'service-fertilizing-feature3-desc': 'Большие площади быстро удобряются, беспроблемная работа даже на пересеченной местности',
    'service-fertilizing-feature4': 'Решение для устойчивого сельского хозяйства',
    'service-fertilizing-feature4-desc': 'Структура почвы сохраняется благодаря правильной дозировке, правильному времени и экологически чистому подходу',
    'service-fertilizing-footer': 'AgroAero Tech MMC предлагает фермерам более высокую урожайность, более низкие затраты и устойчивое сельскохозяйственное будущее через решения для удобрения дронами.',

    'service-analysis-feature1': 'Мультиспектральная съемка',
    'service-analysis-feature1-desc': 'Фотосинтетическая способность растений, водный стресс и дефицит питательных веществ снимаются с помощью различных световых спектров',
    'service-analysis-feature2': 'Раннее обнаружение болезней и вредителей',
    'service-analysis-feature2-desc': 'Симптомы стресса на листьях обнаруживаются до того, как они становятся видимыми невооруженным глазом',
    'service-analysis-feature3': 'Оптимизация и прогнозирование урожайности',
    'service-analysis-feature3-desc': 'Создаются прогнозы урожайности и планы применения по областям',
    'service-analysis-feature4': 'Решения для устойчивого сельского хозяйства',
    'service-analysis-feature4-desc': 'Окружающая среда защищается за счет меньшего использования пестицидов и удобрений',
    'service-analysis-footer': 'AgroAero Tech MMC является сильным спутником для фермеров для более здоровых продуктов и высокой урожайности с помощью интеллектуальных сельскохозяйственных технологий.',

    // Education Section
    'education-title': 'Услуги обучения',
    'education-drone-pilot': 'Обучение пилотов дронов',
    'education-drone-pilot-desc': 'Станьте сертифицированным пилотом с нашим утвержденным обучением пилотов дронов. Сделайте первый шаг к тому, чтобы стать профессиональным оператором дронов с теоретическим и практическим обучением.',
    'education-certified-program': 'Утвержденная программа сертификации',
    'education-theory-practice': 'Теоретические и практические занятия',
    'education-expert-instructors': 'Штат экспертов-инструкторов',

    // References Section
    'references-title': 'Наши рекомендации',
    'references-subtitle': 'Наши надежные деловые партнеры.',

    // References Page
    'references-page-title': 'Наши референсы',
    'references-page-subtitle': 'Наши надёжные деловые партнёры.',
    'references-cta-title': 'Присоединяйтесь к нашим референсам',
    'references-cta-desc': 'Свяжитесь с нами, чтобы вывести свой бизнес на новый уровень с помощью технологий БПЛА, и откройте для себя наши специальные решения.',
    'references-cta-quote': 'Получить предложение',
    'references-cta-call': 'Позвонить сейчас',

    // Tarimsal Cozumler Page
    'page-spraying-title': 'Услуга опрыскивания дронами',
    'page-spraying-desc': 'Как AgroAero Tech, мы предоставляем точные, быстрые и экологически чистые услуги опрыскивания ваших полей с помощью наших сельскохозяйственных дронов DJI Agras T50.',
    'page-fertilizing-title': 'Услуга удобрения и посева',
    'page-fertilizing-desc': 'Благодаря дронам DJI Agras T50 компании AgroAero Tech операции по распространению удобрений и семян теперь стали намного быстрее, точнее и эффективнее.',
    'page-analysis-title': 'Анализ здоровья растений и продуктивности',
    'page-analysis-desc': 'Благодаря мультиспектральной технологии дронов AgroAero Tech мы анализируем здоровье ваших растений и состояние поля самым подробным образом.',
    'page-form-title': 'Заявка на сельскохозяйственную услугу',

    // Service Benefits (kısaltılmış)
    'spraying-benefit1': 'До 90% экономии воды – Гораздо меньшее потребление воды по сравнению с традиционными методами.',
    'spraying-benefit2': 'До 50% экономии времени – Сотни гектаров завершаются за короткое время.',
    'spraying-benefit3': 'Экологически чувствительное применение – Правильная дозировка, правильное место, минимальное воздействие на окружающую среду.',
    'spraying-benefit4': 'Повышение продуктивности – Более здоровые растения, более сильные продукты.',

    // Form Fields
    'form-service-type': 'Тип услуги *',
    'form-name': 'Полное имя *',
    'form-phone': 'Телефон *',
    'form-email': 'Электронная почта *',
    'form-address': 'Адрес *',
    'form-field-size': 'Размер поля (гектар) *',
    'form-crop-type': 'Тип культуры *',
    'form-message': 'Сообщение',
    'form-submit': 'Отправить заявку',
    'form-select': 'Выберите',

    // Service Details (kısaltılmış)
    'spraying-detail': 'Благодаря высокопроизводительным резервуарам и интеллектуальным системам опрыскивания DJI Agras T50, мы наиболее эффективно опрыскиваем сотни гектаров площади за один день.',
    'spraying-cta-text': 'Сотрудничая с AgroAero Tech, достигните более низких затрат, более высокой урожайности и более устойчивого сельского хозяйства.',

    // Service Types
    'service-type-spraying': 'Услуга опрыскивания',
    'service-type-fertilizing': 'Удобрение и посев',
    'service-type-analysis': 'Анализ здоровья растений и урожайности',
    'service-type-all': 'Все услуги',

    // Form Elements
    'legal-approvals': 'Правовые одобрения *',
    'form-message-placeholder': 'Пожалуйста, укажите ваши особые требования к услуге...',

    // Crop Types
    'crop-cotton': 'Хлопок',
    'crop-corn': 'Кукуруза',
    'crop-rice': 'Рис',
    'crop-wheat': 'Пшеница',
    'crop-other': 'Другое',

    // Footer Section
    'footer-company-desc': 'Пионер в технологиях БПЛА, надежный в образовании. Испытайте авиационные технологии будущего уже сегодня.',
    'footer-quick-menu': 'Быстрое меню',
    'footer-contact': 'Контакты',
    'footer-social-media': 'Социальные сети',
    'footer-social-desc': 'Следите за нами для получения актуальных новостей и разработок.',
    'footer-copyright': 'Все права защищены.',
    'footer-privacy': 'Политика конфиденциальности',

    // Service Benefits (eksik olanlar eklendi)
    'fertilizing-benefit1': 'Равномерное распределение – Благодаря передовым датчикам точности удобрения и семена распределяются однородно в каждую точку поля.',
    'fertilizing-benefit2': 'Экономия времени – Большие площади завершаются за гораздо более короткое время по сравнению с традиционными методами.',
    'fertilizing-benefit3': 'Преимущество в стоимости – Меньше труда, более низкие затраты на топливо и оборудование.',
    'fertilizing-benefit4': 'Максимальная эффективность – При правильной дозировке ваши культуры развиваются быстрее и урожайность увеличивается.',

    'fertilizing-footer-text': 'Благодаря технологии дронов мы предлагаем современные решения, которые защищают природу и приносят пользу фермерам как в операциях удобрения, так и в распространении семян.',
    'fertilizing-cta-footer': 'Поймайте будущее в сельском хозяйстве с AgroAero Tech!',

    'analysis-benefit1': 'Ранняя диагностика – Обнаружение стресса, болезней или дефицита питательных веществ в растениях до того, как они станут видимыми глазу.',
    'analysis-benefit2': 'Увеличение урожайности – Ускорьте развитие ваших культур с правильными решениями по удобрению, орошению и опрыскиванию.',
    'analysis-benefit3': 'Экономия затрат – Снизьте производственные затраты, избегая ненужного опрыскивания и орошения.',
    'analysis-benefit4': 'Точные данные – Видите состояние вашего поля с числовыми данными через NDVI, NDRE и другие спектральные карты.',
    'analysis-benefit5': 'Устойчивое сельское хозяйство – Защитите окружающую среду с меньшим использованием ресурсов.',

    // Service Details (eksik olanlar eklendi)
    'fertilizing-detail': 'Благодаря технологии дронов мы предлагаем современные решения, которые защищают природу и приносят пользу фермерам как в операциях удобрения, так и в распространении семян.',
    'fertilizing-cta-text': 'Поймайте будущее в сельском хозяйстве с AgroAero Tech!',
    'analysis-detail': 'С помощью мультиспектрального анализа мы определяем, какая область нуждается в большем количестве удобрений, воды или вмешательства, и предлагаем вам научно обоснованное управление сельским хозяйством.',
    'analysis-cta-text': 'С AgroAero Tech ваши решения теперь будут основаны на технологиях и данных, а не на оценках.',

    // Eksik çeviriler eklendi
    'fertilizing-footer-text': 'Благодаря технологии дронов мы предлагаем современные решения, которые защищают природу и приносят пользу фермерам как в операциях удобрения, так и в распространении семян.',
    'fertilizing-cta-footer': 'Поймайте будущее в сельском хозяйстве с AgroAero Tech!',
    'analysis-footer-text': 'С помощью мультиспектрального анализа мы определяем, какая область нуждается в большем количестве удобрений, воды или вмешательства, и предлагаем вам научно обоснованное управление сельским хозяйством.',
    'analysis-cta-footer': 'С AgroAero Tech ваши решения теперь будут основаны на технологиях и данных, а не на оценках.',

    // Legal Error Messages (eksik olanlar eklendi)
    'legal-kvkk-error': 'Вы должны одобрить текст KVKK.',
    'legal-privacy-error': 'Вы должны принять политику конфиденциальности.',
    'legal-gdpr-error': 'Вы должны одобрить текст согласия GDPR.',

    // Legal Texts
    'legal-kvkk-link': 'Текст уведомления KVKK',
    'legal-kvkk-text': 'прочитал и понял.',
    'legal-privacy-link': 'Политика конфиденциальности',
    'legal-privacy-text': 'прочитал и принимаю.',
    'legal-gdpr-link': 'Текст открытого согласия в рамках GDPR',
    'legal-gdpr-text': 'одобряю.',

    // Certification Education Page
    'cert-hero-title': 'Утвержденное обучение сертификации пилотов дронов',
    'cert-hero-subtitle': 'Как AgroAero Tech MMC, работающая в Азербайджане, мы предлагаем профессиональное обучение пилотов дронов в соответствии с международными стандартами с <strong>утвержденным сертификатом дрона</strong>.',
    'cert-apply-btn': 'Подать заявку',
    'cert-why-title': 'Почему обучение пилотов дронов с нами?',
    'cert-feature1-title': 'Теоретическое и практическое обучение',
    'cert-feature1-desc': 'Участники получают профессиональные знания через практическое обучение как в классе, так и в полевых условиях.',
    'cert-feature2-title': 'Международные стандарты',
    'cert-feature2-desc': 'Наше учебное содержание подготовлено в соответствии с правилами ICAO и региональных авиационных властей.',
    'cert-feature3-title': 'Широкий охват',
    'cert-feature3-desc': 'Комплексное обучение с сельскохозяйственными дронами для опрыскивания (DJI Agras T50/T40 и т.д.), промышленными дронами для исследования и съемки.',
    'cert-feature4-title': 'Утвержденный сертификат дрона',
    'cert-feature4-desc': 'Участники, успешно завершившие обучение, получают <strong>утвержденный сертификат пилота дрона</strong>, и сертификат может быть проверен.',
    'cert-who-title': 'Кто может участвовать?',
    'cert-req1': 'Граждане Азербайджана, достигшие 18 лет',
    'cert-req2': 'Как минимум выпускник средней школы',
    'cert-req3': 'Базовый уровень английского языка',
    'cert-target1': 'Фермеры и инженеры сельского хозяйства, работающие в сельскохозяйственном секторе',
    'cert-target2': 'Технические эксперты, которые хотят использовать дроны в промышленной области',
    'cert-target3': 'Молодые предприниматели, которые хотят приобрести новую профессию',
    'cert-info-title': 'Информация об обучении',
    'cert-duration-title': 'Продолжительность',
    'cert-duration-desc': 'Обучение пилотов дронов (36 часов)<br>16 часов теоретических + 8 часов технических + 12 часов практических',
    'cert-capacity-title': 'Вместимость класса',
    'cert-capacity-desc': 'Максимум 16 человек<br>(минимальное участие 10 человек)',
    'cert-dates-title': 'Даты обучения',
    'cert-dates-desc': 'Каждую неделю, когда мы достигаем достаточного количества<br>Планируется в соответствии с минимальным количеством участников',
    'cert-countries-title': 'Страны',
    'cert-countries-desc': 'Азербайджан',
    'cert-program-title': 'Программа обучения',
    'cert-theory-title': 'Теоретическое обучение (16 часов)',
    'cert-theory1': '• Авиационное законодательство',
    'cert-theory2': '• Системы БПЛА',
    'cert-theory3': '• Метеорология',
    'cert-theory4': '• Навигация',
    'cert-theory5': '• Воздушное пространство',
    'cert-theory6': '• Процедуры безопасности',
    'cert-theory7': '• Управление чрезвычайными ситуациями',
    'cert-theory8': '• Человеческие факторы',
    'cert-technical-title': 'Техническое обучение (8 часов)',
    'cert-tech1': '• Знание аппаратного обеспечения БПЛА',
    'cert-tech2': '• Системы двигателей и пропеллеров',
    'cert-tech3': '• Технологии батарей',
    'cert-tech4': '• Сенсорные системы',
    'cert-tech5': '• Обслуживание и ремонт',
    'cert-tech6': '• Обнаружение неисправностей',
    'cert-practical-title': 'Практическое обучение (12 часов)',
    'cert-prac1': '• Предполетные проверки',
    'cert-prac2': '• Основные летные маневры',
    'cert-prac3': '• Автономный полет',
    'cert-prac4': '• Процедуры экстренных ситуаций',
    'cert-prac5': '• Подготовка к экзамену',
    'cert-prac6': '• Сертификационный экзамен',
    'cert-form-title': 'Форма заявки на сертификацию',
    'cert-form-subtitle': 'Вы можете связаться с нами, заполнив форму ниже. Мы свяжемся с вами как можно скорее.',
    'cert-fin-label': 'FIN код *',
    'cert-fin-placeholder': 'Пример: 1AB2C3D',
    'cert-phone-placeholder': '+994 xx xxx xx xx',
    'cert-photo-label': 'Фото на документы *',
    'cert-judicial-label': 'Справка о судимости *',
    'cert-population-label': 'Образец регистрации населения *',
    'cert-file-format': 'Формат JPG, PNG, PDF, максимум 5МБ',
    'cert-submit-btn': 'Отправить заявку',

    // Agricultural Drone Education Page
    'agri-hero-title': 'Обучение сельскохозяйственным дронам',
    'agri-hero-subtitle': 'Изучите использование дронов в сельскохозяйственных применениях с помощью обучения дронам, ориентированного на хобби и личное развитие.',
    'agri-apply-btn': 'Подать заявку',
    'agri-hobby-title': 'Обучение дронам для хобби',
    'agri-hobby-desc': '<strong>Программа обучения для хобби</strong> для тех, кто хочет изучить использование дронов в сельскохозяйственных применениях. Как AgroAero Tech MMC, работающая в Азербайджане, мы предлагаем обучение дронам, ориентированное на личное развитие и хобби. По окончании этого обучения выдается только сертификат участия и не содержит никакого одобрения или формальности.',
    'agri-why-title': 'Почему обучение дронам для хобби с нами?',
    'agri-feature1-title': 'Теоретическое и практическое обучение',
    'agri-feature1-desc': 'Участники получают профессиональные знания через практическое обучение как в классе, так и в полевых условиях.',
    'agri-feature2-title': 'Международные стандарты',
    'agri-feature2-desc': 'Наше учебное содержание подготовлено в соответствии с правилами ICAO и региональных авиационных властей.',
    'agri-feature3-title': 'Широкий охват',
    'agri-feature3-desc': 'Комплексное обучение с сельскохозяйственными дронами для опрыскивания (DJI Agras T50/T40 и т.д.), промышленными дронами для исследования и съемки.',
    'agri-feature4-title': 'Сертификат участия',
    'agri-feature4-desc': 'Участникам, успешно завершившим обучение, выдается только <strong>сертификат участия</strong>. Этот сертификат не является утвержденным сертификатом и не несет никакой формальности.',
    'agri-who-title': 'Кто может участвовать?',
    'agri-requirements-title': 'Общие требования',
    'agri-req1': 'Граждане Азербайджана, достигшие 18 лет',
    'agri-req2': 'Как минимум выпускник средней школы',
    'agri-req3': 'Базовый уровень английского языка (ICAO Level 2)',
    'agri-target-title': 'Целевая аудитория',
    'agri-target1': 'Фермеры и сельскохозяйственные инженеры, работающие в сельскохозяйственном секторе',
    'agri-target2': 'Технические эксперты, которые хотят использовать дроны в промышленной области',
    'agri-target3': 'Молодые предприниматели, которые хотят приобрести новую профессию',
    'agri-target4': 'Любой, кто хочет изучить использование дронов для хобби',
    'agri-program-title': '📌 Программа обучения',
    'agri-theory-title': 'Теоретическое обучение (16 часов)',
    'agri-theory1': '• Авиационное законодательство',
    'agri-theory2': '• Системы БПЛА',
    'agri-theory3': '• Метеорология',
    'agri-theory4': '• Навигация',
    'agri-theory5': '• Воздушное пространство',
    'agri-theory6': '• Процедуры безопасности',
    'agri-theory7': '• Управление чрезвычайными ситуациями',
    'agri-theory8': '• Человеческие факторы',
    'agri-technical-title': 'Техническое обучение (8 часов)',
    'agri-tech1': '• Знание аппаратного обеспечения БПЛА',
    'agri-tech2': '• Системы двигателей и пропеллеров',
    'agri-tech3': '• Технологии батарей',
    'agri-tech4': '• Системы датчиков',
    'agri-tech5': '• Обслуживание и ремонт',
    'agri-tech6': '• Обнаружение неисправностей',
    'agri-practical-title': 'Практическое обучение (12 часов)',
    'agri-prac1': '• Предполётные проверки',
    'agri-prac2': '• Основные лётные манёвры',
    'agri-prac3': '• Автономный полёт',
    'agri-prac4': '• Процедуры при чрезвычайных ситуациях',
    'agri-prac5': '• Подготовка к экзамену',
    'agri-prac6': '• Оценочный тест',
    'agri-form-title': 'Форма заявки на обучение сельскохозяйственным дронам',
    'agri-form-subtitle': 'Вы можете связаться с нами, заполнив форму ниже. Мы свяжемся с вами как можно скорее.',
    'agri-phone-placeholder': '+994 xx xxx xx xx',
    'agri-message-placeholder': 'Ваши вопросы или особые пожелания по обучению...',
    'agri-submit-btn': 'Отправить заявку',

    // Drone Pilot Education Page
    'pilot-select-btn': 'Выбрать',

    // Corporate Page
    'corporate-page-title': 'О нас и наша история',
    'corporate-page-subtitle': 'Пионер цифровой трансформации сельского хозяйства в Азербайджане',
    'corporate-about-title': 'О нас',
    'corporate-about-desc1': 'AgroAero Tech MMC была основана в 2024 году в Азербайджане с целью объединения услуг сельскохозяйственного опрыскивания с современными технологиями дронов. Наша компания стремится стать пионером новой эры в сельском хозяйстве, предоставляя фермерам высокую эффективность, низкие затраты и экологически чистые решения.',
    'corporate-about-desc2': 'Наши дроны DJI Agras T50 выполняют опрыскивание хлопка, кукурузы, риса и других стратегических культур наиболее точным и эффективным способом. Благодаря передовым системам опрыскивания за один раз можно обработать сотни гектаров за короткое время, обеспечивая преимущества как по времени, так и по стоимости.',
    'corporate-feature1': 'Экономия воды 90%',
    'corporate-feature2': 'Флот DJI Agras T50',
    'corporate-feature3': 'Профессиональная поддержка 24/7',
    'corporate-feature4': 'NDVI Мультиспектральный анализ',
    'corporate-mission-title': 'Наша миссия',
    'corporate-mission-desc': 'Наша миссия — повысить производственную мощь фермеров, предоставляя быстрые, безопасные и эффективные услуги опрыскивания с помощью передовых технологий дронов.',
    'corporate-mission1': 'Разработка инновационных методов сельскохозяйственного опрыскивания',
    'corporate-mission2': 'Обеспечение фермерам преимуществ по времени и стоимости',
    'corporate-mission3': 'Поддержка экологически чистых, устойчивых методов ведения сельского хозяйства',
    'corporate-mission4': 'Подготовка квалифицированных специалистов для отрасли через обучение пилотированию дронов',
    'corporate-vision-title': 'Наше видение',
    'corporate-vision-desc': 'Как AgroAero Tech, наше видение — стать лидером цифровой трансформации сельского хозяйства в Азербайджане и регионе, максимизировать эффективность сельскохозяйственного производства с помощью современных технологий дронов. Наша главная цель — предоставлять экологически чистые решения, используя меньше воды и пестицидов, снижать затраты наших фермеров и поддерживать устойчивое сельское хозяйство.',
    'corporate-history-title': 'Наша история',
    'corporate-history-subtitle': 'Наш путь с принципом «Более эффективное сельское хозяйство, более сильное будущее»',
    'corporate-timeline1-title': '2024 - Основание',
    'corporate-timeline1-desc': 'AgroAero Tech MMC была основана в 2024 году с целью внедрения инновационных технологий в сельское хозяйство. Компания начала свой путь с видением повышения эффективности сельскохозяйственного производства в Азербайджане, экономии воды и пестицидов, а также внедрения современных методов ведения сельского хозяйства.',
    'corporate-timeline2-title': '2024 - Флот DJI Agras T50',
    'corporate-timeline2-desc': 'Вскоре после основания компания начала работы по опрыскиванию хлопка, кукурузы, риса и других стратегических культур, введя в эксплуатацию флот DJI Agras T50 — одних из самых передовых сельскохозяйственных дронов в мире. Благодаря современным системам опрыскивания обеспечивается экономия воды до 90%, а также минимизируется ущерб окружающей среде.',
    'corporate-timeline3-title': '2024 - Полевые операции',
    'corporate-timeline3-desc': 'В течение 2024 года AgroAero Tech предоставляла услуги сельскохозяйственного опрыскивания во многих районах страны, развивая партнёрства, основанные на доверии, с фермерами.',
    'corporate-timeline4-title': '2025 - Обучение, формирующее технологии',
    'corporate-timeline4-desc': 'Мы увенчиваем наш полевой опыт образованием! С 2025 года мы начали профессиональную образовательную деятельность для построения будущего технологического сельского хозяйства и беспилотных систем в Азербайджане.',
    'corporate-timeline5-title': '2025 - Стратегические партнёрства',
    'corporate-timeline5-desc': 'В том же году наша сервисная сеть была расширена благодаря стратегическим соглашениям с крупными сельскохозяйственными компаниями, такими как MKT İstehsalat Kommersiya MMC. Таким образом, была создана прочная модель сотрудничества как с частным сектором, так и с фермерскими объединениями.',
    'corporate-services-title': 'Наши направления услуг',
    'corporate-services-subtitle': 'Сегодня AgroAero Tech является одной из самых надёжных агротехнологических компаний Азербайджана',
    'corporate-service1-title': 'Сельскохозяйственные решения с дронами',
    'corporate-service1-desc': 'Мы рядом с нашими фермерами: точное опрыскивание, анализ здоровья растений и оптимизация урожайности',
    'corporate-service2-title': 'Промышленные решения с дронами',
    'corporate-service2-desc': 'Профессиональные услуги дронов в области энергетики, безопасности, картографии и инспекции',
    'corporate-service3-title': 'Обучение пилотов дронов',
    'corporate-service3-desc': 'Мы готовим профессиональных пилотов дронов с сертифицированными инструкторами',
    'corporate-team-title': 'Наши инструкторы',
    'corporate-team-subtitle': 'Наша опытная команда инструкторов — экспертов в своей области',
    'corporate-instructor1-title': 'ПИЛОТ БПЛА 2',
    'corporate-instructor1-desc': 'Опыт опрыскивания дронами на 50 000 гектаров',
    'corporate-instructor2-title': 'ИНСТРУКТОР БПЛА 2',
    'corporate-instructor2-desc': 'Инструктор — 10 лет авиационного опыта',

    // Contact Page
    'contact-page-title': 'Свяжитесь с нами',
    'contact-page-subtitle': 'Свяжитесь с нами, чтобы получить информацию о наших тренингах и услугах по БПЛА',
    'contact-form-title': 'Контактная форма',
    'contact-form-subtitle': 'Вы можете связаться с нами, заполнив форму ниже. Мы свяжемся с вами в ближайшее время.',
    'form-address-optional': 'Адрес (необязательно)',
    'form-phone-placeholder': '+994 xx xxx xx xx',
    'form-message-placeholder': 'Введите ваше сообщение...',
    'location-section-title': 'Наше местоположение',
    'location-view-on-map': 'Посмотреть на карте',
    'location-get-directions': 'Получить маршрут',

    // Industrial Solutions Page
    'ind-inspection-title': 'Промышленная инспекция и анализ',
    'ind-inspection-desc': 'Комплексные услуги инспекции и анализа для ваших промышленных объектов с высокотехнологичными дронами.',
    'ind-inspection-cta': 'Получить услугу инспекции и анализа',
    'ind-energy-title': 'Контроль энергетической инфраструктуры',
    'ind-energy-desc': 'Комплексные решения для инспекции и контроля дронами для энергетического сектора.',
    'ind-energy-cta': 'Получить услугу энергетического контроля',
    'ind-security-title': 'Решения безопасности',
    'ind-security-desc': 'Защитите свои объекты 24/7 с помощью систем безопасности дронов на базе ИИ.',
    'ind-security-cta': 'Получить решение безопасности',
    'ind-digital-title': 'Цифровые решения',
    'ind-digital-desc': '3D моделирование, технология цифрового двойника и умные решения для недвижимости.',
    'ind-digital-cta': 'Получить цифровое решение',
    'ind-form-title': 'Заявка на промышленную услугу',
    'ind-service-inspection': 'Инспекция и анализ',
    'ind-service-energy': 'Контроль энергетической инфраструктуры',
    'ind-service-security': 'Решения безопасности',
    'ind-service-digital': 'Цифровые решения',
    'form-company': 'Название компании',
    'form-project-area': 'Площадь проекта (м²)',
    'form-sector': 'Сектор *',
    'sector-energy': 'Энергетика',
    'sector-construction': 'Строительство',
    'sector-mining': 'Горнодобыча',
    'sector-manufacturing': 'Производство',
    'sector-realestate': 'Недвижимость',
    'sector-events': 'Мероприятия/Организация',
    'sector-other': 'Другое',
    'ind-mapping-title': 'Картографирование и геодезия:',
    'ind-mapping-desc': 'Подготовка 3D моделей, карт уклонов и отчетов об измерениях территорий с помощью камер высокого разрешения и систем LIDAR.',
    'ind-air-title': 'Анализ воздуха (Sniffer):',
    'ind-air-desc': 'Обнаружение утечек газа и измерения качества окружающей среды на промышленных объектах с помощью датчиков, интегрированных в дроны.',
    'ind-inspection-footer': 'Мы предлагаем измерения с точностью до сантиметра с технологией LIDAR и детальный анализ с мультиспектральными камерами.',
    'ind-powerline-title': 'Контроль линий электропередач:',
    'ind-powerline-desc': 'Инспекция энергетических линий с помощью изображений высокого разрешения и тепловых данных.',
    'ind-wind-title': 'Инспекция ветряных турбин:',
    'ind-wind-desc': 'Обнаружение структурных проблем, таких как трещины и коррозия на лопастях турбин, с помощью тепловизионных камер.',
    'ind-solar-title': 'Инспекция солнечных панелей:',
    'ind-solar-desc': 'Измерение разницы температур в панелях и обнаружение неисправных ячеек с помощью тепловизионных камер.',
    'ind-energy-footer': 'Максимизируйте безопасность и эффективность вашей энергетической инфраструктуры с помощью технологии дронов.',
    'ind-autonomous-title': 'Автономные системы безопасности:',
    'ind-autonomous-desc': 'Системы дронов на базе ИИ, патрулирующие 24/7 в таких областях, как пограничные зоны и заводы, обнаруживающие угрозы.',
    'ind-fire-title': 'Пожарная безопасность:',
    'ind-fire-desc': 'Раннее обнаружение пожароопасных зон с помощью тепловизионных камер и поддержка быстрого реагирования при пожарах.',
    'ind-security-footer': 'Мы предлагаем проактивные решения безопасности с передовыми датчиками и алгоритмами ИИ.',
    'ind-3d-title': '3D моделирование:',
    'ind-3d-desc': 'Высокоточное создание цифровых копий зданий и объектов.',
    'ind-twin-title': 'Цифровой двойник:',
    'ind-twin-desc': 'Создание виртуальных копий физических активов, интегрированных с датчиками IoT и управляемых с помощью данных в реальном времени.',
    'ind-tour-title': 'Виртуальный тур:',
    'ind-tour-desc': 'Цифровые туры, позволяющие интерактивно исследовать пространства на 360 градусов как с воздуха, так и с земли.',
    'ind-realestate-title': 'Умная платформа продаж недвижимости:',
    'ind-realestate-desc': 'Платформа продаж и презентации недвижимости, поддерживаемая 3D моделями и ИИ-ботами.',

    // Drone Event Services Page
    'event-swarm-title': 'Услуги дронов для мероприятий',
    'event-swarm-desc': 'Превратите небо в свой холст! Синхронизированные световые шоу и гигантская экранная реклама с сотнями дронов.',
    'event-swarm-cta': 'Получить предложение на услуги дронов для мероприятий',
    'event-screen-title': 'Экранная реклама дронами',
    'event-screen-desc': 'Гигантский экран в небе! Проекция видео и логотипов с помощью дронов.',
    'event-screen-cta': 'Получить предложение на рекламу дронами',
    'event-form-title': 'Заявка на услугу мероприятия',
    'event-service-swarm': 'Световое шоу роя дронов',
    'event-service-screen': 'Экранная реклама дронами',
    'event-service-both': 'Обе услуги',
    'form-event-date': 'Дата мероприятия *',
    'form-event-type': 'Тип мероприятия *',
    'form-event-location': 'Место мероприятия *',
    'form-event-details': 'Детали мероприятия и особые пожелания',
    'form-event-location-placeholder': 'Город, название места',
    'form-event-details-placeholder': 'Подробная информация о вашем мероприятии, логотип/текст/анимация, которые вы хотите показать и т.д.',
    'form-project-details-placeholder': 'Пожалуйста, предоставьте подробную информацию о вашем проекте...',
    'event-type-opening': 'Церемония открытия',
    'event-type-festival': 'Фестиваль / Концерт',
    'event-type-corporate': 'Корпоративное мероприятие',
    'event-type-wedding': 'Свадьба / Особый день',
    'event-type-launch': 'Запуск продукта',
    'event-type-sports': 'Спортивное мероприятие',
    'event-type-other': 'Другое',
    'event-swarm-sync': 'Синхронное движение:',
    'event-swarm-sync-desc': 'Сотни дронов, координируемых специальным программным обеспечением, движутся в идеальной гармонии в небе.',
    'event-swarm-design': 'Индивидуальный дизайн:',
    'event-swarm-design-desc': 'Логотипы, фигуры, тексты и анимации оживают в небе.',
    'event-swarm-events': 'Для любого мероприятия:',
    'event-swarm-events-desc': 'Открытия, фестивали, праздники, корпоративные мероприятия и особые дни.',
    'event-swarm-safe': 'Безопасно и экологично:',
    'event-swarm-safe-desc': 'Альтернатива фейерверкам, тихое и экологически чистое шоу.',
    'event-swarm-footer': 'Создавайте незабываемые моменты, поднимите свой бренд в небо!',
    'event-screen-giant': 'Создание гигантского экрана:',
    'event-screen-giant-desc': 'Дроны создают гигантский LED-экран в небе для проецирования видео и изображений.',
    'event-screen-impact': 'Максимальный эффект:',
    'event-screen-impact-desc': 'За пределами традиционной рекламы, привлекающая внимание реклама с высоким вирусным потенциалом.',
    'event-screen-video': 'Видеотрансляция:',
    'event-screen-video-desc': 'Логотипы, рекламные видео, сообщения и анимации транслируются в небе.',
    'event-screen-reach': 'Широкий охват аудитории:',
    'event-screen-reach-desc': 'Достигайте тысяч людей одновременно на мероприятиях под открытым небом.',
    'event-screen-footer': 'Начните новую эру в рекламе!',

    // Page Titles
    'industrial-page-title': 'Промышленные решения с дронами | Инспекция, Картография, Безопасность - AgroAeroTech',
    'event-page-title': 'Услуги дронов для мероприятий | Шоу роя дронов, Реклама дронами - AgroAeroTech',

    // Legal Pages
    'legal-kvkk-page-title': 'Текст уведомления KVKK | AgroAeroTech',
    'legal-kvkk-title': 'Текст уведомления KVKK',
    'legal-kvkk-subtitle': 'Информация в рамках Закона № 6698 о защите персональных данных.',
    'legal-kvkk-content': 'Я даю согласие на обработку моих персональных данных в рамках Закона № 6698 о защите персональных данных для целей подачи заявки на обучение, регистрации, сертификации и информирования, а также на передачу соответствующим официальным органам при необходимости.',
    'legal-privacy-page-title': 'Политика конфиденциальности | AgroAeroTech',
    'legal-privacy-title': 'Политика конфиденциальности',
    'legal-privacy-subtitle': 'Мы обязуемся защищать конфиденциальность и безопасность ваших персональных данных.',
    'legal-privacy-intro': 'Как AgroAero Tech MMC, мы обязуемся защищать конфиденциальность и безопасность ваших персональных данных.',
    'legal-privacy-section1-title': '1. Собираемая личная информация',
    'legal-privacy-section1-content': 'В процессе подачи заявки мы можем запросить ваше имя, фамилию, телефон, email, адрес и информацию об образовании.',
    'legal-privacy-section2-title': '2. Цели использования данных',
    'legal-privacy-section2-content': 'Используется для записей об обучении, подготовки сертификатов и информирования.',
    'legal-privacy-section3-title': '3. Защита данных',
    'legal-privacy-section3-content': 'Данные хранятся в зашифрованном виде на защищенных серверах.',
    'legal-privacy-section4-title': '4. Контакты',
    'legal-gdpr-page-title': 'Текст явного согласия GDPR | AgroAeroTech',
    'legal-gdpr-title': 'Текст явного согласия GDPR',
    'legal-gdpr-subtitle': 'Информация в соответствии с Общим регламентом защиты данных Европейского Союза (GDPR).',
    'legal-gdpr-content': 'Я даю свое явное согласие на сбор, хранение и передачу моих персональных данных официальным органам при необходимости в соответствии с Общим регламентом защиты данных Европейского Союза (GDPR) исключительно для целей регистрации на обучение, сертификации и информирования.',
    'legal-consent-title': 'Заявление о явном согласии',
    'legal-approve-btn': 'Прочитал и одобряю',
    'legal-back-btn': 'Назад',

    // Technical Service Page
    'ts-hero-title': 'Технический сервис, обслуживание и выездная поддержка дронов DJI',
    'ts-hero-desc': 'AgroAero Tech MMC, как авторизованный дилер и партнёр по техническому обслуживанию DJI, предоставляет профессиональные услуги по обслуживанию, ремонту и выездной технической поддержке для всех моделей дронов DJI. Благодаря более чем 10-летнему опыту работы в отрасли, команде опытных инженеров и обширному складу запасных частей, мы обеспечиваем бесперебойную и высокопроизводительную работу вашего парка дронов.',
    'ts-hero-cta': 'Запросить сервис',
    'ts-models-title': 'Модели DJI, которые мы обслуживаем',
    'ts-model-agras': 'Серия DJI Agras',
    'ts-model-mavic': 'Серия DJI Mavic',
    'ts-model-matrice': 'Серия DJI Matrice',
    'ts-scope-title': 'Объём наших услуг',
    'ts-scope-1-title': 'Периодическое обслуживание и диагностика',
    'ts-scope-1-desc': 'Детальный анализ систем полёта, датчиков, GPS и блоков управления',
    'ts-scope-2-title': 'Механический ремонт',
    'ts-scope-2-desc': 'Замена корпуса, лучей, моторов, пропеллеров, шасси и монтажных компонентов',
    'ts-scope-3-title': 'Сервис электронных систем',
    'ts-scope-3-desc': 'Ремонт ESC, IMU, подвеса, камеры, антенны и сенсорных модулей',
    'ts-scope-4-title': 'Калибровка и тестовые полёты',
    'ts-scope-4-desc': 'Балансировка полёта после ремонта, оптимизация ПО и проверка производительности',
    'ts-scope-5-title': 'Сервис аккумуляторов и блоков питания',
    'ts-scope-5-desc': 'Тестирование ячеек, измерение ёмкости и процедуры обновления',
    'ts-scope-6-title': 'Обновление прошивки и программного обеспечения',
    'ts-scope-6-desc': 'Установка новейших систем в соответствии со стандартами DJI',
    'ts-scope-7-title': 'Выездная техническая поддержка',
    'ts-scope-7-desc': 'Быстрое вмешательство и устранение неисправностей на поле, объекте или операционной площадке',
    'ts-scope-8-title': 'Поставка запасных частей',
    'ts-scope-8-desc': 'Быстрая поставка оригинальных запчастей DJI, профессиональный монтаж и гарантийное покрытие',
    'ts-why-title': 'Почему AgroAero Tech?',
    'ts-why-1-title': 'Авторизованный дилер и сервисный партнёр DJI',
    'ts-why-1-desc': 'Оригинальные запчасти и стандартная гарантия сервиса с официальной авторизацией',
    'ts-why-2-title': '10 лет опыта',
    'ts-why-2-desc': 'Передовой инженерный опыт и отраслевая экспертиза',
    'ts-why-3-title': 'Склад оригинальных запчастей',
    'ts-why-3-desc': 'Быстрая доставка с преимуществом постоянного наличия на складе',
    'ts-why-4-title': 'Сервис с гарантией',
    'ts-why-4-desc': 'Документированная поставка после тестовых полётов',
    'ts-why-5-title': 'Прозрачный процесс обслуживания',
    'ts-why-5-desc': 'Быстрое и документированное отслеживание процесса',
    'ts-why-6-title': 'Выездная техническая поддержка',
    'ts-why-6-desc': 'Гарантия бесперебойной работы с полевой поддержкой',
    'ts-stock-title': 'Преимущество готового склада',
    'ts-stock-desc': 'AgroAero Tech поддерживает постоянный запас часто используемых компонентов DJI (моторы, пропеллеры, лучи, датчики, подвесы, аккумуляторы и др.), завершая операции обслуживания и ремонта в минимальные сроки.',
    'ts-form-title': 'Форма запроса на сервис',
    'ts-form-subtitle': 'Вашему дрону нужно обслуживание или ремонт? Заполните форму, чтобы сообщить нам о состоянии вашего устройства. Наша команда проверит устройство и отправит вам отчёт о неисправности и ценовое предложение в течение 24 часов.',
    'ts-drone-model': 'Модель дрона <span class="text-danger">*</span>',
    'ts-service-type': 'Тип сервиса <span class="text-danger">*</span>',
    'ts-problem-desc': 'Описание неисправности/проблемы <span class="text-danger">*</span>',
    'ts-address': 'Адрес',
    'ts-other': 'Другое',
    'ts-stype-maintenance': 'Периодическое обслуживание',
    'ts-stype-diagnosis': 'Диагностика неисправностей',
    'ts-stype-mechanical': 'Механический ремонт',
    'ts-stype-electronic': 'Сервис электронных систем',
    'ts-stype-calibration': 'Калибровка',
    'ts-stype-battery': 'Сервис аккумуляторов',
    'ts-stype-firmware': 'Обновление прошивки',
    'ts-stype-onsite': 'Выездная техническая поддержка',
    'ts-problem-placeholder': 'Подробно опишите проблему с вашим дроном...',
    'ts-address-placeholder': 'Адрес для выездного сервиса (необязательно)',
  },
  az: {
    // Corporate Page
    'corporate-page-title': 'Haqqımızda və Tarixçəmiz',
    'corporate-page-subtitle': 'Azərbaycanda kənd təsərrüfatı rəqəmsal transformasiyanın öncüsü',
    'corporate-about-title': 'Haqqımızda',
    'corporate-about-desc1': 'AgroAero Tech MMC, 2024-cü ildə Azərbaycanda kənd təsərrüfatı ilaçlama xidmətlərini müasir dron texnologiyaları ilə birləşdirmək məqsədi ilə qurulmuşdur. Şirkətimiz, fermerlərə yüksək məhsuldarlıq, aşağı xərc və ekoloji təmiz həllər təklif edərək kənd təsərrüfatında yeni dövrün öncüsü olmağı hədəfləyir.',
    'corporate-about-desc2': 'İstifadə etdiyimiz DJI Agras T50 dronları, pambıq, qarğıdalı, düyü və digər strateji məhsullarda ilaçlamanı ən dəqiq və səmərəli şəkildə həyata keçirir. İnkişaf etmiş püskürtmə sistemləri ilə bir dəfədə yüzlərlə hektar sahə qısa müddətdə ilaçlana bilir, beləliklə həm vaxt həm də xərc üstünlüyü təmin edilir.',
    'corporate-feature1': '%90 Su Qənaəti',
    'corporate-feature2': 'DJI Agras T50 Donanması',
    'corporate-feature3': '7/24 Peşəkar Dəstək',
    'corporate-feature4': 'NDVI Multispektral Analiz',
    'corporate-mission-title': 'Missiyamız',
    'corporate-mission-desc': 'Missiyamız, inkişaf etmiş dron texnologiyaları ilə sürətli, təhlükəsiz və səmərəli ilaçlama xidmətləri təklif edərək fermerlərin istehsal gücünü artırmaqdır.',
    'corporate-mission1': 'Kənd təsərrüfatı ilaçlamasında yenilikçi üsullar inkişaf etdirmək',
    'corporate-mission2': 'Fermerlərə vaxt və xərc üstünlüyü təmin etmək',
    'corporate-mission3': 'Ətraf mühitə həssas, davamlı kənd təsərrüfatı tətbiqlərini dəstəkləmək',
    'corporate-mission4': 'Dron pilotluğu təlimləri ilə sektora ixtisaslı mütəxəssislər qazandırmaq',
    'corporate-vision-title': 'Vizyonumuz',
    'corporate-vision-desc': 'AgroAero Tech olaraq vizyonumuz, Azərbaycanda və bölgədə kənd təsərrüfatında rəqəmsal transformasiyanın lideri olmaq, müasir dron texnologiyaları ilə kənd təsərrüfatı istehsalında məhsuldarlığı ən yüksək səviyyəyə çıxarmaqdır. Daha az su və ilaç istifadə edərək ekoloji təmiz həllər təklif etmək, fermerlərimin xərclərini azaltmaqla davamlı kənd təsərrüfatını dəstəkləmək əsas hədəfimizdir.',
    'corporate-history-title': 'Tarixçəmiz',
    'corporate-history-subtitle': '"Daha məhsuldar kənd təsərrüfatı, daha güclü gələcək" anlayışı ilə səyahətimiz',
    'corporate-timeline1-title': '2024 - Quruluş',
    'corporate-timeline1-desc': 'AgroAero Tech MMC, kənd təsərrüfatında yenilikçi texnologiyaların tətbiqi məqsədi ilə 2024-cü ildə qurulmuşdur. Azərbaycanda kənd təsərrüfatı istehsalında məhsuldarlığı artırmaq, su və ilaç istifadəsində qənaət təmin etmək və müasir kənd təsərrüfatı üsullarını fermerlə buluşdurmaq vizyonu ilə yola çıxmışdır.',
    'corporate-timeline2-title': '2024 - DJI Agras T50 Donanması',
    'corporate-timeline2-desc': 'Quruluşundan qısa müddət sonra, dünyanın ən inkişaf etmiş kənd təsərrüfatı dronlarından biri olan DJI Agras T50 donanmasını işə salaraq pambıq, qarğıdalı, düyü və digər strateji bitkilərdə ilaçlama işlərinə başlamışdır. Müasir püskürtmə sistemləri sayəsində %90-a qədər su qənaəti təmin edilərkən, eyni zamanda ətraf mühitə verilən zərər minimuma endirilmişdir.',
    'corporate-timeline3-title': '2024 - Saha Əməliyyatları',
    'corporate-timeline3-desc': '2024-cü il ərzində, AgroAero Tech ölkə üzrə bir çox rayonda kənd təsərrüfatı ilaçlama xidməti təklif edərək, fermerlə etimada əsaslanan əməkdaşlıqlar inkişaf etdirmişdir.',
    'corporate-timeline4-title': '2025 - Texnologiyaya Yön Verən Təlimlər',
    'corporate-timeline4-desc': 'Saha əməliyyatlarındakı təcrübəmizi təhsillə tamamlayırıq! 2025-ci ildən etibarən, Azərbaycanda texnoloji kənd təsərrüfatının və insansız sistemlərin gələcəyini qurmaq üçün peşəkar təlim fəaliyyətlərimizə başladıq.',
    'corporate-timeline5-title': '2025 - Strateji Tərəfdaşlıqlar',
    'corporate-timeline5-desc': 'Eyni il, MKT İstehsalat Kommersiya MMC kimi böyük kənd təsərrüfatı istehsal şirkətləri ilə strateji razılaşmalar edilərək xidmət şəbəkəmiz genişləndirilmişdir. Beləliklə, həm özəl sektor həm də fermer birliklər ilə güclü əməkdaşlıq modeli yaradılmışdır.',
    'corporate-services-title': 'Xidmət Sahələrimiz',
    'corporate-services-subtitle': 'Bu gün AgroAero Tech, Azərbaycanın ən etibarlı kənd təsərrüfatı texnologiyaları şirkətlərindən biri kimi fəaliyyət göstərir',
    'corporate-service1-title': 'Dron ilə Kənd Təsərrüfatı Həlləri',
    'corporate-service1-desc': 'Dəqiq ilaçlama, bitki sağlamlığı analizi və məhsuldarlıq optimallaşdırması ilə fermerlərimin yanındayıq',
    'corporate-service2-title': 'Dron ilə Sənaye Həlləri',
    'corporate-service2-desc': 'Enerji, təhlükəsizlik, xəritəçəkmə və yoxlama sahələrində peşəkar dron xidmətləri',
    'corporate-service3-title': 'Dron Pilot Təlimi',
    'corporate-service3-desc': 'Sertifikatlı təlimatçılarla peşəkar dron pilotu yetişdiririk',
    'corporate-team-title': 'Təlimatçılarımız',
    'corporate-team-subtitle': 'Sahəsində mütəxəssis, təcrübəli təlimatçı heyətimiz',
    'corporate-instructor1-title': 'İHA 2 PİLOTU',
    'corporate-instructor1-desc': '50.000 Hektar Dronla İlaçlama Təcrübəsi',
    'corporate-instructor2-title': 'İHA 2 TƏLİMATÇISI',
    'corporate-instructor2-desc': 'Təlimatçı - 10 İllik Aviasiya Təcrübəsi',

    // References Page
    'references-page-title': 'İstinadlarımız',
    'references-page-subtitle': 'Etibarlı iş ortaqlarımız.',
    'references-cta-title': 'Siz də İstinadlarımıza Qoşulun',
    'references-cta-desc': 'İHA texnologiyaları ilə işinizi bir üst səviyyəyə qaldırmaq üçün bizimlə əlaqə saxlayın və xüsusi həllərimizi kəşf edin.',
    'references-cta-quote': 'Təklif Al',
    'references-cta-call': 'Dərhal Zəng Et',

    // Blog Page
    'blog-loading': 'Yüklənir...',
    'blog-loading-text': 'Blog yazıları yüklənir...',
    'blog-js-warning': 'Blog yazılarını görmək üçün JavaScript-i aktiv edin.',
    'blog-no-posts': 'Hələ blog yazısı yoxdur.',
    'blog-error': 'Blog yazıları yüklənərkən xəta baş verdi.',
    'blog-read-more': 'Davamını Oxu',

    // Common
    'learn-more': 'Ətraflı Məlumat Al',
    'get-service': 'Xidmət Al',
    'contact-us': 'Bizimlə Əlaqə',

    // Contact Page
    'contact-page-title': 'Bizimlə Əlaqə',
    'contact-page-subtitle': 'İHA təlimləri və xidmətlərimiz haqqında məlumat almaq üçün bizimlə əlaqə saxlayın',
    'contact-form-title': 'Əlaqə Forması',
    'contact-form-subtitle': 'Aşağıdakı formanı dolduraraq bizimlə əlaqə saxlaya bilərsiniz. Ən qısa zamanda sizə geri dönüş edəcəyik.',
    'form-address-optional': 'Ünvan (İstəyə bağlı)',
    'form-phone-placeholder': '+994 xx xxx xx xx',
    'form-message-placeholder': 'Mesajınızı daxil edin...',
    'location-section-title': 'Yerimiz',
    'location-view-on-map': 'Xəritədə Bax',
    'location-get-directions': 'Yol Tarifini Al',

    // Industrial Solutions Page
    'ind-inspection-title': 'Sənaye Yoxlaması və Analiz',
    'ind-inspection-desc': 'Yüksək texnologiyalı dron sistemləri ilə sənaye obyektlərinizin hərtərəfli yoxlama və analiz xidmətləri.',
    'ind-inspection-cta': 'Yoxlama və Analiz Xidməti Al',
    'ind-energy-title': 'Enerji İnfrastrukturu Nəzarəti',
    'ind-energy-desc': 'Enerji sektoru üçün hərtərəfli dron yoxlama və nəzarət həlləri.',
    'ind-energy-cta': 'Enerji Nəzarəti Xidməti Al',
    'ind-security-title': 'Təhlükəsizlik Həlləri',
    'ind-security-desc': 'Süni intellekt dəstəkli dron təhlükəsizlik sistemləri ilə obyektlərinizi 7/24 qoruyun.',
    'ind-security-cta': 'Təhlükəsizlik Həlli Al',
    'ind-digital-title': 'Rəqəmsal Həllər',
    'ind-digital-desc': '3D modelləmə, rəqəmsal əkiz texnologiyası və ağıllı daşınmaz əmlak həlləri.',
    'ind-digital-cta': 'Rəqəmsal Həll Al',
    'ind-form-title': 'Sənaye Xidməti Müraciəti',
    'ind-service-inspection': 'Yoxlama və Analiz',
    'ind-service-energy': 'Enerji İnfrastrukturu Nəzarəti',
    'ind-service-security': 'Təhlükəsizlik Həlləri',
    'ind-service-digital': 'Rəqəmsal Həllər',
    'form-company': 'Şirkət Adı',
    'form-project-area': 'Layihə Sahəsi (m²)',
    'form-sector': 'Sektor *',
    'sector-energy': 'Enerji',
    'sector-construction': 'Tikinti',
    'sector-mining': 'Mədənçilik',
    'sector-manufacturing': 'İstehsal',
    'sector-realestate': 'Daşınmaz Əmlak',
    'sector-events': 'Tədbirlər/Təşkilat',
    'sector-other': 'Digər',
    'ind-mapping-title': 'Xəritəçəkmə və Ərazi Ölçümlə:',
    'ind-mapping-desc': 'Yüksək keyfiyyətli kameralar və LIDAR sistemləri ilə ərazilərin 3D modellərinin, meyl xəritələrinin və ölçmə hesabatlarının hazırlanması.',
    'ind-air-title': 'Hava Analizi (Sniffer):',
    'ind-air-desc': 'Dronlara inteqrasiya edilmiş sensorlar ilə sənaye obyektlərində qaz sızmasının aşkarlanması və ətraf mühit keyfiyyəti ölçmələri.',
    'ind-inspection-footer': 'LIDAR texnologiyası ilə santimetr dəqiqliyində ölçmələr, multispektral kameralar ilə ətraflı analizlər təklif edirik.',
    'ind-powerline-title': 'Elektrik Xətləri Nəzarəti:',
    'ind-powerline-desc': 'Enerji xətlərinin yüksək keyfiyyətli şəkillər və termal məlumatlarla yoxlanılması.',
    'ind-wind-title': 'Külək Turbini Yoxlaması:',
    'ind-wind-desc': 'Turbin qanadlarındakı çatlar, korroziya kimi struktur problemlərin termal kameralarla aşkarlanması.',
    'ind-solar-title': 'Günəş Paneli Yoxlaması:',
    'ind-solar-desc': 'Panellərdəki temperatur fərqlərinin ölçülməsi və nasaz hüceyrələrin termal kameralarla aşkarlanması.',
    'ind-energy-footer': 'Enerji infrastrukturunuzun təhlükəsizliyini və səmərəliliyini dron texnologiyası ilə maksimum səviyyəyə çatdırın.',
    'ind-autonomous-title': 'Avtonom Təhlükəsizlik Sistemləri:',
    'ind-autonomous-desc': 'Sərhəd zonası və zavodlar kimi ərazilərdə 7/24 patrul edən, təhdidləri aşkarlayan süni intellekt dəstəkli dron sistemləri.',
    'ind-fire-title': 'Yanğın Təhlükəsizliyi:',
    'ind-fire-desc': 'Termal kameralarla yanğın riskli ərazilərin erkən aşkarlanması və yanğın zamanı sürətli müdaxilə dəstəyi.',
    'ind-security-footer': 'İnkişaf etmiş sensorlar və süni intellekt alqoritmləri ilə proaktiv təhlükəsizlik həlləri təklif edirik.',
    'ind-3d-title': '3D Modelləmə:',
    'ind-3d-desc': 'Bina və obyektlərin rəqəmsal kopyalarının yüksək dəqiqliklə yaradılması.',
    'ind-twin-title': 'Rəqəmsal Əkiz:',
    'ind-twin-desc': 'Fiziki aktivlərin IoT sensorları ilə inteqrasiya edilərək canlı məlumatlarla idarə olunan virtual kopyalarının yaradılması.',
    'ind-tour-title': 'Virtual Tur:',
    'ind-tour-desc': 'Məkanların 360 dərəcə interaktiv şəkildə həm havadan həm yerdən gəzilə bilməsini təmin edən rəqəmsal turlar.',
    'ind-realestate-title': 'Ağıllı Daşınmaz Əmlak Satış Platforması:',
    'ind-realestate-desc': '3D modellər və süni intellekt botları ilə dəstəklənən daşınmaz əmlak satış və təqdimat platforması.',

    // Drone Event Services Page
    'event-swarm-title': 'Dron ilə Tədbir Xidmətləri',
    'event-swarm-desc': 'Göy üzünü kətanınıza çevirin! Yüzlərlə dron ilə sinxronlaşdırılmış işıq şouları və nəhəng ekran reklamları.',
    'event-swarm-cta': 'Dron Tədbir Xidmətləri Təklifi Al',
    'event-screen-title': 'Ekranlı Dron Reklamçılığı',
    'event-screen-desc': 'Göy üzündə nəhəng ekran! Dronlarla video və loqo proyeksiyası.',
    'event-screen-cta': 'Dron Reklamçılıq Təklifi Al',
    'event-form-title': 'Tədbir Xidməti Müraciəti',
    'event-service-swarm': 'İşıqlı Sürü Dron Şousu',
    'event-service-screen': 'Ekranlı Dron Reklamçılığı',
    'event-service-both': 'Hər İki Xidmət',
    'form-event-date': 'Tədbir Tarixi *',
    'form-event-type': 'Tədbir Növü *',
    'form-event-location': 'Tədbir Yeri *',
    'form-event-details': 'Tədbir Detalları və Xüsusi İstəklər',
    'form-event-location-placeholder': 'Şəhər, məkan adı',
    'form-event-details-placeholder': 'Tədbiriniz haqqında ətraflı məlumat, göstərilməsini istədiyiniz loqo/yazı/animasiya və s.',
    'form-project-details-placeholder': 'Zəhmət olmasa layihəniz haqqında ətraflı məlumat verin...',
    'event-type-opening': 'Açılış Mərasimi',
    'event-type-festival': 'Festival / Konsert',
    'event-type-corporate': 'Korporativ Tədbir',
    'event-type-wedding': 'Toy / Xüsusi Gün',
    'event-type-launch': 'Məhsul Təqdimatı',
    'event-type-sports': 'İdman Tədbiri',
    'event-type-other': 'Digər',
    'event-swarm-sync': 'Sinxron Hərəkət:',
    'event-swarm-sync-desc': 'Xüsusi proqram təminatı ilə koordinasiya olunan yüzlərlə dron göy üzündə mükəmməl uyum içində hərəkət edir.',
    'event-swarm-design': 'Xüsusi Dizaynlar:',
    'event-swarm-design-desc': 'Loqolar, formalar, yazılar və animasiyalar göy üzündə canlanır.',
    'event-swarm-events': 'Hər Tədbir Üçün:',
    'event-swarm-events-desc': 'Açılışlar, festivallar, bayramlar, korporativ tədbirlər və xüsusi günlər.',
    'event-swarm-safe': 'Təhlükəsiz və Ekoloji:',
    'event-swarm-safe-desc': 'Atəşfəşanlığa alternativ, səssiz və ətraf mühitə dost şou.',
    'event-swarm-footer': 'Unudulmaz anlar yaradın, brendinizi göy üzünə aparın!',
    'event-screen-giant': 'Nəhəng Ekran Yaratma:',
    'event-screen-giant-desc': 'Dronlar göy üzündə nəhəng LED pərdə yaradaraq video və şəkil proyeksiya edir.',
    'event-screen-impact': 'Maksimum Təsir:',
    'event-screen-impact-desc': 'Ənənəvi reklamçılığın xaricində, diqqət çəkən və yüksək viral potensiallı tanıtım.',
    'event-screen-video': 'Video Yayını:',
    'event-screen-video-desc': 'Loqolar, tanıtım videoları, mesajlar və animasiyalar göy üzündə yayımlanır.',
    'event-screen-reach': 'Geniş Auditoriyaya Çatma:',
    'event-screen-reach-desc': 'Açıq hava tədbirlərində minlərlə insana eyni anda çatın.',
    'event-screen-footer': 'Reklamçılıqda yeni bir dövr başladın!',

    // Page Titles
    'industrial-page-title': 'Dronla Sənaye Həlləri | Yoxlama, Xəritəçəkmə, Təhlükəsizlik - AgroAeroTech',
    'event-page-title': 'Dronla Tədbir Xidmətləri | Sürü Dron Şousu, Dron Reklamçılıq - AgroAeroTech',

    // Legal Pages
    'legal-kvkk-page-title': 'KVKK Aydınlatma Mətni | AgroAeroTech',
    'legal-kvkk-title': 'KVKK Aydınlatma Mətni',
    'legal-kvkk-subtitle': '6698 saylı Fərdi Məlumatların Qorunması Qanunu çərçivəsində məlumatlandırma.',
    'legal-kvkk-content': '6698 saylı Fərdi Məlumatların Qorunması Qanunu çərçivəsində fərdi məlumatlarımın təlim müraciəti, qeydiyyat, sertifikatlaşdırma və məlumatlandırma məqsədləri ilə işlənməsinə və lazım olduqda müvafiq rəsmi qurumlara ötürülməsinə razılıq verirəm.',
    'legal-privacy-page-title': 'Gizlilik Siyasəti | AgroAeroTech',
    'legal-privacy-title': 'Gizlilik Siyasəti',
    'legal-privacy-subtitle': 'Fərdi məlumatlarınızın gizliliyini və təhlükəsizliyini qorumağı öhdəmizə götürürük.',
    'legal-privacy-intro': 'AgroAero Tech MMC olaraq fərdi məlumatlarınızın gizliliyini və təhlükəsizliyini qorumağı öhdəmizə götürürük.',
    'legal-privacy-section1-title': '1. Toplanan Şəxsi Məlumatlar',
    'legal-privacy-section1-content': 'Müraciət prosesində adınız, soyadınız, telefon, email, ünvan və təhsil məlumatlarınız tələb oluna bilər.',
    'legal-privacy-section2-title': '2. Məlumatlardan İstifadə Məqsədləri',
    'legal-privacy-section2-content': 'Təlim qeydləri, sertifikat hazırlanması və məlumatlandırma üçün istifadə olunur.',
    'legal-privacy-section3-title': '3. Məlumatların Qorunması',
    'legal-privacy-section3-content': 'Məlumatlar şifrələnmiş formada təhlükəsiz serverlərdə saxlanılır.',
    'legal-privacy-section4-title': '4. Əlaqə',
    'legal-gdpr-page-title': 'GDPR Açıq Razılıq Mətni | AgroAeroTech',
    'legal-gdpr-title': 'GDPR Açıq Razılıq Mətni',
    'legal-gdpr-subtitle': 'Avropa İttifaqının Ümumi Məlumatların Qorunması Qaydası (GDPR) çərçivəsində məlumatlandırma.',
    'legal-gdpr-content': 'Avropa İttifaqının Ümumi Məlumatların Qorunması Qaydası (GDPR) çərçivəsində fərdi məlumatlarımın yalnız təlim qeydiyyatı, sertifikatlaşdırma və məlumatlandırma məqsədləri ilə toplanmasına, saxlanmasına və lazım olduqda rəsmi qurumlara ötürülməsinə açıq razılığımı verirəm.',
    'legal-consent-title': 'Açıq Razılıq Bəyanı',
    'legal-approve-btn': 'Oxudum və təsdiq edirəm',
    'legal-back-btn': 'Geri',

    // Technical Service Page
    'ts-hero-title': 'DJI Dron Texniki Servis, Baxım və Sahə Dəstəyi',
    'ts-hero-desc': 'AgroAero Tech MMC, DJI-nin səlahiyyətli diler və texniki xidmət tərəfdaşı olaraq, bütün DJI dron modelləri üçün peşəkar baxım, təmir və sahə texniki dəstəyi xidmətləri göstərir. 10 ildən çox sektorial təcrübə, təcrübəli mühəndis komandası və geniş ehtiyat hissə anbarı ilə dron donanmanızın fasiləsiz və yüksək performanslı işləməsini təmin edirik.',
    'ts-hero-cta': 'Servis Tələb Et',
    'ts-models-title': 'Xidmət Göstərdiyimiz DJI Modelləri',
    'ts-model-agras': 'DJI Agras Seriyası',
    'ts-model-mavic': 'DJI Mavic Seriyası',
    'ts-model-matrice': 'DJI Matrice Seriyası',
    'ts-scope-title': 'Xidmət Sahəmiz',
    'ts-scope-1-title': 'Dövri Baxım və Diaqnostika',
    'ts-scope-1-desc': 'Uçuş sistemləri, sensorlar, GPS və idarəetmə bloklarının ətraflı analizi',
    'ts-scope-2-title': 'Mexaniki Təmir',
    'ts-scope-2-desc': 'Gövdə, qol, motor, pervane, şassi və montaj komponentlərinin dəyişdirilməsi',
    'ts-scope-3-title': 'Elektron Sistem Servisi',
    'ts-scope-3-desc': 'ESC, IMU, gimbal, kamera, antenna və sensor modullarının təmiri',
    'ts-scope-4-title': 'Kalibrasiya və Test Uçuşları',
    'ts-scope-4-desc': 'Təmirdən sonra uçuş balanslaması, proqram təminatı optimallaşdırması və performans yoxlaması',
    'ts-scope-5-title': 'Batareya və Güc Mənbəyi Servisi',
    'ts-scope-5-desc': 'Hüceyrə testi, tutum ölçümü və yeniləmə prosedurları',
    'ts-scope-6-title': 'Firmware və Proqram Təminatı Yeniləməsi',
    'ts-scope-6-desc': 'DJI standartlarına uyğun ən yeni sistemlərin quraşdırılması',
    'ts-scope-7-title': 'Sahə Texniki Dəstəyi',
    'ts-scope-7-desc': 'Tarla, obyekt və ya əməliyyat sahəsində sürətli müdaxilə və nasazlığın aradan qaldırılması',
    'ts-scope-8-title': 'Ehtiyat Hissə Təchizatı',
    'ts-scope-8-desc': 'Orijinal DJI ehtiyat hissələrinin sürətli təchizatı, peşəkar montaj və zəmanət əhatəsi',
    'ts-why-title': 'Niyə AgroAero Tech?',
    'ts-why-1-title': 'DJI Səlahiyyətli Diler və Servis Tərəfdaşı',
    'ts-why-1-desc': 'Rəsmi səlahiyyətlə orijinal ehtiyat hissələr və standart servis zəmanəti',
    'ts-why-2-title': '10 İllik Təcrübə',
    'ts-why-2-desc': 'İnkişaf etmiş mühəndislik təcrübəsi və sektorial ekspertiza',
    'ts-why-3-title': 'Orijinal Ehtiyat Hissə Anbarı',
    'ts-why-3-desc': 'Daimi hazır ehtiyat üstünlüyü ilə sürətli çatdırılma',
    'ts-why-4-title': 'Zəmanətli Servis',
    'ts-why-4-desc': 'Test uçuşlarından sonra sənədləşdirilmiş təslim',
    'ts-why-5-title': 'Şəffaf Servis Prosesi',
    'ts-why-5-desc': 'Sürətli və sənədləşdirilmiş proses izlənməsi',
    'ts-why-6-title': 'Sahə Texniki Dəstəyi',
    'ts-why-6-desc': 'Sahə dəstəyi ilə fasiləsiz əməliyyat zəmanəti',
    'ts-stock-title': 'Hazır Anbar Üstünlüyü',
    'ts-stock-desc': 'AgroAero Tech, tez-tez istifadə olunan DJI komponentlərinin (motorlar, pervaneler, qollar, sensorlar, gimballar, batareyalar və s.) daimi ehtiyatını saxlayaraq baxım və təmir əməliyyatlarını ən qısa müddətdə tamamlayır.',
    'ts-form-title': 'Servis Tələbi Forması',
    'ts-form-subtitle': 'Dronunuzun baxım və ya təmirə ehtiyacı var? Cihazınızın vəziyyətini bizə bildirmək üçün formanı doldurun. Komandamız cihazı yoxlayacaq və 24 saat ərzində sizə nasazlıq hesabatı və qiymət təklifi göndərəcək.',
    'ts-drone-model': 'Dron Modeli <span class="text-danger">*</span>',
    'ts-service-type': 'Servis Növü <span class="text-danger">*</span>',
    'ts-problem-desc': 'Nasazlıq/Problem Təsviri <span class="text-danger">*</span>',
    'ts-address': 'Ünvan',
    'ts-other': 'Digər',
    'ts-stype-maintenance': 'Dövri Baxım',
    'ts-stype-diagnosis': 'Nasazlıq Diaqnostikası',
    'ts-stype-mechanical': 'Mexaniki Təmir',
    'ts-stype-electronic': 'Elektron Sistem Servisi',
    'ts-stype-calibration': 'Kalibrasiya',
    'ts-stype-battery': 'Batareya Servisi',
    'ts-stype-firmware': 'Firmware Yeniləmə',
    'ts-stype-onsite': 'Sahə Texniki Dəstəyi',
    'ts-problem-placeholder': 'Dronunuzla bağlı problemi ətraflı təsvir edin...',
    'ts-address-placeholder': 'Sahə servisi üçün ünvan (istəyə bağlı)',
  },

  az: {
    // Navbar
    'nav-home': 'Ana səhifə',
    'nav-services': 'Xidmətlərimiz',
    'nav-education': 'Təhsil',
    'nav-corporate': 'Korporativ',
    'nav-certificate': 'Sertifikat yoxlanışı',
    'nav-contact': 'Bizimlə əlaqə',
    'nav-about': 'Haqqımızda və tarixçəmiz',
    'nav-references': 'İstinadlarımız',
    'nav-blog': 'Bloq',
    'nav-agricultural-solutions': 'Dronla kənd təsərrüfatı həlləri',
    'nav-industrial-solutions': 'Dronla sənaye həlləri',
    'nav-event-services': 'Dronla tədbir xidmətləri',
    'nav-technical-service': 'Dron texniki xidmət',
    'nav-certification-education': 'Sertifikatlaşdırma təhsili',
    'nav-agricultural-drone-education': 'Kənd təsərrüfatı dron təhsili',
    'nav-drone-pilot-education': 'Dron pilot təhsili',

    // Hero Section
    'hero-title': 'İHA texnologiyalarında gələcəyi formalaşdırırıq',
    'hero-subtitle': 'AgroAero Tech MMC kənd təsərrüfatı, sənaye və təhlükəsizlik sektorlarında innovativ insansız hava vasitəsi (İHA) həlləri ilə gələcəyin standartlarını müəyyən edir.',
    'hero-cta-service': 'Kənd təsərrüfatı xidməti alın',
    'hero-cta-education': 'Dron təhsili alın',

    // Services Section
    'services-title': 'Xidmətlərimiz',
    'services-subtitle': 'Kənd təsərrüfatı məhsuldarlığını artıran dron texnologiyaları',
    'services-main-title': 'Dronla kənd təsərrüfatı həlləri',
    'service-spraying-title': 'Dron ilə dərmanlama həlləri',
    'service-spraying-desc': 'Kənd təsərrüfatı istehsalında yüksək səmərəlilik, aşağı xərc və ekoloji təmiz tətbiqlər üçün ağıllı PUA (dron) texnologiyaları ilə dəqiq dərmanlama xidməti təklif edirik.',
    'service-spraying-cta': 'Dron ilə dərmanlama xidməti alın',
    'service-fertilizing-title': 'Dronla gübrələmə və toxumçuluq həlləri',
    'service-fertilizing-desc': 'Müasir kənd təsərrüfatında yüksək məhsuldarlıq və aşağı xərc üçün dron dəstəkli gübrələmə həlləri təklif edirik.',
    'service-fertilizing-cta': 'Gübrələmə və toxumçuluq xidməti alın',
    'service-analysis-title': 'Bitki sağlamlığı və məhsuldarlıq analizi',
    'service-analysis-desc': 'Kənd təsərrüfatında məhsuldarlığı artırmaq və məhsul itkilərini minimuma endirmək üçün multispektral kamera texnologiyası ilə bitki sağlamlığı analizi aparırıq.',
    'service-analysis-cta': 'Bitki sağlamlığı və məhsuldarlıq analizi xidməti alın',

    // Service Details
    'service-spraying-feature1': 'Dəqiq dərmanlama texnologiyası',
    'service-spraying-feature1-desc': 'DJI Agras seriyalı kənd təsərrüfatı dronlarımız bitki ehtiyaclarına uyğun dəqiq dərmanlama təmin edir, pestisidlərin ən dəqiq tətbiqini təmin edir',
    'service-spraying-feature2': '30%-ə qədər kimyəvi qənaət',
    'service-spraying-feature2-desc': 'Ağıllı dərmanlama sistemləri kənd təsərrüfatı kimyəvi maddələri və pestisidlərin istifadəsini minimuma endirir',
    'service-spraying-feature3': 'Sürətli və təsirli tətbiq',
    'service-spraying-feature3-desc': 'Böyük ərazilərin sürətli dərmanlanması, engebeli ərazidə belə bərabər paylanma',
    'service-spraying-feature4': 'Ekoloji təmiz və davamlı kənd təsərrüfatı',
    'service-spraying-feature4-desc': 'Düzgün dozaj və nəzarət edilən tətbiq vasitəsilə ətraf mühitə dəyən zərər minimuma endirilir',
    'service-spraying-footer': 'AgroAero Tech MMC müasir dron texnologiyası ilə fermerlərə daha təhlükəsiz, səmərəli və gəlirli kənd təsərrüfatı gələcəyi təklif edir.',

    'service-fertilizing-feature1': 'Dəqiq paylanma texnologiyası',
    'service-fertilizing-feature1-desc': 'GPS və ağıllı səpmə sistemləri hər sahəyə bərabər gübrə tətbiqini təmin edir',
    'service-fertilizing-feature2': 'Xərc və resurs qənaəti',
    'service-fertilizing-feature2-desc': 'Ənənəvi üsullarla müqayisədə 20%-ə qədər az gübrə istifadəsi, əmək və vaxt qənaəti',
    'service-fertilizing-feature3': 'Sürətli və səmərəli tətbiq',
    'service-fertilizing-feature3-desc': 'Böyük ərazilər tez gübrələnir, engebeli ərazidə belə problemsiz işləmə',
    'service-fertilizing-feature4': 'Davamlı kənd təsərrüfatı həlli',
    'service-fertilizing-feature4-desc': 'Düzgün dozaj, düzgün vaxtlama və ekoloji təmiz yanaşma ilə torpaq strukturu qorunur',
    'service-fertilizing-footer': 'AgroAero Tech MMC dron gübrələmə həlləri vasitəsilə fermerlərə daha yüksək məhsuldarlıq, daha aşağı xərc və davamlı kənd təsərrüfatı gələcəyi təklif edir.',

    'service-analysis-feature1': 'Multispektral görüntüləmə',
    'service-analysis-feature1-desc': 'Bitkilərin fotosintez qabiliyyəti, su stresi və qida çatışmazlıqları müxtəlif işıq spektrləri ilə görüntülənir',
    'service-analysis-feature2': 'Erkən xəstəlik və zərərverici aşkarlanması',
    'service-analysis-feature2-desc': 'Yarpaqlardakı stress əlamətləri çılpaq gözlə görünməzdən əvvəl aşkar edilir',
    'service-analysis-feature3': 'Məhsuldarlıq optimallaşdırması və proqnozlaşdırma',
    'service-analysis-feature3-desc': 'Məhsuldarlıq proqnozları və sahə əsaslı tətbiq planları yaradılır',
    'service-analysis-feature4': 'Davamlı kənd təsərrüfatı həlləri',
    'service-analysis-feature4-desc': 'Daha az pestisid və gübrə istifadəsi ilə ətraf mühit qorunur',
    'service-analysis-footer': 'AgroAero Tech MMC ağıllı kənd təsərrüfatı texnologiyaları ilə fermerlər üçün daha sağlam məhsullar və yüksək məhsuldarlıq üçün güclü yoldaşdır.',

    // Education Section
    'education-title': 'Təhsil xidmətləri',
    'education-drone-pilot': 'Dron pilotu təhsili',
    'education-drone-pilot-desc': 'Təsdiqlənmiş dron pilotu təhsilimizlə sertifikatlı pilot olun. Nəzəri və praktik təhsillə peşəkar dron operatoru olmaq yolunda ilk addımı atın.',
    'education-certified-program': 'Təsdiqlənmiş sertifikat proqramı',
    'education-theory-practice': 'Nəzəri və praktik dərslər',
    'education-expert-instructors': 'Mütəxəssis müəllim heyəti',

    // References Section
    'references-title': 'İstinadlarımız',
    'references-subtitle': 'Etibarlı biznes tərəfdaşlarımız.',

    // Tarimsal Cozumler Page
    'page-spraying-title': 'Dron ilə dərmanlama xidməti',
    'page-spraying-desc': 'AgroAero Tech olaraq DJI Agras T50 kənd təsərrüfatı dronlarımızla sahələrinizə dəqiq, sürətli və ekoloji təmiz dərmanlama xidməti təqdim edirik.',
    'page-fertilizing-title': 'Gübrələmə və toxumçuluq xidməti',
    'page-fertilizing-desc': 'AgroAero Tech\'in DJI Agras T50 dronları sayəsində gübrə və toxum səpmə əməliyyatları artıq daha sürətli, dəqiq və səmərəlidir.',
    'page-analysis-title': 'Bitki sağlamlığı və məhsuldarlıq analizi',
    'page-analysis-desc': 'AgroAero Tech\'in multispektral dron texnologiyası sayəsində bitkilərinizin sağlamlığını və tarla vəziyyətini ən ətraflı şəkildə analiz edirik.',
    'page-form-title': 'Kənd təsərrüfatı xidməti müraciəti',

    // Service Benefits
    'spraying-benefit1': '90%-ə qədər su qənaəti – Ənənəvi üsullarla müqayisədə daha az su istehlakı.',
    'spraying-benefit2': '50%-ə qədər vaxt qənaəti – Yüzlərlə hektar qısa müddətdə tamamlanır.',
    'spraying-benefit3': 'Ekoloji həssas tətbiq – Düzgün dozaj, düzgün nöqtə, minimum ekoloji təsir.',
    'spraying-benefit4': 'Məhsuldarlıq artımı – Daha sağlam bitkilər, daha güclü məhsullar.',

    'fertilizing-benefit1': 'Bərabər paylanma – İnkişaf etmiş dəqiqlik sensorları sayəsində gübrə və toxumlar tarlanın hər nöqtəsinə homojen şəkildə paylanır.',
    'fertilizing-benefit2': 'Vaxt qənaəti – Böyük ərazilər ənənəvi üsullarla müqayisədə daha qısa müddətdə tamamlanır.',
    'fertilizing-benefit3': 'Xərc üstünlüyü – Daha az əmək, daha aşağı yanacaq və avadanlıq xərcləri.',
    'fertilizing-benefit4': 'Maksimum səmərəlilik – Düzgün dozaj ilə bitkiləriniz daha sürətli inkişaf edir və məhsuldarlıq artır.',

    'analysis-benefit1': 'Erkən diaqnoz – Bitkilərdə stress, xəstəlik və ya qida çatışmazlığını gözlə görünməzdən əvvəl aşkar edin.',
    'analysis-benefit2': 'Məhsuldarlıq artımı – Düzgün gübrələmə, suvarma və püskürtmə qərarları ilə məhsulunuzun inkişafını sürətləndirin.',
    'analysis-benefit3': 'Xərc qənaəti – Lazımsız püskürtmə və suvarma ilə istehsal xərclərini azaldın.',
    'analysis-benefit4': 'Dəqiq məlumatlar – NDVI, NDRE və digər spektral xəritələr vasitəsilə tarlanızın vəziyyətini rəqəmsal məlumatlarla görün.',
    'analysis-benefit5': 'Davamlı kənd təsərrüfatı – Daha az resurs istifadəsi ilə ətraf mühiti qoruyun.',

    // Form Fields
    'form-service-type': 'Xidmət növü *',
    'form-name': 'Ad Soyad *',
    'form-phone': 'Telefon *',
    'form-email': 'E-poçt *',
    'form-address': 'Ünvan *',
    'form-field-size': 'Tarla ölçüsü (Hektar) *',
    'form-crop-type': 'Məhsul növü *',
    'form-message': 'Mesaj',
    'form-submit': 'Müraciəti göndər',
    'form-select': 'Seçin',

    // Service Details
    'spraying-detail': 'DJI Agras T50\'nin yüksək tutumlu tankları və ağıllı püskürtmə sistemləri sayəsində bir gündə yüzlərlə hektar ərazini ən səmərəli şəkildə püskürtürük.',
    'spraying-cta-text': 'AgroAero Tech ilə əməkdaşlıq edərək, daha aşağı xərc, daha yüksək məhsuldarlıq və daha davamlı kənd təsərrüfatı əldə edin.',
    'fertilizing-detail': 'Dron texnologiyası sayəsində həm gübrələmə həm də toxum səpmə əməliyyatlarında təbiəti qoruyan, fermerə qazandıran müasir həllər təklif edirik.',
    'fertilizing-cta-text': 'AgroAero Tech ilə kənd təsərrüfatında gələcəyi tutun!',
    'analysis-detail': 'Multispektral analiz ilə hansı bölgənin daha çox gübrəyə, suya və ya müdaxiləyə ehtiyacı olduğunu müəyyən edir, sizə elmi məlumatlara əsaslanan kənd təsərrüfatı idarəçiliyi təklif edirik.',
    'analysis-cta-text': 'AgroAero Tech ilə artıq qərarlarınız təxminə deyil, texnologiya və məlumatlara əsaslanacaq.',

    // Service Types
    'service-type-spraying': 'Dərmanlama xidməti',
    'service-type-fertilizing': 'Gübrələmə və toxumçuluq',
    'service-type-analysis': 'Bitki sağlamlığı və məhsuldarlıq analizi',
    'service-type-all': 'Bütün xidmətlər',

    // Form Elements
    'legal-approvals': 'Hüquqi təsdiqləmələr *',
    'form-message-placeholder': 'Xidmət haqqında xüsusi tələblərinizi qeyd edin...',

    // Crop Types
    'crop-cotton': 'Pambıq',
    'crop-corn': 'Qarğıdalı',
    'crop-rice': 'Düyü',
    'crop-wheat': 'Buğda',
    'crop-other': 'Digər',

    // Footer Section
    'footer-company-desc': 'İHA texnologiyalarında öncü, təhsildə etibarlı. Gələcəyin aviasiya texnologiyalarını bu gündən təcrübə edin.',
    'footer-quick-menu': 'Sürətli menyu',
    'footer-contact': 'Əlaqə',
    'footer-social-media': 'Sosial media',
    'footer-social-desc': 'Cari xəbərlər və inkişaflar üçün bizi izləyin.',
    'footer-copyright': 'Bütün hüquqlar qorunur.',
    'footer-privacy': 'Məxfilik siyasəti',

    // Legal Texts
    'legal-kvkk-link': 'KVKK Məlumatlandırma Mətni',
    'legal-kvkk-text': 'oxudum və başa düşdüm.',
    'legal-privacy-link': 'Məxfilik Siyasəti',
    'legal-privacy-text': 'oxudum və qəbul edirəm.',
    'legal-gdpr-link': 'GDPR çərçivəsində Açıq Razılıq Mətni',
    'legal-gdpr-text': 'təsdiq edirəm.',

    // Legal Error Messages
    'legal-kvkk-error': 'KVKK mətnini təsdiq etməlisiniz.',
    'legal-privacy-error': 'Məxfilik siyasətini qəbul etməlisiniz.',
    'legal-gdpr-error': 'GDPR razılıq mətnini təsdiq etməlisiniz.',
    'legal-privacy-link': 'Məxfilik Siyasəti',
    'legal-privacy-text': 'oxudum və qəbul edirəm.',
    'legal-gdpr-link': 'GDPR çərçivəsində Açıq Razılıq Mətni',
    'legal-gdpr-text': 'təsdiq edirəm.',

    // Legal Error Messages
    'legal-kvkk-error': 'KVKK mətnini təsdiq etməlisiniz.',
    'legal-privacy-error': 'Məxfilik siyasətini qəbul etməlisiniz.',
    'legal-gdpr-error': 'GDPR razılıq mətnini təsdiq etməlisiniz.',

    // Certification Education Page
    'cert-hero-title': 'Təsdiqlənmiş Dron Pilotu Sertifikatlaşdırma Təhsili',
    'cert-hero-subtitle': 'Azərbaycanda fəaliyyət göstərən AgroAero Tech MMC olaraq, <strong>təsdiqlənmiş dron sertifikatı</strong> ilə beynəlxalq standartlara uyğun peşəkar dron pilotu təhsilləri təklif edirik.',
    'cert-apply-btn': 'Müraciət et',
    'cert-why-title': 'Niyə bizimlə Dron Pilotu Təhsili?',
    'cert-feature1-title': 'Nəzəri və Praktik Təhsil',
    'cert-feature1-desc': 'İştirakçılar həm sinif mühitində həm də sahədə tətbiqi təhsillə peşəkar bilgi əldə edirlər.',
    'cert-feature2-title': 'Beynəlxalq Standartlar',
    'cert-feature2-desc': 'Təhsil məzmunlarımız ICAO və regional aviasiya orqanlarının qaydalarına uyğun şəkildə hazırlanır.',
    'cert-feature3-title': 'Geniş Əhatə',
    'cert-feature3-desc': 'Kənd təsərrüfatı ilaçlama dronları (DJI Agras T50/T40 və s.), sənaye kəşfiyyatı və görüntüləmə dronları ilə əhatəli təhsil.',
    'cert-feature4-title': 'Təsdiqlənmiş Dron Sertifikatı',
    'cert-feature4-desc': 'Təhsili uğurla tamamlayan iştirakçılara <strong>təsdiqlənmiş Dron Pilotu Sertifikatı</strong> verilir və sertifikat sorğulana bilər.',
    'cert-who-title': 'Kimlər iştirak edə bilər?',
    'cert-req1': '18 yaşını doldurmuş Azərbaycan vətəndaşları',
    'cert-req2': 'Ən azı orta məktəb məzunu',
    'cert-req3': 'İngilis dili əsas səviyyə',
    'cert-target1': 'Kənd təsərrüfatı sektorunda çalışan fermerlər və ziraat mühəndisləri',
    'cert-target2': 'Sənaye sahəsində dron istifadə etmək istəyən texniki mütəxəssislər',
    'cert-target3': 'Yeni peşə əldə etmək istəyən gənc sahibkarlar',
    'cert-info-title': 'Təhsil Məlumatları',
    'cert-duration-title': 'Müddət',
    'cert-duration-desc': 'Dron Pilotu Təhsili (36 Saat)<br>16 saat nəzəri + 8 saat texniki + 12 saat praktik',
    'cert-capacity-title': 'Sinif Mevcudu',
    'cert-capacity-desc': 'Maksimum 16 Nəfər<br>(minimum iştirak 10 nəfər)',
    'cert-dates-title': 'Təhsil Tarixləri',
    'cert-dates-desc': 'Kifayət qədər sayya çatdığımız hər həftə<br>Minimum iştirakçı sayına görə planlaşdırılır',
    'cert-countries-title': 'Ölkələr',
    'cert-countries-desc': 'Azərbaycan',
    'cert-program-title': 'Təhsil Proqramı',
    'cert-theory-title': 'Nəzəri Təhsil (16 Saat)',
    'cert-theory1': '• Aviasiya Qanunvericiliyi',
    'cert-theory2': '• İHA Sistemləri',
    'cert-theory3': '• Meteorologiya',
    'cert-theory4': '• Naviqasiya',
    'cert-theory5': '• Hava Sahəsi',
    'cert-theory6': '• Təhlükəsizlik Prosedurları',
    'cert-theory7': '• Təcili Vəziyyət İdarəetməsi',
    'cert-theory8': '• İnsan Amilləri',
    'cert-technical-title': 'Texniki Təhsil (8 Saat)',
    'cert-tech1': '• İHA Avadanlıq Bilikləri',
    'cert-tech2': '• Motor və Pərvanə Sistemləri',
    'cert-tech3': '• Batareya Texnologiyaları',
    'cert-tech4': '• Sensor Sistemləri',
    'cert-tech5': '• Baxım və Təmir',
    'cert-tech6': '• Nasazlıq Aşkarlanması',
    'cert-practical-title': 'Praktik Təhsil (12 Saat)',
    'cert-prac1': '• Uçuşdan Əvvəl Yoxlamalar',
    'cert-prac2': '• Əsas Uçuş Manevraları',
    'cert-prac3': '• Avtonom Uçuş',
    'cert-prac4': '• Təcili Vəziyyət Prosedurları',
    'cert-prac5': '• İmtahan Hazırlığı',
    'cert-prac6': '• Sertifikat İmtahanı',
    'cert-form-title': 'Sertifikatlaşdırma Müraciət Formu',
    'cert-form-subtitle': 'Aşağıdakı formu doldurararaq bizimlə əlaqə saxlaya bilərsiniz. Ən qısa müddətdə sizə geri dönüş edəcəyik.',
    'cert-fin-label': 'FIN Kodu *',
    'cert-fin-placeholder': 'Nümunə: 1AB2C3D',
    'cert-phone-placeholder': '+994 xx xxx xx xx',
    'cert-photo-label': 'Şəxsiyyət Fotosu *',
    'cert-judicial-label': 'Məhkəmə Qeydiyyatı Arayışı *',
    'cert-population-label': 'Əhali Qeydiyyatı Nümunəsi *',
    'cert-file-format': 'JPG, PNG, PDF formatında, maksimum 5MB',
    'cert-submit-btn': 'Müraciəti Göndər',

    // Agricultural Drone Education Page
    'agri-hero-title': 'Kənd Təsərrüfatı Dron Təlimi',
    'agri-hero-subtitle': 'Hobbi məqsədli və şəxsi inkişaf yönümlü dron təlimi ilə kənd təsərrüfatı tətbiqlərində dron istifadəsini öyrənin.',
    'agri-apply-btn': 'Müraciət et',
    'agri-hobby-title': 'Hobbi Məqsədli Dron Təlimi',
    'agri-hobby-desc': 'Kənd təsərrüfatı tətbiqlərində dron istifadəsini öyrənmək istəyənlər üçün <strong>hobbi məqsədli təlim proqramı</strong>. Azərbaycanda fəaliyyət göstərən AgroAero Tech MMC olaraq, şəxsi inkişaf və hobbi yönümlü dron təlimləri təklif edirik. Bu təlimin sonunda yalnız iştirak sertifikatı verilir və heç bir təsdiq və ya rəsmilik daşımır.',
    'agri-why-title': 'Niyə Bizimlə Hobbi Məqsədli Dron Təlimi?',
    'agri-feature1-title': 'Nəzəri və Praktik Təlim',
    'agri-feature1-desc': 'İştirakçılar həm sinif mühitində həm də sahədə tətbiqi təlimlə peşəkar bilik əldə edirlər.',
    'agri-feature2-title': 'Beynəlxalq Standartlar',
    'agri-feature2-desc': 'Təlim məzmunlarımız ICAO və regional aviasiya orqanlarının qaydalarına uyğun şəkildə hazırlanır.',
    'agri-feature3-title': 'Geniş Əhatə',
    'agri-feature3-desc': 'Kənd təsərrüfatı püskürtmə dronları (DJI Agras T50/T40 və s.), sənaye kəşfiyyatı və görüntüləmə dronları ilə əhatəli təlim.',
    'agri-feature4-title': 'İştirak Sertifikatı',
    'agri-feature4-desc': 'Təlimi uğurla tamamlayan iştirakçılara yalnız <strong>iştirak sertifikatı</strong> verilir. Bu sertifikat təsdiqlənmiş sertifikat deyil və heç bir rəsmilik daşımır.',
    'agri-who-title': 'Kimlər İştirak Edə Bilər?',
    'agri-requirements-title': 'Ümumi Şərtlər',
    'agri-req1': '18 yaşını doldurmuş Azərbaycan vətəndaşları',
    'agri-req2': 'Ən azı orta məktəb məzunu',
    'agri-req3': 'İngilis dili əsas səviyyə (ICAO Level 2)',
    'agri-target-title': 'Hədəf Kütlə',
    'agri-target1': 'Kənd təsərrüfatı sektorunda çalışan fermerlər və ziraat mühəndisləri',
    'agri-target2': 'Sənaye sahəsində dron istifadə etmək istəyən texniki mütəxəssislər',
    'agri-target3': 'Yeni peşə əldə etmək istəyən gənc sahibkarlar',
    'agri-target4': 'Hobbi məqsədli dron istifadəsini öyrənmək istəyən hər kəs',
    'agri-program-title': '📌 Təlim Proqramı',
    'agri-theory-title': 'Nəzəri Təlim (16 Saat)',
    'agri-theory1': '• Aviasiya Qanunvericiliyi',
    'agri-theory2': '• İHA Sistemləri',
    'agri-theory3': '• Meteorologiya',
    'agri-theory4': '• Naviqasiya',
    'agri-theory5': '• Hava Sahəsi',
    'agri-theory6': '• Təhlükəsizlik Prosedurları',
    'agri-theory7': '• Fövqəladə Hal İdarəetməsi',
    'agri-theory8': '• İnsan Amilləri',
    'agri-technical-title': 'Texniki Təlim (8 Saat)',
    'agri-tech1': '• İHA Avadanlıq Bilikləri',
    'agri-tech2': '• Motor və Pərvanə Sistemləri',
    'agri-tech3': '• Batareya Texnologiyaları',
    'agri-tech4': '• Sensor Sistemləri',
    'agri-tech5': '• Baxım və Təmir',
    'agri-tech6': '• Nasazlıq Aşkarlanması',
    'agri-practical-title': 'Praktik Təlim (12 Saat)',
    'agri-prac1': '• Uçuşdan Əvvəl Yoxlamalar',
    'agri-prac2': '• Əsas Uçuş Manevraları',
    'agri-prac3': '• Avtonom Uçuş',
    'agri-prac4': '• Fövqəladə Hal Prosedurları',
    'agri-prac5': '• İmtahan Hazırlığı',
    'agri-prac6': '• Qiymətləndirmə Testi',
    'agri-form-title': 'Kənd Təsərrüfatı Dron Təlimi Müraciət Forması',
    'agri-form-subtitle': 'Aşağıdakı formu doldurararaq bizimlə əlaqə saxlaya bilərsiniz. Ən qısa müddətdə sizə geri dönüş edəcəyik.',
    'agri-phone-placeholder': '+994 xx xxx xx xx',
    'agri-message-placeholder': 'Təlim haqqında suallarınız və ya xüsusi istəkləriniz...',
    'agri-submit-btn': 'Müraciəti Göndər',

    // Drone Pilot Education Page
    'pilot-select-btn': 'Seç',

    // Corporate Page
    'corporate-page-title': 'Haqqımızda və Tarixçəmiz',
    'corporate-page-subtitle': 'Azərbaycanda kənd təsərrüfatı rəqəmsal transformasiyanın öncüsü',
    'corporate-about-title': 'Haqqımızda',
    'corporate-about-desc1': 'AgroAero Tech MMC, 2024-cü ildə Azərbaycanda kənd təsərrüfatı ilaçlama xidmətlərini müasir dron texnologiyaları ilə birləşdirmək məqsədi ilə qurulmuşdur. Şirkətimiz, fermerlərə yüksək məhsuldarlıq, aşağı xərc və ekoloji təmiz həllər təklif edərək kənd təsərrüfatında yeni dövrün öncüsü olmağı hədəfləyir.',
    'corporate-about-desc2': 'İstifadə etdiyimiz DJI Agras T50 dronları, pambıq, qarğıdalı, düyü və digər strateji məhsullarda ilaçlamanı ən dəqiq və səmərəli şəkildə həyata keçirir. İnkişaf etmiş püskürtmə sistemləri ilə bir dəfədə yüzlərlə hektar sahə qısa müddətdə ilaçlana bilir, beləliklə həm vaxt həm də xərc üstünlüyü təmin edilir.',
    'corporate-feature1': '%90 Su Qənaəti',
    'corporate-feature2': 'DJI Agras T50 Donanması',
    'corporate-feature3': '7/24 Peşəkar Dəstək',
    'corporate-feature4': 'NDVI Multispektral Analiz',
    'corporate-mission-title': 'Missiyamız',
    'corporate-mission-desc': 'Missiyamız, inkişaf etmiş dron texnologiyaları ilə sürətli, təhlükəsiz və səmərəli ilaçlama xidmətləri təklif edərək fermerlərin istehsal gücünü artırmaqdır.',
    'corporate-mission1': 'Kənd təsərrüfatı ilaçlamasında yenilikçi üsullar inkişaf etdirmək',
    'corporate-mission2': 'Fermerlərə vaxt və xərc üstünlüyü təmin etmək',
    'corporate-mission3': 'Ətraf mühitə həssas, davamlı kənd təsərrüfatı tətbiqlərini dəstəkləmək',
    'corporate-mission4': 'Dron pilotluğu təlimləri ilə sektora ixtisaslı mütəxəssislər qazandırmaq',
    'corporate-vision-title': 'Vizyonumuz',
    'corporate-vision-desc': 'AgroAero Tech olaraq vizyonumuz, Azərbaycanda və bölgədə kənd təsərrüfatında rəqəmsal transformasiyanın lideri olmaq, müasir dron texnologiyaları ilə kənd təsərrüfatı istehsalında məhsuldarlığı ən yüksək səviyyəyə çıxarmaqdır. Daha az su və ilaç istifadə edərək ekoloji təmiz həllər təklif etmək, fermerlərimin xərclərini azaltmaqla davamlı kənd təsərrüfatını dəstəkləmək əsas hədəfimizdir.',
    'corporate-history-title': 'Tarixçəmiz',
    'corporate-history-subtitle': '"Daha məhsuldar kənd təsərrüfatı, daha güclü gələcək" anlayışı ilə səyahətimiz',
    'corporate-timeline1-title': '2024 - Quruluş',
    'corporate-timeline1-desc': 'AgroAero Tech MMC, kənd təsərrüfatında yenilikçi texnologiyaların tətbiqi məqsədi ilə 2024-cü ildə qurulmuşdur. Azərbaycanda kənd təsərrüfatı istehsalında məhsuldarlığı artırmaq, su və ilaç istifadəsində qənaət təmin etmək və müasir kənd təsərrüfatı üsullarını fermerlə buluşdurmaq vizyonu ilə yola çıxmışdır.',
    'corporate-timeline2-title': '2024 - DJI Agras T50 Donanması',
    'corporate-timeline2-desc': 'Quruluşundan qısa müddət sonra, dünyanın ən inkişaf etmiş kənd təsərrüfatı dronlarından biri olan DJI Agras T50 donanmasını işə salaraq pambıq, qarğıdalı, düyü və digər strateji bitkilərdə ilaçlama işlərinə başlamışdır. Müasir püskürtmə sistemləri sayəsində %90-a qədər su qənaəti təmin edilərkən, eyni zamanda ətraf mühitə verilən zərər minimuma endirilmişdir.',
    'corporate-timeline3-title': '2024 - Saha Əməliyyatları',
    'corporate-timeline3-desc': '2024-cü il ərzində, AgroAero Tech ölkə üzrə bir çox rayonda kənd təsərrüfatı ilaçlama xidməti təklif edərək, fermerlə etimada əsaslanan əməkdaşlıqlar inkişaf etdirmişdir.',
    'corporate-timeline4-title': '2025 - Texnologiyaya Yön Verən Təlimlər',
    'corporate-timeline4-desc': 'Saha əməliyyatlarındakı təcrübəmizi təhsillə tamamlayırıq! 2025-ci ildən etibarən, Azərbaycanda texnoloji kənd təsərrüfatının və insansız sistemlərin gələcəyini qurmaq üçün peşəkar təlim fəaliyyətlərimizə başladıq.',
    'corporate-timeline5-title': '2025 - Strateji Tərəfdaşlıqlar',
    'corporate-timeline5-desc': 'Eyni il, MKT İstehsalat Kommersiya MMC kimi böyük kənd təsərrüfatı istehsal şirkətləri ilə strateji razılaşmalar edilərək xidmət şəbəkəmiz genişləndirilmişdir. Beləliklə, həm özəl sektor həm də fermer birliklər ilə güclü əməkdaşlıq modeli yaradılmışdır.',
    'corporate-services-title': 'Xidmət Sahələrimiz',
    'corporate-services-subtitle': 'Bu gün AgroAero Tech, Azərbaycanın ən etibarlı kənd təsərrüfatı texnologiyaları şirkətlərindən biri kimi fəaliyyət göstərir',
    'corporate-service1-title': 'Dron ilə Kənd Təsərrüfatı Həlləri',
    'corporate-service1-desc': 'Dəqiq ilaçlama, bitki sağlamlığı analizi və məhsuldarlıq optimallaşdırması ilə fermerlərimin yanındayıq',
    'corporate-service2-title': 'Dron ilə Sənaye Həlləri',
    'corporate-service2-desc': 'Enerji, təhlükəsizlik, xəritəçəkmə və yoxlama sahələrində peşəkar dron xidmətləri',
    'corporate-service3-title': 'Dron Pilot Təlimi',
    'corporate-service3-desc': 'Sertifikatlı təlimatçılarla peşəkar dron pilotu yetişdiririk',
    'corporate-team-title': 'Təlimatçılarımız',
    'corporate-team-subtitle': 'Sahəsində mütəxəssis, təcrübəli təlimatçı heyətimiz',
    'corporate-instructor1-title': 'İHA 2 PİLOTU',
    'corporate-instructor1-desc': '50.000 Hektar Dronla İlaçlama Təcrübəsi',
    'corporate-instructor2-title': 'İHA 2 TƏLİMATÇISI',
    'corporate-instructor2-desc': 'Təlimatçı - 10 İllik Aviasiya Təcrübəsi',

    // References Page
    'references-page-title': 'İstinadlarımız',
    'references-page-subtitle': 'Etibarlı iş ortaqlarımız.',
    'references-cta-title': 'Siz də Referanslarımıza Qoşulun',
    'references-cta-desc': 'İHA texnologiyaları ilə işinizi bir üst səviyyəyə qaldırmaq üçün bizimlə əlaqə saxlayın və xüsusi həllərimizi kəşf edin.',
    'references-cta-quote': 'Təklif Al',
    'references-cta-call': 'Dərhal Zəng Et',

    // Blog Page
    'blog-loading': 'Yüklənir...',
    'blog-loading-text': 'Blog yazıları yüklənir...',
    'blog-js-warning': 'Blog yazılarını görmək üçün JavaScript\'i aktivləşdirin.',
    'blog-no-posts': 'Hələ blog yazısı yoxdur.',
    'blog-error': 'Blog yazıları yüklənərkən xəta baş verdi.',
    'blog-read-more': 'Davamını Oxu',

    // Common
    'learn-more': 'Ətraflı məlumat alın',
    'get-service': 'Xidmət al',
    'contact-us': 'Bizimlə əlaqə',

    // Contact Page
    'contact-page-title': 'Bizimlə əlaqə',
    'contact-page-subtitle': 'İHA təlimi və xidmətlərimiz haqqında məlumat almaq üçün bizimlə əlaqə saxlayın',
    'contact-form-title': 'Əlaqə Forması',
    'contact-form-subtitle': 'Aşağıdakı formu dolduraraq bizimlə əlaqə saxlaya bilərsiniz. Ən qısa zamanda sizə geri dönüş edəcəyik.',
    'form-address-optional': 'Ünvan (İstəyə bağlı)',
    'form-phone-placeholder': '+994 xx xxx xx xx',
    'form-message-placeholder': 'Mesajınızı daxil edin...',
    'location-section-title': 'Yerləşməmiz',
    'location-view-on-map': 'Xəritədə Bax',
    'location-get-directions': 'Yol Tərifini Al',

    // Industrial Solutions Page
    'ind-inspection-title': 'Sənaye Yoxlaması və Analizi',
    'ind-inspection-desc': 'Yüksək texnologiyalı dron sistemləri ilə sənaye obyektləriniz üçün hərtərəfli yoxlama və analiz xidmətləri.',
    'ind-inspection-cta': 'Yoxlama və Analiz Xidməti Al',
    'ind-energy-title': 'Enerji İnfrastrukturu Nəzarəti',
    'ind-energy-desc': 'Enerji sektoru üçün hərtərəfli dron yoxlama və nəzarət həlləri.',
    'ind-energy-cta': 'Enerji Nəzarəti Xidməti Al',
    'ind-security-title': 'Təhlükəsizlik Həlləri',
    'ind-security-desc': 'Süni intellekt dəstəkli dron təhlükəsizlik sistemləri ilə obyektlərinizi 7/24 qoruyun.',
    'ind-security-cta': 'Təhlükəsizlik Həlli Al',
    'ind-digital-title': 'Rəqəmsal Həllər',
    'ind-digital-desc': '3D modelləmə, rəqəmsal əkiz texnologiyası və ağıllı daşınmaz əmlak həlləri.',
    'ind-digital-cta': 'Rəqəmsal Həll Al',
    'ind-form-title': 'Sənaye Xidməti Müraciəti',
    'ind-service-inspection': 'Yoxlama və Analiz',
    'ind-service-energy': 'Enerji İnfrastrukturu Nəzarəti',
    'ind-service-security': 'Təhlükəsizlik Həlləri',
    'ind-service-digital': 'Rəqəmsal Həllər',
    'form-company': 'Şirkət Adı',
    'form-project-area': 'Layihə Sahəsi (m²)',
    'form-sector': 'Sektor *',
    'sector-energy': 'Enerji',
    'sector-construction': 'Tikinti',
    'sector-mining': 'Mədənçilik',
    'sector-manufacturing': 'İstehsal',
    'sector-realestate': 'Daşınmaz Əmlak',
    'sector-events': 'Tədbirlər/Təşkilat',
    'sector-other': 'Digər',
    'ind-mapping-title': 'Xəritəçəkmə və Ərazi Ölçmə:',
    'ind-mapping-desc': 'Yüksək keyfiyyətli kameralar və LIDAR sistemləri ilə ərazilərin 3D modellərinin, maillik xəritələrinin və ölçmə hesabatlarının hazırlanması.',
    'ind-air-title': 'Hava Analizi (Sniffer):',
    'ind-air-desc': 'Dronlara inteqrasiya edilmiş sensorlarla sənaye obyektlərində qaz sızmasının aşkarlanması və ətraf mühit keyfiyyətinin ölçülməsi.',
    'ind-inspection-footer': 'LIDAR texnologiyası ilə santimetr dəqiqliyində ölçmələr, multispektral kameralarla ətraflı analizlər təklif edirik.',
    'ind-powerline-title': 'Elektrik Paylama Xətti Nəzarəti:',
    'ind-powerline-desc': 'Enerji xətlərinin yüksək keyfiyyətli şəkillər və termal məlumatlarla yoxlanılması.',
    'ind-wind-title': 'Külək Turbini Yoxlaması:',
    'ind-wind-desc': 'Turbin qanadlarındakı çatlar, paslanma kimi struktur problemlərin termal kameralarla aşkarlanması.',
    'ind-solar-title': 'Günəş Paneli Yoxlaması:',
    'ind-solar-desc': 'Termal kameralarla panellərdəki temperatur fərqlərinin ölçülməsi və nasaz hüceyrələrin aşkarlanması.',
    'ind-energy-footer': 'Enerji infrastrukturunuzun təhlükəsizliyini və səmərəliliyini dron texnologiyası ilə maksimuma çatdırın.',
    'ind-autonomous-title': 'Avtonom Təhlükəsizlik Sistemləri:',
    'ind-autonomous-desc': 'Sərhəd bölgələri və fabriklər kimi ərazilərdə 7/24 patrul edən, təhdidləri aşkarlayan süni intellekt dəstəkli dron sistemləri.',
    'ind-fire-title': 'Yanğın Təhlükəsizliyi:',
    'ind-fire-desc': 'Termal kameralarla yanğın riskli ərazilərin erkən aşkarlanması və yanğın zamanı sürətli müdaxilə dəstəyi.',
    'ind-security-footer': 'İnkişaf etmiş sensorlar və süni intellekt alqoritmləri ilə proaktiv təhlükəsizlik həlləri təklif edirik.',
    'ind-3d-title': '3D Modelləmə:',
    'ind-3d-desc': 'Bina və obyektlərin rəqəmsal surətlərinin yüksək dəqiqliklə yaradılması.',
    'ind-twin-title': 'Rəqəmsal Əkiz:',
    'ind-twin-desc': 'Fiziki aktivlərin IoT sensorları ilə inteqrasiya edilərək canlı məlumatlarla idarə olunan virtual surətlərinin yaradılması.',
    'ind-tour-title': 'Virtual Tur:',
    'ind-tour-desc': 'Məkanların həm havadan həm yerdən 360 dərəcə interaktiv şəkildə gəzilməsini təmin edən rəqəmsal turlar.',
    'ind-realestate-title': 'Ağıllı Daşınmaz Əmlak Satış Platforması:',
    'ind-realestate-desc': '3D modellər və süni intellekt botları ilə dəstəklənən daşınmaz əmlak satış və təqdimat platforması.',

    // Drone Event Services Page
    'event-swarm-title': 'Dron ilə Tədbir Xidmətləri',
    'event-swarm-desc': 'Səmanı kətanınıza çevirin! Yüzlərlə dronla sinxron işıq şouları və nəhəng ekran reklamları.',
    'event-swarm-cta': 'Dron ilə Tədbir Xidmətləri Təklifi Al',
    'event-screen-title': 'Ekranlı Dron Reklamçılığı',
    'event-screen-desc': 'Səmada nəhəng ekran! Dronlarla video və loqo proyeksiyası.',
    'event-screen-cta': 'Dron Reklamçılıq Təklifi Al',
    'event-form-title': 'Tədbir Xidməti Müraciəti',
    'event-service-swarm': 'İşıqlı Sürü Dron Şousu',
    'event-service-screen': 'Ekranlı Dron Reklamçılığı',
    'event-service-both': 'Hər İki Xidmət',
    'form-event-date': 'Tədbir Tarixi *',
    'form-event-type': 'Tədbir Növü *',
    'form-event-location': 'Tədbir Yeri *',
    'form-event-details': 'Tədbir Detalları və Xüsusi İstəklər',
    'form-event-location-placeholder': 'Şəhər, məkan adı',
    'form-event-details-placeholder': 'Tədbiriniz haqqında ətraflı məlumat, göstərilməsini istədiyiniz loqo/yazı/animasiya və s.',
    'form-project-details-placeholder': 'Layihəniz haqqında ətraflı məlumat verin...',
    'event-type-opening': 'Açılış Mərasimi',
    'event-type-festival': 'Festival / Konsert',
    'event-type-corporate': 'Korporativ Tədbir',
    'event-type-wedding': 'Toy / Xüsusi Gün',
    'event-type-launch': 'Məhsul Təqdimatı',
    'event-type-sports': 'İdman Tədbiri',
    'event-type-other': 'Digər',
    'event-swarm-sync': 'Sinxron Hərəkət:',
    'event-swarm-sync-desc': 'Xüsusi proqram təminatı ilə koordinasiya edilən yüzlərlə dron səmada mükəmməl uyğunluqla hərəkət edir.',
    'event-swarm-design': 'Xüsusi Dizaynlar:',
    'event-swarm-design-desc': 'Loqolar, formalar, yazılar və animasiyalar səmada canlanır.',
    'event-swarm-events': 'Hər Tədbir Üçün:',
    'event-swarm-events-desc': 'Açılışlar, festivallar, bayramlar, korporativ tədbirlər və xüsusi günlər.',
    'event-swarm-safe': 'Təhlükəsiz və Ekoloji:',
    'event-swarm-safe-desc': 'Atəşfəşanlığa alternativ, səssiz və ekoloji təmiz şou.',
    'event-swarm-footer': 'Unudulmaz anlar yaradın, brendinizi səmaya qaldırın!',
    'event-screen-giant': 'Nəhəng Ekran Yaratma:',
    'event-screen-giant-desc': 'Dronlar səmada video və vizualları proyeksiya etmək üçün nəhəng LED ekran yaradır.',
    'event-screen-impact': 'Maksimum Təsir:',
    'event-screen-impact-desc': 'Ənənəvi reklamçılıqdan kənarda, yüksək viral potensiallı diqqət çəkən tanıtım.',
    'event-screen-video': 'Video Yayımı:',
    'event-screen-video-desc': 'Loqolar, tanıtım videoları, mesajlar və animasiyalar səmada yayımlanır.',
    'event-screen-reach': 'Geniş Auditoriyaya Çatma:',
    'event-screen-reach-desc': 'Açıq hava tədbirlərində eyni anda minlərlə insana çatın.',
    'event-screen-footer': 'Reklamçılıqda yeni bir dövr başladın!',

    // Page Titles
    'industrial-page-title': 'Sənaye Dron Həlləri | Yoxlama, Xəritəçəkmə, Təhlükəsizlik - AgroAeroTech',
    'event-page-title': 'Dron ilə Tədbir Xidmətləri | Sürü Dron Şousu, Dron Reklamçılıq - AgroAeroTech',

    // Legal Pages
    'legal-kvkk-page-title': 'KVKK Məlumatlandırma Mətni | AgroAeroTech',
    'legal-kvkk-title': 'KVKK Məlumatlandırma Mətni',
    'legal-kvkk-subtitle': 'Şəxsi Məlumatların Qorunması haqqında 6698 saylı Qanun çərçivəsində məlumatlandırma.',
    'legal-kvkk-content': 'Şəxsi məlumatlarımın 6698 saylı Şəxsi Məlumatların Qorunması haqqında Qanun çərçivəsində; təhsil müraciəti, qeydiyyat, sertifikasiya və məlumatlandırma proseslərinin həyata keçirilməsi məqsədilə işlənməsinə və lazım olduqda müvafiq rəsmi qurumlarla paylaşılmasına razılıq verirəm.',
    'legal-privacy-page-title': 'Məxfilik Siyasəti | AgroAeroTech',
    'legal-privacy-title': 'Məxfilik Siyasəti',
    'legal-privacy-subtitle': 'Şəxsi məlumatlarınızın məxfiliyini və təhlükəsizliyini qorumağı öhdəmizə götürürük.',
    'legal-privacy-intro': 'AgroAero Tech MMC olaraq, şəxsi məlumatlarınızın məxfiliyini və təhlükəsizliyini qorumağı öhdəmizə götürürük.',
    'legal-privacy-section1-title': '1. Toplanan Şəxsi Məlumatlar',
    'legal-privacy-section1-content': 'Müraciət prosesində ad, soyad, telefon, e-poçt, ünvan və təhsil məlumatlarınızı tələb edə bilərik.',
    'legal-privacy-section2-title': '2. Məlumatların İstifadə Məqsədləri',
    'legal-privacy-section2-content': 'Təhsil qeydləri, sertifikat hazırlanması və məlumatlandırma məqsədilə istifadə olunur.',
    'legal-privacy-section3-title': '3. Məlumatların Qorunması',
    'legal-privacy-section3-content': 'Məlumatlar təhlükəsiz serverlərdə şifrələnmiş şəkildə saxlanılır.',
    'legal-privacy-section4-title': '4. Əlaqə',
    'legal-gdpr-page-title': 'GDPR Çərçivəsində Açıq Razılıq Mətni | AgroAeroTech',
    'legal-gdpr-title': 'GDPR Çərçivəsində Açıq Razılıq Mətni',
    'legal-gdpr-subtitle': 'Avropa İttifaqı Ümumi Məlumat Qoruma Qaydası (GDPR) uyğun olaraq məlumatlandırma.',
    'legal-gdpr-content': 'Şəxsi məlumatlarımın Avropa İttifaqı Ümumi Məlumat Qoruma Qaydası (GDPR) uyğun olaraq; yalnız təhsil qeydiyyatı, sertifikasiya və məlumatlandırma məqsədilə toplanmasına, saxlanmasına və lazım olduqda rəsmi qurumlarla paylaşılmasına açıq razılığımı verirəm.',
    'legal-consent-title': 'Açıq Razılıq Bəyanatı',
    'legal-approve-btn': 'Oxudum, Təsdiqləyirəm',
    'legal-back-btn': 'Geri Qayıt',

    // Technical Service Page
    'ts-hero-title': 'DJI Dron Texniki Servis, Baxım və Yerində Dəstək Mərkəzi',
    'ts-hero-desc': 'AgroAero Tech MMC, DJI-nin səlahiyyətli bayisi və texniki servis ortağı olaraq, bütün DJI dron modelləri üçün peşəkar baxım, təmir və yerində texniki dəstək xidmətləri təqdim edir. 10 ildən artıq sektör təcrübəmiz, mütəxəssis mühəndis heyətimiz və geniş ehtiyat hissələri ehtiyatımızla, dron filonuzun fasiləsiz və yüksək performansla işləməsini təmin edirik.',
    'ts-hero-cta': 'Servis Tələb Et',
    'ts-models-title': 'Servis Verdiyimiz DJI Modelləri',
    'ts-model-agras': 'DJI Agras Seriyası',
    'ts-model-mavic': 'DJI Mavic Seriyası',
    'ts-model-matrice': 'DJI Matrice Seriyası',
    'ts-scope-title': 'Xidmət Əhatəmiz',
    'ts-scope-1-title': 'Dövri Baxım və Nasazlıq Aşkarlanması',
    'ts-scope-1-desc': 'Uçuş sistemləri, sensorlar, GPS və idarəetmə bloklarının ətraflı analizi',
    'ts-scope-2-title': 'Mexaniki Təmir',
    'ts-scope-2-desc': 'Gövdə, qol, motor, pervane, eniş dəstəyi və montaj komponentlərinin dəyişdirilməsi',
    'ts-scope-3-title': 'Elektron Sistem Servisi',
    'ts-scope-3-desc': 'ESC, IMU, gimbal, kamera, antenna və sensor modullarının təmiri',
    'ts-scope-4-title': 'Kalibrasiya və Test Uçuşları',
    'ts-scope-4-desc': 'Təmirdən sonra uçuş balanslaşdırması, proqram təminatı optimallaşdırması və performans yoxlanışı',
    'ts-scope-5-title': 'Batareya və Güc Bloku Servisi',
    'ts-scope-5-desc': 'Hüceyrə testi, tutum ölçümü və yeniləmə prosedurları',
    'ts-scope-6-title': 'Firmware və Proqram Təminatı Yeniləmələri',
    'ts-scope-6-desc': 'DJI standartlarına uyğun ən son sistem quraşdırması',
    'ts-scope-7-title': 'Yerində Texniki Dəstək',
    'ts-scope-7-desc': 'Tarla, müəssisə və ya əməliyyat sahəsində sürətli müdaxilə və nasazlığın aradan qaldırılması',
    'ts-scope-8-title': 'Ehtiyat Hissələrinin Tədarükü',
    'ts-scope-8-desc': 'Orijinal DJI ehtiyat hissələri ilə sürətli tədarük, peşəkar montaj və zəmanət əhatəsi',
    'ts-why-title': 'Niyə AgroAero Tech?',
    'ts-why-1-title': 'DJI Səlahiyyətli Bayisi və Servis Ortağı',
    'ts-why-1-desc': 'Rəsmi səlahiyyət ilə orijinal hissələr və standart servis zəmanəti',
    'ts-why-2-title': '10 İllik Təcrübə',
    'ts-why-2-desc': 'Qabaqcıl mühəndislik təcrübəsi və sektoral bilik',
    'ts-why-3-title': 'Orijinal Ehtiyat Hissələri Anbarı',
    'ts-why-3-desc': 'Daimi anbar üstünlüyü ilə sürətli çatdırılma',
    'ts-why-4-title': 'Zəmanətli Servis',
    'ts-why-4-desc': 'Test uçuşlarından sonra sənədli təslim',
    'ts-why-5-title': 'Şəffaf Servis Prosesi',
    'ts-why-5-desc': 'Sürətli və sənədli proses izləmə',
    'ts-why-6-title': 'Yerində Texniki Dəstək',
    'ts-why-6-desc': 'Sahə dəstəyi ilə fasiləsiz əməliyyat zəmanəti',
    'ts-stock-title': 'Hazır Anbar Üstünlüyü',
    'ts-stock-desc': 'AgroAero Tech tez-tez istifadə olunan DJI komponentlərini (motor, pervane, qol, sensor, gimbal, batareya və s.) daimi anbarda saxlayaraq, baxım və təmir əməliyyatlarını minimum müddətdə tamamlayır.',
    'ts-form-title': 'Servis Tələb Forması',
    'ts-form-subtitle': 'Dronunuzda baxım və ya təmir lazımdır? Formanı dolduraraq cihazınızın vəziyyəti haqqında bizə məlumat verin. Komandamız cihazınızın vəziyyətini yoxlayıb 24 saat ərzində nasazlıq hesabatı və qiymət təklifi göndərəcəkdir.',
    'ts-drone-model': 'Dron Modeli <span class="text-danger">*</span>',
    'ts-service-type': 'Servis Növü <span class="text-danger">*</span>',
    'ts-problem-desc': 'Nasazlıq/Problem Təsviri <span class="text-danger">*</span>',
    'ts-address': 'Ünvan',
    'ts-other': 'Digər',
    'ts-stype-maintenance': 'Dövri Baxım',
    'ts-stype-diagnosis': 'Nasazlıq Aşkarlanması',
    'ts-stype-mechanical': 'Mexaniki Təmir',
    'ts-stype-electronic': 'Elektron Sistem Servisi',
    'ts-stype-calibration': 'Kalibrasiya',
    'ts-stype-battery': 'Batareya Servisi',
    'ts-stype-firmware': 'Firmware Yeniləmə',
    'ts-stype-onsite': 'Yerində Texniki Dəstək',
    'ts-problem-placeholder': 'Dronunuzda yaşadığınız problemi ətraflı şəkildə izah edin...',
    'ts-address-placeholder': 'Yerində servis üçün ünvan məlumatı (ixtiyari)'
  }
};

// Language System Functions
let currentLanguage = 'tr';
window.currentLanguage = currentLanguage;

function getTranslation(key) {
  if (translations[currentLanguage] && translations[currentLanguage][key]) {
    return translations[currentLanguage][key];
  }
  // Fallback to Turkish if translation not found
  if (translations['tr'] && translations['tr'][key]) {
    return translations['tr'][key];
  }
  return key; // Return key if no translation found
}

function detectBrowserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  const langCode = browserLang.split('-')[0].toLowerCase();

  // Desteklenen diller
  const supportedLanguages = ['tr', 'en', 'ru', 'az'];

  if (supportedLanguages.includes(langCode)) {
    return langCode;
  }

  return 'tr'; // Varsayılan dil
}

function setLanguage(lang) {
  console.log(`Setting language to: ${lang}`);
  currentLanguage = lang;
  window.currentLanguage = lang;
  localStorage.setItem('selectedLanguage', lang);

  // Çevirileri uygula
  applyTranslations(lang);

  // Dil seçici güncelle
  updateLanguageSelector(lang);

  // Custom event dispatch et (blog sayfası için)
  const languageChangeEvent = new CustomEvent('languageChanged', {
    detail: { language: lang }
  });
  document.dispatchEvent(languageChangeEvent);

  console.log(`Language set to: ${lang} completed`);
}

function applyTranslations(lang) {
  const elements = document.querySelectorAll('[data-translate]');

  console.log(`Applying translations for language: ${lang}`);
  console.log(`Found ${elements.length} elements with data-translate`);

  elements.forEach(element => {
    const key = element.getAttribute('data-translate');
    const placeholderKey = element.getAttribute('data-translate-placeholder');

    if (key && translations[lang] && translations[lang][key]) {
      const translatedText = translations[lang][key];

      if (element.tagName === 'INPUT' && element.type === 'submit') {
        element.value = translatedText;
      } else if (element.tagName === 'INPUT' && element.placeholder !== undefined) {
        element.placeholder = translatedText;
      } else {
        // HTML etiketleri içeren metinler için innerHTML kullan, diğerleri için textContent
        if (translatedText.includes('<strong>') || translatedText.includes('<br>') || translatedText.includes('<em>') || translatedText.includes('<b>') || translatedText.includes('<i>') || translatedText.includes('<span')) {
          element.innerHTML = translatedText;
        } else {
          element.textContent = translatedText;
        }
      }

      // Debug log for nav-contact
      if (key === 'nav-contact') {
        console.log(`Updated nav-contact to: ${translatedText}`);
      }
    } else if (placeholderKey && translations[lang] && translations[lang][placeholderKey]) {
      // Placeholder çevirisi
      element.placeholder = translations[lang][placeholderKey];
    } else {
      console.warn(`Translation not found for key: ${key || placeholderKey} in language: ${lang}`);
    }
  });

  // Placeholder attribute'lı elementleri ayrıca kontrol et
  const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
  placeholderElements.forEach(element => {
    const key = element.getAttribute('data-translate-placeholder');
    if (translations[lang] && translations[lang][key]) {
      element.placeholder = translations[lang][key];
      // Mobil için setAttribute ile de ayarla
      element.setAttribute('placeholder', translations[lang][key]);
    }
  });

  // Select elementlerindeki option'ları çevir
  const selectElements = document.querySelectorAll('select option[data-translate]');
  selectElements.forEach(option => {
    const key = option.getAttribute('data-translate');
    if (translations[lang] && translations[lang][key]) {
      option.textContent = translations[lang][key];
    }
  });

  // Optgroup label'larını çevir
  const optgroupElements = document.querySelectorAll('optgroup[data-translate]');
  optgroupElements.forEach(optgroup => {
    const key = optgroup.getAttribute('data-translate');
    if (translations[lang] && translations[lang][key]) {
      optgroup.label = translations[lang][key];
    }
  });

  // HTML lang attribute güncelle
  document.documentElement.lang = lang;

  // Sayfa başlığını güncelle (eğer sayfa için özel başlık varsa)
  updatePageTitle(lang);

  // Yasal onay hata mesajlarını güncelle (eğer görünürse)
  updateLegalErrorMessages(lang);
}

// Sayfa başlığını dile göre güncelle
function updatePageTitle(lang) {
  const path = window.location.pathname;
  let titleKey = null;

  // Sayfa yoluna göre başlık anahtarını belirle
  if (path.includes('industrial-solutions')) {
    titleKey = 'industrial-page-title';
  } else if (path.includes('drone-event-services')) {
    titleKey = 'event-page-title';
  }

  // Eğer sayfa için özel başlık varsa güncelle
  if (titleKey && translations[lang] && translations[lang][titleKey]) {
    document.title = translations[lang][titleKey];
  }
}

function updateLegalErrorMessages(lang) {
  // KVKK checkbox hata mesajını güncelle
  const kvkkCheckbox = document.getElementById('kvkk');
  if (kvkkCheckbox) {
    const kvkkFeedback = kvkkCheckbox.parentElement?.querySelector('.invalid-feedback');
    if (kvkkFeedback && kvkkFeedback.style.display !== 'none' && kvkkFeedback.textContent.trim() !== '') {
      kvkkFeedback.textContent = getTranslation('legal-kvkk-error');
    }
  }

  // Privacy checkbox hata mesajını güncelle
  const privacyCheckbox = document.getElementById('privacy');
  if (privacyCheckbox) {
    const privacyFeedback = privacyCheckbox.parentElement?.querySelector('.invalid-feedback');
    if (privacyFeedback && privacyFeedback.style.display !== 'none' && privacyFeedback.textContent.trim() !== '') {
      privacyFeedback.textContent = getTranslation('legal-privacy-error');
    }
  }

  // GDPR checkbox hata mesajını güncelle
  const gdprCheckbox = document.getElementById('gdpr');
  if (gdprCheckbox) {
    const gdprFeedback = gdprCheckbox.parentElement?.querySelector('.invalid-feedback');
    if (gdprFeedback && gdprFeedback.style.display !== 'none' && gdprFeedback.textContent.trim() !== '') {
      gdprFeedback.textContent = getTranslation('legal-gdpr-error');
    }
  }
}

function updateLanguageSelector(lang) {
  const flagMap = {
    'tr': { flag: 'tr.svg', name: 'TR', fullName: 'Türkçe' },
    'en': { flag: 'en.svg', name: 'EN', fullName: 'English' },
    'ru': { flag: 'ru.svg', name: 'RU', fullName: 'Русский' },
    'az': { flag: 'az.svg', name: 'AZ', fullName: 'Azərbaycan' }
  };

  // Absolute path kullan - tüm sayfalarda çalışır
  const flagPath = `/assets/img/flags/${flagMap[lang].flag}`;

  // Desktop selector güncelle
  const currentFlag = document.getElementById('currentFlag');
  const currentLang = document.getElementById('currentLang');

  if (currentFlag && currentLang) {
    currentFlag.src = flagPath;
    currentFlag.alt = flagMap[lang].fullName;
    currentLang.textContent = flagMap[lang].name;
  }

  // Mobile selector güncelle
  const currentFlagMobile = document.getElementById('currentFlagMobile');
  const currentLangMobile = document.getElementById('currentLangMobile');

  if (currentFlagMobile && currentLangMobile) {
    currentFlagMobile.src = flagPath;
    currentFlagMobile.alt = flagMap[lang].fullName;
    currentLangMobile.textContent = flagMap[lang].fullName;
  }

  // Aktif durumu güncelle
  document.querySelectorAll('.language-selector .dropdown-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-lang') === lang) {
      item.classList.add('active');
    }
  });
}

function initializeLanguageSystem() {
  // Kaydedilmiş dil varsa onu kullan, yoksa tarayıcı dilini tespit et
  const savedLanguage = localStorage.getItem('selectedLanguage');
  const initialLanguage = savedLanguage || detectBrowserLanguage();

  // Dil seçici event listener'ları ekle
  document.addEventListener('click', function (e) {
    if (e.target.closest('.language-selector .dropdown-item')) {
      e.preventDefault();
      const langItem = e.target.closest('.dropdown-item');
      const selectedLang = langItem.getAttribute('data-lang');

      if (selectedLang && selectedLang !== currentLanguage) {
        setLanguage(selectedLang);
      }
    }
  });

  // İlk dili ayarla
  setLanguage(initialLanguage);

  // Mobil için: Sayfa tamamen yüklendikten sonra çevirileri tekrar uygula
  // Bu, dinamik olarak yüklenen form elementlerinin de çevrilmesini sağlar
  if (document.readyState === 'complete') {
    setTimeout(() => applyTranslations(initialLanguage), 100);
  } else {
    window.addEventListener('load', function () {
      setTimeout(() => applyTranslations(currentLanguage), 100);
    });
  }
}

// Legal onay kontrolü - localStorage'dan onayları kontrol et
function initLegalApprovalListener() {
  const legalCheckboxIds = ['kvkk', 'privacy', 'gdpr'];

  // Sayfa focus aldığında localStorage'daki onayları kontrol et
  function checkLegalApprovals() {
    legalCheckboxIds.forEach(checkboxId => {
      const approvalKey = 'legal_approved_' + checkboxId;
      const approvalTime = localStorage.getItem(approvalKey);

      if (approvalTime) {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox && !checkbox.checked) {
          // Son 5 dakika içinde onaylanmışsa işaretle
          const timeDiff = Date.now() - parseInt(approvalTime);
          if (timeDiff < 5 * 60 * 1000) { // 5 dakika
            checkbox.checked = true;
            checkbox.classList.remove('is-invalid');

            const invalidFeedback = checkbox.parentElement?.querySelector('.invalid-feedback');
            if (invalidFeedback) {
              invalidFeedback.style.display = 'none';
              invalidFeedback.classList.remove('d-block');
            }

            // Change event'i tetikle
            const changeEvent = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(changeEvent);

            // localStorage'dan temizle
            localStorage.removeItem(approvalKey);
          } else {
            // Eski onayları temizle
            localStorage.removeItem(approvalKey);
          }
        }
      }
    });
  }

  // Sayfa focus aldığında kontrol et
  window.addEventListener('focus', checkLegalApprovals);

  // Sayfa görünür olduğunda kontrol et (mobil için)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      checkLegalApprovals();
    }
  });

  // İlk yüklemede de kontrol et
  checkLegalApprovals();
}

// URL parametrelerinden hizmet türünü okuyup formu otomatik doldur
function autoSelectServiceFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const serviceType = urlParams.get('service');

  if (serviceType) {
    // Hizmet türü radio butonunu seç
    const serviceRadio = document.querySelector(`input[name="service_type"][value="${serviceType}"]`);
    if (serviceRadio) {
      serviceRadio.checked = true;

      // selectService fonksiyonunu çağır (eğer varsa)
      const serviceOption = serviceRadio.closest('.service-option');
      if (serviceOption && typeof selectService === 'function') {
        selectService(serviceOption, serviceType);
      } else if (serviceOption) {
        // selectService fonksiyonu yoksa manuel olarak seçili görünümü ayarla
        document.querySelectorAll('.service-option').forEach(option => {
          option.classList.remove('selected');
        });
        serviceOption.classList.add('selected');
      }

      // Eğer URL'de hash varsa o bölüme scroll yap
      if (window.location.hash) {
        setTimeout(() => {
          const target = document.querySelector(window.location.hash);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    }
  }
}

// Hizmet butonlarına tıklama event'lerini ekle
function addServiceButtonListeners() {
  // Tarimsal-cozumler.html sayfasındaki data-service attribute'u olan butonlar
  const serviceButtons = document.querySelectorAll('a[data-service]');

  serviceButtons.forEach(button => {
    button.addEventListener('click', function (e) {
      const service = this.getAttribute('data-service');

      if (service) {
        // URL'yi güncelle
        const url = new URL(window.location);
        url.searchParams.set('service', service);
        window.history.replaceState({}, '', url);

        // Hizmeti seç
        setTimeout(() => {
          autoSelectServiceFromURL();
        }, 100);
      }
    });
  });
}

// Hizmet seçimi fonksiyonu
function selectService(element, serviceType) {
  // Tüm service-option'lardan selected sınıfını kaldır
  document.querySelectorAll('.service-option').forEach(option => {
    option.classList.remove('selected');
  });

  // Seçilen option'a selected sınıfını ekle
  element.classList.add('selected');

  // Radio button'ı seç
  const radio = element.querySelector('input[type="radio"]');
  if (radio) {
    radio.checked = true;
  }
}

// KVKK, Gizlilik ve GDPR checkbox'ları için uyarı gizleme işlevi
function handleCheckboxWarnings() {
  const checkboxes = document.querySelectorAll('#kvkk, #privacy, #gdpr');

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function () {
      const invalidFeedback = this.parentElement.querySelector('.invalid-feedback');

      if (this.checked && invalidFeedback) {
        // Checkbox işaretliyse uyarıyı gizle
        invalidFeedback.style.display = 'none';
        invalidFeedback.classList.remove('d-block');
        this.classList.remove('is-invalid');
        this.classList.remove('is-valid'); // Yeşil işaret de gösterme
      } else if (!this.checked && invalidFeedback) {
        // Checkbox işaretli değilse uyarıyı göster
        let errorMessage = '';
        if (this.id === 'kvkk') {
          errorMessage = getTranslation('legal-kvkk-error');
        } else if (this.id === 'privacy') {
          errorMessage = getTranslation('legal-privacy-error');
        } else if (this.id === 'gdpr') {
          errorMessage = getTranslation('legal-gdpr-error');
        }

        invalidFeedback.textContent = errorMessage;
        invalidFeedback.style.display = 'block';
        invalidFeedback.classList.add('d-block');
        this.classList.remove('is-valid');
        this.classList.add('is-invalid');
      }
    });
  });
}

let ticking = false;

// Navbar scroll effect
window.addEventListener('scroll', function () {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('navbar-scrolled');
  } else {
    navbar.classList.remove('navbar-scrolled');
  }
});



// Form handling
document.addEventListener('DOMContentLoaded', function () {
  // Lead Form (Talep Formu)
  const leadForm = document.getElementById('leadForm');
  if (leadForm) {
    // Bu artık bindStrictForm içinden çağrılıyor, ama yedek olarak bırakıyoruz
    // leadForm.addEventListener('submit', handleLeadForm);
  }

  // Service Form (Tarımsal Hizmet Formu) debug
  const serviceForm = document.getElementById('serviceForm');
  console.log('ServiceForm element:', serviceForm);
  if (serviceForm) {
    console.log('ServiceForm bulundu, data-validate:', serviceForm.getAttribute('data-validate'));
    console.log('ServiceForm event listeners aktif');

    // Manuel test event listener
    serviceForm.addEventListener('submit', function (e) {
      console.log('MANUEL EVENT LISTENER: Form submit yakalandı!');
    });

    // Test butonu da ekle
    const submitBtn = serviceForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', function (e) {
        console.log('BUTON CLICK EVENT: Submit butonu tıklandı!');
        console.log('Button type:', e.target.type);
        console.log('Button disabled:', e.target.disabled);
      });
    }

  } else {
    console.error('ServiceForm bulunamadı!');
  }

  // Certificate Verification Form bloğu kaldırıldı
  // Sertifika sorgulama artık sertifika-sorgu.html içindeki çok dilli script tarafından yönetiliyor

  // Sertifikasyon Eğitimi Form
  const sertifikasyonForm = document.getElementById('form-sertifikasyon');
  if (sertifikasyonForm) {
    sertifikasyonForm.addEventListener('submit', handleSertifikasyonForm);

    // Gerçek zamanlı validasyon ekle
    const inputs = sertifikasyonForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', function () {
        validateSingleField(this);
      });

      input.addEventListener('change', function () {
        validateSingleField(this);
      });
    });
  }

  // Tarımsal Drone Eğitimi Form
  const tarimsalDroneForm = document.getElementById('form-tarimsal-drone');
  if (tarimsalDroneForm) {
    tarimsalDroneForm.addEventListener('submit', handleTarimsalDroneForm);
  }

  // Checkbox uyarı işlevini başlat
  handleCheckboxWarnings();

  // URL'den hizmet seçimini otomatik yap
  autoSelectServiceFromURL();

  // Hizmet butonlarına event listener ekle
  addServiceButtonListeners();

  // Dil sistemini başlat
  initializeLanguageSystem();

  // Legal onay kontrolünü başlat (localStorage'dan)
  initLegalApprovalListener();

  // Navbar: aktif sayfa işaretleme (normalize edilmiş kıyas)
  const cur = new URL(window.location.href);

  // URL'leri normalize eden yardımcı fonksiyon
  const normalizeUrl = (path) => {
    if (!path) return '/';
    let normalized = path;

    // /index.html -> /
    normalized = normalized.replace(/\/index\.html$/i, '/');

    // .html uzantısını kaldır
    normalized = normalized.replace(/\.html$/i, '');

    // Sondaki /'ı kaldır (kök hariç)
    if (normalized.length > 1) {
      normalized = normalized.replace(/\/+$/, '');
    }

    return normalized;
  };

  const curPath = normalizeUrl(cur.pathname);
  const links = document.querySelectorAll('.navbar a.nav-link, .navbar a.dropdown-item');

  links.forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;

    const target = new URL(href, cur.origin);
    const targetPath = normalizeUrl(target.pathname);

    if (targetPath === curPath) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');

      // Eğer dropdown içindeyse parent "Kurumsal" gibi üst linki de aktif yap
      const parentDropdown = a.closest('.dropdown');
      if (parentDropdown) {
        const toggle = parentDropdown.querySelector('.nav-link.dropdown-toggle');
        if (toggle) toggle.classList.add('active');
      }
    }
  });

  // Navbar dropdown indicator rotation
  const dropdownToggles = document.querySelectorAll('.navbar-nav .dropdown-toggle');
  dropdownToggles.forEach(dropdownToggle => {
    dropdownToggle.addEventListener('click', function () {
      dropdownToggle.classList.toggle('rotate');
    });
  });
});

// Handle Service Form Submission
async function handleServiceForm(e) {
  console.log('handleServiceForm çağrıldı!');
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  console.log('Form element:', form);
  console.log('Submit button:', submitBtn);
  console.log('SubmitLock durumu:', submitLock);

  // Çoklu tık engeli
  if (submitLock) {
    console.log('SubmitLock aktif, işlem iptal edildi');
    return;
  }

  // Hizmet türü seçimi kontrolü
  const serviceTypeSelected = form.querySelector('input[name="service_type"]:checked');
  if (!serviceTypeSelected) {
    const serviceError = document.getElementById('service-error');
    if (serviceError) {
      serviceError.textContent = 'Lütfen bir hizmet türü seçin.';
      serviceError.style.display = 'block';
    }
    showFormAlert('danger', 'Lütfen bir hizmet türü seçin.', form);
    return;
  } else {
    // Hizmet seçilmişse hata mesajını temizle
    const serviceError = document.getElementById('service-error');
    if (serviceError) {
      serviceError.textContent = '';
      serviceError.style.display = 'none';
    }
  }

  // Diğer zorunlu alanların kontrolü
  let isValid = true;
  form.querySelectorAll('[required]').forEach(input => {
    if (input.type === 'radio') {
      // Radio buttonlar için grup kontrolü
      const radioGroup = form.querySelectorAll(`input[name="${input.name}"]:checked`);
      if (radioGroup.length === 0) {
        isValid = false;
      }
    } else if (!input.value.trim() && input.type !== 'checkbox') {
      input.classList.add('is-invalid');
      isValid = false;
    } else if (input.type === 'checkbox' && !input.checked) {
      input.classList.add('is-invalid');
      isValid = false;
    } else {
      input.classList.remove('is-invalid');
    }
  });

  // Turnstile kontrolü
  const turnstileToken = form.querySelector('[name="cf-turnstile-response"]');
  if (!turnstileToken || !turnstileToken.value) {
    showFormAlert('danger', 'Lütfen güvenlik doğrulamasını tamamlayın.', form);
    isValid = false;
  }

  if (!isValid) {
    showFormAlert('danger', 'Lütfen tüm zorunlu alanları doldurun ve güvenlik doğrulamasını tamamlayın.', form);
    return;
  }

  // İşlemi başlat
  submitLock = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Gönderiliyor...';

  try {
    const formData = new FormData(form);
    const turnstileToken = formData.get('cf-turnstile-response');

    const data = {
      service_type: formData.get('service_type'),
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      field_size: formData.get('field_size'),
      crop_type: formData.get('crop_type'),
      message: formData.get('message'),
      turnstileToken: turnstileToken
    };

    console.log('Service Form data:', data);
    console.log('Service Turnstile token:', turnstileToken);
    console.log('API endpoint: /api/tarim-basvurulari');

    console.log('API çağrısı yapılıyor...');
    const response = await fetch('/api/tarim-basvurulari', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    console.log('API response status:', response.status);
    console.log('API response headers:', [...response.headers.entries()]);

    console.log('API response status:', response.status);
    console.log('API response headers:', [...response.headers.entries()]);

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Bir hata oluştu.');

    showFormAlert('success', result.message || 'Başvurunuz başarıyla alındı. En kısa sürede size dönüş yapacağız.', form);
    form.reset();
    clearValidation(form);

    // Hizmet seçeneklerini temizle
    document.querySelectorAll('.service-option').forEach(opt => opt.classList.remove('selected'));

    // Karakter sayaçlarını sıfırla
    form.querySelectorAll('.char-counter').forEach(counter => {
      const forField = counter.getAttribute('data-for');
      const field = form.querySelector(`[name="${forField}"]`);
      if (field) {
        const max = parseInt(field.getAttribute('maxlength') || '0', 10);
        counter.textContent = `0/${max}`;
      }
    });

    // Hizmet seçim hatası varsa temizle
    const serviceError = document.getElementById('service-error');
    if (serviceError) {
      serviceError.textContent = '';
      serviceError.style.display = 'none';
    }

  } catch (error) {
    showFormAlert('danger', error.message, form);
    if (typeof turnstile !== 'undefined') {
      turnstile.reset();
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    // submitLock'u serbest bırak
    submitLock = false;
  }
}

// Handle Lead Form Submission
async function handleLeadForm(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  const formContainer = form.closest('.card-body') || form.parentElement;

  // Butonu kitle
  submitBtn.disabled = true;
  submitBtn.textContent = 'Gönderiliyor...';

  try {
    // Turnstile token'ını al
    const turnstileToken = formData.get('cf-turnstile-response') ||
      document.querySelector('input[name="cf-turnstile-response"]')?.value ||
      document.querySelector('.cf-turnstile input')?.value;

    const data = {
      name: formData.get('name')?.trim() || '',
      email: formData.get('email')?.trim() || '',
      phone: window.normalizePhone ? window.normalizePhone(formData.get('phone') || '') : formData.get('phone'),
      address: (formData.get('address') || '').trim(),
      message: (formData.get('message') || formData.get('note') || '').trim(),
      // Turnstile token'ını ekle
      turnstileToken: turnstileToken
    };

    console.log('Lead Form data:', data);
    console.log('Lead Turnstile token:', turnstileToken);
    console.log('API endpoint: /api/contact');

    // '/api/contact' endpoint'ine gönder
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      showFormAlert('success', result.message || 'Mesajınız gönderildi! Size en kısa sürede dönüş yapacağız.', form);
      form.reset();
      clearValidation(form);

      // Karakter sayaçlarını sıfırla
      form.querySelectorAll('.char-counter').forEach(counter => {
        const forField = counter.getAttribute('data-for');
        const field = form.querySelector(`[name="${forField}"]`);
        if (field) {
          const max = parseInt(field.getAttribute('maxlength') || '0', 10);
          counter.textContent = `0/${max}`;
        }
      });

    } else {
      // Hata durumunda Turnstile'ı sıfırla
      if (typeof turnstile !== 'undefined') {
        turnstile.reset();
      }
      throw new Error(result.message || 'Sunucu hatası');
    }

  } catch (error) {
    console.error('Form submission error:', error);
    showFormAlert('danger', error.message || 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.', form);
    // Hata durumunda da Turnstile'ı sıfırla
    if (typeof turnstile !== 'undefined') {
      turnstile.reset();
    }
  } finally {
    // İşlem bitince butonu ve kilidi serbest bırak
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    // submitLock'ı globale taşıdığımızı varsayarsak veya main.js içinde tanımlıysa
    if (typeof submitLock !== 'undefined') {
      submitLock = false;
    }
  }
}

// Handle Sertifikasyon Form Submission
async function handleSertifikasyonForm(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  const formContainer = form.closest('.card-body') || form.parentElement;

  // Validation
  if (!validateSertifikasyonForm(form)) {
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Gönderiliyor...';

  try {
    console.log('Sertifikasyon Form data being sent to API...');
    console.log('API endpoint: /api/certification-applications');

    // FormData içeriğini logla
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File - ${value.name} (${value.size} bytes, ${value.type})`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    // Gerçek API çağrısı
    const response = await fetch('/api/certification-applications', {
      method: 'POST',
      body: formData // FormData olarak gönder (dosyalar için)
    });

    console.log('API response status:', response.status);
    const result = await response.json();
    console.log('API response:', result);

    if (result.success) {
      // Mesajı form içindeki özel div'e göster
      showFormAlert('success', result.message || 'Başvurunuz başarıyla alındı. En kısa sürede size dönüş yapacağız.', form);
      form.reset();
      clearValidation(form);
    } else {
      throw new Error(result.error || 'Başvuru gönderilemedi');
    }
  } catch (error) {
    console.error('Sertifikasyon form submission error:', error);
    // Mesajı form içindeki özel div'e göster
    showFormAlert('danger', error.message || 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.', form);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Handle Tarımsal Drone Form Submission
async function handleTarimsalDroneForm(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  const formContainer = form.closest('.card-body') || form.parentElement;

  // Validation - Tarımsal drone formu için özel validasyon
  let isValid = true;
  const requiredFields = ['name', 'phone', 'email', 'address'];

  // Zorunlu alanları kontrol et
  requiredFields.forEach(fieldName => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      const value = field.value.trim();
      if (!value) {
        field.classList.add('is-invalid');
        isValid = false;
      } else {
        field.classList.remove('is-invalid');
      }
    }
  });

  // Checkbox'ları kontrol et
  const checkboxes = form.querySelectorAll('input[type="checkbox"][required]');
  checkboxes.forEach(checkbox => {
    if (!checkbox.checked) {
      checkbox.classList.add('is-invalid');
      isValid = false;
    } else {
      checkbox.classList.remove('is-invalid');
    }
  });

  if (!isValid) {
    showFormAlert('danger', 'Lütfen tüm zorunlu alanları doldurun ve onay kutularını işaretleyin.', form);
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Gönderiliyor...';

  try {
    // Turnstile token'ini al
    const turnstileToken = formData.get('cf-turnstile-response') ||
      document.querySelector('input[name="cf-turnstile-response"]')?.value ||
      document.querySelector('.cf-turnstile input')?.value;

    // Payload hazırla
    const payload = {
      name: (formData.get('name') || '').trim(),
      phone: (formData.get('phone') || '').trim(),
      email: (formData.get('email') || '').trim(),
      address: (formData.get('address') || '').trim(),
      message: (formData.get('message') || '').trim(),
      turnstileToken: turnstileToken
    };

    console.log('Tarımsal Drone Form data:', payload);
    console.log('API endpoint: /api/tarimsal-drone-applications');

    // Gerçek API çağrısı
    const response = await fetch('/api/tarimsal-drone-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('API response status:', response.status);
    const result = await response.json();

    if (!response.ok) throw new Error(result.message || 'Bir hata oluştu.');

    // Başarılı - Mesajı form içindeki özel div'e göster
    showFormAlert('success', result.message || 'Başvurunuz başarıyla alındı. En kısa sürede size dönüş yapacağız.', form);
    form.reset();
    clearValidation(form);

    // Turnstile reset (varsa)
    if (typeof turnstile !== 'undefined') {
      turnstile.reset();
    }

  } catch (error) {
    console.error('Tarımsal drone form submission error:', error);
    showFormAlert('danger', error.message || 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.', form);

    // Hata durumunda da Turnstile reset
    if (typeof turnstile !== 'undefined') {
      turnstile.reset();
    }

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Eski handleVerifyForm fonksiyonu silindi - yeni olanı kullanıyoruz

// Display certificate verification result
function displayCertificateResult(data) {
  const resultDiv = document.getElementById('verifyResult');

  resultDiv.innerHTML = `
    <div class="card mt-4 fade show">
      <div class="card-header bg-success text-white">
        <h5 class="mb-0"><i class="fas fa-check-circle me-2"></i>Sertifika Bulundu</h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <p><strong>Ad Soyad:</strong> ${data.name || 'N/A'}</p>
            <p><strong>Sınıf:</strong> ${data.class || 'N/A'}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Sertifika No:</strong> ${data.cert_no || 'N/A'}</p>
            <p><strong>Veriliş Tarihi:</strong> ${data.issue_date || 'N/A'}</p>
          </div>
        </div>
        ${data.pdf_url ? `<a href="${data.pdf_url}" target="_blank" class="btn btn-brand btn-sm"><i class="fas fa-download me-2"></i>PDF İndir</a>` : ''}
      </div>
    </div>
  `;
}

// Sertifikasyon form validation
function validateSertifikasyonForm(form) {
  let isValid = true;
  const inputs = form.querySelectorAll('input[required], textarea[required]');

  inputs.forEach(input => {
    if (input.type === 'file') {
      if (!input.files || input.files.length === 0) {
        input.classList.add('is-invalid');
        isValid = false;
      } else {
        const file = input.files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

        if (file.size > maxSize) {
          input.classList.add('is-invalid');
          showAlert('danger', 'Dosya boyutu 5MB\'dan büyük olamaz.', form.closest('.card-body'));
          isValid = false;
        } else if (!allowedTypes.includes(file.type)) {
          input.classList.add('is-invalid');
          showAlert('danger', 'Sadece JPG, PNG ve PDF dosyaları kabul edilir.', form.closest('.card-body'));
          isValid = false;
        } else {
          input.classList.remove('is-invalid');
          input.classList.add('is-valid');
        }
      }
    } else if (!input.value.trim()) {
      input.classList.add('is-invalid');
      isValid = false;
    } else {
      // Önce geçersiz sınıfını kaldır
      input.classList.remove('is-invalid');

      let fieldValid = true;

      // FIN kodu kontrolü
      if (input.name === 'fin') {
        const finValue = input.value.trim().toUpperCase();
        if (!/^[A-Z0-9]{1,15}$/.test(finValue)) {
          input.classList.add('is-invalid');
          showAlert('danger', 'FIN kodu 1-15 karakter arasında olmalı ve sadece harf ve rakam içermelidir.', form.closest('.card-body'));
          isValid = false;
          fieldValid = false;
        } else {
          input.value = finValue; // Büyük harfe çevir
        }
      }

      // Telefon kontrolü
      if (input.type === 'tel' && !/^[\d\s\-\+\(\)]+$/.test(input.value)) {
        input.classList.add('is-invalid');
        isValid = false;
        fieldValid = false;
      }

      // Email kontrolü
      if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        input.classList.add('is-invalid');
        isValid = false;
        fieldValid = false;
      }

      // Eğer alan geçerliyse yeşil yap
      if (fieldValid) {
        input.classList.add('is-valid');
      }
    }
  });

  // Checkbox kontrolü
  const checkboxes = form.querySelectorAll('input[type="checkbox"][required]');
  checkboxes.forEach(checkbox => {
    if (!checkbox.checked) {
      checkbox.classList.add('is-invalid');
      checkbox.classList.remove('is-valid');
      isValid = false;
    } else {
      checkbox.classList.remove('is-invalid');
      checkbox.classList.add('is-valid');
    }
  });

  return isValid;
}

// Tek alan validasyonu (gerçek zamanlı)
function validateSingleField(input) {
  if (!input.required) return;

  if (input.type === 'file') {
    if (!input.files || input.files.length === 0) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
    } else {
      const file = input.files[0];
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

      if (file.size > maxSize || !allowedTypes.includes(file.type)) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
      } else {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
      }
    }
  } else if (input.type === 'checkbox') {
    if (!input.checked) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
    } else {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
    }
  } else if (!input.value.trim()) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
  } else {
    let fieldValid = true;

    // FIN kodu kontrolü
    if (input.name === 'fin') {
      const finValue = input.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{1,15}$/.test(finValue)) {
        fieldValid = false;
      } else {
        input.value = finValue; // Büyük harfe çevir
      }
    }

    // Telefon kontrolü
    if (input.type === 'tel' && !/^[\d\s\-\+\(\)]+$/.test(input.value)) {
      fieldValid = false;
    }

    // Email kontrolü
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      fieldValid = false;
    }

    if (fieldValid) {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
    } else {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
    }
  }
}

// Legacy form validation (basit kontroller için)
function validateForm(form) {
  let isValid = true;
  const get = (n) => form.querySelector(`[name="${n}"]`);

  const name = get('name');
  if (name) {
    const v = name.value.trim();
    if (v.length < 2 || v.length > 80 || !/^[A-Za-zÇĞİÖŞÜçğıöşü\s'.-]+$/.test(v)) {
      name.classList.add('is-invalid');
      isValid = false;
    } else {
      name.classList.remove('is-invalid');
    }
  }

  const email = get('email');
  if (email) {
    const v = email.value.trim();
    if (v.length === 0 || v.length > 100 || !/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(v)) {
      email.classList.add('is-invalid');
      isValid = false;
    } else {
      email.classList.remove('is-invalid');
    }
  }

  const phone = get('phone');
  if (phone) {
    const v = phone.value.trim();
    if (v.length < 10 || v.length > 20 || !/^[0-9+\-\s()]+$/.test(v)) {
      phone.classList.add('is-invalid');
      isValid = false;
    } else {
      phone.classList.remove('is-invalid');
    }
  }

  const address = get('address');
  if (address) {
    const v = address.value.trim();
    // Adres isteğe bağlı - sadece max karakter kontrolü yap
    if (v.length > 200) {
      address.classList.add('is-invalid');
      isValid = false;
    } else {
      address.classList.remove('is-invalid');
    }
  }

  const note = get('note');
  if (note) {
    const v = note.value.trim();
    if (v.length > 500) {
      note.classList.add('is-invalid');
      isValid = false;
    } else {
      note.classList.remove('is-invalid');
    }
  }

  // Legacy validation for TCKN and other fields
  const inputs = form.querySelectorAll('input[required], textarea[required]');
  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('is-invalid');
      isValid = false;
    } else {
      if (input.name === 'tckn' && !/^\d{11}$/.test(input.value)) {
        input.classList.add('is-invalid');
        isValid = false;
      }
    }
  });

  return isValid;
}

// Clear form validation
function clearValidation(form) {
  // Hem is-invalid hem de is-valid sınıflarını temizle
  const inputs = form.querySelectorAll('.is-invalid, .is-valid');
  inputs.forEach(input => {
    input.classList.remove('is-invalid');
    input.classList.remove('is-valid');
  });

  // Checkbox'lar için 'was-validated' sınıfını ebeveynden kaldır
  form.classList.remove('was-validated');

  // Geri bildirim metinlerini temizle ve gizle
  form.querySelectorAll('.invalid-feedback').forEach(feedback => {
    feedback.textContent = '';
    feedback.style.display = 'none';
  });

  // Checkbox'ları sıfırla
  form.querySelectorAll('#kvkk, #privacy, #gdpr').forEach(checkbox => {
    checkbox.checked = false;
    checkbox.classList.remove('is-invalid', 'is-valid');
  });
}

// Form için özel alert fonksiyonu
function showFormAlert(type, message, form) {
  // Form mesaj alanını bul
  let messageContainer = form.querySelector('#form-messages');

  // Eğer form-messages yoksa oluştur
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'form-messages';
    messageContainer.className = 'mb-3';

    // Submit butonunun ebeveyn elementini bul (<div class="d-grid">)
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitBtnParent = submitBtn ? submitBtn.parentElement : null;

    if (submitBtnParent) {
      // Submit butonunun ebeveyn elementinden önce ekle
      submitBtnParent.insertAdjacentElement('beforebegin', messageContainer);
    } else {
      // Fallback: formun sonuna ekle
      form.appendChild(messageContainer);
    }
  }

  // Mevcut mesajları temizle
  messageContainer.innerHTML = '';

  // Yeni mesaj oluştur
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  messageContainer.appendChild(alertDiv);

  // Başarı mesajını 5 saniye sonra otomatik gizle
  if (type === 'success') {
    setTimeout(() => {
      if (messageContainer) {
        messageContainer.innerHTML = '';
      }
    }, 5000);
  }

  // Mesaja scroll yap
  setTimeout(() => {
    messageContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

// GÜNCELLEME: showAlert fonksiyonu artık uyarının nereye ekleneceğini belirten bir `container` parametresi alıyor.
function showAlert(type, message, container) {
  // Eğer bir container belirtilmemişse, eski davranışa geri dön (bu bir yedek önlemdir)
  if (!container) {
    container = document.querySelector('main') || document.body;
  }

  // Aynı container içindeki mevcut uyarıyı kaldır (üst üste birikmesin)
  const existingAlert = container.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }

  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Uyarının container'ın en üstüne eklenmesi
  container.prepend(alertDiv);

  // 5 saniye sonra otomatik olarak kaybolması
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Enhanced Dropdown functionality
document.addEventListener('DOMContentLoaded', function () {
  // Checkbox warning handler'ı başlat
  handleCheckboxWarnings();

  // URL'den hizmet türünü otomatik seç
  autoSelectServiceFromURL();

  // Hizmet butonlarına event listener'lar ekle
  addServiceButtonListeners();

  // Sayfa yüklendiğinde hash varsa scroll yap
  if (window.location.hash) {
    setTimeout(() => {
      const target = document.querySelector(window.location.hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
  }

  // Bootstrap dropdown'ları devre dışı bırak - sadece mobil için özel kod kullan
  if (window.innerWidth <= 991) {
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(element => {
      element.removeAttribute('data-bs-toggle');
    });
  }

  // Handle main dropdowns with hover effect
  const dropdowns = document.querySelectorAll('.nav-item.dropdown');

  dropdowns.forEach(dropdown => {
    const dropdownToggle = dropdown.querySelector('.dropdown-toggle');
    const dropdownMenu = dropdown.querySelector('.dropdown-menu');
    let hoverTimeout;

    // Desktop hover effects
    if (window.innerWidth > 991) {
      dropdown.addEventListener('mouseenter', function () {
        clearTimeout(hoverTimeout);
        dropdownMenu.classList.add('show');
        dropdownToggle.setAttribute('aria-expanded', 'true');
      });

      dropdown.addEventListener('mouseleave', function () {
        hoverTimeout = setTimeout(() => {
          dropdownMenu.classList.remove('show');
          dropdownToggle.setAttribute('aria-expanded', 'false');
        }, 200);
      });
    }
  });

  // Handle submenu functionality with hover
  const dropdownSubmenus = document.querySelectorAll('.dropdown-submenu');

  dropdownSubmenus.forEach(submenu => {
    const submenuToggle = submenu.querySelector('.dropdown-item');
    const submenuDropdown = submenu.querySelector('.submenu');
    let submenuTimeout;

    // Desktop hover effects for submenus
    if (window.innerWidth > 991) {
      submenu.addEventListener('mouseenter', function () {
        clearTimeout(submenuTimeout);
        if (submenuDropdown) {
          submenuDropdown.style.display = 'block';
          setTimeout(() => {
            submenuDropdown.style.opacity = '1';
            submenuDropdown.style.visibility = 'visible';
            submenuDropdown.style.transform = 'translateX(0) translateZ(0)';
          }, 50);
        }
      });

      submenu.addEventListener('mouseleave', function () {
        submenuTimeout = setTimeout(() => {
          if (submenuDropdown) {
            submenuDropdown.style.opacity = '0';
            submenuDropdown.style.visibility = 'hidden';
            submenuDropdown.style.transform = 'translateX(-15px) translateZ(-10px)';
            setTimeout(() => {
              submenuDropdown.style.display = 'none';
            }, 400);
          }
        }, 150);
      });
    }

    // Mobile click functionality
    submenuToggle.addEventListener('click', function (e) {
      if (window.innerWidth <= 991) {
        e.preventDefault();
        e.stopPropagation();

        // Toggle submenu visibility
        submenu.classList.toggle('show');

        // Close other submenus
        dropdownSubmenus.forEach(otherSubmenu => {
          if (otherSubmenu !== submenu) {
            otherSubmenu.classList.remove('show');
          }
        });
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown')) {
      dropdowns.forEach(dropdown => {
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');
        const dropdownToggle = dropdown.querySelector('.dropdown-toggle');
        dropdownMenu.classList.remove('show');
        dropdownToggle.setAttribute('aria-expanded', 'false');
      });

      dropdownSubmenus.forEach(submenu => {
        submenu.classList.remove('show');
        const submenuDropdown = submenu.querySelector('.submenu');
        if (submenuDropdown) {
          submenuDropdown.style.display = 'none';
          submenuDropdown.style.opacity = '0';
          submenuDropdown.style.visibility = 'hidden';
        }
      });
    }
  });

  // Handle window resize
  window.addEventListener('resize', function () {
    if (window.innerWidth <= 991) {
      // Bootstrap dropdown'ları devre dışı bırak
      document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(element => {
        element.removeAttribute('data-bs-toggle');
      });

      // On mobile, remove hover effects
      dropdowns.forEach(dropdown => {
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');
        const dropdownToggle = dropdown.querySelector('.dropdown-toggle');
        dropdownMenu.classList.remove('show');
        dropdownToggle.setAttribute('aria-expanded', 'false');
      });

      dropdownSubmenus.forEach(submenu => {
        const submenuDropdown = submenu.querySelector('.submenu');
        if (submenuDropdown) {
          submenuDropdown.style.display = 'none';
        }
      });
    } else {
      // Desktop'ta Bootstrap dropdown'ları geri yükle
      document.querySelectorAll('.dropdown-toggle').forEach(element => {
        element.setAttribute('data-bs-toggle', 'dropdown');
      });
    }
  });

  // Ultra Professional Mobile Navbar Auto-Close



  const navbarToggler = document.querySelector('.navbar-toggler');
  const navbarCollapse = document.querySelector('.navbar-collapse');
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link:not(.dropdown-toggle)');
  const dropdownItems = document.querySelectorAll('.navbar-nav .dropdown-item');

  // Function to close mobile navbar
  function closeMobileNavbar() {
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      navbarToggler.click();
    }
  }

  // Close navbar when clicking on regular nav links
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      // Only close if it's not a dropdown toggle and we're on mobile
      if (window.innerWidth <= 991 && !this.classList.contains('dropdown-toggle')) {
        setTimeout(() => {
          closeMobileNavbar();
        }, 100);
      }
    });
  });

  // Close navbar when clicking on dropdown items
  dropdownItems.forEach(item => {
    item.addEventListener('click', function (e) {
      if (window.innerWidth <= 991) {
        setTimeout(() => {
          closeMobileNavbar();
        }, 100);
      }
    });
  });

  // Event delegation ile mobil dropdown functionality - DÜZELTME
  document.addEventListener('click', function (e) {
    if (window.innerWidth <= 991) {
      const clickedElement = e.target.closest('.navbar-nav .dropdown-toggle');

      if (clickedElement) {
        e.preventDefault();
        e.stopPropagation();

        const parentDropdown = clickedElement.closest('.dropdown');
        const dropdownMenu = parentDropdown.querySelector('.dropdown-menu');
        const isOpen = dropdownMenu.classList.contains('show');

        // Close all other dropdowns and reset their indicators
        document.querySelectorAll('.navbar-nav .dropdown').forEach(dropdown => {
          if (dropdown !== parentDropdown) {
            const menu = dropdown.querySelector('.dropdown-menu');
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const indicator = toggle.querySelector('.dropdown-indicator');

            menu.classList.remove('show');
            toggle.setAttribute('aria-expanded', 'false');
            if (indicator) {
              indicator.style.transform = 'rotate(0deg)';
            }
          }
        });

        // Toggle current dropdown
        if (!isOpen) {
          dropdownMenu.classList.add('show');
          clickedElement.setAttribute('aria-expanded', 'true');

          // Animate dropdown indicator
          const indicator = clickedElement.querySelector('.dropdown-indicator');
          if (indicator) {
            indicator.style.transform = 'rotate(180deg)';
          }
        } else {
          dropdownMenu.classList.remove('show');
          clickedElement.setAttribute('aria-expanded', 'false');

          // Reset dropdown indicator
          const indicator = clickedElement.querySelector('.dropdown-indicator');
          if (indicator) {
            indicator.style.transform = 'rotate(0deg)';
          }
        }
      }

      // Submenu tıklama işlemi için event delegation - YENİ MANTIK
      const clickedSubmenu = e.target.closest('.navbar-nav .dropdown-submenu > .dropdown-item.dropdown-toggle');

      if (clickedSubmenu) {
        const submenuParent = clickedSubmenu.closest('.dropdown-submenu');
        const submenu = submenuParent.querySelector('.submenu');
        const isOpen = submenu && (submenu.style.display === 'block' || submenu.classList.contains('show'));
        const href = (clickedSubmenu.getAttribute('href') || '').trim();

        if (!isOpen) {
          // İlk dokunuş: alt menüyü aç, sayfaya gitmeyi engelle
          e.preventDefault();
          e.stopPropagation();

          // Close all other submenus
          document.querySelectorAll('.navbar-nav .submenu').forEach(menu => {
            if (menu !== submenu) {
              menu.style.display = 'none';
              menu.classList.remove('show');
              menu.closest('.dropdown-submenu').classList.remove('show');
            }
          });

          // Open current submenu
          if (submenu) {
            submenu.style.display = 'block';
            submenu.classList.add('show');
            submenuParent.classList.add('show');
          }
        } else if (href === '' || href === '#') {
          // İkinci dokunuş ama hedef yoksa yine engelle
          e.preventDefault();
          e.stopPropagation();
        }
        // Aksi halde (isOpen && href geçerli), preventDefault YAPMA -> linke gitsin
      }
    }
  });

  // Enhanced mobile dropdown functionality - ESKİ KOD (YEDEKLENDİ)
  const mobileDropdownToggles = document.querySelectorAll('.navbar-nav .dropdown-toggle');

  mobileDropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', function (e) {
      if (window.innerWidth <= 991) {
        e.preventDefault();
        e.stopPropagation();

        const parentDropdown = this.closest('.dropdown');
        const dropdownMenu = parentDropdown.querySelector('.dropdown-menu');
        const isOpen = dropdownMenu.classList.contains('show');

        // Close all other dropdowns and reset their indicators
        document.querySelectorAll('.navbar-nav .dropdown').forEach(dropdown => {
          if (dropdown !== parentDropdown) {
            const menu = dropdown.querySelector('.dropdown-menu');
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const indicator = toggle.querySelector('.dropdown-indicator');

            menu.classList.remove('show');
            toggle.setAttribute('aria-expanded', 'false');
            if (indicator) {
              indicator.style.transform = 'rotate(0deg)';
            }
          }
        });

        // Toggle current dropdown
        if (!isOpen) {
          dropdownMenu.classList.add('show');
          this.setAttribute('aria-expanded', 'true');

          // Animate dropdown indicator
          const indicator = this.querySelector('.dropdown-indicator');
          if (indicator) {
            indicator.style.transform = 'rotate(180deg)';
          }
        } else {
          dropdownMenu.classList.remove('show');
          this.setAttribute('aria-expanded', 'false');

          // Reset dropdown indicator
          const indicator = this.querySelector('.dropdown-indicator');
          if (indicator) {
            indicator.style.transform = 'rotate(0deg)';
          }
        }
      }
    });
  });



  // Close dropdowns when navbar collapses
  if (navbarToggler) {
    navbarToggler.addEventListener('click', function () {
      if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        // Reset all dropdowns when closing navbar
        setTimeout(() => {
          document.querySelectorAll('.navbar-nav .dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
          });
          document.querySelectorAll('.navbar-nav .submenu').forEach(menu => {
            menu.style.display = 'none';
            menu.classList.remove('show');
          });
          document.querySelectorAll('.navbar-nav .dropdown-submenu').forEach(submenu => {
            submenu.classList.remove('show');
          });
          document.querySelectorAll('.navbar-nav .dropdown-toggle .dropdown-indicator').forEach(indicator => {
            indicator.style.transform = 'rotate(0deg)';
          });
        }, 300);
      }
    });
  }

  // Mobilde submenu başlığı: 1. dokunuş açar, 2. dokunuş linke gider
  document.querySelectorAll('.navbar-nav .dropdown-submenu > .dropdown-item.dropdown-toggle')
    .forEach(function (submenuToggle) {
      submenuToggle.addEventListener('click', function (e) {
        if (window.innerWidth <= 991) {
          const submenu = this.nextElementSibling; // <ul class="dropdown-menu submenu">
          const isOpen = submenu && submenu.classList.contains('show');

          if (!isOpen) {
            // İlk dokunuş: alt menüyü aç, sayfaya gitmeyi engelle
            e.preventDefault();

            // Diğer açık alt menüleri kapat
            document.querySelectorAll('.navbar-nav .dropdown-submenu .submenu.show')
              .forEach(s => s.classList.remove('show'));
            // Bu alt menüyü aç
            if (submenu) submenu.classList.add('show');
          }
          // isOpen true ise (yani ikinci dokunuş), preventDefault YAPMA -> linke gitsin
        }
      }, { passive: false });
    });
});
// Global flag for preventing multiple submissions
let isSearching = false;

// Helper function to format remaining time
function formatRemainingTime(minutes) {
  if (minutes <= 0) return '0 dakika';
  if (minutes < 60) return `${minutes} dakika`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} saat`;
  }
  return `${hours} saat ${remainingMinutes} dakika`;
}

// Rate limit status management
let rateLimitStatusInterval = null;

// Function to fetch and display current rate limit status
async function updateRateLimitStatus() {
  const statusContainer = document.getElementById('rateLimitStatus');
  const statusText = document.getElementById('rateLimitText');

  if (!statusContainer || !statusText) return;

  try {
    // Make a lightweight POST request to check rate limit status
    // This will be caught by rate limiting but won't process the search
    const response = await fetch('/api/certificate-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fin_code: '' }) // Empty FIN to trigger validation
    });

    // Check rate limit headers from response
    const limit = parseInt(response.headers.get('X-RateLimit-Limit')) || 10;
    const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
    const resetTime = response.headers.get('X-RateLimit-Reset');

    // If we have rate limit info, display it
    if (remaining !== null && remaining !== undefined) {
      const used = limit - remaining;

      if (used > 0) {
        statusContainer.style.display = 'block';

        // Calculate remaining time until reset
        let resetMinutes = 0;
        if (resetTime) {
          const resetTimestamp = parseInt(resetTime) * 1000;
          const now = Date.now();
          resetMinutes = Math.max(0, Math.ceil((resetTimestamp - now) / (1000 * 60)));
        }

        // Update status text based on usage
        if (remaining === 0) {
          statusText.innerHTML = `
            <span class="text-warning">
              <i class="fas fa-exclamation-triangle me-1"></i>
              Sorgulama limitiniz doldu (${used}/${limit}). ${formatRemainingTime(resetMinutes)} sonra yenilenecek.
            </span>
          `;
          statusContainer.querySelector('.alert').className = 'alert alert-warning text-center py-2';
        } else if (remaining <= 2) {
          statusText.innerHTML = `
            <span class="text-warning">
              <i class="fas fa-clock me-1"></i>
              ${used}/${limit} sorgulama kullanıldı. ${remaining} sorgulama hakkınız kaldı.
            </span>
          `;
          statusContainer.querySelector('.alert').className = 'alert alert-warning text-center py-2';
        } else {
          statusText.innerHTML = `
            <span class="text-info">
              <i class="fas fa-info-circle me-1"></i>
              ${used}/${limit} sorgulama kullanıldı. ${remaining} sorgulama hakkınız kaldı.
            </span>
          `;
          statusContainer.querySelector('.alert').className = 'alert alert-info text-center py-2';
        }
      } else {
        statusContainer.style.display = 'none';
      }
    } else {
      // No rate limit headers, hide status
      statusContainer.style.display = 'none';
    }
  } catch (error) {
    // Silently fail - don't show status if we can't fetch it
    statusContainer.style.display = 'none';
  }
}

// Function to start rate limit status updates
function startRateLimitStatusUpdates() {
  // Update immediately
  updateRateLimitStatus();

  // Update every 30 seconds
  if (rateLimitStatusInterval) {
    clearInterval(rateLimitStatusInterval);
  }
  rateLimitStatusInterval = setInterval(updateRateLimitStatus, 30000);
}

// Function to stop rate limit status updates
function stopRateLimitStatusUpdates() {
  if (rateLimitStatusInterval) {
    clearInterval(rateLimitStatusInterval);
    rateLimitStatusInterval = null;
  }
}

// Handle Certificate Verification Form
async function handleVerifyForm(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  const resultContainer = document.getElementById('verifyResult');

  // Çoklu tık koruması
  if (isSearching || submitBtn.disabled) {
    return;
  }

  // FIN kodu kontrolü
  const finInput = document.getElementById('fin');
  const finCode = finInput.value.trim();

  // Validation kontrolleri (buton durumunu değiştirmeden önce)
  if (!finCode) {
    finInput.classList.add('is-invalid');
    resultContainer.innerHTML = `
      <div class="alert alert-warning" role="alert">
        <i class="fas fa-exclamation-triangle me-2"></i>Lütfen FIN kodunu girin.
      </div>
    `;
    // Buton zaten disabled değilse normale döndür
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    return;
  }

  // FIN kodu formatı kontrolü
  if (!/^[A-Z0-9]+$/.test(finCode)) {
    finInput.classList.add('is-invalid');
    resultContainer.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <i class="fas fa-times-circle me-2"></i>FIN kodu sadece büyük harf ve rakam içermelidir.
      </div>
    `;
    // Buton zaten disabled değilse normale döndür
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    return;
  }

  finInput.classList.remove('is-invalid');

  // Validation geçtikten sonra butonu kitle
  isSearching = true;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sorgulanıyor...';

  try {
    const response = await fetch('/api/certificate-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fin_code: finCode })
    });

    const result = await response.json();

    // 404 hatası özel olarak handle et
    if (response.status === 404) {
      resultContainer.innerHTML = `
        <div class="alert alert-warning text-center" role="alert">
          <h5 class="alert-heading"><i class="fas fa-search me-2"></i>Sertifika Bulunamadı</h5>
          <p class="mb-0">Bu FIN koduna ait sertifika bulunamadı. Lütfen FIN kodunuzu kontrol edin.</p>
        </div>
      `;
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || 'Bir hata oluştu');
    }

    if (result.success) {
      // Güvenlik: XSS koruması için HTML escape
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // Başarılı sonuç göster
      resultContainer.innerHTML = `
        <div class="alert alert-success text-center mx-1 mx-md-auto" role="alert" style="max-width: none;">
          <!-- Başlık yukarıda -->
          <h5 class="alert-heading"><i class="fas fa-check-circle me-2"></i>Sertifika Bulundu!</h5>
          <hr>
          <!-- FIN Kodu ve Ad Soyad - responsive -->
          <div class="mb-3 text-start text-md-center d-flex flex-column flex-md-row justify-content-start justify-content-md-center align-items-start align-items-md-center">
            <!-- Masaüstü: yan yana, Mobil: alt alta ve ortalı -->
            <div class="mb-2 mb-md-0 me-md-3">
              <strong>FIN Kodu:</strong> ${escapeHtml(result.data.fin_code)}
            </div>
            <div>
              <strong>Ad Soyad:</strong> ${escapeHtml(result.data.full_name)}
            </div>
          </div>
          <!-- Sertifika görseli -->
          <div class="certificate-preview text-center">
            <img src="${result.data.certificate_image_url}" 
                 alt="Sertifika Görseli" 
                 class="img-fluid rounded shadow"
                 style="max-height: 500px; cursor: pointer;"
                 onclick="showCertificateModal('${result.data.certificate_image_url}', '${result.data.full_name}', '${result.data.fin_code}')"
                 oncontextmenu="return false;"
                 ondragstart="return false;"
                 onselect="return false;">
          </div>
        </div>
      `;
    } else {
      // Hata sonucu göster
      resultContainer.innerHTML = `
        <div class="alert alert-danger text-center" role="alert">
          <h5 class="alert-heading"><i class="fas fa-times-circle me-2"></i>Sertifika Bulunamadı</h5>
          <p class="mb-0">${result.error}</p>
        </div>
      `;
    }

  } catch (error) {
    console.error('Sertifika sorgulama hatası:', error);
    resultContainer.innerHTML = `
      <div class="alert alert-danger text-center" role="alert">
        <h5 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>Hata</h5>
        <p class="mb-0">Sertifika sorgulanırken bir hata oluştu. Lütfen tekrar deneyin.</p>
      </div>
    `;
  } finally {
    // Butonu her durumda normale döndür
    isSearching = false;
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// Sertifika modal gösterimi
function showCertificateModal(imageUrl, fullName, finCode) {
  // Modal HTML'i oluştur
  const modalHtml = `
    <div class="modal fade" id="certificateModal" tabindex="-1" aria-labelledby="certificateModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header justify-content-center">
            <h5 class="modal-title" id="certificateModalLabel">
              <i class="fas fa-certificate me-2"></i>Sertifika Görseli
            </h5>
            <button type="button" class="btn-close position-absolute end-0 me-3" data-bs-dismiss="modal" aria-label="Kapat"></button>
          </div>
          <div class="modal-body text-center">
            <img src="${imageUrl}" 
                 alt="Sertifika Görseli" 
                 class="img-fluid rounded shadow"
                 style="max-width: 90%; max-height: 70vh; height: auto;"
                 oncontextmenu="return false;"
                 ondragstart="return false;"
                 onselect="return false;">
            <div class="mt-3">
              <small class="text-muted">
                <i class="fas fa-lock me-1"></i>
                Bu sertifika görseli şifrelenmektedir.
              </small>
            </div>
          </div>
          <div class="modal-footer justify-content-center">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Eski modal varsa kaldır
  const existingModal = document.getElementById('certificateModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Yeni modal ekle
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Modal'ı göster
  const modal = new bootstrap.Modal(document.getElementById('certificateModal'), {
    backdrop: true,
    keyboard: true
  });
  modal.show();

  // Modal kapandığında DOM'dan kaldır
  const modalElement = document.getElementById('certificateModal');
  modalElement.addEventListener('hidden.bs.modal', function () {
    this.remove();
  });
}

// Alert gösterme fonksiyonu (sertifika sayfası için)
function showAlert(type, message) {
  // Mevcut alert'leri temizle
  const existingAlerts = document.querySelectorAll('.alert-container .alert');
  existingAlerts.forEach(alert => alert.remove());

  // Alert container'ı bul veya oluştur
  let alertContainer = document.querySelector('.alert-container');
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.className = 'alert-container';
    alertContainer.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 9999; width: 90%; max-width: 500px;';
    document.body.appendChild(alertContainer);
  }

  // Alert HTML'i oluştur
  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Kapat"></button>
    </div>
  `;

  alertContainer.insertAdjacentHTML('beforeend', alertHtml);

  // 5 saniye sonra otomatik kaldır
  setTimeout(() => {
    const alert = alertContainer.querySelector('.alert');
    if (alert) {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 150);
    }
  }, 5000);
}