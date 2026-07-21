const SRC = 'https://assets.lemonsqueezy.com/lemon.js'

let caricamento = null

/** Carica lo script Lemon.js una sola volta e restituisce window.LemonSqueezy pronto. */
function caricaLemonJs() {
  if (window.LemonSqueezy) return Promise.resolve(window.LemonSqueezy)
  if (caricamento) return caricamento

  caricamento = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SRC
    script.defer = true
    script.onload = () => {
      if (typeof window.createLemonSqueezy === 'function') {
        window.createLemonSqueezy()
      }
      resolve(window.LemonSqueezy)
    }
    script.onerror = () => reject(new Error('Impossibile caricare Lemon.js.'))
    document.head.appendChild(script)
  })

  return caricamento
}

/**
 * Apre l'overlay di checkout Lemon Squeezy per l'URL indicato.
 * onSuccess viene richiamato quando l'utente completa l'acquisto nell'overlay.
 */
export async function apriCheckout(url, { onSuccess } = {}) {
  const LemonSqueezy = await caricaLemonJs()
  if (onSuccess) {
    LemonSqueezy.Setup({
      eventHandler: (evento) => {
        if (evento.event === 'Checkout.Success') onSuccess()
      }
    })
  }
  LemonSqueezy.Url.Open(url)
}
