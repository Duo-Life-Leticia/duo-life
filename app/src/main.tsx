import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App, { TelaDeFalha } from "./App";
import "./styles.css";
import { registrarServiceWorker } from "./celular";

registrarServiceWorker();

// Se alguma tela quebrar, mostra uma mensagem com "Tentar de novo" em vez da tela azul vazia.
class Protecao extends Component<{ children: ReactNode }, { quebrou: boolean }> {
  state = { quebrou: false };
  static getDerivedStateFromError() { return { quebrou: true }; }
  render() {
    if (!this.state.quebrou) return this.props.children;
    return <TelaDeFalha texto="Algo deu errado nesta tela. Toque em “Tentar de novo”. Se continuar, avise o professor." aoTentar={() => { window.location.href = "/"; }} />;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Protecao>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Protecao>
  </StrictMode>,
);
