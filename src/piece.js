/**
 * piece.js - Tetris piece definitions, rotation states, and Wall Kick data
 */

// 7 standard Tetris pieces (Tetrominoes) in their rotation states
// Each piece has 4 rotation states (0, 1, 2, 3)
// 0 = spawn orientation
export const PIECES = {
  I: {
    color: 0x00FFFF, // Cyan
    name: 'I',
    rotations: [
      [
        [0,0,0,0],
        [1,1,1,1],
        [0,0,0,0],
        [0,0,0,0]
      ],
      [
        [0,0,1,0],
        [0,0,1,0],
        [0,0,1,0],
        [0,0,1,0]
      ],
      [
        [0,0,0,0],
        [0,0,0,0],
        [1,1,1,1],
        [0,0,0,0]
      ],
      [
        [0,1,0,0],
        [0,1,0,0],
        [0,1,0,0],
        [0,1,0,0]
      ]
    ]
  },
  O: {
    color: 0xFFFF00, // Yellow
    name: 'O',
    rotations: [
      [
        [1,1],
        [1,1]
      ],
      [
        [1,1],
        [1,1]
      ],
      [
        [1,1],
        [1,1]
      ],
      [
        [1,1],
        [1,1]
      ]
    ]
  },
  T: {
    color: 0xAA00FF, // Purple
    name: 'T',
    rotations: [
      [
        [0,1,0],
        [1,1,1],
        [0,0,0]
      ],
      [
        [0,1,0],
        [0,1,1],
        [0,1,0]
      ],
      [
        [0,0,0],
        [1,1,1],
        [0,1,0]
      ],
      [
        [0,1,0],
        [1,1,0],
        [0,1,0]
      ]
    ]
  },
  S: {
    color: 0x00FF44, // Green
    name: 'S',
    rotations: [
      [
        [0,1,1],
        [1,1,0],
        [0,0,0]
      ],
      [
        [0,1,0],
        [0,1,1],
        [0,0,1]
      ],
      [
        [0,0,0],
        [0,1,1],
        [1,1,0]
      ],
      [
        [1,0,0],
        [1,1,0],
        [0,1,0]
      ]
    ]
  },
  Z: {
    color: 0xFF2244, // Red
    name: 'Z',
    rotations: [
      [
        [1,1,0],
        [0,1,1],
        [0,0,0]
      ],
      [
        [0,0,1],
        [0,1,1],
        [0,1,0]
      ],
      [
        [0,0,0],
        [1,1,0],
        [0,1,1]
      ],
      [
        [0,1,0],
        [1,1,0],
        [1,0,0]
      ]
    ]
  },
  J: {
    color: 0x0044FF, // Blue
    name: 'J',
    rotations: [
      [
        [1,0,0],
        [1,1,1],
        [0,0,0]
      ],
      [
        [0,1,1],
        [0,1,0],
        [0,1,0]
      ],
      [
        [0,0,0],
        [1,1,1],
        [0,0,1]
      ],
      [
        [0,1,0],
        [0,1,0],
        [1,1,0]
      ]
    ]
  },
  L: {
    color: 0xFF8800, // Orange
    name: 'L',
    rotations: [
      [
        [0,0,1],
        [1,1,1],
        [0,0,0]
      ],
      [
        [0,1,0],
        [0,1,0],
        [0,1,1]
      ],
      [
        [0,0,0],
        [1,1,1],
        [1,0,0]
      ],
      [
        [1,1,0],
        [0,1,0],
        [0,1,0]
      ]
    ]
  }
};

// Wall Kick data for J, L, S, T, Z pieces (SRS standard)
// [fromRotation->toRotation]: array of (dx, dy) offsets to try
export const WALL_KICK_DATA = {
  '0->1': [[ 0,0],[-1,0],[-1, 1],[ 0,-2],[-1,-2]],
  '1->0': [[ 0,0],[ 1,0],[ 1,-1],[ 0, 2],[ 1, 2]],
  '1->2': [[ 0,0],[ 1,0],[ 1,-1],[ 0, 2],[ 1, 2]],
  '2->1': [[ 0,0],[-1,0],[-1, 1],[ 0,-2],[-1,-2]],
  '2->3': [[ 0,0],[ 1,0],[ 1, 1],[ 0,-2],[ 1,-2]],
  '3->2': [[ 0,0],[-1,0],[-1,-1],[ 0, 2],[-1, 2]],
  '3->0': [[ 0,0],[-1,0],[-1,-1],[ 0, 2],[-1, 2]],
  '0->3': [[ 0,0],[ 1,0],[ 1, 1],[ 0,-2],[ 1,-2]]
};

// Wall Kick data specifically for the I piece
export const WALL_KICK_DATA_I = {
  '0->1': [[ 0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
  '1->0': [[ 0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
  '1->2': [[ 0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]],
  '2->1': [[ 0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
  '2->3': [[ 0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
  '3->2': [[ 0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
  '3->0': [[ 0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
  '0->3': [[ 0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]]
};

// Piece bag for 7-bag randomization (ensures all 7 pieces appear before repeating)
export class PieceBag {
  constructor() {
    this.bag = [];
  }

  // Get the next piece type from the bag
  next() {
    if (this.bag.length === 0) {
      this.refill();
    }
    return this.bag.pop();
  }

  // Preview upcoming pieces without removing them
  preview(count = 3) {
    while (this.bag.length < count) {
      this.refill();
    }
    // Return last `count` items (next to be drawn)
    return this.bag.slice(-count).reverse();
  }

  refill() {
    const types = Object.keys(PIECES);
    // Fisher-Yates shuffle
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    this.bag.push(...types);
  }
}

// Active piece instance during gameplay
export class Piece {
  constructor(type) {
    this.type = type;
    this.data = PIECES[type];
    this.color = this.data.color;
    this.rotation = 0;
    this.matrix = this.data.rotations[0];
    // Spawn position (col, row) - will be set by game logic
    this.x = 0;
    this.y = 0;
  }

  // Get current shape matrix
  getMatrix() {
    return this.data.rotations[this.rotation];
  }

  // Return rotated piece (new rotation state index)
  getRotated(dir = 1) {
    // dir: 1 = clockwise, -1 = counter-clockwise
    return ((this.rotation + dir) % 4 + 4) % 4;
  }

  // Get wall kick offsets for a rotation transition
  getWallKicks(fromRot, toRot) {
    const key = `${fromRot}->${toRot}`;
    if (this.type === 'I') {
      return WALL_KICK_DATA_I[key] || [[0,0]];
    }
    if (this.type === 'O') {
      return [[0,0]]; // O piece doesn't need wall kicks
    }
    return WALL_KICK_DATA[key] || [[0,0]];
  }

  // Clone this piece
  clone() {
    const p = new Piece(this.type);
    p.rotation = this.rotation;
    p.x = this.x;
    p.y = this.y;
    return p;
  }
}
