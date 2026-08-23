// Service worker minimal : reçoit les notifications push et les affiche directement sur
// l'appareil (machine ou téléphone), même si l'application n'est pas ouverte.

self.addEventListener('push', (event) => {
  let data = { titre: 'Daara Barakatul Mahaahidi', message: 'Nouvelle notification', lien: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch (e) {
    // ignore, on garde les valeurs par défaut
  }

  event.waitUntil(
    self.registration.showNotification(data.titre, {
      body: data.message,
      icon: '/logo.png',
      badge: '/logo.png',
      data: { lien: data.lien || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const lien = event.notification.data?.lien || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(lien)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(lien)
    })
  )
})
