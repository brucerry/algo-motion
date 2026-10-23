//! Two-phase search adapted from cubejs; original MIT notice is distributed
//! in public/licenses/cubejs-MIT.txt. The browser independently verifies output.
mod cubie;
mod search;
mod tables;

pub use cubie::Cubie;
pub use search::Solution;
use std::sync::OnceLock;

static TABLES: OnceLock<tables::Tables> = OnceLock::new();

pub fn prepare() -> usize {
    TABLES.get_or_init(tables::Tables::new).bytes()
}

pub fn solve_facelets(facelets: &[u8], max_depth: usize) -> Option<Solution> {
    let cube = Cubie::from_facelets(facelets)?;
    search::solve(&cube, TABLES.get_or_init(tables::Tables::new), max_depth)
}

#[cfg(target_arch = "wasm32")]
mod abi {
    // One instance belongs to one JS worker; calls are synchronous and never
    // reentrant. JS writes INPUT only between calls and copies OUTPUT afterward.
    static mut INPUT: [u8; 54] = [0; 54];
    static mut OUTPUT: [u8; 31] = [0; 31];

    #[unsafe(no_mangle)]
    pub extern "C" fn input_ptr() -> *mut u8 {
        (&raw mut INPUT).cast()
    }
    #[unsafe(no_mangle)]
    pub extern "C" fn output_ptr() -> *const u8 {
        (&raw const OUTPUT).cast()
    }
    #[unsafe(no_mangle)]
    pub extern "C" fn prepare() -> u32 {
        super::prepare() as u32
    }
    #[unsafe(no_mangle)]
    pub extern "C" fn solve() -> i32 {
        // SAFETY: pointers refer to fixed module-owned buffers; no Rust
        // references escape this synchronous call or alias a host callback.
        let input = unsafe { std::slice::from_raw_parts(input_ptr(), 54) };
        let Some(result) = super::solve_facelets(input, 30) else {
            return -1;
        };
        let output = unsafe { std::slice::from_raw_parts_mut((&raw mut OUTPUT).cast::<u8>(), 31) };
        output[0] = result.phase1_length as u8;
        output[1..=result.moves.len()].copy_from_slice(&result.moves);
        (result.moves.len() + 1) as i32
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cubie::{Coordinate, MOVES, SOLVED};

    #[test]
    fn coordinate_round_trips_and_quarter_turns() {
        for (coordinate, count) in [
            (Coordinate::Twist, 2187),
            (Coordinate::Flip, 2048),
            (Coordinate::Slice, 11880),
            (Coordinate::Corners, 20160),
            (Coordinate::Edges, 20160),
            (Coordinate::Upper, 1320),
            (Coordinate::Lower, 1320),
        ] {
            for i in 0..count {
                let mut cube = SOLVED;
                cube.set_coordinate(coordinate, i);
                assert_eq!(cube.coordinate(coordinate), i);
            }
        }
        for movement in &MOVES {
            let mut cube = SOLVED;
            for _ in 0..4 {
                cube.multiply_corners(movement);
                cube.multiply_edges(movement);
            }
            assert_eq!(cube, SOLVED);
        }
    }

    #[test]
    fn rejects_invalid_facelets_and_impossible_orientations() {
        let solved = b"UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
        assert_eq!(Cubie::from_facelets(solved), Some(SOLVED));
        assert!(Cubie::from_facelets(b"bad").is_none());
        let mut flipped = *solved;
        flipped.swap(5, 10);
        assert!(Cubie::from_facelets(&flipped).is_none());
        let mut twisted = *solved;
        twisted[8] = b'R';
        twisted[9] = b'F';
        twisted[20] = b'U';
        assert!(Cubie::from_facelets(&twisted).is_none());
        let mut parity = *solved;
        parity.swap(10, 19);
        assert!(Cubie::from_facelets(&parity).is_none());
    }

    #[test]
    fn solves_fixtures_and_zero_depth_phases_with_compact_tables() {
        assert!(prepare() < 6 * 1024 * 1024);
        let solved = b"UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
        assert_eq!(
            solve_facelets(solved, 0),
            Some(Solution {
                moves: vec![],
                phase1_length: 0
            })
        );
        for facelets in [
            b"DFBBUDURFLBUURLLRFRUURFBBFBDUDLDBLLDLLFRLDUDRRDFFBFRUB",
            b"DUUDUUUDDRLRLRRLRLFBBFFBFFBUUDDDUDDULRLLLRRLRBBFBBFBFF",
        ] {
            let result = solve_facelets(facelets, 30).unwrap();
            let mut cube = Cubie::from_facelets(facelets).unwrap();
            for &movement in &result.moves {
                for _ in 0..movement % 3 + 1 {
                    cube.multiply_corners(&MOVES[movement as usize / 3]);
                    cube.multiply_edges(&MOVES[movement as usize / 3]);
                }
            }
            assert_eq!(cube, SOLVED);
        }
        assert!(solve_facelets(solved, 31).is_none());
    }
}
