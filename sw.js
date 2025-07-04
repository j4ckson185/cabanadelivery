// Service Worker para Cabana Delivery PWA
const CACHE_NAME = 'cabana-delivery-v1.0.0';
const urlsToCache = [
  '/',
  '/motoboy.html',
  '/relatorio.html',
  '/manifest.json',
  // CDN resources
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker ativado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  // Estratégia Network First para API calls
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('netlify/functions') ||
      event.request.url.includes('firebase')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Se a resposta for bem-sucedida, não fazer cache de dados dinâmicos
          return response;
        })
        .catch(() => {
          // Se falhar, tentar buscar no cache (fallback)
          return caches.match(event.request);
        })
    );
    return;
  }

  // Estratégia Cache First para recursos estáticos
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Se encontrar no cache, retornar
        if (response) {
          return response;
        }
        
        // Se não encontrar no cache, buscar na rede
        return fetch(event.request).then((response) => {
          // Se a requisição falhar, não fazer nada
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar resposta para poder usar e armazenar
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('🔄 Sincronização em background:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aqui você pode implementar lógica para sincronizar dados offline
      syncOfflineData()
    );
  }
});

async function syncOfflineData() {
  try {
    // Implementar lógica de sincronização se necessário
    console.log('🔄 Sincronizando dados offline...');
    // Por exemplo, enviar pedidos aceitos enquanto offline
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

// Notificações push
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification recebida');
  
  const options = {
    body: event.data ? event.data.text() : 'Novo pedido disponível!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Pedidos',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Cabana Delivery', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificação clicada');
  
  event.notification.close();

  if (event.action === 'explore') {
    // Abrir app na aba de pedidos
    event.waitUntil(
      clients.openWindow('/motoboy.html#pedidos')
    );
  }
});

// Mensagens do app principal
self.addEventListener('message', (event) => {
  console.log('📨 Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker Cabana Delivery carregado!');
