import { Component } from 'react'

// Rete di sicurezza: se un errore imprevisto si verifica durante il render
// dell'app, mostra un messaggio invece di lasciare la pagina bianca.
export default class ErrorBoundary extends Component {
  state = { errore: null }

  static getDerivedStateFromError(errore) {
    return { errore }
  }

  componentDidCatch(errore, info) {
    console.error('Errore non gestito nell\'app:', errore, info)
  }

  render() {
    if (this.state.errore) {
      return (
        <div className="errore-globale">
          <h1>Qualcosa è andato storto</h1>
          <p>Prova a ricaricare la pagina. Se il problema persiste, riprova più tardi.</p>
        </div>
      )
    }
    return this.props.children
  }
}
