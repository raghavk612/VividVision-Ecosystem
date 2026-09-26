const API = 'http://127.0.0.1:5184'
const config = window.CLEARSPEAK_CONFIG ?? {}
const cloudConfigured = Boolean(
  config.supabaseUrl &&
  config.supabaseAnonKey &&
  !config.supabaseUrl.includes('YOUR_') &&
  window.supabase,
)
const cloud = cloudConfigured
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null
const connection = document.querySelector('#connection')
const latestCard = document.querySelector('#latest-card')
const latestText = document.querySelector('#latest-text')
const latestTime = document.querySelector('#latest-time')
const latestLevel = document.querySelector('#latest-level')
const patientStatus = document.querySelector('#patient-status')
const lastSeen = document.querySelector('#last-seen')
const messageCount = document.querySelector('#message-count')
const urgentCount = document.querySelector('#urgent-count')
const deviceCopy = document.querySelector('#device-copy')
const historyElement = document.querySelector('#history')
const acknowledge = document.querySelector('#acknowledge')
const urgentBanner = document.querySelector('#urgent-banner')
const urgentText = document.querySelector('#urgent-text')

let items = []
let seen = new Set()
let currentProfile = null
let cloudChannel = null

function timeLabel(value) {
  return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function relativeTime(value) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds} seconds ago`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
}

function render() {
  messageCount.textContent = String(items.length)
  urgentCount.textContent = String(items.filter((item) => item.level === 'urgent').length)

  if (items.length === 0) {
    historyElement.innerHTML = '<div class="history-empty"><span>···</span><strong>No messages yet</strong><p>Spoken sentences will appear here automatically.</p></div>'
    return
  }

  const latest = items[0]
  latestCard.className = `latest-card ${latest.level}`
  latestText.textContent = latest.text
  latestTime.textContent = timeLabel(latest.time)
  latestLevel.textContent = latest.level === 'urgent' ? 'URGENT' : 'MESSAGE'
  patientStatus.textContent = latest.level === 'urgent' ? 'Needs attention' : 'Communicating'
  document.querySelector('#status-card').classList.toggle('urgent', latest.level === 'urgent')
  lastSeen.textContent = `Last message ${relativeTime(latest.time)}`
  acknowledge.disabled = seen.has(latest.id)
  acknowledge.innerHTML = seen.has(latest.id) ? 'Seen <b>✓</b>' : 'Mark as seen <b>✓</b>'

  historyElement.innerHTML = items.map((item) => `
    <article class="history-item ${item.level}">
      <span class="history-icon">${item.level === 'urgent' ? '!' : '“'}</span>
      <div><strong>${escapeHtml(item.text)}</strong><span>${item.level === 'urgent' ? 'Urgent alert' : 'Spoken message'} · ${relativeTime(item.time)}</span></div>
      <time>${timeLabel(item.time)}</time>
      <i class="${seen.has(item.id) ? 'seen' : ''}">${seen.has(item.id) ? '✓' : ''}</i>
    </article>
  `).join('')
}

function escapeHtml(text) {
  const element = document.createElement('span')
  element.textContent = text
  return element.innerHTML
}

function receive(item, announce = true) {
  if (items.some((current) => current.id === item.id)) return
  items.unshift(item)
  items = items.slice(0, 30)
  render()
  if (announce) {
    latestCard.animate(
      [{ transform: 'translateY(-8px)', opacity: .65 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' },
    )
  }
  if (item.level === 'urgent' && announce) {
    urgentText.textContent = item.text
    urgentBanner.classList.add('show')
  }
}

function connectLocal() {
  const stream = new EventSource(`${API}/api/caregiver/events`)
  stream.addEventListener('open', () => {
    connection.className = 'connection online'
    connection.querySelector('span').textContent = 'Live connection'
    deviceCopy.textContent = 'Connected and listening'
  })
  stream.addEventListener('snapshot', (event) => {
    const snapshot = JSON.parse(event.data)
    items = snapshot.history ?? []
    render()
  })
  stream.addEventListener('message', (event) => receive(JSON.parse(event.data)))
  stream.addEventListener('error', () => {
    connection.className = 'connection offline'
    connection.querySelector('span').textContent = 'Reconnecting…'
    deviceCopy.textContent = 'Trying to reconnect'
  })
}

async function connectCloud(session) {
  const { data: profile, error: profileError } = await cloud
    .from('profiles').select('*').eq('id', session.user.id).maybeSingle()
  if (profileError || !profile || profile.role !== 'caregiver') {
    await cloud.auth.signOut()
    showLogin(profileError?.message || 'This account does not have a caregiver profile.')
    return
  }
  currentProfile = profile
  document.querySelector('#login-overlay').hidden = true
  document.querySelector('#sign-out').hidden = false

  const { data: messages, error } = await cloud.from('messages')
    .select('*').eq('room_code', profile.room_code)
    .order('created_at', { ascending: false }).limit(30)
  if (error) {
    showLogin(error.message)
    return
  }
  items = messages.map((item) => ({ ...item, time: item.created_at }))
  seen = new Set(messages.filter((item) => item.acknowledged_at).map((item) => item.id))
  render()

  cloudChannel?.unsubscribe()
  cloudChannel = cloud.channel(`caregiver:${profile.room_code}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `room_code=eq.${profile.room_code}`,
    }, (payload) => receive({ ...payload.new, time: payload.new.created_at }))
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `room_code=eq.${profile.room_code}`,
    }, (payload) => {
      if (payload.new.acknowledged_at) seen.add(payload.new.id)
      render()
    })
    .subscribe((status) => {
      const online = status === 'SUBSCRIBED'
      connection.className = `connection ${online ? 'online' : 'offline'}`
      connection.querySelector('span').textContent = online ? 'Live connection' : 'Connecting…'
      deviceCopy.textContent = online ? `Private room ${profile.room_code}` : 'Trying to reconnect'
    })
}

