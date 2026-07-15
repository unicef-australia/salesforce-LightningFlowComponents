import { LightningElement, api } from 'lwc';

const DEFAULT_PAGE_SIZE = 10;
const ALL_SOURCES = 'All sources';
const SOURCE_SLOTS = ['source1', 'source2', 'source3', 'source4', 'source5', 'source6', 'source7', 'source8'];
const DISPLAY_MODES = ['auto', 'table', 'timeline'];
const OBJECT_ICON_BY_TYPE = {
    Account: 'standard:account',
    Asset: 'standard:asset_object',
    Campaign: 'standard:campaign',
    Case: 'standard:case',
    CampaignMember: 'standard:campaign',
    Contact: 'standard:contact',
    Event: 'standard:event',
    Lead: 'standard:lead',
    Opportunity: 'standard:opportunity',
    Order: 'standard:orders',
    Task: 'standard:task',
    EmailMessage: 'standard:email'
};

const DEFAULT_TIMELINE_CONFIG = {
    sources: [
        {
            slot: 'source1',
            source: 'Case',
            objectType: 'Case',
            dateField: 'CreatedDate',
            dateType: 'dateTime',
            columns: {
                when: { field: 'CreatedDate', type: 'dateTime' },
                record: { field: 'CaseNumber' },
                status: { field: 'Status' },
                type: { fields: [{ field: 'Type' }, { field: 'Reason' }], separator: ' / ' },
                details: {
                    fields: [
                        { label: 'Subject', field: 'Subject' },
                        { label: 'Description', field: 'Description' },
                        { label: 'Closed', field: 'ClosedDate', type: 'dateTime' }
                    ],
                    separator: '\n',
                    includeLabels: true
                }
            }
        }
    ],
    columns: [
        { key: 'when', label: 'When', type: 'dateTime', sortable: true },
        { key: 'source', label: 'Source', type: 'text', sortable: true, value: 'source' },
        { key: 'record', label: 'Record', type: 'record', sortable: false },
        { key: 'status', label: 'Status', type: 'text', sortable: true },
        { key: 'type', label: 'Type', type: 'text', wrapText: true, sortable: true },
        { key: 'details', label: 'Details', type: 'richText', wrapText: true, sortable: false }
    ]
};

export default class UnifiedObjectTimeline extends LightningElement {
    @api headerLabel;
    @api displayMode = 'auto';
    @api pageSize = DEFAULT_PAGE_SIZE;

    _sourceConfiguration;
    _columnConfiguration;
    _sourceFieldConfiguration;
    _source1 = [];
    _source2 = [];
    _source3 = [];
    _source4 = [];
    _source5 = [];
    _source6 = [];
    _source7 = [];
    _source8 = [];

    rows = [];
    columns = [];
    searchTerm = '';
    sourceFilter = ALL_SOURCES;
    fromDate = '';
    toDate = '';
    pageNumber = 1;
    sortedBy = 'column_when';
    sortDirection = 'desc';
    expandedRowKeys = new Set();

    @api
    get sourceConfiguration() {
        return this._sourceConfiguration;
    }

    set sourceConfiguration(value) {
        this._sourceConfiguration = value;
        this.rebuildRows();
    }

    @api
    get columnConfiguration() {
        return this._columnConfiguration;
    }

    set columnConfiguration(value) {
        this._columnConfiguration = value;
        this.rebuildRows();
    }

    @api
    get sourceFieldConfiguration() {
        return this._sourceFieldConfiguration;
    }

    set sourceFieldConfiguration(value) {
        this._sourceFieldConfiguration = value;
        this.rebuildRows();
    }

    @api
    get source1() {
        return this._source1;
    }

    set source1(value) {
        this._source1 = this.asArray(value);
        this.rebuildRows();
    }

    @api
    get source2() {
        return this._source2;
    }

    set source2(value) {
        this._source2 = this.asArray(value);
        this.rebuildRows();
    }

    @api
    get source3() {
        return this._source3;
    }

    set source3(value) {
        this._source3 = this.asArray(value);
        this.rebuildRows();
    }

    @api
    get source4() {
        return this._source4;
    }

