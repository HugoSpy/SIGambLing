import { Howl } from "howler";

type SoundName = "spin" | "click" | "win" | "chip" | "lose";

class SoundManager {
  private readonly sounds = new Map<SoundName, Howl>();
  private enabled = true;
  private booted = false;

  private buildHowl(src: string) {
    return new Howl({
      src: [src],
      volume: 0.45,
      preload: true,
      onloaderror: () => {
        return;
      },
    });
  }

  private ensureBooted() {
    if (this.booted) {
      return;
    }

    this.booted = true;
    this.sounds.set("spin", this.buildHowl("/sounds/spin.mp3"));
    this.sounds.set("click", this.buildHowl("/sounds/click.mp3"));
    this.sounds.set("win", this.buildHowl("/sounds/win.mp3"));
    this.sounds.set("chip", this.buildHowl("/sounds/chip.mp3"));
    this.sounds.set("lose", this.buildHowl("/sounds/lose.mp3"));
  }

  play(sound: SoundName) {
    this.ensureBooted();

    if (!this.enabled) {
      return;
    }

    this.sounds.get(sound)?.play();
  }

  preload() {
    this.ensureBooted();
  }

  toggle() {
    this.enabled = !this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  setVolume(volume: number) {
    this.ensureBooted();
    this.sounds.forEach((sound) => {
      sound.volume(volume);
    });
  }
}

export const soundManager = new SoundManager();