const loginOverlay = document.querySelector('#login-overlay')
const loginForm = document.querySelector('#login-form')
const loginError = document.querySelector('#login-error')
const loginSwitch = document.querySelector('#login-switch')
let loginMode = 'signin'

function showLogin(message = '') {
  loginOverlay.hidden = false
  loginError.hidden = !message
  loginError.textContent = message
}

function setLoginMode(mode) {
  loginMode = mode
  const creating = mode === 'signup'
  document.querySelector('#name-field').hidden = !creating
  document.querySelector('#room-field').hidden = !creating
  document.querySelector('#care-name').required = creating
  document.querySelector('#room-code').required = creating
  document.querySelector('#login-title').textContent = creating ? 'Create caregiver account' : 'Caregiver sign in'
  document.querySelector('#login-copy').textContent = creating
    ? 'Enter the private code shown when the patient creates their VividVision account.'
    : 'Sign in to receive communication from your patient securely.'
  document.querySelector('#login-submit').textContent = creating ? 'Create caregiver account' : 'Sign in'
  loginSwitch.textContent = creating ? 'Already have an account? Sign in' : 'New caregiver? Create an account'
  loginError.hidden = true
}

loginSwitch.addEventListener('click', () => setLoginMode(loginMode === 'signin' ? 'signup' : 'signin'))

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const submit = document.querySelector('#login-submit')
  submit.disabled = true
  loginError.hidden = true
  try {
    const email = document.querySelector('#email').value
    const password = document.querySelector('#password').value
    if (loginMode === 'signin') {
      const { data, error } = await cloud.auth.signInWithPassword({ email, password })
      if (error) throw error
      await connectCloud(data.session)
    } else {
      const roomCode = document.querySelector('#room-code').value.trim().toUpperCase()
      if (!/^[A-Z2-9]{8}$/.test(roomCode)) throw new Error('Enter the patient’s exact 8-character code.')
      const { data, error } = await cloud.auth.signUp({ email, password })
      if (error) throw error
      if (!data.session) throw new Error('Check your email, then sign in. Disable email confirmation for the instant hackathon flow.')
      const { error: profileError } = await cloud.from('profiles').upsert({
        id: data.user.id,
        display_name: document.querySelector('#care-name').value.trim(),
        role: 'caregiver',
        room_code: roomCode,
      })
      if (profileError) throw profileError
      await connectCloud(data.session)
    }
  } catch (problem) {
    showLogin(problem.message || 'Could not sign in')
  } finally {
    submit.disabled = false
  }
})

const signOutButton = document.querySelector('#sign-out')
const signOutError = document.querySelector('#sign-out-error')
signOutButton.addEventListener('click', async () => {
  signOutButton.disabled = true
  signOutButton.textContent = 'Signing out…'
  signOutError.hidden = true
  try {
    const { error } = await cloud.auth.signOut()
    if (error) throw error
    // Reload after the stored session is removed to discard all patient data,
    // subscriptions, and form values before returning to caregiver sign-in.
    window.location.reload()
  } catch (problem) {
    signOutError.textContent = problem.message || 'Could not sign out. Please try again.'
    signOutError.hidden = false
    signOutButton.disabled = false
    signOutButton.textContent = 'Sign out'
  }
})

async function start() {
  if (!cloudConfigured) {
    connectLocal()
    return
  }
  const { data } = await cloud.auth.getSession()
  if (data.session) await connectCloud(data.session)
  else showLogin()
}

acknowledge.addEventListener('click', async () => {
  if (!items[0]) return
  seen.add(items[0].id)
  if (cloud) {
    const { data } = await cloud.auth.getUser()
    await cloud.from('messages').update({
      acknowledged_by: data.user?.id,
      acknowledged_at: new Date().toISOString(),
    }).eq('id', items[0].id)
  }
  urgentBanner.classList.remove('show')
  render()
})

document.querySelector('#dismiss-alert').addEventListener('click', () => urgentBanner.classList.remove('show'))
document.querySelector('#clear-history').addEventListener('click', () => {
  items = []
  latestCard.className = 'latest-card empty'
  latestText.textContent = 'Waiting for the patient to speak…'
  latestTime.textContent = '—'
  patientStatus.textContent = 'Waiting for VividVision'
  lastSeen.textContent = 'No messages yet'
  acknowledge.disabled = true
  render()
})

window.setInterval(() => { if (items.length) render() }, 10_000)
void start()
