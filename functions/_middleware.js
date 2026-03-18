// Redirect middleware for Cloudflare Pages
export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // Redirects mapping
  const redirects = {
    '/sertifika-sorgu.html': '/certificate-verification.html',
    '/sertifika-sorgu': '/certificate-verification.html',
    '/kurumsal.html': '/about.html',
    '/kurumsal': '/about.html',
    '/referanslar.html': '/references.html',
    '/referanslar': '/references.html',
    '/bize-ulasin.html': '/contact.html',
    '/bize-ulasin': '/contact.html',
    '/egitim/sertifikasyon-egitimi.html': '/education/certification-training.html',
    '/egitim/sertifikasyon-egitimi': '/education/certification-training.html',
    '/egitim/tarimsal-drone-egitimi.html': '/education/agricultural-drone-training.html',
    '/egitim/tarimsal-drone-egitimi': '/education/agricultural-drone-training.html',
    '/egitim/drone-pilotu-egitimi.html': '/education/drone-pilot-training.html',
    '/egitim/drone-pilotu-egitimi': '/education/drone-pilot-training.html',
    '/hizmetler/tarimsal-cozumler.html': '/services/agricultural-solutions.html',
    '/hizmetler/tarimsal-cozumler': '/services/agricultural-solutions.html',
  };
  
  // Check if current path needs redirect
  if (redirects[url.pathname]) {
    return Response.redirect(
      new URL(redirects[url.pathname], url.origin), 
      301 // Permanent redirect
    );
  }
  
  // Continue to next middleware/function
  return context.next();
}
