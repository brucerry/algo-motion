# Spec Delta

## Purpose

Make gradient descent observable as a sequence of moves on a selectable 3D objective surface, with numerical state and convergence behavior available at each step.

## ADDED Requirements

### Requirement: Configurable objective and starting point
Gradient descent SHALL offer multiple named objective surfaces and bounded controls for learning rate, starting X and Y, maximum iterations, and convergence tolerance. The selected objective SHALL determine the rendered surface and function values.

#### Scenario: Switch objective
- **WHEN** a user selects a different objective function
- **THEN** the surface and descent trajectory regenerate for that function

### Requirement: Stepwise descent
The simulation SHALL show the current point, gradient direction, movement trail, and convergence path on the surface. Each step SHALL report position, function value, gradient magnitude, and distance moved, and stop on convergence or at the iteration limit.

#### Scenario: Converged run
- **WHEN** the convergence condition is met
- **THEN** the run ends with a convergence explanation and the final point remains visible

#### Scenario: Iteration limit
- **WHEN** the iteration limit is reached before convergence
- **THEN** the run identifies the limit as its stopping reason rather than claiming convergence

### Requirement: Stable numerical behavior
Inputs that produce non-finite positions, gradients, or function values SHALL be rejected or stop the run with a clear numerical-error explanation instead of rendering invalid geometry.

#### Scenario: Divergent configuration
- **WHEN** a run yields a non-finite numerical state
- **THEN** playback stops and the user sees which configuration or step caused the failure
