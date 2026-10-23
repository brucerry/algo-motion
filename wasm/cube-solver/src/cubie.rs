// Coordinate conventions and move definitions adapted from ldez/cubejs (MIT).
// See ../README.md and ../../../public/licenses/cubejs-MIT.txt.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Cubie {
    pub cp: [i8; 8],
    pub co: [u8; 8],
    pub ep: [i8; 12],
    pub eo: [u8; 12],
}

pub const SOLVED: Cubie = Cubie {
    cp: [0, 1, 2, 3, 4, 5, 6, 7],
    co: [0; 8],
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: [0; 12],
};

const CORNER_FACELETS: [[usize; 3]; 8] = [
    [8, 9, 20],
    [6, 18, 38],
    [0, 36, 47],
    [2, 45, 11],
    [29, 26, 15],
    [27, 44, 24],
    [33, 53, 42],
    [35, 17, 51],
];
const CORNER_COLORS: [[u8; 3]; 8] = [
    *b"URF", *b"UFL", *b"ULB", *b"UBR", *b"DFR", *b"DLF", *b"DBL", *b"DRB",
];
const EDGE_FACELETS: [[usize; 2]; 12] = [
    [5, 10],
    [7, 19],
    [3, 37],
    [1, 46],
    [32, 16],
    [28, 25],
    [30, 43],
    [34, 52],
    [23, 12],
    [21, 41],
    [50, 39],
    [48, 14],
];
const EDGE_COLORS: [[u8; 2]; 12] = [
    *b"UR", *b"UF", *b"UL", *b"UB", *b"DR", *b"DF", *b"DL", *b"DB", *b"FR", *b"FL", *b"BL", *b"BR",
];

pub const MOVES: [Cubie; 6] = [
    Cubie {
        cp: [3, 0, 1, 2, 4, 5, 6, 7],
        ep: [3, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11],
        ..SOLVED
    },
    Cubie {
        cp: [4, 1, 2, 0, 7, 5, 6, 3],
        co: [2, 0, 0, 1, 1, 0, 0, 2],
        ep: [8, 1, 2, 3, 11, 5, 6, 7, 4, 9, 10, 0],
        ..SOLVED
    },
    Cubie {
        cp: [1, 5, 2, 3, 0, 4, 6, 7],
        co: [1, 2, 0, 0, 2, 1, 0, 0],
        ep: [0, 9, 2, 3, 4, 8, 6, 7, 1, 5, 10, 11],
        eo: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
    },
    Cubie {
        cp: [0, 1, 2, 3, 5, 6, 7, 4],
        ep: [0, 1, 2, 3, 5, 6, 7, 4, 8, 9, 10, 11],
        ..SOLVED
    },
    Cubie {
        cp: [0, 2, 6, 3, 4, 1, 5, 7],
        co: [0, 1, 2, 0, 0, 2, 1, 0],
        ep: [0, 1, 10, 3, 4, 5, 9, 7, 8, 2, 6, 11],
        ..SOLVED
    },
    Cubie {
        cp: [0, 1, 3, 7, 4, 5, 2, 6],
        co: [0, 0, 1, 2, 0, 0, 2, 1],
        ep: [0, 1, 2, 11, 4, 5, 6, 10, 8, 9, 3, 7],
        eo: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
    },
];

#[derive(Clone, Copy, Debug)]
pub enum Coordinate {
    Twist,
    Flip,
    Slice,
    Corners,
    Edges,
    Upper,
    Lower,
}

pub fn parity(permutation: &[i8]) -> usize {
    let mut result = 0;
    for i in 0..permutation.len() {
        for j in 0..i {
            result ^= usize::from(permutation[j] > permutation[i]);
        }
    }
    result
}

fn permutation_valid(permutation: &[i8]) -> bool {
    let mut seen = 0_u16;
    for &piece in permutation {
        if piece < 0 || piece as usize >= permutation.len() || seen & (1 << piece) != 0 {
            return false;
        }
        seen |= 1 << piece;
    }
    true
}

impl Cubie {
    pub fn from_facelets(facelets: &[u8]) -> Option<Self> {
        if facelets.len() != 54 {
            return None;
        }
        for (face, color) in b"URFDLB".iter().enumerate() {
            if facelets[face * 9 + 4] != *color
                || facelets.iter().filter(|c| *c == color).count() != 9
            {
                return None;
            }
        }
        let mut cube = SOLVED;
        for (i, indices) in CORNER_FACELETS.iter().enumerate() {
            let orientation = (0..3).find(|&o| matches!(facelets[indices[o]], b'U' | b'D'))?;
            let colors = std::array::from_fn(|j| facelets[indices[(orientation + j) % 3]]);
            cube.cp[i] = CORNER_COLORS.iter().position(|c| *c == colors)? as i8;
            cube.co[i] = orientation as u8;
        }
        for (i, indices) in EDGE_FACELETS.iter().enumerate() {
            let colors = [facelets[indices[0]], facelets[indices[1]]];
            let (piece, orientation) = EDGE_COLORS.iter().enumerate().find_map(|(j, c)| {
                if *c == colors {
                    Some((j, 0))
                } else if [c[1], c[0]] == colors {
                    Some((j, 1))
                } else {
                    None
                }
            })?;
            cube.ep[i] = piece as i8;
            cube.eo[i] = orientation;
        }
        (permutation_valid(&cube.cp)
            && permutation_valid(&cube.ep)
            && cube.co.iter().sum::<u8>() % 3 == 0
            && cube.eo.iter().sum::<u8>() % 2 == 0
            && parity(&cube.cp) == parity(&cube.ep))
        .then_some(cube)
    }