    set source4(value) {
        this._source4 = this.asArray(value);
        this.rebuildRows();
    }

    @api
    get source5() {
        return this._source5;
    }

    set source5(value) {
        this._source5 = this.asArray(value);
        this.rebuildRows();
    }

    @api
    get source6() {
        return this._source6;
    }

    set source6(value) {
        this._source6 = this.asArray(value);
        this.rebuildRows();
    }

    @api
    get source7() {
        return this._source7;
    }

    set source7(value) {
        this._source7 = this.asArray(value);
        this.rebuildRows();
    }

    @api
    get source8() {
        return this._source8;
    }

    set source8(value) {
        this._source8 = this.asArray(value);
        this.rebuildRows();
    }

    get cardTitle() {
        return this.headerLabel === undefined || this.headerLabel === null
            ? ''
            : String(this.headerLabel).trim();
    }

    get hasCardTitle() {
        return Boolean(this.cardTitle);
    }

    get normalizedDisplayMode() {
        return DISPLAY_MODES.indexOf(this.displayMode) !== -1 ? this.displayMode : 'auto';
    }

    get viewClass() {
        return `timeline-content mode-${this.normalizedDisplayMode}`;
    }

    get sourceOptions() {
        const sources = new Set(this.rows.map((row) => row.source));
        return [
            { label: ALL_SOURCES, value: ALL_SOURCES },
            ...Array.from(sources)
                .sort()
                .map((source) => ({ label: source, value: source }))
        ];
    }

    get isInvalidDateRange() {
        return Boolean(this.fromDate && this.toDate && this.fromDate > this.toDate);
    }

    get dateRangeError() {
        return this.isInvalidDateRange ? 'The start date must be on or before the end date.' : '';
    }

    get hasActiveFilters() {
        return Boolean(this.searchTerm || this.fromDate || this.toDate || this.sourceFilter !== ALL_SOURCES);
    }

    get isClearDisabled() {
        return !this.hasActiveFilters;
    }

    get filteredRows() {
        const term = (this.searchTerm || '').trim().toLowerCase();
        const fromTime = this.fromDate ? new Date(`${this.fromDate}T00:00:00`).getTime() : null;
        const toTime = this.toDate ? new Date(`${this.toDate}T23:59:59.999`).getTime() : null;

        return this.rows.filter((row) => {
            const sourceMatches = this.sourceFilter === ALL_SOURCES || row.source === this.sourceFilter;
            if (!sourceMatches || this.isInvalidDateRange) {
                return false;
            }
            if (fromTime !== null && row.sortTime < fromTime) {
                return false;
            }
            if (toTime !== null && row.sortTime > toTime) {
                return false;
            }
            if (!term) {
                return true;
            }
            return String(row.searchText || '').indexOf(term) !== -1;
        });
    }

    get pageRows() {
        const start = (this.pageNumber - 1) * this.effectivePageSize;
        return this.filteredRows.slice(start, start + this.effectivePageSize);
    }

    get compactRows() {
        return this.pageRows.map((row) => {
            const details = this.compactValue(row, 'details');
            const detailsRichText = row.column_detailsRichText || '';
            return {
                rowKey: row.rowKey,
                when: this.formatDate(row.timelineDate, 'dateTime'),
                source: row.source,
                sourceIcon: row.sourceIcon,
                recordLabel: row.column_recordLabel || row.recordLabel,
                recordUrl: row.column_recordUrl || row.recordUrl,
                status: this.compactValue(row, 'status'),
                type: this.compactValue(row, 'type'),
                summary: this.compactValue(row, 'summary'),
                details,
                detailsRichText,
                detailsIsRichText: Boolean(detailsRichText),
                hasDetails: Boolean(details || detailsRichText),
                expanded: this.expandedRowKeys.has(row.rowKey),
                toggleLabel: this.expandedRowKeys.has(row.rowKey) ? 'Hide details' : 'Show details',
                toggleIcon: this.expandedRowKeys.has(row.rowKey)
                    ? 'utility:chevronup'
                    : 'utility:chevrondown'
            };
        });
    }

