// blog-multilang eski URL'lerini /blog/ altina yonlendir
export async function onRequestGet(context) {
  const { params, request } = context;
  const slug = params.slug.replace('.html', '');
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang');
  const target = `/blog/${slug}${lang && lang !== 'tr' ? '?lang=' + lang : ''}`;

  return new Response(null, {
    status: 301,
    headers: { 'Location': target }
  });
}
