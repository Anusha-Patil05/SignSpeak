// Uses browser's built-in speech — no backend needed
export function speak(text) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.9
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}