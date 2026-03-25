// Blog HTML dosyası oluşturma
export async function onRequestPost({ request, env }) {
  try {
    // Session kontrolü
    const sessionValid = await checkAdminSession(request, env);
    if (!sessionValid) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Yetkisiz erişim'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { blogId } = await request.json();
    
    // Blog bilgilerini getir
    const blog = await env.BLOG_DB.prepare(
      "SELECT * FROM blogs WHERE id = ?"
    ).bind(blogId).first();

    if (!blog) {
      return new Response(JSON.stringify({
        success: false,
        message: "Blog bulunamadı"
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // HTML template oluştur
    const htmlContent = generateBlogHTML(blog);
    
    // Bu kısımda HTML dosyasını kaydetme işlemi yapılacak
    // Cloudflare Pages'de dosya yazma işlemi sınırlı olduğu için
    // Bu işlem genellikle build process'te yapılır
    
    return new Response(JSON.stringify({
      success: true,
      message: "Blog HTML'i oluşturuldu",
      html: htmlContent
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('HTML oluşturma hatası:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'HTML oluşturulurken hata oluştu'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function generateBlogHTML(blog) {
  const formattedDate = new Date(blog.created_at).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blog.title_tr || blog.title} | AgroAeroTech Blog</title>
  <meta name="description" content="${blog.description_tr || blog.description}">
  
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
  <link href="../assets/css/custom.css" rel="stylesheet">

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
  </style>
</head>
<body>

  <!-- Navigation -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm" aria-label="Ana Gezinti Menüsü">
    <div class="container">
      <a class="navbar-brand me-auto" href="../index.html" title="AgroAeroTech Anasayfa">
        <img src="../assets/img/logo-agroaerotech.png" alt="AgroAeroTech Logo">
      </a>
  
      <!-- Mobil üstte küçük buton -->
      <a href="../bize-ulasin.html" class="btn-contact btn-sm d-lg-none me-2">Bize Ulaşın</a>
  
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
        aria-controls="navbarNav" aria-expanded="false" aria-label="Gezinti menüsünü aç/kapat">
        <i class="fas fa-bars"></i>
      </button>
  
      <div class="collapse navbar-collapse" id="navbarNav">
        <!-- Menü -->
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <a class="nav-link" href="../index.html">Anasayfa</a>
          </li>
  
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              Hizmetlerimiz <i class="fas fa-chevron-down dropdown-indicator ms-2"></i>
            </a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="../hizmetler/tarimsal-cozumler.html">Drone ile Tarımsal Çözümler</a></li>
            </ul>
          </li>

          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="egitimMenu" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              Eğitim <i class="fas fa-chevron-down dropdown-indicator ms-2"></i>
            </a>
            <ul class="dropdown-menu" aria-labelledby="egitimMenu">
              <li><a class="dropdown-item" href="../egitim/sertifikasyon-egitimi.html">Sertifikasyon Eğitimi</a></li>
              <li><a class="dropdown-item" href="../egitim/tarimsal-drone-egitimi.html">Tarımsal Drone Eğitimi</a></li>
            </ul>
          </li>
  
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle active" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" aria-current="page">
              Kurumsal <i class="fas fa-chevron-down dropdown-indicator ms-2"></i>
            </a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="../kurumsal.html">Hakkımızda ve Tarihçemiz</a></li>
              <li><a class="dropdown-item" href="../referanslar.html">Referanslarımız</a></li>
              <li><a class="dropdown-item" href="../blog.html">Blog</a></li>
            </ul>
          </li>

          <li class="nav-item">
            <a class="nav-link" href="../sertifika-sorgu.html">Sertifika Sorgulama</a>
          </li>
        </ul>
  
        <!-- DESKTOP: sağ üst buton grubu -->
        <div class="d-none d-lg-flex gap-2 ms-lg-3">
          <a href="../bize-ulasin.html" class="btn-contact btn-sm d-inline-flex align-items-center">Bize Ulaşın</a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Blog Header -->
  <section class="blog-header">
    <div class="container">
      <div class="row">
        <div class="col-lg-8 mx-auto">
          <a href="../blog.html" class="btn back-to-blog mb-4">
            <i class="fas fa-arrow-left me-2"></i>Blog'a Dön
          </a>
          <h1 class="display-5 fw-bold mb-4" data-aos="fade-up">
            ${blog.title_tr || blog.title}
          </h1>
          <div class="blog-meta" data-aos="fade-up" data-aos-delay="100">
            <div class="row align-items-center">
              <div class="col-md-6">
                <i class="fas fa-calendar me-2 text-dark"></i>${formattedDate}
                <span class="mx-3">•</span>
                <i class="fas fa-tag me-2 text-dark"></i>${blog.category}
              </div>
              <div class="col-md-6 text-md-end">
                <i class="fas fa-clock me-2 text-dark"></i>${blog.read_time} dakika okuma
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
            ${blog.image && blog.image.trim() ? `<img src="${blog.image}" alt="${blog.title_tr || blog.title}" class="img-fluid rounded shadow mb-4">` : ''}
            
            ${blog.content_tr || blog.content}
          </div>

          <!-- Back to Blog -->
          <div class="text-center mt-5">
            <a href="../blog.html" class="btn back-to-blog btn-lg">
              <i class="fas fa-arrow-left me-2"></i>Diğer Blog Yazılarını Görüntüle
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
          <p class="text-muted">İHA teknolojilerinde öncü, eğitimde güvenilir. Geleceğin havacılık teknolojilerini bugünden deneyimleyin.</p>
        </div>
        
        <div class="col-lg-3 col-md-6">
          <h5 class="fw-bold mb-3">Hızlı Menü</h5>
          <ul class="list-unstyled">
            <li class="mb-2"><a href="../index.html" class="text-decoration-none">Anasayfa</a></li>
            <li class="mb-2"><a href="../kurumsal.html" class="text-decoration-none">Kurumsal</a></li>
            <li class="mb-2"><a href="../hizmetler/tarimsal-cozumler.html" class="text-decoration-none">Tarımsal Çözümler</a></li>
            <li class="mb-2"><a href="../egitim/drone-pilotu-egitimi.html" class="text-decoration-none">Eğitim</a></li>
            <li class="mb-2"><a href="../referanslar.html" class="text-decoration-none">Referanslar</a></li>
            <li class="mb-2"><a href="../blog.html" class="text-decoration-none">Blog</a></li>
          </ul>
        </div>
        
        <div class="col-lg-3 col-md-6">
          <h5 class="fw-bold mb-3">İletişim</h5>
          <ul class="list-unstyled">
            <li class="mb-2">
              <i class="fas fa-phone me-2"></i>
              <a href="tel:+994103314875" class="text-decoration-none">+994 10 331 48 75</a>
            </li>
            <li class="mb-2">
              <i class="fas fa-envelope me-2"></i>
              <a href="mailto:info@agroaerotech.com" class="text-decoration-none">info@agroaerotech.com</a>
            </li>
            <li class="mb-2">
              <i class="fas fa-map-marker-alt me-2"></i>
              CVCH+J9P, Alaskar Gayibov St, Baku, Azerbaycan
            </li>
          </ul>
        </div>
        
        <div class="col-lg-3 col-md-6">
          <h5 class="fw-bold mb-3">Sosyal Medya</h5>
          <p class="text-muted">Güncel haberler ve gelişmeler için bizi takip edin.</p>
          <div class="d-flex gap-3">
            <a href="https://www.instagram.com/agroaero.tech?igsh=bTlndmZuYW1yZzl5" class="social-icon" target="_blank" title="Instagram"><i class="fab fa-instagram fa-lg"></i></a>
            <a href="https://www.tiktok.com/@agroaerotech?_t=ZS-8z4hgtv6Ep2&_r=1" class="social-icon" target="_blank" title="TikTok"><i class="fab fa-tiktok fa-lg"></i></a>
            <a href="https://www.linkedin.com/company/agroaero-tech/" class="social-icon" target="_blank" title="LinkedIn"><i class="fab fa-linkedin-in fa-lg"></i></a>
          </div>
        </div>
      </div>
      
      <hr class="my-4">
      
      <div class="row align-items-center">
        <div class="col-md-6">
          <p class="mb-0 text-muted">&copy; 2025 AgroAeroTech. Tüm hakları saklıdır.</p>
        </div>
        <div class="col-md-6 text-md-end">
          <a href="#" class="text-decoration-none">Gizlilik Politikası</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  
  <!-- AOS JS -->
  <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>
  
  <!-- Custom JS -->
  <script src="../assets/js/main.js"></script>
  
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
  </script>
  
</body>
</html>`;
}

// Session kontrolü fonksiyonu
async function checkAdminSession(request, env) {
  try {
    const cookie = request.headers.get('Cookie');
    if (!cookie) return false;

    const sessionMatch = cookie.match(/adminSession=([^;]+)/);
    if (!sessionMatch) return false;

    const token = decodeURIComponent(sessionMatch[1]);
    if (!token.startsWith('admin-')) return false;

    // Token yaş kontrolü (1 saat)
    const parts = token.split('-');
    if (parts.length < 3) return false;
    const tokenTime = parseInt(parts[1], 10);
    if (isNaN(tokenTime)) return false;
    const now = Date.now();
    if (tokenTime > now + 60000 || now - tokenTime > 3600000) return false;

    return true;
  } catch {
    return false;
  }
}