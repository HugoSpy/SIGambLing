import { Howl } from 'howler';

export const sounds = {
  win:             new Howl({ src: ['/win_sound.mp3'],            volume: 0.6 }),
  cardDistributed: new Howl({ src: ['/card_distributed.mp3'],     volume: 0.5 }),
  cardReveal:      new Howl({ src: ['/card_reveal.mp3'],          volume: 0.5 }),
  cardShuffle:     new Howl({ src: ['/card_shuffle.mp3'],         volume: 0.4 }),
  bombClick:       new Howl({ src: ['/bomb_click.mp3'],           volume: 0.7 }),
  betButton:       new Howl({ src: ['/bouton parier clique.mp3'], volume: 0.5 }),
  gemmeClick:      new Howl({ src: ['/gemme_click.mp3'],          volume: 0.6 }),
};
