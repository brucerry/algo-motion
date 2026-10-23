use crate::cubie::{Coordinate, MOVES, SOLVED};

pub const PHASE2: [usize; 10] = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16];
const ALL: [usize; 18] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

pub struct Tables {
    pub twist: Vec<u16>,
    pub flip: Vec<u16>,
    pub slice: Vec<u16>,
    pub corners: Vec<u16>,
    pub edges: Vec<u32>,
    pub upper: Vec<u16>,
    pub lower: Vec<u16>,
    pub merge: Vec<i32>,
    pub slice_twist: Vec<u32>,
    pub slice_flip: Vec<u32>,
    pub slice_corners: Vec<u32>,
    pub slice_edges: Vec<u32>,
}

fn move_table(coordinate: Coordinate, size: usize) -> Vec<u32> {
    let mut table = Vec::with_capacity(size * 18);
    for i in 0..size {
        let mut cube = SOLVED;
        cube.set_coordinate(coordinate, i);
        for movement in &MOVES {
            for power in 0..4 {
                match coordinate {
                    Coordinate::Twist | Coordinate::Corners => cube.multiply_corners(movement),
                    _ => cube.multiply_edges(movement),
                }
                if power < 3 {
                    table.push(cube.coordinate(coordinate) as u32);
                }
            }
        }
    }
    table
}

fn small_table(coordinate: Coordinate, size: usize) -> Vec<u16> {
    move_table(coordinate, size)
        .into_iter()
        .map(|v| u16::try_from(v).expect("coordinate overflow"))
        .collect()
}

pub fn distance(table: &[u32], index: usize) -> usize {
    ((table[index >> 3] >> ((index & 7) * 4)) & 15) as usize
}
fn set_distance(table: &mut [u32], index: usize, depth: usize) {
    let shift = (index & 7) * 4;
    table[index >> 3] = (table[index >> 3] & !(15 << shift)) | ((depth as u32) << shift);
}

fn pruning(size: usize, phase2: bool, next: impl Fn(usize, usize) -> usize) -> Vec<u32> {
    let mut table = vec![u32::MAX; size.div_ceil(8)];
    set_distance(&mut table, 0, 0);
    let mut done = 1;
    let mut depth = 0;
    let moves: &[usize] = if phase2 { &PHASE2 } else { &ALL };
    while done < size {
        for index in 0..size {
            if distance(&table, index) != depth {
                continue;
            }
            for &movement in moves {
                let target = next(index, movement);
                if distance(&table, target) == 15 {
                    set_distance(&mut table, target, depth + 1);
                    done += 1;
                }
            }
        }
        depth += 1;
        assert!(depth < 15, "unreachable pruning coordinate");
    }
    table
}

impl Tables {
    pub fn new() -> Self {
        let twist = small_table(Coordinate::Twist, 2187);
        let flip = small_table(Coordinate::Flip, 2048);
        let slice = small_table(Coordinate::Slice, 11880);
        let corners = small_table(Coordinate::Corners, 20160);
        // Non-phase-2 columns can exceed u16 even though only phase-2 moves
        // are used in search. Keep the complete reference table losslessly.
        let edges = move_table(Coordinate::Edges, 20160);
        let upper = small_table(Coordinate::Upper, 1320);
        let lower = small_table(Coordinate::Lower, 1320);
        let mut merge = Vec::with_capacity(336 * 336);
        for a in 0..336 {
            let mut first = SOLVED;
            first.set_coordinate(Coordinate::Upper, a);
            for b in 0..336 {
                let mut second = SOLVED;
                second.set_coordinate(Coordinate::Lower, b);
                let mut collision = false;
                for i in 0..8 {
                    if first.ep[i] != -1 {
                        if second.ep[i] != -1 {
                            collision = true;
                            break;
                        }
                        second.ep[i] = first.ep[i];
                    }
                }
                merge.push(if collision {
                    -1
                } else {
                    second.coordinate(Coordinate::Edges) as i32
                });
            }
        }
        let slice_twist = pruning(495 * 2187, false, |i, m| {
            twist[(i / 495) * 18 + m] as usize * 495 + slice[(i % 495) * 24 * 18 + m] as usize / 24
        });
        let slice_flip = pruning(495 * 2048, false, |i, m| {
            flip[(i / 495) * 18 + m] as usize * 495 + slice[(i % 495) * 24 * 18 + m] as usize / 24
        });
        let slice_corners = pruning(24 * 20160 * 2, true, |i, m| {
            let next = corners[(i / 48) * 18 + m] as usize;
            (next * 24 + slice[((i / 2) % 24) * 18 + m] as usize) * 2
                + ((i & 1) ^ usize::from(m % 3 != 1))
        });
        let slice_edges = pruning(24 * 20160 * 2, true, |i, m| {
            let next = edges[(i / 48) * 18 + m] as usize;
            (next * 24 + slice[((i / 2) % 24) * 18 + m] as usize) * 2
                + ((i & 1) ^ usize::from(m % 3 != 1))
        });
        Self {
            twist,
            flip,
            slice,
            corners,
            edges,
            upper,
            lower,
            merge,
            slice_twist,
            slice_flip,
            slice_corners,
            slice_edges,
        }
    }

    pub fn bytes(&self) -> usize {
        [
            &self.twist,
            &self.flip,
            &self.slice,
            &self.corners,
            &self.upper,
            &self.lower,
        ]
        .iter()
        .map(|v| v.len() * 2)
        .sum::<usize>()
            + [
                &self.edges,
                &self.slice_twist,
                &self.slice_flip,
                &self.slice_corners,
                &self.slice_edges,
            ]
            .iter()
            .map(|v| v.len() * 4)
            .sum::<usize>()
            + self.merge.len() * 4
    }
}
