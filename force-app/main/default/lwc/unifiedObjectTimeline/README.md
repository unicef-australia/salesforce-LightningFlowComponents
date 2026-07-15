# Unified Object Timeline

A Flow Screen Component that combines up to eight Flow record collections into one configurable, searchable table or timeline.

- Requires a Screen Flow. It is not usable outside Flow.
- Has no Apex controller and does not query Salesforce itself — the consuming Flow retrieves records and passes them in as collections.
- Configured through its custom property editor, `unifiedObjectTimelineEditor` (`configurationEditor="c-unifiedObjectTimelineEditor"`), rather than by hand-editing JSON.

## Deploy

```bash
sf project deploy start \
  --target-org my-org \
  --source-dir force-app/main/default/lwc/unifiedObjectTimeline \
  --source-dir force-app/main/default/lwc/unifiedObjectTimelineEditor
```

## Full guide

See [docs/unified-object-timeline.md](../../../../../docs/unified-object-timeline.md) for prerequisites, Flow setup, configuration concepts, and troubleshooting.
