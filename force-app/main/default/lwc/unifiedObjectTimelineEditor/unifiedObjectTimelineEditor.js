import { LightningElement, api, wire } from 'lwc';
import { getObjectInfos } from 'lightning/uiObjectInfoApi';
import STANDARD_OBJECT_TYPES from './objectTypes';
import { DEFAULT_COLUMNS, DEFAULT_SOURCE_CONFIGURATION } from './configDefaults';

const SOURCE_SLOTS = [
    { slot: 'source1', typeName: 'S1', label: 'Source 1', required: true },
    { slot: 'source2', typeName: 'S2', label: 'Source 2', required: false },
    { slot: 'source3', typeName: 'S3', label: 'Source 3', required: false },
    { slot: 'source4', typeName: 'S4', label: 'Source 4', required: false },
    { slot: 'source5', typeName: 'S5', label: 'Source 5', required: false },
    { slot: 'source6', typeName: 'S6', label: 'Source 6', required: false },
    { slot: 'source7', typeName: 'S7', label: 'Source 7', required: false },
    { slot: 'source8', typeName: 'S8', label: 'Source 8', required: false }
];

const COLUMN_TYPES = [
    { label: 'Text', value: 'text' },
    { label: 'Text area / rich text', value: 'richText' },
    { label: 'Date', value: 'date' },
    { label: 'Date/time', value: 'dateTime' },
    { label: 'Number', value: 'number' },
    { label: 'Currency', value: 'currency' },
    { label: 'Percent', value: 'percent' },
    { label: 'Boolean', value: 'boolean' },
    { label: 'Record link', value: 'record' }
];

const DATE_TYPES = [
    { label: 'Date/time', value: 'dateTime' },
    { label: 'Date', value: 'date' }
];

const DISPLAY_MODES = [
    { label: 'Auto (recommended)', value: 'auto' },
    { label: 'Table', value: 'table' },
    { label: 'Compact timeline', value: 'timeline' }
];

const PAGE_SIZE_OPTIONS = [
    { label: '5 records', value: '5' },
    { label: '10 records (default)', value: '10' },
    { label: '15 records', value: '15' },
    { label: '20 records', value: '20' },
    { label: '25 records', value: '25' },
    { label: '50 records', value: '50' },
    { label: '100 records', value: '100' }
];

const SOURCE_VALUE = '@source';
const DEFAULT_SEPARATOR = ' / ';
const LINE_BREAK_SEPARATOR = '__LINE_BREAK__';
const SEPARATOR_OPTIONS = [
    // Literal newline option values can make Flow Builder's property editor fail.
    { label: 'Line break', value: LINE_BREAK_SEPARATOR },
    { label: 'Slash ( / )', value: ' / ' },
    { label: 'Vertical bar ( | )', value: ' | ' },
    { label: 'Comma ( , )', value: ', ' },
    { label: 'Semicolon ( ; )', value: '; ' },
    { label: 'Dash ( - )', value: ' - ' },
    { label: 'Space', value: ' ' }
];

const normalizeColumnType = (type) => {
    const normalized = String(type || 'text')
        .replace(/[\s_/-]+/g, '')
        .toLowerCase();

    if (normalized === 'richtext' || normalized === 'textarea' || normalized === 'html') {
        return 'richText';
    }
    return type || 'text';
};

export default class UnifiedObjectTimelineEditor extends LightningElement {
    _inputVariables = [];
    _builderContext = {};
    _genericTypeMappings = [];
    localTypeValues = {};
    columns = [];
    sourceConfigurations = {};
    headerLabel = '';
    displayMode = 'auto';
    pageSize = '10';
    objectInfos = {};
    configLoaded = false;
    configDirty = false;
    configWarning = '';
    configurationFingerprint = '';

    @api
    get inputVariables() {
        return this._inputVariables;
    }

    set inputVariables(value) {
        this._inputVariables = value || [];
        this.loadConfigurationIfReady();
    }

    @api
    get builderContext() {
        return this._builderContext;
    }

    set builderContext(value) {
        this._builderContext = value || {};
        this.loadConfigurationIfReady();
    }

    @api
    get genericTypeMappings() {
        return this._genericTypeMappings;
    }

    set genericTypeMappings(value) {
        this._genericTypeMappings = value || [];
        this.loadConfigurationIfReady();
    }

    @wire(getObjectInfos, { objectApiNames: '$selectedObjectApiNames' })
    handleObjectInfos({ data }) {
        if (!data || !Array.isArray(data.results)) {
            return;
        }

        const nextInfos = {};
        data.results.forEach((result, index) => {
            const info = result && result.result ? result.result : result;
            const objectApiName = info && info.apiName
                ? info.apiName
                : this.selectedObjectApiNames[index];
            if (objectApiName && info && info.fields) {
                nextInfos[objectApiName] = info;
            }
        });
        this.objectInfos = nextInfos;
    }

