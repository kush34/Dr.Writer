const KEY = "drwriter:notifications";

export const notificationsEnabled = () => localStorage.getItem(KEY) !== "off";
export const setNotificationsEnabled = (on: boolean) => localStorage.setItem(KEY, on ? "on" : "off");

/** Must run from a user action (a click or a sent prompt) or browsers ignore it. */
export function requestNotificationPermission() {
  if (!notificationsEnabled() || typeof Notification === "undefined" || Notification.permission !== "default") return Promise.resolve();
  return Notification.requestPermission().then(() => {}, () => {});
}

let audio: AudioContext | undefined;

function chime() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const start = audio.currentTime;
    [660, 880].forEach((frequency, index) => {
      const oscillator = audio!.createOscillator();
      const gain = audio!.createGain();
      oscillator.frequency.value = frequency;
      oscillator.connect(gain).connect(audio!.destination);
      const at = start + index * 0.16;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.15, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      oscillator.start(at);
      oscillator.stop(at + 0.32);
    });
  } catch { /* no audio available; the notification still shows */ }
}

/** Plays a chime and, when the tab is not in front, shows a system notification. */
export function notifyUser(title: string, body: string, test = false) {
  if (!notificationsEnabled() && !test) return;
  chime();
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || (!test && document.hasFocus() && !document.hidden)) return;
  try {
    const notification = new Notification(title, { body: body.slice(0, 200), icon: "/icon.png", tag: "drwriter-ai" });
    notification.onclick = () => { window.focus(); notification.close(); };
  } catch { /* some browsers only allow notifications from a service worker */ }
}
