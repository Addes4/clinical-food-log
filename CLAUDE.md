# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is a newly initialized git repository. No source files, build system, or dependencies have been added yet.

When the project is set up, update this file with:
- Build, lint, and test commands
- High-level architecture and key file paths
- Any conventions or patterns specific to this codebase

## Project rules
- Build only the requested MVP scope.
- Do not add extra features.
- Prefer simple deterministic implementations.
- Keep code readable and maintainable.
- Use TypeScript everywhere possible.
- Add tests for business logic and access control.
- Keep UI minimal and clean.
- Document assumptions in README.

## Product philosophy
This app is a privacy-aware IBS/IBD food and symptom logging MVP for patients and clinicians.
Analytics must be framed as possible associations, never causation.
The product should optimize for clarity, low friction, and structured data capture.

## Technical preferences
- Next.js
- TypeScript
- Prisma
- Tailwind
- Simple local database for MVP if practical
- Seed realistic demo data

## Non-goals
- No AI diagnosis
- No advanced ML
- No barcode/image integrations
- No mobile app
- No EHR integration