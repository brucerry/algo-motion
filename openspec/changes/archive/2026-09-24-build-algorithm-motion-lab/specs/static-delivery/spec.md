# Spec Delta

## Purpose

Make the workbench buildable, testable, and deployable as a browser-only site on GitHub Pages, with enough documentation to operate and extend it.

## ADDED Requirements

### Requirement: Static build and direct links
The application SHALL build with `npm install` followed by `npm run build`, run without a backend, and load correctly under a GitHub Pages repository subpath. Deep links to algorithms and their configurations SHALL open correctly when shared.

#### Scenario: Repository path deployment
- **WHEN** the built site is served from a GitHub Pages repository path
- **THEN** assets, navigation, and shared algorithm URLs load without server-side routing

### Requirement: Automated quality checks and deployment
The repository SHALL include automated checks for deterministic generation, parameter and URL validation, timeline behavior, and algorithm correctness, including valid path output. A GitHub Actions workflow SHALL install dependencies, run checks and build, and publish the static artifact to GitHub Pages when configured.

#### Scenario: Validation failure
- **WHEN** an automated check or build fails
- **THEN** the deployment job does not publish that revision

### Requirement: Developer documentation
The README SHALL explain the project's purpose, local setup, build, deployment, architecture, parameter schema, simulation frames, and the steps for adding an algorithm, including a concise example. Screenshots SHALL be included when available.

#### Scenario: Add algorithm guidance
- **WHEN** a developer follows the README to add an algorithm
- **THEN** the required module contracts, registration point, and automated checks are identifiable without tracing the whole application
