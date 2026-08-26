/**
 * Capture un élément DOM en canvas pour export (carte, badge...) en intégrant d'abord
 * chaque <img> sous forme de data URI. Nécessaire car html2canvas ne peut pas toujours lire
 * le contenu d'une image hébergée sur une autre origine (photo de profil servie par le
 * backend) : sans ça, la photo peut apparaître vide/manquante sur l'export alors qu'elle
 * s'affiche normalement à l'écran.
 */
export async function capturerAvecPhotos(el) {
  const { default: html2canvas } = await import('html2canvas')
  const imgs = Array.from(el.querySelectorAll('img'))
  const originaux = imgs.map((img) => img.src)
  try {
    await Promise.all(
      imgs.map(async (img) => {
        try {
          const res = await fetch(img.src)
          const blob = await res.blob()
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          img.src = dataUrl
          if (!img.complete) {
            await new Promise((resolve) => {
              img.onload = resolve
              img.onerror = resolve
            })
          }
        } catch {
          // Échec du fetch (réseau, CORS strict sans fallback) : on garde l'image telle
          // quelle, html2canvas tentera quand même de la capturer via useCORS.
        }
      }),
    )
    return await html2canvas(el, { backgroundColor: '#ffffff', scale: 3, useCORS: true, logging: false })
  } finally {
    imgs.forEach((img, i) => { img.src = originaux[i] })
  }
}
