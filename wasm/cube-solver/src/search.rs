use crate::cubie::{Coordinate, Cubie, parity};
use crate::tables::{PHASE2, Tables, distance};

#[derive(Debug, PartialEq, Eq)]
pub struct Solution {
    pub moves: Vec<u8>,
    pub phase1_length: usize,
}

#[derive(Clone, Copy)]
struct Orientation {
    flip: usize,
    twist: usize,
    slice: usize,
}
#[derive(Clone, Copy)]
struct Permutation {
    parity: usize,
    corners: usize,
    slice: usize,
    upper: usize,
    lower: usize,
    edges: usize,
}

struct Search<'a> {
    tables: &'a Tables,
    root: Permutation,
    path: [u8; 30],
    length: usize,
    boundary: usize,
    max_depth: usize,
}

fn allowed(movement: usize, last: Option<u8>) -> bool {
    last.is_none_or(|last| {
        movement / 3 != last as usize / 3 && movement / 3 + 3 != last as usize / 3
    })
}

impl Search<'_> {
    fn phase1(
        &mut self,
        state: Orientation,
        remaining: usize,
        used: usize,
        last: Option<u8>,
    ) -> bool {
        let lower = distance(&self.tables.slice_flip, 495 * state.flip + state.slice).max(
            distance(&self.tables.slice_twist, 495 * state.twist + state.slice),
        );
        if lower > remaining {
            return false;
        }
        if remaining == 0 {
            if last.is_some_and(|m| PHASE2.contains(&(m as usize))) {
                return false;
            }
            let mut perm = self.root;
            for &m in &self.path[..used] {
                let m = m as usize;
                perm.corners = self.tables.corners[perm.corners * 18 + m] as usize;
                perm.slice = self.tables.slice[perm.slice * 18 + m] as usize;
                perm.parity ^= usize::from(m % 3 != 1);
                perm.upper = self.tables.upper[perm.upper * 18 + m] as usize;
                perm.lower = self.tables.lower[perm.lower * 18 + m] as usize;
            }
            if perm.upper >= 336 || perm.lower >= 336 || perm.slice >= 24 {
                return false;
            }
            let merged = self.tables.merge[perm.upper * 336 + perm.lower];
            if merged < 0 {
                return false;
            }
            perm.edges = merged as usize;
            for depth in 0..=self.max_depth - used {
                if self.phase2(perm, depth, used, last) {
                    self.boundary = used;
                    return true;
                }
            }
            return false;
        }
        for m in 0..18 {
            if !allowed(m, last) {
                continue;
            }
            self.path[used] = m as u8;
            let next = Orientation {
                flip: self.tables.flip[state.flip * 18 + m] as usize,
                twist: self.tables.twist[state.twist * 18 + m] as usize,
                slice: self.tables.slice[state.slice * 24 * 18 + m] as usize / 24,
            };
            if self.phase1(next, remaining - 1, used + 1, Some(m as u8)) {
                return true;
            }
        }
        false
    }

    fn phase2(
        &mut self,
        state: Permutation,
        remaining: usize,
        used: usize,
        last: Option<u8>,
    ) -> bool {
        let lower = distance(
            &self.tables.slice_edges,
            (24 * state.edges + state.slice) * 2 + state.parity,
        )
        .max(distance(
            &self.tables.slice_corners,
            (24 * state.corners + state.slice) * 2 + state.parity,
        ));
        if lower > remaining {
            return false;
        }
        if remaining == 0 {
            self.length = used;
            return true;
        }
        for m in PHASE2 {
            if !allowed(m, last) {
                continue;
            }
            self.path[used] = m as u8;
            let next = Permutation {
                corners: self.tables.corners[state.corners * 18 + m] as usize,
                slice: self.tables.slice[state.slice * 18 + m] as usize,
                parity: state.parity ^ usize::from(m % 3 != 1),
                edges: self.tables.edges[state.edges * 18 + m] as usize,
                ..state
            };
            if self.phase2(next, remaining - 1, used + 1, Some(m as u8)) {
                return true;
            }
        }
        false
    }
}

pub fn solve(cube: &Cubie, tables: &Tables, max_depth: usize) -> Option<Solution> {
    if max_depth > 30 {
        return None;
    }
    let orientation = Orientation {
        flip: cube.coordinate(Coordinate::Flip),
        twist: cube.coordinate(Coordinate::Twist),
        slice: cube.coordinate(Coordinate::Slice) / 24,
    };
    let mut search = Search {
        tables,
        root: Permutation {
            parity: parity(&cube.cp),
            corners: cube.coordinate(Coordinate::Corners),
            slice: cube.coordinate(Coordinate::Slice),
            upper: cube.coordinate(Coordinate::Upper),
            lower: cube.coordinate(Coordinate::Lower),
            edges: 0,
        },
        path: [0; 30],
        length: 0,
        boundary: 0,
        max_depth,
    };
    for depth in 0..=max_depth {
        if search.phase1(orientation, depth, 0, None) {
            return Some(Solution {
                moves: search.path[..search.length].to_vec(),
                phase1_length: search.boundary,
            });
        }
    }
    None
}
