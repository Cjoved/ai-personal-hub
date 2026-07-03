import { computed, onBeforeUnmount, ref } from 'vue'

const SPEECH_ERRORS = {
  'not-allowed':
    'Microphone blocked. Allow mic access for this site in browser settings, then refresh.',
  'service-not-allowed': 'Microphone is blocked on this page (needs HTTPS).',
  'no-speech': 'Walang narinig. Tap mic, magsalita, then tap stop (mic ulit).',
  aborted: 'Listening was interrupted.',
  'audio-capture': 'Walang microphone na nakita sa device mo.',
  network:
    'Hindi maabot ang speech service ng browser (Google servers). Hindi ito WiFi mo — subukan Chrome o Edge, i-off VPN/ad blocker, o gamitin Text mode.',
}

const STORAGE_KEY = 'tasker:voice-language'

const FEMALE_VOICE_PATTERNS = [
  /\bfemale\b/i,
  /\bwoman\b/i,
  /zira/i,
  /samantha/i,
  /karen/i,
  /susan/i,
  /victoria/i,
  /paulina/i,
  /helena/i,
  /maria/i,
  /anna\b/i,
  /linda/i,
  /hazel/i,
  /michelle/i,
  /jenny/i,
  /aria\b/i,
  /google.*filipino.*female/i,
]

const MALE_VOICE_PATTERNS = [/\bmale\b/i, /\bman\b/i, /david/i, /mark\b/i, /james/i, /daniel/i, /guy\b/i]

let cachedVoices = []

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  cachedVoices = window.speechSynthesis.getVoices()
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
}

function isFemaleVoice(voice) {
  const name = voice.name || ''
  if (MALE_VOICE_PATTERNS.some((pattern) => pattern.test(name))) return false
  return FEMALE_VOICE_PATTERNS.some((pattern) => pattern.test(name))
}

function pickAssistantVoice(lang) {
  const voices = cachedVoices.length ? cachedVoices : (typeof window !== 'undefined' ? window.speechSynthesis?.getVoices() || [] : [])
  const langPrefix = lang.split('-')[0].toLowerCase()

  const langMatches = voices.filter(
    (voice) => voice.lang?.toLowerCase().startsWith(lang.toLowerCase())
      || voice.lang?.toLowerCase().startsWith(langPrefix),
  )

  const femaleInLang = langMatches.filter(isFemaleVoice)
  if (femaleInLang.length) return femaleInLang[0]

  const anyFemale = voices.filter(isFemaleVoice)
  if (anyFemale.length) return anyFemale[0]

  return langMatches[0] || voices[0] || null
}

export const VOICE_LANGUAGE_OPTIONS = [
  { id: 'tagalog', label: 'Tagalog', langs: ['fil-PH', 'tl-PH', 'en-PH'], speakLang: 'fil-PH' },
  { id: 'taglish', label: 'Taglish', langs: ['en-PH', 'fil-PH', 'en-US'], speakLang: 'en-PH' },
  { id: 'english', label: 'English', langs: ['en-PH', 'en-US'], speakLang: 'en-PH' },
]

function defaultVoiceLanguage() {
  if (typeof navigator === 'undefined') return 'taglish'
  const browserLang = navigator.language || ''
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (timezone === 'Asia/Manila' || browserLang.startsWith('fil') || browserLang.startsWith('tl')) {
    return 'tagalog'
  }
  if (browserLang.startsWith('en')) return 'taglish'
  return 'taglish'
}

function readStoredVoiceLanguage() {
  if (typeof localStorage === 'undefined') return defaultVoiceLanguage()
  const stored = localStorage.getItem(STORAGE_KEY)
  return VOICE_LANGUAGE_OPTIONS.some((option) => option.id === stored) ? stored : defaultVoiceLanguage()
}

