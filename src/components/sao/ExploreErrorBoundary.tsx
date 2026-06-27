'use client';
import React from 'react';

interface State { error: Error | null; }

/**
 * ExploreErrorBoundary — contenitore di errori per il pannello esplorazione.
 *
 * Un singolo errore runtime nell'esplorazione oggi farebbe cadere l'INTERO albero React,
 * distruggendo il canvas WebGL globale e innescando il loop di full-reload che uccide il dev server.
 * Questo Boundary contiene l'errore al solo pannello esplorazione, lascia in piedi il resto
 * (incluso <AnimatedBackground />) e stampa lo stack a schermo e in console.
 */
export class ExploreErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // visibile in console (catturabile via page.on('console'))
    console.error('[ExploreErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          className="glass-panel"
          style={{
            padding: 24,
            maxWidth: 600,
            margin: '40px auto',
            color: '#f0f0f0',
            fontFamily: "'SAO UI','Trebuchet MS',sans-serif",
          }}
        >
          <div style={{ color: '#BE2156', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
            ERRORE NELL'ESPLORAZIONE (contenuto)
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 12 }}>
            Un errore runtime è stato isolato qui invece di far crashare l'intera app.
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.7rem',
              color: '#EBA601',
              background: 'rgba(0,0,0,0.35)',
              padding: 12,
              borderRadius: 0,
              maxHeight: 320,
              overflow: 'auto',
            }}
          >
            {String(this.state.error?.stack ?? this.state.error)}
          </pre>
          <button
            style={{
              marginTop: 12,
              padding: '8px 16px',
              background: 'rgba(43,115,179,0.8)',
              border: '1px solid rgba(255,255,255,0.3)',
              clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
              color: '#FBFBFB',
              fontFamily: "'SAO UI','Trebuchet MS',sans-serif",
              fontWeight: 400,
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              cursor: 'pointer',
            }}
            onClick={() => this.setState({ error: null })}
          >
            RIPROVA
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
