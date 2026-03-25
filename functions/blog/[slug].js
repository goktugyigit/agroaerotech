// Dil bazli icerik alma fonksiyonlari
function getBlogTitle(blog, language) {
  if (language === 'en' && blog.title_en) return blog.title_en;
  if (language === 'ru' && blog.title_ru) return blog.title_ru;
  if (language === 'az' && blog.title_az) return blog.title_az;
  return blog.title_tr || 'Blog Basligi';
}

function getBlogDescription(blog, language) {
  if (language === 'en' && blog.description_en) return blog.description_en;
  if (language === 'ru' && blog.description_ru) return blog.description_ru;
  if (language === 'az' && blog.description_az) return blog.description_az;
  return blog.description_tr || 'Blog aciklamasi';
}

function getBlogContent(blog, language) {
  if (language === 'en' && blog.content_en) return blog.content_en;
  if (language === 'ru' && blog.content_ru) return blog.content_ru;
  if (language === 'az' && blog.content_az) return blog.content_az;
  return blog.content_tr || 'Icerik yukleniyor...';
}

// Dil bazli UI metinleri
function getUITexts(language) {
  const texts = {
    tr: { backToBlog: "Blog'a Dön", readTime: 'dakika okuma', viewOtherPosts: 'Diğer Blog Yazılarını Görüntüle' },
    en: { backToBlog: 'Back to Blog', readTime: 'min read', viewOtherPosts: 'View Other Blog Posts' },
    ru: { backToBlog: 'Назад к блогу', readTime: 'мин чтения', viewOtherPosts: 'Смотреть другие статьи' },
    az: { backToBlog: 'Bloqa qayıt', readTime: 'dəqiqə oxuma', viewOtherPosts: 'Digər bloq yazılarını gör' }
  };
  return texts[language] || texts.tr;
}

