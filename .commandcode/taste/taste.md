# architecture

- Follow modular pattern: route → validation → controller → service flow for all modules. Confidence: 0.80

# workflow

- Create separate plan files for each module, explaining planning and execution approach so work can be done progressively. Confidence: 0.75
- Make frequent git commits after meaningful changes to a topic — do not accumulate large amounts of work before committing. Confidence: 0.75
- After completing a module, update api_collection/GearUp with separate folders per module. Confidence: 0.65
- Use TDD, verification-before-completion, and improve-codebase-architecture skills during development. Confidence: 0.65

# typescript

- Use TypeScript for type safety across the project. Confidence: 0.70

# api-collections

- For Bruno API collections, JSON bodies must use `body: json` with inline `body` content (not `mode: json` with `payload`). Bruno does not recognize `mode: json`/`payload` and will blank out the body data. Use the format: `body:\n  type: json\n  data: |\n    { "key": "value" }`. Confidence: 0.80
- When creating or modifying Bruno API collection YAML files, research the correct Bruno YAML schema before writing. Do not guess the format. Confidence: 0.75

# dependencies

- Use recent compatible versions of packages; avoid old or incompatible versions. Confidence: 0.65
