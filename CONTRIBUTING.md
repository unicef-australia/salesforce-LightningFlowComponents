# Contributing

Thanks for considering a contribution.

## Reporting a bug

Open a GitHub issue using the Bug Report template. Include:

- the component and version/commit affected;
- Salesforce API version and org type (sandbox/prod/scratch);
- steps to reproduce, expected behaviour, and actual behaviour;
- console errors or Flow debug log excerpts if relevant.

## Proposing a change

1. Open an issue first for anything beyond a trivial fix, so the approach can be agreed before code is written.
2. Fork the repository and create a branch for your change.
3. Keep the public `@api` property names and component bundle names stable — existing Flows depend on them. Treat any rename or type change as a breaking change and call it out explicitly in your PR description.
4. Do not add organisation-specific fields, objects, or wording to a component's default configuration or documentation.
5. Do not add a Flow, Apex class, test data, or custom object to the component bundles. If your contribution needs an example Flow, propose it as a separate, clearly labelled example — not inside the deployable component source.
6. Add or update Jest tests for any behaviour change where practical.
7. Update the component's documentation in `docs/` if you change configuration behaviour, inputs, or defaults.

## Pull requests

- Describe what changed and why.
- Note any migration steps required for existing configured Flows.
- Confirm you've deployed and manually exercised the change in a sandbox.

## Releases

Releases are tagged on the default branch. There isn't a fixed release cadence — tag when a change is worth pointing consuming orgs at.