    get selectedObjectApiNames() {
        const objectNames = SOURCE_SLOTS
            .map((source) => this.getConfiguredObjectType(source))
            .filter((value) => typeof value === 'string' && value.length > 0)
            .filter((value, index, values) => values.indexOf(value) === index);
        return objectNames;
    }

    get flowVariables() {
        return Array.isArray(this._builderContext.variables) ? this._builderContext.variables : [];
    }

    get flowResources() {
        const resources = [];
        const groups = [
            { name: 'variables', objectField: 'objectType', collectionField: 'isCollection' },
            { name: 'recordLookups', objectField: 'object', collectionField: 'getFirstRecordOnly' },
            { name: 'recordCreates', objectField: 'object', collectionField: 'getFirstRecordOnly' },
            { name: 'recordUpdates', objectField: 'object', collectionField: 'getFirstRecordOnly' }
        ];

        groups.forEach((group) => {
            const entries = Array.isArray(this._builderContext[group.name])
                ? this._builderContext[group.name]
                : [];
            entries.forEach((resource) => {
                if (!resource.name) {
                    return;
                }
                resources.push({
                    ...resource,
                    objectType: resource[group.objectField] || resource.objectType,
                    isRecordCollection: this.isCollectionResource(resource, group.collectionField)
                });
            });
        });

        return resources;
    }

    get objectOptions() {
        const objectTypes = new Set(
            STANDARD_OBJECT_TYPES.filter((objectType) => typeof objectType === 'string' && objectType)
        );
        this.flowResources.forEach((resource) => {
            if (typeof resource.objectType === 'string' && resource.objectType) {
                objectTypes.add(resource.objectType);
            }
        });
        this._genericTypeMappings.forEach((mapping) => {
            const objectType = mapping.typeValue || mapping.value;
            if (typeof objectType === 'string' && objectType) {
                objectTypes.add(objectType);
            }
        });
        return [
            { label: 'Select object type', value: '' },
            ...Array.from(objectTypes)
                .sort()
                .map((objectType) => ({ label: objectType, value: objectType }))
        ];
    }

    get sourceEditors() {
        return SOURCE_SLOTS.map((source) => {
            const configuration = this.sourceConfigurations[source.slot] || this.emptySourceConfiguration(source);
            const objectType = this.getConfiguredObjectType(source);
            const collectionValue = configuration.collectionValue || this.inputReference(source.slot);
            const mappings = this.columns.map((column) => this.mappingEditorRow(source, configuration, column, objectType));

            return {
                ...source,
                ...configuration,
                objectType,
                accordionLabel: objectType ? `${source.label} — ${objectType}` : source.label,
                collectionValue,
                objectOptions: this.objectOptions,
                collectionOptions: this.collectionOptions(objectType, collectionValue),
                dateFieldOptions: this.dateFieldOptions(objectType, configuration.dateField),
                fallbackDateFieldOptions: this.dateFieldOptions(objectType, configuration.fallbackDateField),
                mappings,
                showMappings: Boolean(objectType && collectionValue),
                sourceHelp: source.required
                    ? 'Required. Choose an object type and record collection for this source.'
                    : 'Optional. Leave the object type and collection blank until this source is needed.'
            };
        });
    }

    get isConfigWarning() {
        return Boolean(this.configWarning);
    }

    get configStatus() {
        if (this.configWarning) {
            return 'Safe visual defaults are loaded. Change a control or use Reset configuration to replace the malformed JSON.';
        }
        if (this.configDirty) {
            return 'Changes are saved into the component configuration when you change a control.';
        }
        return 'Configure the columns first, then map each source collection into those columns.';
    }

    get columnTypeOptions() {
        return COLUMN_TYPES;
    }

    get dateTypeOptions() {
        return DATE_TYPES;
    }

    get displayModeOptions() {
        return DISPLAY_MODES;
    }

    get pageSizeOptions() {
        return PAGE_SIZE_OPTIONS;
    }

    get resourceOptions() {
        const resources = [];
        ['variables', 'constants', 'formulas', 'textTemplates'].forEach((groupName) => {
            const group = Array.isArray(this._builderContext[groupName]) ? this._builderContext[groupName] : [];
            group.forEach((resource) => {
                if (resource.name) {
                    resources.push({ label: resource.label || resource.name, value: `{!${resource.name}}` });
                }
            });
        });
        return [{ label: 'Select a Flow value', value: '' }, ...resources];
    }

    getSourceConfigurationText() {
        return JSON.stringify(this.serializeSourceConfiguration());
    }

