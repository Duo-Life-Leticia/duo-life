// Duo Life · recebe as notificações no celular, mesmo com o app fechado.
self.addEventListener("push", (evento) => {
  let dados = {};
  try { dados = evento.data ? evento.data.json() : {}; } catch { dados = { texto: evento.data && evento.data.text() }; }
  evento.waitUntil(self.registration.showNotification(dados.titulo || "Duo Life", {
    body: dados.texto || "",
    icon: "/icone-192.png",
    badge: "/icone-192.png",
    data: { link: dados.link || "/" },
  }));
});

// Tocar na notificação abre o app na tela certa.
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const link = (evento.notification.data && evento.notification.data.link) || "/";
  evento.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const j of janelas) {
      if ("focus" in j) { await j.focus(); if ("navigate" in j) await j.navigate(link); return; }
    }
    await self.clients.openWindow(link);
  })());
});