    pub fn multiply_corners(&mut self, movement: &Self) {
        let old = *self;
        for i in 0..8 {
            let source = movement.cp[i] as usize;
            self.cp[i] = old.cp[source];
            self.co[i] = (old.co[source] + movement.co[i]) % 3;
        }
    }

    pub fn multiply_edges(&mut self, movement: &Self) {
        let old = *self;
        for i in 0..12 {
            let source = movement.ep[i] as usize;
            self.ep[i] = old.ep[source];
            self.eo[i] = (old.eo[source] + movement.eo[i]) % 2;
        }
    }

    pub fn coordinate(&self, coordinate: Coordinate) -> usize {
        match coordinate {
            Coordinate::Twist => self.co[..7].iter().fold(0, |v, o| 3 * v + *o as usize),
            Coordinate::Flip => self.eo[..11].iter().fold(0, |v, o| 2 * v + *o as usize),
            Coordinate::Corners => rank(&self.cp, 0, 6, false),
            Coordinate::Edges => rank(&self.ep, 0, 6, false),
            Coordinate::Upper => rank(&self.ep, 0, 3, false),
            Coordinate::Lower => rank(&self.ep, 3, 3, false),
            Coordinate::Slice => rank(&self.ep, 8, 4, true),
        }
    }

    pub fn set_coordinate(&mut self, coordinate: Coordinate, mut index: usize) {
        match coordinate {
            Coordinate::Twist => {
                let mut sum = 0;
                for i in (0..7).rev() {
                    self.co[i] = (index % 3) as u8;
                    sum += self.co[i];
                    index /= 3;
                }
                self.co[7] = (3 - sum % 3) % 3;
            }
            Coordinate::Flip => {
                let mut sum = 0;
                for i in (0..11).rev() {
                    self.eo[i] = (index % 2) as u8;
                    sum += self.eo[i];
                    index /= 2;
                }
                self.eo[11] = sum % 2;
            }
            Coordinate::Corners => unrank(&mut self.cp, 0, 6, false, index),
            Coordinate::Edges => unrank(&mut self.ep, 0, 6, false, index),
            Coordinate::Upper => unrank(&mut self.ep, 0, 3, false, index),
            Coordinate::Lower => unrank(&mut self.ep, 3, 3, false, index),
            Coordinate::Slice => unrank(&mut self.ep, 8, 4, true, index),
        }
    }
}

fn factorial(n: usize) -> usize {
    (1..=n).product()
}
fn choose(n: usize, k: usize) -> usize {
    if k > n {
        return 0;
    }
    let k = k.min(n - k);
    (0..k).fold(1, |v, i| v * (n - i) / (i + 1))
}

fn rank(permutation: &[i8], start: i8, count: usize, from_end: bool) -> usize {
    let mut selected = [0_i8; 6];
    let (mut combination, mut found, mut result) = (0, 0, 0);
    for offset in 0..permutation.len() {
        let j = if from_end {
            permutation.len() - 1 - offset
        } else {
            offset
        };
        let piece = permutation[j];
        if piece >= start && piece < start + count as i8 {
            combination += choose(offset, found + 1);
            selected[if from_end { count - 1 - found } else { found }] = piece;
            found += 1;
        }
    }
    for j in (0..count).rev() {
        let mut rotations = 0;
        while selected[j] != start + j as i8 {
            selected[..=j].rotate_left(1);
            rotations += 1;
        }
        result = (j + 1) * result + rotations;
    }
    combination * factorial(count) + result
}

fn unrank(permutation: &mut [i8], start: i8, count: usize, from_end: bool, index: usize) {
    let mut selected = [0_i8; 6];
    for (i, slot) in selected[..count].iter_mut().enumerate() {
        *slot = start + i as i8;
    }
    let mut combination = index / factorial(count);
    let mut order = index % factorial(count);
    for j in 1..count {
        selected[..=j].rotate_right(order % (j + 1));
        order /= j + 1;
    }
    permutation.fill(-1);
    let mut remaining = count;
    for offset in 0..permutation.len() {
        if remaining == 0 {
            break;
        }
        let j = if from_end {
            offset
        } else {
            permutation.len() - 1 - offset
        };
        let coefficient = choose(permutation.len() - 1 - offset, remaining);
        if combination >= coefficient {
            permutation[j] = selected[if from_end {
                count - remaining
            } else {
                remaining - 1
            }];
            combination -= coefficient;
            remaining -= 1;
        }
    }
}