    loadConfigurationIfReady() {
        if (this.configDirty || !this._inputVariables.length) {
            return;
        }

        const fingerprint = this.getConfigurationFingerprint();
        if (this.configLoaded && fingerprint === this.configurationFingerprint) {
            return;
        }

        const columnText = this.resolveConfigurationInput('columnConfiguration');
        const sourceText = this.resolveConfigurationInput('sourceFieldConfiguration');
        this.headerLabel = this.inputReference('headerLabel');
        this.displayMode = this.normalizeDisplayMode(this.inputReference('displayMode'));
        this.pageSize = this.normalizePageSize(this.inputReference('pageSize'));
        let parsedColumns;
        let parsedSources;
        const errors = [];

        if (columnText) {
            try {
                parsedColumns = JSON.parse(columnText);
            } catch (error) {
                errors.push('Column configuration JSON is malformed.');
            }
        }

        if (sourceText) {
            try {
                parsedSources = JSON.parse(sourceText);
            } catch (error) {
                errors.push('Source field mapping JSON is malformed.');
            }
        }

        this.columns = this.normalizeColumns(parsedColumns);
        this.sourceConfigurations = this.buildSourceConfigurations(parsedSources);
        this.configWarning = errors.join(' ');
        this.configLoaded = true;
        this.configurationFingerprint = fingerprint;
    }

    getConfigurationFingerprint() {
        return JSON.stringify({
            inputs: this._inputVariables.map((input) => ({
                name: input.name,
                value: input.value,
                valueDataType: input.valueDataType
            })),
            mappings: this._genericTypeMappings,
            constants: this.resourceFingerprint('constants'),
            variables: this.resourceFingerprint('variables'),
            recordLookups: this.resourceFingerprint('recordLookups')
        });
    }

    resourceFingerprint(groupName) {
        const group = Array.isArray(this._builderContext[groupName]) ? this._builderContext[groupName] : [];
        return group.map((resource) => ({
            name: resource.name,
            value: resource.value,
            stringValue: resource.stringValue,
            object: resource.object,
            objectType: resource.objectType,
            getFirstRecordOnly: resource.getFirstRecordOnly,
            isCollection: resource.isCollection
        }));
    }

    normalizeColumns(value) {
        const source = Array.isArray(value) && value.length ? value : DEFAULT_COLUMNS;
        return source.map((column, index) => ({
            key: this.safeKey(column.key || `column${index + 1}`),
            label: column.label || column.key || `Column ${index + 1}`,
            type: normalizeColumnType(column.type),
            sortable: column.sortable !== false,
            wrapText: column.wrapText === true,
            allowMultipleFields: column.allowMultipleFields === true
                || column.multipleFields === true
                || column.key === 'summary'
                || column.key === 'details',
            ...(column.value !== undefined ? { value: column.value } : {})
        }));
    }

    buildSourceConfigurations(value) {
        const sourceMap = Array.isArray(value)
            ? value.reduce((result, item) => ({ ...result, [item.slot]: item }), {})
            : value && typeof value === 'object' ? value : DEFAULT_SOURCE_CONFIGURATION;

        return SOURCE_SLOTS.reduce((result, source) => {
            const raw = sourceMap[source.slot] || {};
            result[source.slot] = {
                slot: source.slot,
                typeName: source.typeName,
                source: raw.source || '',
                objectType: this.getObjectType(source.typeName) || raw.objectType || '',
                collectionValue: this.inputReference(source.slot),
                enabled: raw.enabled !== false,
                dateField: raw.dateField || '',
                dateType: raw.dateType || 'dateTime',
                fallbackDateField: raw.fallbackDateField || '',
                fallbackDateType: raw.fallbackDateType || 'dateTime',
                columns: this.columns.reduce((columns, column) => {
                    columns[column.key] = this.normalizeMapping(raw.columns && raw.columns[column.key]);
                    return columns;
                }, {})
            };
            return result;
        }, {});
    }

    normalizeMapping(value) {
        if (!value || typeof value !== 'object') {
            return { fields: [{ field: '' }], separator: DEFAULT_SEPARATOR, includeLabels: false };
        }

        const fields = value.value === 'source'
            ? [{ field: SOURCE_VALUE }]
            : Array.isArray(value.fields)
                ? value.fields.map((field) => ({ ...field }))
                : value.field
                    ? [{ field: value.field, ...value }]
                    : [{ field: '' }];

        const { field, fields: ignoredFields, ...settings } = value;
        return {
            ...settings,
            fields,
            separator: Object.prototype.hasOwnProperty.call(value, 'separator')
                ? this.editorSeparator(value.separator)
                : DEFAULT_SEPARATOR,
            includeLabels: value.includeLabels === true
        };
    }

