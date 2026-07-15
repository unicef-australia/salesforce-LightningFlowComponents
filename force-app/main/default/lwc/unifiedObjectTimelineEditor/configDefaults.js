const DEFAULT_COLUMNS = [
    { key: 'when', label: 'When', type: 'dateTime', sortable: true, allowMultipleFields: false },
    { key: 'source', label: 'Source', type: 'text', sortable: true, value: 'source', allowMultipleFields: false },
    { key: 'record', label: 'Record', type: 'record', sortable: false, allowMultipleFields: false },
    { key: 'status', label: 'Status', type: 'text', sortable: true, allowMultipleFields: false },
    { key: 'type', label: 'Type', type: 'text', wrapText: true, sortable: true, allowMultipleFields: true },
    { key: 'details', label: 'Details', type: 'richText', wrapText: true, sortable: false, allowMultipleFields: true }
];

const EMPTY_SOURCE = {
    enabled: false,
    source: '',
    dateField: '',
    dateType: 'dateTime',
    columns: {}
};

const DEFAULT_SOURCE_CONFIGURATION = {
    source1: {
        source: 'Case',
        objectType: 'Case',
        dateField: 'CreatedDate',
        dateType: 'dateTime',
        columns: {
            when: { field: 'CreatedDate', type: 'dateTime' },
            record: { field: 'CaseNumber' },
            status: { field: 'Status' },
            type: {
                fields: [{ field: 'Type' }, { field: 'Reason' }],
                separator: ' / '
            },
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
    },
    source2: { ...EMPTY_SOURCE },
    source3: { ...EMPTY_SOURCE },
    source4: { ...EMPTY_SOURCE },
    source5: { ...EMPTY_SOURCE },
    source6: { ...EMPTY_SOURCE },
    source7: { ...EMPTY_SOURCE },
    source8: { ...EMPTY_SOURCE }
};

export { DEFAULT_COLUMNS, DEFAULT_SOURCE_CONFIGURATION };
