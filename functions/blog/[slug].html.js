// .html uzantılı URL'leri uzantısız URL'lere yönlendiren function
export async function onRequestGet(context) {
  const { params } = context;
  const slug = params.slug;
  
  // .html uzantılı URL'yi uzantısız URL'ye yönlendir
  return new Response(null, {
    status: 301, // Permanent redirect
    headers: {
      'Location': `/blog/${slug}`
    }
  });
}