    mappingEditorRow(source, configuration, column, objectType) {
        const mapping = configuration.columns[column.key] || this.normalizeMapping(null);
        if (column.value === 'source') {
            return {
                key: `${source.slot}-${column.key}`,
                columnKey: column.key,
                label: column.label,
                isSourceColumn: true,
                allowMultipleFields: false,
                fields: []
            };
        }
        const fields = Array.isArray(mapping.fields) && mapping.fields.length
            ? mapping.fields
            : [{ field: '' }];
        const options = this.fieldOptions(objectType, fields.map((field) => field.field));

        const separator = Object.prototype.hasOwnProperty.call(mapping, 'separator')
            ? this.editorSeparator(mapping.separator)
            : DEFAULT_SEPARATOR;
        return {
            key: `${source.slot}-${column.key}`,
            columnKey: column.key,
            label: column.label,
            allowMultipleFields: column.allowMultipleFields === true,
            fields: fields.map((field, index) => ({
                ...field,
                index,
                options,
                value: field.field || '',
                showAddButton: column.allowMultipleFields === true && index === fields.length - 1
            })),
            showFormatting: fields.length > 1 || column.key === 'summary' || column.key === 'details',
            separator,
            separatorOptions: this.separatorOptions(separator),
            includeLabels: mapping.includeLabels === true
        };
    }

    separatorOptions(selectedSeparator) {
        const editorValue = this.editorSeparator(selectedSeparator);
        if (SEPARATOR_OPTIONS.some((option) => option.value === editorValue)) {
            return SEPARATOR_OPTIONS;
        }
        return [
            ...SEPARATOR_OPTIONS,
            { label: `Current custom separator (${String(editorValue)})`, value: editorValue }
        ];
    }

    fieldOptions(objectType, selectedFields) {
        const options = [
            { label: 'Select field', value: '' },
            { label: 'Use source label', value: SOURCE_VALUE }
        ];
        const info = objectType ? this.objectInfos[objectType] : null;
        const fields = info && info.fields ? Object.values(info.fields) : [];

        fields
            .sort((left, right) => left.label.localeCompare(right.label))
            .forEach((field) => {
                options.push({ label: `${field.label} (${field.apiName})`, value: field.apiName });
                if (field.relationshipName) {
                    options.push({
                        label: `${field.label} name (${field.relationshipName}.Name)`,
                        value: `${field.relationshipName}.Name`
                    });
                }
            });

        selectedFields.filter(Boolean).forEach((field) => {
            if (!options.some((option) => option.value === field)) {
                options.push({ label: field, value: field });
            }
        });
        return options;
    }

    fieldInfo(objectType, fieldPath) {
        if (!objectType || !fieldPath || fieldPath === SOURCE_VALUE) {
            return null;
        }
        const apiName = String(fieldPath).split('.')[0];
        const info = this.objectInfos[objectType];
        return info && info.fields ? info.fields[apiName] || null : null;
    }

    fieldDisplayLabel(objectType, fieldPath) {
        if (!fieldPath || fieldPath === SOURCE_VALUE) {
            return '';
        }
        const info = this.fieldInfo(objectType, fieldPath);
        if (info && info.label) {
            return String(fieldPath).indexOf('.') !== -1 ? `${info.label} name` : info.label;
        }
        return this.humanizeFieldPath(fieldPath);
    }

    inferFieldDisplayType(objectType, fieldPath) {
        const info = this.fieldInfo(objectType, fieldPath);
        if (!info) {
            return '';
        }
        if (info.dataType === 'RichTextArea'
            || info.dataType === 'Html'
            || /html/i.test(info.apiName || fieldPath)) {
            return 'richText';
        }
        switch (info.dataType) {
            case 'Date':
                return 'date';
            case 'DateTime':
                return 'dateTime';
            case 'Currency':
                return 'currency';
            case 'Double':
            case 'Integer':
            case 'Long':
            case 'Decimal':
                return 'number';
            case 'Percent':
                return 'percent';
            case 'Boolean':
                return 'boolean';
            default:
                return '';
        }
    }

