/* Replay fixtures extracted from real playtest ops. Pips are operation operands, not a reconstructed routing graph. */
export const PLAYTEST_CASCADES = Object.freeze([
  {
    "id": "short",
    "label": "Short",
    "source": "MONOID_PLAYTEST_v0.56.0_B-1HARM9V.txt",
    "run": "Run 1 · FRAMES",
    "move": "T3 R1.3",
    "rebounds": 0,
    "operations": 2,
    "pips": [
      4,
      4
    ]
  },
  {
    "id": "medium",
    "label": "Medium",
    "source": "MONOID_PLAYTEST_v0.56.0_B-1HARM9V.txt",
    "run": "Run 1 · FRAMES",
    "move": "T6 R3.1",
    "rebounds": 0,
    "operations": 5,
    "pips": [
      4,
      5,
      3,
      4,
      6
    ]
  },
  {
    "id": "long",
    "label": "Long",
    "source": "MONOID_PLAYTEST_v0.56.0_B-1HARM9V.txt",
    "run": "Run 1 · FRAMES",
    "move": "T10 R6.1",
    "rebounds": 1,
    "operations": 16,
    "pips": [
      5,
      6,
      4,
      3,
      5,
      4,
      4,
      0,
      4,
      4,
      5,
      3,
      4,
      6,
      5,
      2
    ]
  },
  {
    "id": "monstrous",
    "label": "Monstrous",
    "source": "MONOID_PLAYTEST_v0.56.0_B-1HARM9V.txt",
    "run": "Run 1 · FRAMES",
    "move": "T22 R10.4",
    "rebounds": 2,
    "operations": 32,
    "pips": [
      1,
      1,
      4,
      4,
      5,
      3,
      4,
      6,
      5,
      2,
      0,
      2,
      5,
      6,
      4,
      3,
      5,
      4,
      4,
      1,
      1,
      5,
      2,
      6,
      0,
      6,
      2,
      4,
      4,
      1,
      1,
      5
    ]
  }
]);