    get pageCount() {
        return Math.max(1, Math.ceil(this.filteredRows.length / this.effectivePageSize));
    }

    get effectivePageSize() {
        const value = Number(this.pageSize);
        return Number.isFinite(value) && value > 0
            ? Math.min(200, Math.max(1, Math.floor(value)))
            : DEFAULT_PAGE_SIZE;
    }

    get isFirstPage() {
        return this.pageNumber <= 1;
    }

    get isLastPage() {
        return this.pageNumber >= this.pageCount;
    }

    get hasRows() {
        return this.filteredRows.length > 0;
    }

    get hasNoRows() {
        return !this.hasRows;
    }

    get resultSummary() {
        const total = this.rows.length;
        const matching = this.filteredRows.length;
        const noun = matching === 1 ? 'record' : 'records';
        return matching === total ? `${total} ${noun}` : `${matching} of ${total} ${noun}`;
    }

    get pageSummary() {
        const matching = this.filteredRows.length;
        const first = matching === 0 ? 0 : (this.pageNumber - 1) * this.effectivePageSize + 1;
        const last = Math.min(this.pageNumber * this.effectivePageSize, matching);
        return `${first}-${last} of ${matching}`;
    }

    handleSearch(event) {
        this.searchTerm = event.target.value || '';
        this.pageNumber = 1;
    }

    handleSourceFilter(event) {
        this.sourceFilter = event.detail.value;
        this.pageNumber = 1;
    }

    handleDateFilter(event) {
        this[event.target.name] = event.target.value || '';
        this.pageNumber = 1;
    }

    handleClearFilters() {
        this.searchTerm = '';
        this.sourceFilter = ALL_SOURCES;
        this.fromDate = '';
        this.toDate = '';
        this.pageNumber = 1;
    }

    handleCompactRowToggle(event) {
        const rowKey = event.currentTarget.dataset.rowKey;
        const expandedRowKeys = new Set(this.expandedRowKeys);
        if (expandedRowKeys.has(rowKey)) {
            expandedRowKeys.delete(rowKey);
        } else {
            expandedRowKeys.add(rowKey);
        }
        this.expandedRowKeys = expandedRowKeys;
    }

    handlePrevious() {
        if (!this.isFirstPage) {
            this.pageNumber -= 1;
        }
    }

    handleNext() {
        if (!this.isLastPage) {
            this.pageNumber += 1;
        }
    }

    handleSort(event) {
        const { fieldName, sortDirection } = event.detail;
        const sortedRows = [...this.rows].sort((left, right) => this.compareRows(left, right, fieldName, sortDirection));
        this.rows = sortedRows;
        this.sortedBy = fieldName;
        this.sortDirection = sortDirection;
        this.pageNumber = 1;
    }

    rebuildRows() {
        const config = this.parseConfiguration();
        this.columns = this.buildDatatableColumns(config.columns);
        const collections = {
            source1: this._source1,
            source2: this._source2,
            source3: this._source3,
            source4: this._source4,
            source5: this._source5,
            source6: this._source6,
            source7: this._source7,
            source8: this._source8
        };
        const rows = [];

        (config.sources || []).filter((sourceConfig) => sourceConfig.enabled !== false).forEach((sourceConfig) => {
            const records = collections[sourceConfig.slot] || [];
            records.forEach((record) => {
                const row = this.recordToRow(record, sourceConfig, config.columns);
                if (row) {
                    rows.push(row);
                }
            });
        });

        rows.sort((left, right) => this.compareRows(left, right, 'column_when', 'desc'));
        this.rows = rows;
        this.pageNumber = 1;
        this.expandedRowKeys = new Set();

        if (this.sourceFilter !== ALL_SOURCES && !rows.some((row) => row.source === this.sourceFilter)) {
            this.sourceFilter = ALL_SOURCES;
        }
    }