    humanizeFieldPath(fieldPath) {
        const leaf = String(fieldPath || '')
            .split('.')
            .pop()
            .replace(/__c$/i, '')
            .replace(/__/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return leaf || String(fieldPath || '');
    }

    dateFieldOptions(objectType, selectedField) {
        const options = [{ label: 'Select date field', value: '' }];
        const info = objectType ? this.objectInfos[objectType] : null;
        const fields = info && info.fields ? Object.values(info.fields) : [];
        fields
            .filter((field) => field.dataType === 'Date' || field.dataType === 'DateTime')
            .sort((left, right) => left.label.localeCompare(right.label))
            .forEach((field) => options.push({ label: `${field.label} (${field.apiName})`, value: field.apiName }));
        if (selectedField && !options.some((option) => option.value === selectedField)) {
            options.push({ label: selectedField, value: selectedField });
        }
        return options;
    }

    collectionOptions(objectType, selectedValue) {
        if (!objectType) {
            return this.withSelectedOption([{ label: 'Select collection', value: '' }], selectedValue);
        }

        const resources = this.flowResources.filter((resource) => {
            return resource.objectType === objectType && resource.isRecordCollection;
        });

        return this.withSelectedOption([
            { label: 'Select collection', value: '' },
            ...resources.map((resource) => ({
                label: resource.label || resource.name,
                value: `{!${resource.name}}`
            }))
        ], selectedValue);
    }

    isCollectionResource(resource, collectionField) {
        if (collectionField === 'getFirstRecordOnly') {
            return resource.getFirstRecordOnly === false
                || resource.getFirstRecordOnly === 'false'
                || resource.isCollection === true
                || resource.isCollection === 'true'
                || resource.dataType === 'SObjectCollection'
                || resource.dataType === 'SObject[]';
        }

        return resource[collectionField] === undefined
            || resource[collectionField] === true
            || resource[collectionField] === 'true'
            || resource.dataType === 'SObjectCollection'
            || resource.dataType === 'SObject[]';
    }

    withSelectedOption(options, selectedValue) {
        if (selectedValue && !options.some((option) => option.value === selectedValue)) {
            return [...options, { label: selectedValue.replace(/^\{!|\}$/g, ''), value: selectedValue }];
        }
        return options;
    }

    getObjectType(typeName) {
        const localValue = this.localTypeValues[typeName];
        if (localValue !== undefined) {
            return localValue;
        }
        const source = SOURCE_SLOTS.find((candidate) => candidate.typeName === typeName);
        if (source && !source.required && !this.inputReference(source.slot)) {
            return '';
        }
        const mapping = this._genericTypeMappings.find((candidate) => {
            const candidateName = candidate.typeName || candidate.name;
            return candidateName === typeName;
        });
        const typeValue = mapping ? mapping.typeValue || mapping.value || '' : '';
        return typeof typeValue === 'string' ? typeValue : '';
    }

    getConfiguredObjectType(source) {
        const configuration = this.sourceConfigurations[source.slot];
        const value = configuration && configuration.objectType !== undefined
            ? configuration.objectType
            : this.getObjectType(source.typeName);
        return typeof value === 'string' ? value : '';
    }

    emptySourceConfiguration(source) {
        return {
            slot: source.slot,
            typeName: source.typeName,
            source: '',
            objectType: this.getObjectType(source.typeName),
            collectionValue: '',
            enabled: source.required,
            dateField: '',
            dateType: 'dateTime',
            fallbackDateField: '',
            fallbackDateType: 'dateTime',
            columns: {}
        };
    }

    inputReference(name) {
        const input = this._inputVariables.find((candidate) => candidate.name === name);
        if (!input || input.value === null || input.value === undefined || input.value === '') {
            return '';
        }
        if (input.valueDataType === 'reference' && !String(input.value).startsWith('{!')) {
            return `{!${input.value}}`;
        }
        return input.value;
    }

    resolveConfigurationInput(name) {
        const value = this.inputReference(name);
        if (!value) {
            return '';
        }
        if (!String(value).startsWith('{!')) {
            return this.decodeConfigurationText(value);
        }

        const resourceName = String(value).replace(/^\{!|\}$/g, '');
        const groups = ['constants', 'variables', 'textTemplates', 'formulas'];
        for (const groupName of groups) {
            const group = Array.isArray(this._builderContext[groupName]) ? this._builderContext[groupName] : [];
            const resource = group.find((candidate) => candidate.name === resourceName);
            if (resource) {
                return this.decodeConfigurationText(resource.value ?? resource.stringValue ?? resource.body ?? '');
            }
        }
        return '';
    }

    decodeConfigurationText(value) {
        return String(value || '')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
    }

    handleObjectTypeChange(event) {
        const slot = event.target.dataset.slot;
        const typeName = event.target.dataset.typeName;
        const typeValue = event.detail.value;
        this.localTypeValues = { ...this.localTypeValues, [typeName]: typeValue };
        this.updateSource(slot, {
            objectType: typeValue,
            collectionValue: '',
            source: this.sourceConfigurations[slot] && this.sourceConfigurations[slot].source
                ? this.sourceConfigurations[slot].source
                : typeValue
        });

        this.dispatchEvent(new CustomEvent('configuration_editor_generic_type_mapping_changed', {
            bubbles: true,
            composed: true,
            detail: { typeName, typeValue }
        }));
        this.dispatchInputDeleted(slot);
    }

    handleCollectionChange(event) {
        const slot = event.target.dataset.slot;
        const newValue = event.detail.value;
        this.updateSource(slot, {
            collectionValue: newValue,
            enabled: Boolean(newValue)
        });
        if (!newValue) {
            this.dispatchInputDeleted(slot);
            return;
        }
        this.dispatchInputChanged(slot, newValue, 'reference');
    }

    handleSourceTextChange(event) {
        const slot = event.target.dataset.slot;
        this.updateSource(slot, { [event.target.dataset.field]: this.eventValue(event) });
    }

    handleDisplayModeChange(event) {
        this.displayMode = this.normalizeDisplayMode(this.eventValue(event));
        this.persistConfiguration();
    }

    handlePageSizeChange(event) {
        this.pageSize = this.normalizePageSize(this.eventValue(event));
        this.persistConfiguration(['pageSize']);
    }

    handleHeaderLabelChange(event) {
        // Prevent Flow Builder's next inputVariables refresh from restoring
        // the previous label while this edit is being applied.
        this.configDirty = true;
        this.configWarning = '';
        this.headerLabel = this.eventValue(event).trim();
        if (!this.headerLabel) {
            // Keep the optional input present with an empty String value.
            // Some Flow Builder sessions do not persist deletion events for
            // optional screen component properties and restore the old value
            // when the editor is reopened.
            this.dispatchInputChanged('headerLabel', '', 'String');
            return;
        }

        const exactReference = this.headerLabel.match(/^\{!([^{}]+)\}$/);
        if (exactReference) {
            this.dispatchInputChanged('headerLabel', exactReference[1], 'reference');
            return;
        }

        // Mixed text such as "{!Get_Contact.Name} Timeline" must remain a
        // String value so Flow stores it as a template instead of trying to
        // resolve the entire phrase as one resource reference.
        this.dispatchInputChanged('headerLabel', this.headerLabel, 'String');
    }

    handleSourceSelectChange(event) {
        const slot = event.target.dataset.slot;
        const field = event.target.dataset.field;
        const value = this.eventValue(event);
        if (field !== 'dateField'
            && field !== 'dateType'
            && field !== 'fallbackDateField'
            && field !== 'fallbackDateType') {
            this.updateSource(slot, { [field]: value });
            return;
        }

        const configuration = this.clone(this.sourceConfigurations[slot]);
        configuration[field] = value;
        const whenMapping = configuration.columns.when || this.normalizeMapping(null);
        const whenFields = whenMapping.fields || [{ field: '' }];
        whenFields[0] = { ...whenFields[0] };
        if (field === 'dateField') {
            whenFields[0].field = value;
        } else if (field === 'dateType') {
            whenFields[0].type = value;
        } else if (field === 'fallbackDateField') {
            whenFields[0].fallbackField = value;
        } else if (field === 'fallbackDateType') {
            whenFields[0].fallbackType = value;
        }
        whenMapping.fields = whenFields;
        configuration.columns.when = whenMapping;
        this.sourceConfigurations = { ...this.sourceConfigurations, [slot]: configuration };
        this.persistConfiguration();
    }

    handleColumnChange(event) {
        const oldKey = event.target.dataset.key;
        const field = event.target.dataset.field;
        const value = this.eventValue(event);
        const columns = this.clone(this.columns);
        const index = columns.findIndex((column) => column.key === oldKey);
        if (index === -1) {
            return;
        }

        if (field === 'key') {
            const newKey = this.safeKey(this.eventValue(event));
            if (!newKey || columns.some((column, columnIndex) => columnIndex !== index && column.key === newKey)) {
                return;
            }
            columns[index].key = newKey;
            this.renameSourceColumnMappings(oldKey, newKey);
        } else if (field === 'type') {
            columns[index].type = normalizeColumnType(value);
            if (columns[index].type === 'richText') {
                columns[index].wrapText = true;
                columns[index].allowMultipleFields = true;
                columns[index].sortable = false;
            }
        } else {
            columns[index][field] = field === 'sortable'
                || field === 'wrapText'
                || field === 'allowMultipleFields'
                ? event.target.checked
                : value;
        }
        this.columns = columns;
        this.persistConfiguration();
    }

    handleAddColumn() {
        const key = this.nextColumnKey();
        this.columns = [
            ...this.columns,
            { key, label: 'New column', type: 'text', sortable: true, wrapText: false, allowMultipleFields: false }
        ];
        Object.keys(this.sourceConfigurations).forEach((slot) => {
            this.sourceConfigurations[slot].columns[key] = this.normalizeMapping(null);
        });
        this.persistConfiguration();
    }

    handleDeleteColumn(event) {
        const key = event.currentTarget.dataset.key;
        if (this.columns.length <= 1) {
            return;
        }
        this.columns = this.columns.filter((column) => column.key !== key);
        Object.keys(this.sourceConfigurations).forEach((slot) => {
            delete this.sourceConfigurations[slot].columns[key];
        });
        this.persistConfiguration();
    }

    handleMoveColumn(event) {
        const key = event.currentTarget.dataset.key;
        const direction = event.currentTarget.dataset.direction;
        const index = this.columns.findIndex((column) => column.key === key);
        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (index < 0 || nextIndex < 0 || nextIndex >= this.columns.length) {
            return;
        }
        const columns = [...this.columns];
        [columns[index], columns[nextIndex]] = [columns[nextIndex], columns[index]];
        this.columns = columns;
        this.persistConfiguration();
    }

    handleMappingFieldChange(event) {
        const slot = event.target.dataset.slot;
        const columnKey = event.target.dataset.columnKey;
        const fieldIndex = Number(event.target.dataset.index);
        const configuration = this.clone(this.sourceConfigurations[slot]);
        const mapping = configuration.columns[columnKey] || this.normalizeMapping(null);
        const fields = mapping.fields || [{ field: '' }];
        const newValue = this.eventValue(event);
        const previousField = fields[fieldIndex] || {};
        const nextField = { ...previousField, field: newValue };
        if (newValue !== previousField.field) {
            const inferredType = this.inferFieldDisplayType(configuration.objectType, newValue);
            if (inferredType) {
                nextField.type = inferredType;
            } else {
                delete nextField.type;
            }

            if (newValue === SOURCE_VALUE) {
                delete nextField.label;
            } else {
                nextField.label = this.fieldDisplayLabel(configuration.objectType, newValue);
            }
        }
        fields[fieldIndex] = nextField;
        mapping.fields = fields;
        if (newValue === SOURCE_VALUE) {
            mapping.value = 'source';
        } else {
            delete mapping.value;
        }
        configuration.columns[columnKey] = mapping;
        this.sourceConfigurations = { ...this.sourceConfigurations, [slot]: configuration };
        this.persistConfiguration();
    }

    handleAddMappingField(event) {
        const slot = event.currentTarget.dataset.slot;
        const columnKey = event.currentTarget.dataset.columnKey;
        const column = this.columns.find((candidate) => candidate.key === columnKey);
        if (!column || column.allowMultipleFields !== true) {
            return;
        }
        const configuration = this.clone(this.sourceConfigurations[slot]);
        const mapping = configuration.columns[columnKey] || this.normalizeMapping(null);
        mapping.fields = [...(mapping.fields || []), { field: '' }];
        configuration.columns[columnKey] = mapping;
        this.sourceConfigurations = { ...this.sourceConfigurations, [slot]: configuration };
        this.persistConfiguration();
    }

    handleRemoveMappingField(event) {
        const slot = event.currentTarget.dataset.slot;
        const columnKey = event.currentTarget.dataset.columnKey;
        const fieldIndex = Number(event.currentTarget.dataset.index);
        const configuration = this.clone(this.sourceConfigurations[slot]);
        const mapping = configuration.columns[columnKey] || this.normalizeMapping(null);
        const fields = [...(mapping.fields || [])];
        if (fields.length <= 1) {
            fields[0] = { field: '' };
        } else {
            fields.splice(fieldIndex, 1);
        }
        mapping.fields = fields;
        configuration.columns[columnKey] = mapping;
        this.sourceConfigurations = { ...this.sourceConfigurations, [slot]: configuration };
        this.persistConfiguration();
    }

    handleMappingSettingChange(event) {
        const slot = event.target.dataset.slot;
        const columnKey = event.target.dataset.columnKey;
        const field = event.target.dataset.field;
        const configuration = this.clone(this.sourceConfigurations[slot]);
        const mapping = configuration.columns[columnKey] || this.normalizeMapping(null);
        const value = field === 'includeLabels' ? event.target.checked : this.eventValue(event);
        mapping[field] = field === 'separator' ? this.editorSeparator(value) : value;
        configuration.columns[columnKey] = mapping;
        this.sourceConfigurations = { ...this.sourceConfigurations, [slot]: configuration };
        this.persistConfiguration();
    }

    handleResetConfiguration() {
        this.localTypeValues = {};
        this.displayMode = 'auto';
        this.columns = this.clone(DEFAULT_COLUMNS);
        this.sourceConfigurations = this.buildSourceConfigurations(this.clone(DEFAULT_SOURCE_CONFIGURATION));
        this.configWarning = '';
        this.persistConfiguration();
    }

    updateSource(slot, changes) {
        const current = this.sourceConfigurations[slot] || this.emptySourceConfiguration(
            SOURCE_SLOTS.find((source) => source.slot === slot)
        );
        this.sourceConfigurations = {
            ...this.sourceConfigurations,
            [slot]: { ...current, ...changes }
        };
        this.persistConfiguration();
    }

    renameSourceColumnMappings(oldKey, newKey) {
        Object.keys(this.sourceConfigurations).forEach((slot) => {
            const configuration = this.sourceConfigurations[slot];
            if (configuration.columns[oldKey]) {
                configuration.columns[newKey] = configuration.columns[oldKey];
                delete configuration.columns[oldKey];
            }
        });
    }

    serializeSourceConfiguration() {
        return SOURCE_SLOTS.reduce((result, source) => {
            const configuration = this.sourceConfigurations[source.slot] || this.emptySourceConfiguration(source);
            const entry = {
                source: configuration.source || configuration.objectType || source.label,
                dateField: configuration.dateField,
                dateType: configuration.dateType || 'dateTime',
                columns: {}
            };

            if (configuration.objectType) {
                entry.objectType = configuration.objectType;
            }

            if (configuration.fallbackDateField) {
                entry.fallbackDateField = configuration.fallbackDateField;
                entry.fallbackDateType = configuration.fallbackDateType || 'dateTime';
            }
            if (!source.required) {
                entry.enabled = Boolean(configuration.collectionValue || this.inputReference(source.slot));
            }

            this.columns.forEach((column) => {
                const mapping = configuration.columns[column.key];
                if (!mapping) {
                    return;
                }
                const fields = (mapping.fields || []).filter((field) => field.field);
                if (!fields.length) {
                    return;
                }
                const settings = { ...mapping };
                delete settings.fields;
                delete settings.value;
                if (Object.prototype.hasOwnProperty.call(settings, 'separator')) {
                    // Keep the Builder-safe token in the Flow value. The runtime
                    // converts it to a visual line break when rendering.
                    settings.separator = this.editorSeparator(settings.separator);
                }
                if (fields.length === 1 && fields[0].field === SOURCE_VALUE) {
                    entry.columns[column.key] = { value: 'source', ...settings };
                } else if (fields.length === 1) {
                    entry.columns[column.key] = { ...fields[0], ...settings };
                } else {
                    entry.columns[column.key] = { fields, ...settings };
                }
            });
            result[source.slot] = entry;
            return result;
        }, {});
    }

    persistConfiguration(explicitInputs = []) {
        this.configDirty = true;
        this.configWarning = '';
        this.dispatchInputChanged('displayMode', this.displayMode, 'String');
        // Older Flow versions may not have this newer property persisted yet.
        // Do not introduce it during unrelated edits; Flow Builder can throw
        // while translating the screen metadata when several inputs are added
        // together. A direct page-size edit explicitly opts into adding it.
        if (explicitInputs.includes('pageSize') || this.hasInputVariable('pageSize')) {
            this.dispatchInputChanged('pageSize', Number(this.pageSize), 'Integer');
        }
        this.dispatchInputChanged('columnConfiguration', JSON.stringify(this.columns), 'String');
        this.dispatchInputChanged('sourceFieldConfiguration', JSON.stringify(this.serializeSourceConfiguration()), 'String');
    }

    normalizeDisplayMode(value) {
        const normalized = String(value || '').toLowerCase();
        return DISPLAY_MODES.some((option) => option.value === normalized) ? normalized : 'auto';
    }

    normalizePageSize(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '10';
        }
        return String(Math.min(200, Math.max(1, Math.floor(numeric))));
    }

