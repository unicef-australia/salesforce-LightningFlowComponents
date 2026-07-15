# Salesforce Lightning Flow Components (UNICEF Australia)

An open-source collection of reusable Salesforce Flow components, published by UNICEF Australia for the wider Salesforce nonprofit and UNICEF National Committee community.

The collection currently contains Flow Screen Components. Flow Actions and other Flow-adjacent utilities may be added over time as separate, independently documented components.

## Components

| Component | Type | Docs |
|---|---|---|
| [Unified Object Timeline](force-app/main/default/lwc/unifiedObjectTimeline) | Flow Screen Component | [docs/unified-object-timeline.md](docs/unified-object-timeline.md) |

## How this repository works

- **Source-based, not packaged.** There is no unlocked package, managed package, or package.json dependency to install. Clone the repository and deploy the metadata you need with Salesforce CLI.
- **No organisation-specific metadata.** This repository does not include UNICEF Australia's Flows, custom objects, custom fields, permission sets, or data. Components are built to work against standard Salesforce objects and fields, and against any custom object your org already exposes to Flow.
- **You build the consuming Flow.** Each component's documentation explains its Flow inputs and configuration, but the Screen Flow (or other Flow) that uses the component is org-specific and is not included here.

## Quick start

```bash
sf org login web --alias my-org

sf project deploy start \
  --target-org my-org \
  --source-dir force-app/main/default/lwc/unifiedObjectTimeline \
  --source-dir force-app/main/default/lwc/unifiedObjectTimelineEditor
```

See each component's documentation for the full setup, configuration, and troubleshooting guide.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

If you believe you've found a security issue, please do not open a public issue. See [SECURITY.md](SECURITY.md) for how to report it privately.

## Licence

Released under the [MIT License](LICENSE).

## Acknowledgements

This repository is inspired by, but not affiliated with or endorsed by, the community-maintained [UnofficialSF/LightningFlowComponents](https://github.com/UnofficialSF/LightningFlowComponents) project. If you're looking for a much larger catalogue of community Flow components, that project is a great place to start.