function languageCandidates(voiceLanguage) {
  const option = VOICE_LANGUAGE_OPTIONS.find((item) => item.id === voiceLanguage)
    || VOICE_LANGUAGE_OPTIONS.find((item) => item.id === 'taglish')
  return option.langs
}

function speakLanguage(voiceLanguage) {
  const option = VOICE_LANGUAGE_OPTIONS.find((item) => item.id === voiceLanguage)
    || VOICE_LANGUAGE_OPTIONS.find((item) => item.id === 'taglish')
  return option.speakLang
}

function getSpeechConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useVoice() {
  const SpeechRecognition = getSpeechConstructor()

  const isSupported = ref(Boolean(SpeechRecognition))
  const isListening = ref(false)
  const isVoiceMode = ref(false)
  const isMuted = ref(false)
  const interimTranscript = ref('')
  const voiceLanguage = ref(readStoredVoiceLanguage())

  const activeVoiceLanguage = computed(() =>
    VOICE_LANGUAGE_OPTIONS.find((option) => option.id === voiceLanguage.value)
    || VOICE_LANGUAGE_OPTIONS[1],
  )

  const voiceHint = computed(() => {
    if (!isSupported.value) {
      return 'Voice STT needs Chrome or Edge. Safari/iPhone has limited support — use Text mode.'
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'Voice needs HTTPS (or localhost). Kung phone via LAN IP (http://192...), hindi gagana — deploy sa Vercel o gamitin Text mode.'
    }
    if (isListening.value) {
      return 'Nakikinig… huminto ka man magsalita, tuloy pa rin hanggang tap mo ang stop (mic).'
    }
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'Tap mic → magsalita (pwede mag-pause) → tap mic ulit para stop → Send.'
    }
    return ''
  })

  let recognition = null
  let accumulatedFinal = ''
  let manualStopRequested = false
  let listenResolve = null
  let listenReject = null

  function createRecognition(lang) {
    const engine = new SpeechRecognition()
    engine.lang = lang
    engine.interimResults = true
    engine.continuous = true
    engine.maxAlternatives = 3
    return engine
  }

  function detachRecognition() {
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition = null
  }

  function finalizeListen(text) {
    isListening.value = false
    interimTranscript.value = ''
    accumulatedFinal = ''
    manualStopRequested = false
    detachRecognition()
    const resolver = listenResolve
    listenResolve = null
    listenReject = null
    resolver?.(text)
  }

  function rejectListen(error) {
    isListening.value = false
    interimTranscript.value = ''
    accumulatedFinal = ''
    manualStopRequested = false
    detachRecognition()
    const rejecter = listenReject
    listenResolve = null
    listenReject = null
    rejecter?.(error)
  }

  function bindRecognitionHandlers(engine, lang) {
    engine.onresult = (event) => {
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const alternatives = event.results[index]
        let chunk = alternatives[0]?.transcript || ''
        for (let alt = 1; alt < alternatives.length; alt += 1) {
          const candidate = alternatives[alt]?.transcript || ''
          if (candidate.length > chunk.length) chunk = candidate
        }
        if (event.results[index].isFinal) accumulatedFinal += chunk
        else interim += chunk
      }
      interimTranscript.value = (accumulatedFinal + interim).trim()
    }

    engine.onerror = (event) => {
      const code = event?.error || 'unknown'
      if (!manualStopRequested && (code === 'no-speech' || code === 'aborted')) return
      if (code === 'no-speech' && (accumulatedFinal.trim() || interimTranscript.value.trim())) return
      const error = new Error(SPEECH_ERRORS[code] || `Speech recognition failed (${code}).`)
      error.code = code
      rejectListen(error)
    }

    engine.onend = () => {
      if (manualStopRequested) {
        const text = accumulatedFinal.trim() || interimTranscript.value.trim()
        finalizeListen(text)
        return
      }

      // Browser paused after silence — keep session alive until user taps stop
      try {
        engine.start()
      } catch {
        try {
          const next = createRecognition(lang)
          recognition = next
          bindRecognitionHandlers(next, lang)
          next.start()
        } catch (error) {
          rejectListen(new Error(error.message || 'Speech recognition stopped unexpectedly.'))
        }
      }
    }
  }

  function startRecognitionEngine(lang) {
    accumulatedFinal = ''
    manualStopRequested = false
    const engine = createRecognition(lang)
    recognition = engine
    bindRecognitionHandlers(engine, lang)
    engine.start()
  }

  function stopListening() {
    manualStopRequested = true
    if (recognition) {
      try {
        recognition.abort()
      } catch {
        try {
          recognition.stop()
        } catch {
          // ignore
        }
      }
    }
    isListening.value = false
    interimTranscript.value = ''
    accumulatedFinal = ''
    listenResolve = null
    listenReject = null
    detachRecognition()
  }

  async function ensureMicrophoneAccess() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
  }

  function assertVoiceEnvironment() {
    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not supported in this browser. Use Chrome/Edge or Text mode.')
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error(
        'Voice needs a secure page (https:// or localhost). Opening via http:// on a phone/LAN IP will not work.',
      )
    }
  }

  async function listenOnceWithRetry(lang, attempts = 3) {
    let lastError = null
    for (let index = 0; index < attempts; index += 1) {
      try {
        return await new Promise((resolve, reject) => {
          listenResolve = resolve
          listenReject = reject
          startRecognitionEngine(lang)
          isListening.value = true
        })
      } catch (error) {
        lastError = error
        if (error.code !== 'network' || index === attempts - 1) throw error
        await new Promise((resolve) => setTimeout(resolve, 700))
      }
    }
    throw lastError || new Error(SPEECH_ERRORS.network)
  }

  async function listen() {
    assertVoiceEnvironment()
    if (recognition) stopListening()

    try {
      await ensureMicrophoneAccess()
    } catch {
      throw new Error(SPEECH_ERRORS['not-allowed'])
    }

    const langs = languageCandidates(voiceLanguage.value)
    let lastError = null

    for (let attempt = 0; attempt < langs.length; attempt += 1) {
      const lang = langs[attempt]
      try {
        const text = await listenOnceWithRetry(lang)
        return text
      } catch (error) {
        lastError = error
        const retriable = error.code === 'network' || error.code === 'no-speech'
        if (!retriable || attempt === langs.length - 1) break
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
    }

    throw lastError || new Error('Speech recognition failed.')
  }

  function submitListening() {
    if (!recognition || !isListening.value) return
    manualStopRequested = true
    try {
      recognition.stop()
    } catch {
      try {
        recognition.abort()
      } catch {
        // ignore
      }
    }
  }

  function speak(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis || isMuted.value || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const lang = speakLanguage(voiceLanguage.value)
    utterance.lang = lang
    utterance.rate = 1
    utterance.pitch = 1.05
    const voice = pickAssistantVoice(lang)
    if (voice) utterance.voice = voice
    window.speechSynthesis.speak(utterance)
  }

  function stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  function setVoiceLanguage(languageId) {
    if (!VOICE_LANGUAGE_OPTIONS.some((option) => option.id === languageId)) return
    voiceLanguage.value = languageId
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, languageId)
    }
  }

  function setVoiceMode(enabled) {
    isVoiceMode.value = enabled
    if (!enabled) stopListening()
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (isMuted.value) stopSpeaking()
  }

  onBeforeUnmount(() => {
    stopListening()
    stopSpeaking()
  })

  return {
    isSupported,
    isListening,
    isVoiceMode,
    isMuted,
    interimTranscript,
    voiceHint,
    voiceLanguage,
    activeVoiceLanguage,
    voiceLanguageOptions: VOICE_LANGUAGE_OPTIONS,
    listen,
    speak,
    stopSpeaking,
    stopListening,
    submitListening,
    setVoiceLanguage,
    setVoiceMode,
    toggleMute,
  }
}
