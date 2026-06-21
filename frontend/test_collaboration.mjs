/**
 * Test standalone collaboration WebSocket STOMP
 * Run: node test_collaboration.mjs
 * Requires: npm install @stomp/stompjs ws
 */
import { Client } from '@stomp/stompjs'
import { WebSocket } from 'ws'

// Node.js n'a pas WebSocket natif avant v22 — on l'injecte
Object.assign(globalThis, { WebSocket })

const BFF_URL   = 'ws://localhost:8081/ws/collab'
const PROJECT_ID = 'test-collab-001'

// ── Simule 2 utilisateurs ──────────────────────────────────────────────────

function createUser(name) {
  return new Promise((resolve) => {
    const client = new Client({
      brokerURL: BFF_URL,
      reconnectDelay: 0,
      onConnect: () => {
        console.log(`[${name}] connecte au broker STOMP`)

        // S'abonner aux evenements du projet
        client.subscribe(`/topic/project/${PROJECT_ID}/events`, (msg) => {
          const event = JSON.parse(msg.body)
          console.log(`[${name}] recu event: type=${event.type}, from=${event.userName}, data=${JSON.stringify(event.data)}`)
        })

        resolve({ client, name })
      },
      onDisconnect: () => console.log(`[${name}] deconnecte`),
      onStompError: (frame) => {
        console.error(`[${name}] STOMP error:`, frame.headers?.message)
        resolve(null)
      },
    })
    client.activate()
  })
}

async function run() {
  console.log('=== TEST COLLABORATION WEBSOCKET ===')
  console.log(`URL: ${BFF_URL}`)
  console.log(`Projet: ${PROJECT_ID}`)
  console.log()

  // Connecte utilisateur 1
  console.log('1. Connexion utilisateur Alice...')
  const alice = await Promise.race([
    createUser('Alice'),
    new Promise(r => setTimeout(() => r(null), 5000))
  ])

  if (!alice) {
    console.log('ECHEC: impossible de se connecter au WebSocket')
    console.log('  -> Verifie que Docker tourne: docker compose up -d')
    console.log('  -> Verifie que Spring BFF repond: http://localhost:8081/health')
    process.exit(1)
  }

  // Connecte utilisateur 2 apres 1s
  await new Promise(r => setTimeout(r, 1000))
  console.log('2. Connexion utilisateur Bob...')
  const bob = await Promise.race([
    createUser('Bob'),
    new Promise(r => setTimeout(() => r(null), 5000))
  ])

  if (!bob) {
    console.log('ECHEC: Bob ne peut pas se connecter')
    alice.client.deactivate()
    process.exit(1)
  }

  await new Promise(r => setTimeout(r, 500))

  // Alice envoie un evenement cursor
  console.log()
  console.log('3. Alice envoie un evenement cursor...')
  alice.client.publish({
    destination: `/app/project/${PROJECT_ID}/event`,
    body: JSON.stringify({
      type: 'cursor',
      projectId: PROJECT_ID,
      userId: 'alice',
      userName: 'Alice',
      data: { line: 42, column: 15 },
    })
  })

  await new Promise(r => setTimeout(r, 500))

  // Bob envoie un evenement edit
  console.log('4. Bob envoie un evenement edit...')
  bob.client.publish({
    destination: `/app/project/${PROJECT_ID}/event`,
    body: JSON.stringify({
      type: 'edit',
      projectId: PROJECT_ID,
      userId: 'bob',
      userName: 'Bob',
      data: { file: 'App.tsx', saved: true },
    })
  })

  await new Promise(r => setTimeout(r, 1000))

  // Deconnexion
  console.log()
  console.log('5. Deconnexion...')
  alice.client.publish({ destination: `/app/project/${PROJECT_ID}/leave`, body: '{}' })
  bob.client.publish({ destination: `/app/project/${PROJECT_ID}/leave`, body: '{}' })

  await new Promise(r => setTimeout(r, 500))
  alice.client.deactivate()
  bob.client.deactivate()

  console.log()
  console.log('=== TEST TERMINE ===')
  console.log('Si tu as vu les events "recu event" ci-dessus -> collaboration OK')
  process.exit(0)
}

run().catch(e => {
  console.error('Erreur inattendue:', e.message)
  process.exit(1)
})
