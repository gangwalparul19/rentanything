/**
 * Enhanced Data Table Utilities
 * Adds sorting, filtering, bulk actions, and export functionality
 */

class EnhancedDataTable {
    constructor(tableId, options = {}) {
        this.table = document.getElementById(tableId);
        if (!this.table) {
            console.error(`Table with ID "${tableId}" not found`);
            return;
        }

        this.options = {
            sortable: true,
            bulkActions: true,
            exportable: true,
            stickyHeader: true,
            ...options
        };

        this.selectedRows = new Set();
        this.sortColumn = null;
        this.sortDirection = 'asc';

        this.init();
    }

    init() {
        if (this.options.sortable) {
            this.makeSortable();
        }

        if (this.options.bulkActions) {
            this.addBulkActions();
        }

        if (this.options.exportable) {
            this.addExportButton();
        }

        if (this.options.stickyHeader) {
            this.makeStickyHeader();
        }
    }

    /**
     * Make table headers sortable
     */
    makeSortable() {
        const headers = this.table.querySelectorAll('th[data-sortable="true"]');

        headers.forEach((header, index) => {
            header.classList.add('sortable-header');
            header.style.cursor = 'pointer';

            header.addEventListener('click', () => {
                this.sortTable(index, header);
            });
        });
    }

    /**
     * Sort table by column
     */
    sortTable(columnIndex, header) {
        const tbody = this.table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Toggle sort direction
        if (this.sortColumn === columnIndex) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortDirection = 'asc';
            this.sortColumn = columnIndex;
        }

        // Update header classes
        this.table.querySelectorAll('th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
        });
        header.classList.add(`sorted-${this.sortDirection}`);

        // Sort rows
        rows.sort((a, b) => {
            const aValue = a.cells[columnIndex]?.textContent.trim() || '';
            const bValue = b.cells[columnIndex]?.textContent.trim() || '';

            //Try numeric comparison first
            const aNum = parseFloat(aValue.replace(/[^0-9.-]/g, ''));
            const bNum = parseFloat(bValue.replace(/[^0-9.-]/g, ''));

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return this.sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // Fallback to string comparison
            return this.sortDirection === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        });

        // Reorder table rows
        rows.forEach(row => tbody.appendChild(row));
    }

    /**
     * Add bulk action functionality
     */
    addBulkActions() {
        // Add master checkbox in header
        const firstHeader = this.table.querySelector('thead tr th:first-child');
        if (!firstHeader.querySelector('.bulk-checkbox')) {
            const masterCheckbox = document.createElement('input');
            masterCheckbox.type = 'checkbox';
            masterCheckbox.className = 'bulk-checkbox master-checkbox';
            masterCheckbox.addEventListener('change', (e) => {
                this.selectAll(e.target.checked);
            });
            firstHeader.insertBefore(masterCheckbox, firstHeader.firstChild);
        }

        // Add checkboxes to each row
        const rows = this.table.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            const firstCell = row.querySelector('td:first-child');
            if (!firstCell.querySelector('.bulk-checkbox')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'bulk-checkbox';
                checkbox.dataset.rowId = index;
                checkbox.addEventListener('change', (e) => {
                    this.toggleRow(index, e.target.checked);
                });
                firstCell.insertBefore(checkbox, firstCell.firstChild);
            }
        });
    }

    selectAll(checked) {
        const checkboxes = this.table.querySelectorAll('tbody .bulk-checkbox');
        checkboxes.forEach((cb, index) => {
            cb.checked = checked;
            this.toggleRow(index, checked);
        });
    }

    toggleRow(rowId, selected) {
        if (selected) {
            this.selectedRows.add(rowId);
        } else {
            this.selectedRows.delete(rowId);
        }

        // Show/hide bulk action bar
        this.updateBulkActionBar();
    }

    updateBulkActionBar() {
        const bulkActions = document.querySelector('.bulk-actions');
        if (bulkActions) {
            if (this.selectedRows.size > 0) {
                bulkActions.classList.add('active');
                const countEl = bulkActions.querySelector('.selected-count');
                if (countEl) {
                    countEl.textContent = `${this.selectedRows.size} selected`;
                }
            } else {
                bulkActions.classList.remove('active');
            }
        }
    }

    /**
     * Add export to CSV functionality
     */
    addExportButton() {
        const tableActions = document.querySelector('.table-actions');
        if (!tableActions) return;

        if (!tableActions.querySelector('.export-btn')) {
            const exportBtn = document.createElement('button');
            exportBtn.className = 'export-btn';
            exportBtn.innerHTML = '<i class="fa-solid fa-download"></i> Export CSV';
            exportBtn.addEventListener('click', () => this.exportToCSV());
            tableActions.appendChild(exportBtn);
        }
    }

    /**
     * Export table data to CSV
     */
    exportToCSV() {
        const rows = [];

        // Add headers
        const headers = Array.from(this.table.querySelectorAll('thead th'))
            .map(th => th.textContent.trim())
            .filter(text => text && text !== ''); // Remove checkbox column
        rows.push(headers);

        // Add data rows
        this.table.querySelectorAll('tbody tr').forEach(tr => {
            const row = Array.from(tr.querySelectorAll('td'))
                .map(td => td.textContent.trim())
                .slice(1); // Skip checkbox column
            rows.push(row);
        });

        // Convert to CSV
        const csvContent = rows.map(row =>
            row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `export_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Make table header sticky
     */
    makeStickyHeader() {
        const thead = this.table.querySelector('thead');
        if (thead) {
            thead.classList.add('sticky-header');
        }
    }

    /**
     * Get selected row IDs
     */
    getSelectedRows() {
        return Array.from(this.selectedRows);
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedRows.clear();
        this.table.querySelectorAll('.bulk-checkbox').forEach(cb => {
            cb.checked = false;
        });
        this.updateBulkActionBar();
    }
}

// Export for global use
window.EnhancedDataTable = EnhancedDataTable;

/**
 * Initialize all enhanced tables on page load
 */
function initEnhancedTables() {
    // Find all tables with data-enhanced="true"
    document.querySelectorAll('table[data-enhanced="true"]').forEach(table => {
        new EnhancedDataTable(table.id);
    });
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancedTables);
} else {
    initEnhancedTables();
}

export { EnhancedDataTable, initEnhancedTables };