// Ana Function Handler
export async function onRequestGet(context) {
  const { env, params, request } = context;
  const slug = params.slug.replace('.html', '');

  // URL'den dil parametresini al
  const url = new URL(request.url);
  const language = url.searchParams.get('lang') || 'tr';

  try {
    if (!env.BLOG_DB) {
      return new Response("Veritabani baglantisi kurulamadi.", { status: 500 });
    }

    const blog = await env.BLOG_DB.prepare(
      `SELECT id, title_tr, title_en, title_ru, title_az,
              description_tr, description_en, description_ru, description_az,
              content_tr, content_en, content_ru, content_az,
              slug, category, image, read_time, created_at, updated_at, published
       FROM blogs
       WHERE slug = ? AND (published = 1 OR published IS NULL)`
    ).bind(slug).first();

    if (!blog) {
      return new Response("Blog yazisi bulunamadi.", { status: 404 });
    }

    const localeMap = { tr: 'tr-TR', en: 'en-US', ru: 'ru-RU', az: 'az-AZ' };
    const formattedDate = new Date(blog.created_at).toLocaleDateString(localeMap[language] || 'tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const title = getBlogTitle(blog, language);
    const description = getBlogDescription(blog, language);
    const content = getBlogContent(blog, language);
    const ui = getUITexts(language);
    const langParam = language !== 'tr' ? `?lang=${language}` : '';

    const html = `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | AgroAeroTech</title>
  <meta name="description" content="${description}">

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/assets/img/favicon/favicon.png">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- Bootstrap CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />

  <!-- AOS CSS -->
  <link href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" rel="stylesheet">

  <!-- Custom CSS -->
  <link href="/assets/css/custom.css" rel="stylesheet">
  <link href="/assets/css/cursor-effects.css" rel="stylesheet">

  <style>
    .blog-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding-top: 120px;
      padding-bottom: 60px;
    }

    .blog-content {
      font-size: 1.1rem;
      line-height: 1.8;
    }

    .blog-content h2 {
      color: #28a745;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }

    .blog-content h3 {
      color: #495057;
      margin-top: 1.5rem;
      margin-bottom: 0.8rem;
    }

    .blog-meta {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 10px;
      margin-bottom: 2rem;
    }

    .back-to-blog {
      background: #f8f9fa;
      border: 2px solid #28a745;
      color: #28a745;
      padding: 10px 25px;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }

    .back-to-blog:hover {
      background: #28a745;
      border-color: #28a745;
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
    }

    .back-to-blog i {
      transition: transform 0.3s ease;
    }

    .back-to-blog:hover i {
      transform: translateX(-3px);
    }

    /* Dil Secici Stilleri */
    .language-selector .dropdown-toggle {
      background: none;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 6px 12px;
      color: #495057;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }

    .language-selector .dropdown-toggle:hover {
      border-color: #28a745;
      color: #28a745;
    }

    .language-selector .flag-icon {
      width: 20px;
      height: 15px;
      object-fit: cover;
      border-radius: 2px;
    }

    .language-selector .dropdown-menu {
      min-width: 140px;
      border: 1px solid #dee2e6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .language-selector .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      font-size: 0.9rem;
    }

    .language-selector .dropdown-item:hover {
      background-color: #f8f9fa;
    }

    .language-selector .dropdown-item.active {
      background-color: #28a745;
      color: white;
    }

    @media (max-width: 991px) {
      .language-selector .dropdown-toggle {
        border: none;
        padding: 8px 0;
        justify-content: space-between;
        width: 100%;
      }
    }
  </style>

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-CSCL2KYTFF"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-CSCL2KYTFF');
</script>
</head>
<body>

  <!-- Navigation -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm" aria-label="Ana Gezinti Menusu">
    <div class="container">
      <a class="navbar-brand me-auto" href="/index.html" title="AgroAeroTech Anasayfa">
        <img src="/assets/img/logo-agroaerotech.png" alt="AgroAeroTech Logo">
      </a>

      <a href="/contact.html" class="btn-contact btn-sm d-lg-none me-2" data-translate="nav-contact">Bize Ulasin</a>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
        aria-controls="navbarNav" aria-expanded="false" aria-label="Gezinti menusunu ac/kapat">
        <i class="fas fa-bars"></i>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <a class="nav-link" href="/" data-translate="nav-home">Anasayfa</a>
          </li>

          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <span data-translate="nav-services">Hizmetlerimiz</span> <i class="fas fa-chevron-down dropdown-indicator ms-2"></i>
            </a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="/services/agricultural-solutions.html" data-translate="nav-agricultural-solutions">Drone ile Tarimsal Cozumler</a></li>
              <li><a class="dropdown-item" href="/services/industrial-solutions.html" data-translate="nav-industrial-solutions">Drone ile Endustriyel Cozumler</a></li>
              <li><a class="dropdown-item" href="/services/drone-event-services.html" data-translate="nav-event-services">Drone ile Etkinlik Hizmetleri</a></li>
              <li><a class="dropdown-item" href="/services/drone-technical-service.html" data-translate="nav-technical-service">Drone Teknik Servis ve Bakim</a></li>
            </ul>
          </li>

          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <span data-translate="nav-education">Egitim</span> <i class="fas fa-chevron-down dropdown-indicator ms-2"></i>
            </a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="/education/certification-training.html" data-translate="nav-certification-education">Sertifikasyon Egitimi</a></li>
              <li><a class="dropdown-item" href="/education/agricultural-drone-training.html" data-translate="nav-agricultural-drone-education">Tarimsal Drone Egitimi</a></li>
            </ul>
          </li>

          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle active" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" aria-current="page">
              <span data-translate="nav-corporate">Kurumsal</span> <i class="fas fa-chevron-down dropdown-indicator ms-2"></i>
            </a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="/about.html" data-translate="nav-about">Hakkimizda ve Tarihcemiz</a></li>
              <li><a class="dropdown-item" href="/references.html" data-translate="nav-references">Referanslarimiz</a></li>
              <li><a class="dropdown-item" href="/blog.html" data-translate="nav-blog">Blog</a></li>
            </ul>
          </li>

          <li class="nav-item">
            <a class="nav-link" href="/certificate-verification.html" data-translate="nav-certificate">Sertifika Sorgulama</a>
          </li>

          <!-- Mobil Dil Secici -->
          <li class="nav-item d-lg-none">
            <div class="language-selector dropdown">
              <a class="dropdown-toggle nav-link" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="/assets/img/flags/${language}.svg" alt="" class="flag-icon" id="currentFlagMobile">
                <span id="currentLangMobile">${language === 'tr' ? 'Turkce' : language === 'en' ? 'English' : language === 'ru' ? 'Russkiy' : 'Azerbaycan'}</span>
                <i class="fas fa-chevron-down ms-auto" style="font-size: 0.7rem;"></i>
              </a>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item${language === 'tr' ? ' active' : ''}" href="#" data-lang="tr" data-flag="tr.svg">
                  <img src="/assets/img/flags/tr.svg" alt="Turkce" class="flag-icon"> Turkce
                </a></li>
                <li><a class="dropdown-item${language === 'en' ? ' active' : ''}" href="#" data-lang="en" data-flag="en.svg">
                  <img src="/assets/img/flags/en.svg" alt="English" class="flag-icon"> English
                </a></li>
                <li><a class="dropdown-item${language === 'ru' ? ' active' : ''}" href="#" data-lang="ru" data-flag="ru.svg">
                  <img src="/assets/img/flags/ru.svg" alt="Russkiy" class="flag-icon"> Russkiy
                </a></li>
                <li><a class="dropdown-item${language === 'az' ? ' active' : ''}" href="#" data-lang="az" data-flag="az.svg">
                  <img src="/assets/img/flags/az.svg" alt="Azerbaycan" class="flag-icon"> Azerbaycan
                </a></li>
              </ul>
            </div>
          </li>
        </ul>

        <!-- DESKTOP: sag ust buton grubu -->
        <div class="d-none d-lg-flex gap-2 ms-lg-3 align-items-center">
          <div class="language-selector dropdown">
            <a class="dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" id="languageSelector">
              <img src="/assets/img/flags/${language}.svg" alt="" class="flag-icon" id="currentFlag">
              <span id="currentLang">${language.toUpperCase()}</span>
              <i class="fas fa-chevron-down ms-1" style="font-size: 0.7rem;"></i>
            </a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item${language === 'tr' ? ' active' : ''}" href="#" data-lang="tr" data-flag="tr.svg">
                <img src="/assets/img/flags/tr.svg" alt="Turkce" class="flag-icon"> Turkce
              </a></li>
              <li><a class="dropdown-item${language === 'en' ? ' active' : ''}" href="#" data-lang="en" data-flag="en.svg">
                <img src="/assets/img/flags/en.svg" alt="English" class="flag-icon"> English
              </a></li>
              <li><a class="dropdown-item${language === 'ru' ? ' active' : ''}" href="#" data-lang="ru" data-flag="ru.svg">
                <img src="/assets/img/flags/ru.svg" alt="Russkiy" class="flag-icon"> Russkiy
              </a></li>
              <li><a class="dropdown-item${language === 'az' ? ' active' : ''}" href="#" data-lang="az" data-flag="az.svg">
                <img src="/assets/img/flags/az.svg" alt="Azerbaycan" class="flag-icon"> Azerbaycan
              </a></li>
            </ul>
          </div>
          <a href="/contact.html" class="btn-contact btn-sm d-inline-flex align-items-center" data-translate="nav-contact">Bize Ulasin</a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Blog Header -->
  <section class="blog-header">
    <div class="container">
      <div class="row">
        <div class="col-lg-8 mx-auto">
          <a href="/blog.html" class="btn back-to-blog mb-4">
            <i class="fas fa-arrow-left me-2"></i>${ui.backToBlog}
          </a>
          <h1 class="display-5 fw-bold mb-4" data-aos="fade-up">
            ${title}
          </h1>
          <div class="blog-meta" data-aos="fade-up" data-aos-delay="100">
            <div class="row align-items-center">
              <div class="col-md-6">
                <i class="fas fa-calendar me-2 text-dark"></i>${formattedDate}
                <span class="mx-3">&bull;</span>
                <i class="fas fa-tag me-2 text-dark"></i>${blog.category}
              </div>
              <div class="col-md-6 text-md-end">
                <i class="fas fa-clock me-2 text-dark"></i>${blog.read_time} ${ui.readTime}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Blog Content -->
  <section class="py-5">
    <div class="container">
      <div class="row">
        <div class="col-lg-8 mx-auto">
          <div class="blog-content" data-aos="fade-up">
            ${blog.image ? `<img src="${blog.image}" alt="${title}" class="img-fluid rounded shadow mb-4">` : ''}

            ${content}
          </div>

          <!-- Back to Blog -->
          <div class="text-center mt-5">
            <a href="/blog.html" class="btn back-to-blog btn-lg">
              <i class="fas fa-arrow-left me-2"></i>${ui.viewOtherPosts}
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer-dark py-5">
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-3 col-md-6">
          <h5 class="fw-bold mb-3">AgroAeroTech</h5>
          <p class="text-muted" data-translate="footer-company-desc">IHA teknolojilerinde oncu, egitimde guvenilir. Gelecegin havacilik teknolojilerini bugunden deneyimleyin.</p>
          <div class="d-flex gap-3 mt-3">
            <a href="https://www.facebook.com/people/AgroAero-Tech/61575199386431/" class="social-icon" target="_blank" title="Facebook"><i class="fab fa-facebook-f fa-lg"></i></a>
            <a href="https://www.instagram.com/agroaero.tech?igsh=bTlndmZuYW1yZzl5" class="social-icon" target="_blank" title="Instagram"><i class="fab fa-instagram fa-lg"></i></a>
            <a href="https://www.tiktok.com/@agroaerotech?_t=ZS-8z4hgtv6Ep2&_r=1" class="social-icon" target="_blank" title="TikTok"><i class="fab fa-tiktok fa-lg"></i></a>
            <a href="https://www.linkedin.com/company/agroaero-tech/" class="social-icon" target="_blank" title="LinkedIn"><i class="fab fa-linkedin-in fa-lg"></i></a>
          </div>
        </div>

        <div class="col-lg-2 col-md-4">
          <h5 class="fw-bold mb-3" data-translate="nav-services">Hizmetlerimiz</h5>
          <ul class="list-unstyled footer-links">
            <li class="mb-2"><a href="/services/agricultural-solutions.html" data-translate="nav-agricultural-solutions">Tarimsal Cozumler</a></li>
            <li class="mb-2"><a href="/services/industrial-solutions.html" data-translate="nav-industrial-solutions">Endustriyel Cozumler</a></li>
            <li class="mb-2"><a href="/services/drone-event-services.html" data-translate="nav-event-services">Etkinlik Hizmetleri</a></li>
            <li class="mb-2"><a href="/services/drone-technical-service.html" data-translate="nav-technical-service">Teknik Servis ve Bakim</a></li>
          </ul>
        </div>

        <div class="col-lg-2 col-md-4">
          <h5 class="fw-bold mb-3" data-translate="nav-education">Egitim</h5>
          <ul class="list-unstyled footer-links">
            <li class="mb-2"><a href="/education/certification-training.html" data-translate="nav-certification-education">Sertifikasyon Egitimi</a></li>
            <li class="mb-2"><a href="/education/agricultural-drone-training.html" data-translate="nav-agricultural-drone-education">Tarimsal Drone Egitimi</a></li>
          </ul>
        </div>

        <div class="col-lg-2 col-md-4">
          <h5 class="fw-bold mb-3" data-translate="nav-corporate">Kurumsal</h5>
          <ul class="list-unstyled footer-links">
            <li class="mb-2"><a href="/about.html" data-translate="nav-about">Hakkimizda ve Tarihcemiz</a></li>
            <li class="mb-2"><a href="/references.html" data-translate="nav-references">Referanslarimiz</a></li>
            <li class="mb-2"><a href="/blog.html" data-translate="nav-blog">Blog</a></li>
            <li class="mb-2"><a href="/certificate-verification.html" data-translate="nav-certificate">Sertifika Sorgulama</a></li>
            <li class="mb-2"><a href="/contact.html" data-translate="nav-contact">Bize Ulasin</a></li>
          </ul>
        </div>

        <div class="col-lg-3 col-md-6">
          <h5 class="fw-bold mb-3" data-translate="footer-contact">Iletisim</h5>
          <ul class="list-unstyled footer-links">
            <li class="mb-3">
              <i class="fas fa-phone me-2"></i>
              <a href="tel:+994103314875">+994 10 331 48 75</a>
            </li>
            <li class="mb-3">
              <i class="fas fa-envelope me-2"></i>
              <a href="mailto:info@agroaerotech.com">info@agroaerotech.com</a>
            </li>
            <li class="mb-3">
              <i class="fas fa-map-marker-alt me-2"></i>
              <span>CVCH+J9P, Alaskar Gayibov St, Baku, Azerbaycan</span>
            </li>
          </ul>
        </div>
      </div>

      <hr class="my-4" style="border-color: rgba(255,255,255,0.15);">

      <div class="row align-items-center">
        <div class="col-md-6">
          <p class="mb-0 text-muted">&copy; 2025 AgroAeroTech. <span data-translate="footer-copyright">Tum haklari saklidir.</span></p>
        </div>
        <div class="col-md-6 text-md-end">
          <a href="/legal/gizlilik-politikasi.html" class="footer-bottom-link" data-translate="footer-privacy">Gizlilik Politikasi</a>
          <span class="mx-2" style="color: rgba(255,255,255,0.3);">|</span>
          <a href="/legal/kvkk-aydinlatma-metni.html" class="footer-bottom-link" data-translate="legal-kvkk-link">KVKK Aydinlatma Metni</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

  <!-- AOS JS -->
  <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>

  <!-- Custom JS -->
  <script src="/assets/js/cursor-effects.js"></script>
  <script src="/assets/js/main.js"></script>

  <script>
    // AOS Initialize
    AOS.init({
      duration: 800,
      once: true
    });

    // Navigation height adjustment
    (function () {
      function setNavH(){
        var nav = document.querySelector('.navbar');
        if(!nav) return;
        var h = Math.ceil(nav.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--nav-h', h + 'px');
      }

      window.addEventListener('load', setNavH);
      window.addEventListener('resize', setNavH);
      window.addEventListener('scroll', setNavH, {passive:true});
      window.addEventListener('pageshow', setNavH);

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(setNavH);
      }

      var logo = document.querySelector('.navbar-brand img');
      if (logo && !logo.complete) {
        logo.addEventListener('load', setNavH, {once:true});
      }
    })();

    // Dil secici
    document.addEventListener('DOMContentLoaded', function() {
      // Mevcut dili URL'den al ve main.js'e aktar
      var currentLang = '${language}';
      if (typeof window.currentLanguage === 'undefined') {
        window.currentLanguage = currentLang;
      }
      localStorage.setItem('selectedLanguage', currentLang);

      // Dil secici event listener
      document.querySelectorAll('.language-selector .dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.preventDefault();
          var selectedLang = this.getAttribute('data-lang');
          if (selectedLang) {
            var currentUrl = new URL(window.location);
            if (selectedLang === 'tr') {
              currentUrl.searchParams.delete('lang');
            } else {
              currentUrl.searchParams.set('lang', selectedLang);
            }
            window.location.href = currentUrl.toString();
          }
        });
      });
    });
  </script>

</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
      },
    });

  } catch (error) {
    console.error('Blog hatasi:', error);
    return new Response("Sayfa yuklenirken bir hata olustu.", { status: 500 });
  }
}
