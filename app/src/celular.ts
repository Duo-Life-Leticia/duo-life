// Notificação no celular (web push). Precisa da chave pública VITE_VAPID_PUBLIC_KEY.
import { api } from "./api";

const chavePublica = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type SituacaoCelular = "ativo" | "desligado" | "bloqueado" | "instalar-iphone" | "sem-suporte" | "nao-configurado";

const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

export async function registrarServiceWorker() {
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("/sw.js"); } catch { /* sem suporte */ }
  }
}

export async function situacaoCelular(): Promise<SituacaoCelular> {
  if (ehIphone() && !instalado()) return "instalar-iphone";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  return inscricao && Notification.permission === "granted" ? "ativo" : "desligado";
}

function chaveEmBytes(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

export async function ativarCelular(): Promise<SituacaoCelular> {
  const atual = await situacaoCelular();
  if (atual === "instalar-iphone" || atual === "sem-suporte" || atual === "bloqueado") return atual;
  if (api.demo || !chavePublica) {
    // Sem a chave, só pede a permissão; o envio de verdade liga quando o app for publicado.
    const p = await Notification.requestPermission();
    return p === "granted" ? (api.demo ? "ativo" : "nao-configurado") : p === "denied" ? "bloqueado" : "desligado";
  }
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "bloqueado" : "desligado";
  const reg = await navigator.serviceWorker.ready;
  const inscricao = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(chavePublica) });
  await api.salvarInscricaoCelular(inscricao.toJSON());
  return "ativo";
}