    safeKey(value) {
        return String(value || '')
            .trim()
            .replace(/[^a-zA-Z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toLowerCase();
    }

    eventValue(event) {
        return event.detail && event.detail.value !== undefined
            ? event.detail.value
            : event.target.value;
    }

    hasInputVariable(name) {
        return this._inputVariables.some((input) => input && input.name === name);
    }

    nextColumnKey() {
        let index = this.columns.length + 1;
        let key = `column${index}`;
        while (this.columns.some((column) => column.key === key)) {
            index += 1;
            key = `column${index}`;
        }
        return key;
    }

    clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    editorSeparator(value) {
        return value === '\n' || value === '\r\n' || value === '\\n'
            ? LINE_BREAK_SEPARATOR
            : value;
    }

    dispatchInputChanged(name, newValue, newValueDataType) {
        this.dispatchEvent(new CustomEvent('configuration_editor_input_value_changed', {
            bubbles: true,
            composed: true,
            detail: { name, newValue, newValueDataType }
        }));
    }

    dispatchInputDeleted(name) {
        this.dispatchEvent(new CustomEvent('configuration_editor_input_value_deleted', {
            bubbles: true,
            composed: true,
            detail: { name }
        }));
    }

    @api
    validate() {
        const errors = [];
        const keys = this.columns.map((column) => column.key).filter(Boolean);
        if (keys.length !== new Set(keys).size) {
            errors.push({ key: 'columns', errorString: 'Column keys must be unique.' });
        }

        SOURCE_SLOTS.forEach((source) => {
            const configuration = this.sourceConfigurations[source.slot] || {};
            const collectionValue = configuration.collectionValue || this.inputReference(source.slot);
            if (source.required && (!configuration.objectType || !collectionValue)) {
                errors.push({ key: source.slot, errorString: `${source.label} needs an object type and record collection.` });
            }
            if (!source.required && collectionValue && !configuration.objectType) {
                errors.push({ key: source.slot, errorString: `${source.label} needs an object type.` });
            }

            this.columns.forEach((column) => {
                const mapping = configuration.columns && configuration.columns[column.key];
                const mappedFields = mapping && (mapping.fields || []).filter((field) => field.field).length;
                if (mappedFields > 1 && column.allowMultipleFields !== true) {
                    errors.push({
                        key: `${source.slot}-${column.key}`,
                        errorString: `${column.label} allows only one field for ${source.label}.`
                    });
                }
            });
        });
        return errors;
    }
}
