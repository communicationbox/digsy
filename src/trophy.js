/* Coppe pixel-art UNICHE per ogni traguardo. Disegnate su canvas (scala intera).
   won=false → coppa grigia (bloccata); won=true → oro + ornamento colorato distinto. */
export function drawTrophy(cv, idx, won) {
  const g = cv.getContext && cv.getContext('2d'); if (!g) return;
  const GW = 22, S = cv.width / GW;
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
  const P = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x * S), Math.round(y * S), Math.ceil(S), Math.ceil(S)); };
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * S), Math.round(y * S), Math.ceil(w * S), Math.ceil(h * S)); };
  const M = won ? '#e8b93c' : '#8f8f8f', L = won ? '#f8dd82' : '#c2c2c2', D = won ? '#a8842a' : '#5e5e5e';

  /* MANICI (due, a C) */
  R(4, 10, 2, 1, D); P(3, 11, D); P(3, 12, D); R(4, 13, 2, 1, D);
  R(16, 10, 2, 1, D); P(18, 11, D); P(18, 12, D); R(16, 13, 2, 1, D);
  /* COPPA (calice): orlo largo, si stringe in basso */
  R(6, 9, 10, 1, L);            // orlo lucido
  R(6, 10, 10, 1, M);
  R(7, 11, 8, 1, M);
  R(8, 12, 6, 1, M);
  R(9, 13, 4, 1, D);            // fondo coppa
  P(8, 10, L); P(9, 11, L);     // riflesso
  /* STELO + BASE */
  R(10, 14, 2, 2, M);
  R(8, 16, 6, 1, M); R(7, 17, 8, 1, D); R(8, 18, 6, 1, D);
  /* TARGHETTA sul davanti */
  R(9, 11, 4, 1, won ? '#5c4229' : '#4a4a4a');

  /* ORNAMENTO in cima (distinto per premio) — solo se sbloccato è colorato */
  const oc = won ? 1 : 0; // opacità concettuale: da bloccato usa toni grigi
  const c = (col, grey) => oc ? col : grey;
  switch (idx % 12) {
    case 0: // STELLA
      P(11, 3, c('#ffe06a', '#c0c0c0')); P(10, 4, c('#ffd24a', '#b0b0b0')); P(12, 4, c('#ffd24a', '#b0b0b0')); P(11, 4, c('#fff0a8', '#d0d0d0')); P(9, 5, c('#ffd24a', '#b0b0b0')); P(13, 5, c('#ffd24a', '#b0b0b0')); P(11, 5, c('#ffd24a', '#b0b0b0')); P(10, 6, c('#e8b93c', '#a0a0a0')); P(12, 6, c('#e8b93c', '#a0a0a0')); break;
    case 1: // GEMMA
      P(11, 3, c('#bfeff8', '#d0d0d0')); R(10, 4, 3, 1, c('#5fd0e6', '#a8a8a8')); R(9, 5, 5, 1, c('#3aa8c8', '#8a8a8a')); R(10, 6, 3, 1, c('#2a88a8', '#6a6a6a')); P(11, 7, c('#2a88a8', '#6a6a6a')); break;
    case 2: // CORONA
      R(9, 5, 5, 2, c('#e8b93c', '#a0a0a0')); P(9, 4, c('#f6d76a', '#c0c0c0')); P(11, 3, c('#f6d76a', '#c0c0c0')); P(13, 4, c('#f6d76a', '#c0c0c0')); P(11, 5, c('#c65a54', '#8a8a8a')); break;
    case 3: // ALI
      R(7, 5, 3, 1, c('#f2ead8', '#c8c8c8')); R(6, 6, 3, 1, c('#d8cfb8', '#a8a8a8')); R(13, 5, 3, 1, c('#f2ead8', '#c8c8c8')); R(14, 6, 3, 1, c('#d8cfb8', '#a8a8a8')); R(10, 5, 3, 2, c('#e8b93c', '#9a9a9a')); break;
    case 4: // ALLORO
      P(8, 6, c('#5fa04e', '#9a9a9a')); P(9, 5, c('#5fa04e', '#9a9a9a')); P(10, 5, c('#6cb35a', '#a8a8a8')); P(14, 6, c('#5fa04e', '#9a9a9a')); P(13, 5, c('#5fa04e', '#9a9a9a')); P(12, 5, c('#6cb35a', '#a8a8a8')); P(11, 4, c('#7ec069', '#b0b0b0')); break;
    case 5: // MEDAGLIA con nastro
      P(10, 3, c('#c65a54', '#a0a0a0')); P(12, 3, c('#5a86c8', '#8a8a8a')); P(10, 4, c('#c65a54', '#a0a0a0')); P(12, 4, c('#5a86c8', '#8a8a8a')); R(10, 5, 3, 2, c('#f6d76a', '#c0c0c0')); P(11, 6, c('#a8842a', '#7a7a7a')); break;
    case 6: // FIAMMA
      P(11, 3, c('#ffd24a', '#c0c0c0')); P(11, 4, c('#f0883a', '#a8a8a8')); P(10, 5, c('#e8622a', '#9a9a9a')); P(12, 5, c('#e8622a', '#9a9a9a')); P(11, 5, c('#ffb84a', '#b8b8b8')); P(11, 6, c('#c04520', '#7a7a7a')); break;
    case 7: // GERMOGLIO
      R(11, 4, 1, 3, c('#5fa04e', '#9a9a9a')); P(10, 4, c('#7ec069', '#b0b0b0')); P(12, 3, c('#7ec069', '#b0b0b0')); P(9, 5, c('#5fa04e', '#9a9a9a')); P(13, 4, c('#5fa04e', '#9a9a9a')); break;
    case 8: // OSSO
      P(9, 4, c('#f2ead8', '#c8c8c8')); P(9, 5, c('#f2ead8', '#c8c8c8')); P(13, 4, c('#f2ead8', '#c8c8c8')); P(13, 5, c('#f2ead8', '#c8c8c8')); R(9, 4, 5, 2, c('#e6ddc8', '#bcbcbc')); R(10, 4, 3, 2, c('#f2ead8', '#c8c8c8')); break;
    case 9: // ORMA
      P(11, 5, c('#8a5f38', '#9a9a9a')); R(10, 6, 3, 1, c('#8a5f38', '#9a9a9a')); P(10, 4, c('#8a5f38', '#9a9a9a')); P(12, 4, c('#8a5f38', '#9a9a9a')); P(9, 5, c('#8a5f38', '#9a9a9a')); P(13, 5, c('#8a5f38', '#9a9a9a')); break;
    case 10: // DNA
      P(9, 3, c('#8d7ba0', '#a8a8a8')); P(13, 3, c('#8d7ba0', '#a8a8a8')); P(11, 4, c('#b39fd0', '#c0c0c0')); P(10, 5, c('#8d7ba0', '#a8a8a8')); P(12, 5, c('#8d7ba0', '#a8a8a8')); P(11, 6, c('#b39fd0', '#c0c0c0')); break;
    default: // LUNA
      P(11, 3, c('#e8e2d0', '#c8c8c8')); P(10, 4, c('#e8e2d0', '#c8c8c8')); P(11, 4, c('#fff8e0', '#d8d8d8')); P(10, 5, c('#e8e2d0', '#c8c8c8')); P(11, 5, c('#e8e2d0', '#c8c8c8')); P(12, 4, c('#cf4f36', '#a0a0a0'));
  }
}