    buildDatatableColumns(columnDefinitions) {
        return (columnDefinitions || []).map((definition) => {
            const fieldName = `column_${definition.key}`;
            const column = {
                label: definition.label || definition.key,
                fieldName,
                sortable: definition.sortable !== false
            };

            if (definition.type === 'record') {
                column.type = 'url';
                column.fieldName = `${fieldName}Url`;
                column.typeAttributes = {
                    label: { fieldName: `${fieldName}Label` },
                    target: '_blank'
                };
            } else if (definition.type === 'date' || definition.type === 'dateTime') {
                column.type = 'date';
                column.typeAttributes = definition.type === 'date'
                    ? { year: 'numeric', month: 'short', day: '2-digit' }
                    : { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' };
            } else if (definition.type === 'number') {
                column.type = 'number';
                column.typeAttributes = { maximumFractionDigits: 2 };
            } else if (definition.type === 'currency') {
                column.type = 'currency';
                column.typeAttributes = { maximumFractionDigits: 2 };
            } else if (definition.type === 'percent') {
                column.type = 'percent';
                column.typeAttributes = { maximumFractionDigits: 2 };
            } else if (definition.type === 'boolean') {
                column.type = 'boolean';
            } else {
                column.type = 'text';
            }

            if (definition.wrapText || this.isRichTextType(definition.type)) {
                column.wrapText = true;
            }
            if (definition.value === 'source') {
                column.cellAttributes = {
                    iconName: { fieldName: 'sourceIcon' }
                };
            }
            return column;
        });
    }

    recordToRow(record, sourceConfig, columnDefinitions) {
        const id = this.read(record, sourceConfig.idField || 'Id');
        const dateDefinition = {
            field: sourceConfig.dateField,
            type: sourceConfig.dateType || 'dateTime',
            fallbackField: sourceConfig.fallbackDateField,
            fallbackType: sourceConfig.fallbackDateType || 'dateTime'
        };
        let dateValue = this.read(record, dateDefinition.field);
        if (!dateValue && dateDefinition.fallbackField) {
            dateValue = this.read(record, dateDefinition.fallbackField);
            dateDefinition.field = dateDefinition.fallbackField;
            dateDefinition.type = dateDefinition.fallbackType;
        }

        if (!id || !dateValue) {
            return null;
        }

        const timelineDate = this.toDateValue(dateValue, dateDefinition.type);
        if (!timelineDate) {
            return null;
        }

        const recordColumn = (columnDefinitions || []).find((columnDefinition) => columnDefinition.key === 'record');
        const recordLabelDefinition = recordColumn
            ? this.mappingForColumn(recordColumn, sourceConfig)
            : { field: sourceConfig.recordLabelField || 'Name' };
        const recordLabel = this.formatDisplayValue(record, recordLabelDefinition) || sourceConfig.source;
        const row = {
            rowKey: `${sourceConfig.slot}-${id}`,
            timelineDate,
            source: sourceConfig.source,
            sourceIcon: this.objectIconName(sourceConfig),
            recordLabel,
            recordUrl: `/${id}`,
            sortTime: new Date(timelineDate).getTime(),
            searchText: ''
        };

        (columnDefinitions || []).forEach((columnDefinition) => {
            const fieldName = `column_${columnDefinition.key}`;
            const mapping = this.mappingForColumn(columnDefinition, sourceConfig);

            if (columnDefinition.type === 'record') {
                const label = this.formatDisplayValue(record, mapping) || sourceConfig.source;
                row[`${fieldName}Label`] = label;
                row[`${fieldName}Url`] = `/${id}`;
            } else if (this.isRichTextType(columnDefinition.type)) {
                const richText = this.formatRichTextColumnValue(record, mapping, sourceConfig);
                const searchText = this.richTextToPlainText(richText);
                row[fieldName] = this.truncateText(searchText, 280);
                row[`${fieldName}RichText`] = richText;
                row[`${fieldName}Search`] = searchText;
            } else {
                row[fieldName] = this.formatColumnValue(record, mapping, sourceConfig);
            }
        });

        row.searchText = [
            row.source,
            row.recordLabel,
            ...(columnDefinitions || []).map((columnDefinition) => {
                const fieldName = `column_${columnDefinition.key}`;
                if (columnDefinition.type === 'record') {
                    return row[`${fieldName}Label`];
                }
                return row[`${fieldName}Search`] || row[fieldName];
            })
        ]
            .filter((value) => value !== null && value !== undefined && value !== '')
            .join(' ')
            .toLowerCase();

        return row;
    }

    objectIconName(sourceConfig) {
        const objectType = this.sourceObjectType(sourceConfig);
        return OBJECT_ICON_BY_TYPE[objectType] || 'standard:record';
    }

    sourceObjectType(sourceConfig) {
        if (sourceConfig && sourceConfig.objectType) {
            return sourceConfig.objectType;
        }

        const source = String(sourceConfig && sourceConfig.source || '').trim().toLowerCase();
        return {
            account: 'Account',
            asset: 'Asset',
            campaign: 'Campaign',
            case: 'Case',
            'campaign member': 'CampaignMember',
            contact: 'Contact',
            event: 'Event',
            lead: 'Lead',
            opportunity: 'Opportunity',
            order: 'Order',
            task: 'Task',
            'email message': 'EmailMessage'
        }[source] || '';
    }

    mappingForColumn(columnDefinition, sourceConfig) {
        if (sourceConfig.columns && sourceConfig.columns[columnDefinition.key]) {
            return sourceConfig.columns[columnDefinition.key];
        }
        const sourceFields = columnDefinition.sourceFields || {};
        return sourceFields[sourceConfig.slot] || sourceFields[sourceConfig.source] || sourceFields.default || columnDefinition;
    }

    compactValue(row, key) {
        const value = row[`column_${key}`];
        return value === null || value === undefined ? '' : String(value);
    }

    isRichTextType(type) {
        return type === 'richText' || type === 'textArea' || type === 'html';
    }

    formatRichTextColumnValue(record, definition, sourceConfig) {
        const displayDefinition = this.sanitizeDisplayDefinition(definition || {});
        if (displayDefinition.value === 'source') {
            return this.escapeHtml(sourceConfig.source);
        }

        const fields = Array.isArray(displayDefinition.fields)
            ? displayDefinition.fields
            : displayDefinition.field
                ? [displayDefinition]
                : [];
        const separator = Object.prototype.hasOwnProperty.call(displayDefinition, 'separator')
            ? displayDefinition.separator
            : ' / ';
        const includeLabels = displayDefinition.includeLabels === true;

        return fields
            .map((fieldDefinition) => this.formatRichTextField(record, fieldDefinition, includeLabels))
            .filter(Boolean)
            .join(this.richTextSeparator(separator));
    }

    formatRichTextField(record, fieldDefinition, includeLabel) {
        const safeDefinition = this.sanitizeDisplayDefinition(fieldDefinition || {});
        const rawValue = this.readWithFallback(record, safeDefinition);
        if (rawValue === null || rawValue === undefined || rawValue === '') {
            return '';
        }

        const preservesMarkup = this.looksLikeHtml(rawValue);
        const needsTypedFormatting = safeDefinition.type === 'date'
            || safeDefinition.type === 'dateTime'
            || safeDefinition.type === 'number'
            || safeDefinition.type === 'currency'
            || safeDefinition.type === 'percent'
            || safeDefinition.type === 'boolean'
            || safeDefinition.type === 'direction'
            || Boolean(safeDefinition.statusValueLabels);
        const plainValue = typeof rawValue === 'string' && !needsTypedFormatting
            ? rawValue
            : this.formatDisplayValue(record, safeDefinition);
        const value = preservesMarkup
            ? String(rawValue)
            : this.escapeHtml(plainValue).replace(/\r?\n/g, '<br>');
        if (!includeLabel) {
            return value;
        }

        const label = safeDefinition.label || this.humanizeFieldPath(safeDefinition.field);
        return `<strong>${this.escapeHtml(label)}:</strong> ${value}`;
    }

    richTextSeparator(separator) {
        const value = separator === null || separator === undefined ? ' / ' : String(separator);
        return this.escapeHtml(value).replace(/\\n|\r?\n/g, '<br>');
    }

    looksLikeHtml(value) {
        return typeof value === 'string' && /<\/?[a-z][^>]*>/i.test(value);
    }

    escapeHtml(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    richTextToPlainText(value) {
        return String(value || '')
            .replace(/<br\s*\/?\s*>/gi, '\n')
            .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;|&#160;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/[ \t]+/g, ' ')
            .replace(/\s*\n\s*/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
            .slice(0, 4000);
    }

    truncateText(value, maximumLength) {
        const text = String(value || '');
        return text.length > maximumLength
            ? `${text.slice(0, Math.max(0, maximumLength - 3)).trimEnd()}...`
            : text;
    }

    formatColumnValue(record, definition, sourceConfig) {
        const displayDefinition = this.sanitizeDisplayDefinition(definition);
        if (displayDefinition.value === 'source') {
            return sourceConfig.source;
        }
        if (displayDefinition.value !== undefined) {
            return this.formatDisplayValue(record, displayDefinition.value);
        }
        if (displayDefinition.fields) {
            return this.formatCompositeValue(record, displayDefinition);
        }

        const rawValue = this.readWithFallback(record, displayDefinition);
        if (rawValue === null || rawValue === undefined || rawValue === '') {
            return '';
        }

        if (displayDefinition.type === 'date' || displayDefinition.type === 'dateTime') {
            return this.toDateValue(rawValue, displayDefinition.type);
        }
        if (displayDefinition.type === 'number' || displayDefinition.type === 'currency' || displayDefinition.type === 'percent') {
            const numberValue = Number(rawValue);
            return Number.isNaN(numberValue) ? this.cleanText(rawValue) : numberValue;
        }
        if (displayDefinition.type === 'direction') {
            return this.toBoolean(rawValue)
                ? displayDefinition.trueLabel || 'Inbound'
                : displayDefinition.falseLabel || 'Outbound';
        }
        if (displayDefinition.type === 'boolean') {
            return this.toBoolean(rawValue);
        }
        if (displayDefinition.statusValueLabels) {
            return displayDefinition.statusValueLabels[String(rawValue)] || this.cleanText(rawValue);
        }
        return this.cleanText(rawValue);
    }

    formatCompositeValue(record, definition) {
        const separator = definition.separator || ' / ';
        const includeLabels = definition.includeLabels === true;
        return (definition.fields || [])
            .map((fieldDefinition) => {
                const safeFieldDefinition = this.sanitizeDisplayDefinition(fieldDefinition);
                const value = this.formatDisplayValue(record, safeFieldDefinition);
                if (!value) {
                    return '';
                }
                if (!includeLabels && !safeFieldDefinition.label) {
                    return value;
                }
                const label = safeFieldDefinition.label || safeFieldDefinition.field;
                return includeLabels ? `${label}: ${value}` : value;
            })
            .filter((value) => value !== '')
            .join(separator);
    }

    formatDisplayValue(record, definition) {
        if (definition === null || definition === undefined) {
            return '';
        }
        if (typeof definition !== 'object') {
            return this.cleanText(definition);
        }

        const safeDefinition = this.sanitizeDisplayDefinition(definition);
        const rawValue = this.readWithFallback(record, safeDefinition);
        if (rawValue === null || rawValue === undefined || rawValue === '') {
            return '';
        }
        if (safeDefinition.statusValueLabels) {
            return safeDefinition.statusValueLabels[String(rawValue)]
                || this.formatDisplayScalar(rawValue, safeDefinition);
        }
        return this.formatDisplayScalar(rawValue, safeDefinition);
    }

    sanitizeDisplayDefinition(definition) {
        if (!definition || typeof definition !== 'object') {
            return definition;
        }
        if (definition.type !== 'date' && definition.type !== 'dateTime') {
            return definition;
        }
        if (this.isDateFieldPath(definition.field)) {
            return definition;
        }

        const safeDefinition = { ...definition };
        delete safeDefinition.type;
        safeDefinition.label = this.humanizeFieldPath(definition.field);
        return safeDefinition;
    }

    isDateFieldPath(fieldPath) {
        const leaf = String(fieldPath || '')
            .split('.')
            .pop()
            .replace(/__c$/i, '')
            .split('__')
            .pop();
        return /date$/i.test(leaf) || /datetime$/i.test(leaf);
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

    formatDisplayScalar(value, definition) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            value = value.Name || value.label || value.value || value.Id || '';
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.formatDisplayScalar(item, definition)).filter(Boolean).join(', ');
        }
        if (definition.type === 'date' || definition.type === 'dateTime') {
            return this.formatDate(value, definition.type);
        }
        if (definition.type === 'number' || definition.type === 'currency' || definition.type === 'percent') {
            const numberValue = Number(value);
            return Number.isNaN(numberValue)
                ? this.cleanText(value)
                : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(numberValue);
        }
        if (definition.type === 'boolean') {
            return this.toBoolean(value) ? definition.trueLabel || 'Yes' : definition.falseLabel || 'No';
        }
        return this.cleanText(value);
    }

    readWithFallback(record, definition) {
        let rawValue = this.read(record, definition.field);
        if ((rawValue === null || rawValue === undefined || rawValue === '') && definition.fallbackField) {
            rawValue = this.read(record, definition.fallbackField);
        }
        return rawValue;
    }

    parseConfiguration() {
        const columns = this.parseJson(this._columnConfiguration);
        const sourceFields = this.parseJson(this._sourceFieldConfiguration);
        if (columns || sourceFields) {
            return {
                columns: Array.isArray(columns) && columns.length ? columns : DEFAULT_TIMELINE_CONFIG.columns,
                sources: this.normalizeSourceConfiguration(sourceFields)
            };
        }

        if (!this._sourceConfiguration) {
            return DEFAULT_TIMELINE_CONFIG;
        }

        try {
            const parsed = JSON.parse(this._sourceConfiguration);
            if (Array.isArray(parsed)) {
                return { sources: parsed, columns: DEFAULT_TIMELINE_CONFIG.columns };
            }
            if (parsed && Array.isArray(parsed.sources) && Array.isArray(parsed.columns)) {
                return parsed;
            }
            return DEFAULT_TIMELINE_CONFIG;
        } catch (error) {
            return DEFAULT_TIMELINE_CONFIG;
        }
    }

    parseJson(value) {
        if (!value) {
            return null;
        }
        try {
            return JSON.parse(value);
        } catch (error) {
            return null;
        }
    }

    normalizeSourceConfiguration(value) {
        if (Array.isArray(value)) {
            return value;
        }
        if (!value || typeof value !== 'object') {
            return DEFAULT_TIMELINE_CONFIG.sources;
        }
        return Object.entries(value).map(([slot, configuration]) => ({
            slot,
            ...(configuration || {})
        }));
    }

    read(record, fieldPath) {
        if (!record || !fieldPath) {
            return null;
        }
        return String(fieldPath)
            .split('.')
            .reduce((value, field) => (value === null || value === undefined ? null : value[field]), record);
    }

    compareRows(left, right, fieldName, direction) {
        const multiplier = direction === 'asc' ? 1 : -1;
        if (fieldName === 'column_when' || fieldName === 'timelineDate') {
            return (left.sortTime - right.sortTime) * multiplier;
        }

        const leftValue = String(left[fieldName] || '').toLowerCase();
        const rightValue = String(right[fieldName] || '').toLowerCase();
        return leftValue.localeCompare(rightValue) * multiplier;
    }

    asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    toBoolean(value) {
        return value === true || value === 'true' || value === 1 || value === '1';
    }

    cleanText(value) {
        return String(value)
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 4000);
    }

    formatDate(value, type) {
        const date = this.parseDate(value, type);
        if (!date) {
            return this.cleanText(value);
        }

        const options = type === 'date'
            ? { year: 'numeric', month: 'short', day: '2-digit' }
            : { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        return new Intl.DateTimeFormat(undefined, options).format(date);
    }

    parseDate(value, type) {
        if (type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
            const [year, month, day] = String(value).split('-').map(Number);
            return new Date(year, month - 1, day);
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    toDateValue(value, type) {
        if (type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
            return `${value}T00:00:00.000Z`;
        }
        const date = this.parseDate(value, type);
        return date ? date.toISOString() : null;
    }
}
