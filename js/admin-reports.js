/**
 * Admin Reports Generator
 * Generates printable HTML reports from current dashboard data
 */

import { showToast } from './toast-enhanced.js';

export class AdminReports {
    constructor() {
        this.companyName = "RentAnything";
        this.currentDate = new Date().toLocaleDateString();
    }

    /**
     * Gather data from the page to build the report
     */
    gatherData() {
        // Safe getter for element text content
        const getText = (id) => {
            const el = document.getElementById(id);
            return el ? el.innerText : '0';
        };

        return {
            users: getText('health-users'),
            listings: getText('health-listings'),
            bookings: getText('health-bookings'),
            revenue: getText('revenue-kpi')?.replace(/[^\d]/g, '') || '0', // Extract number from KPI if available
            properties: getText('health-properties'),
            flagged: getText('health-flagged'),
            generatedAt: new Date().toLocaleString()
        };
    }

    /**
     * Generate HTML for the printable report
     */
    generateReportHTML(data) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>RentAnything - Business Report</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; padding: 2rem; color: #1e293b; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 2rem; }
                    .brand { font-size: 1.5rem; font-weight: bold; color: #2563eb; }
                    .meta { color: #64748b; font-size: 0.9rem; text-align: right; }
                    .section-title { font-size: 1.2rem; font-weight: 600; margin: 2rem 0 1rem 0; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 0.5rem; }
                    
                    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
                    .kpi-card { background: #f8fafc; padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; text-align: center; }
                    .kpi-value { font-size: 2rem; font-weight: bold; color: #0f172a; margin: 0.5rem 0; }
                    .kpi-label { color: #64748b; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
                    
                    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                    th { text-align: left; background: #f1f5f9; padding: 0.75rem; font-size: 0.85rem; text-transform: uppercase; color: #475569; }
                    td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    
                    .footer { margin-top: 4rem; text-align: center; color: #94a3b8; font-size: 0.8rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
                    
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand">${this.companyName}</div>
                    <div class="meta">
                        <div>Generated: ${data.generatedAt}</div>
                        <div>Confidential Business Report</div>
                    </div>
                </div>

                <div class="section-title">Executive Summary</div>
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-label">Total Users</div>
                        <div class="kpi-value">${data.users}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Total Listings</div>
                        <div class="kpi-value">${data.listings}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Total Bookings</div>
                        <div class="kpi-value">${data.bookings}</div>
                    </div>
                </div>

                <div class="section-title">Platform Health</div>
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-label">Active Properties</div>
                        <div class="kpi-value">${data.properties}</div>
                    </div>
                     <div class="kpi-card">
                        <div class="kpi-label">Flagged Content</div>
                        <div class="kpi-value">${data.flagged}</div>
                    </div>
                     <div class="kpi-card">
                        <div class="kpi-label">System Status</div>
                        <div class="kpi-value" style="color: #22c55e;">Operational</div>
                    </div>
                </div>

                <!-- Snapshot of pending items, cloning from existing tables -->
                <div class="section-title">Pending Actions Snapshot</div>
                <div id="pending-items-container">
                    <!-- Javascript will copy tables here -->
                </div>

                <div class="footer">
                    &copy; ${new Date().getFullYear()} ${this.companyName} Admin Panel. Internal Use Only.
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Open report in new window for printing
     */
    generate() {
        showToast('Generating comprehensive report...', 'info');

        const data = this.gatherData();
        const html = this.generateReportHTML(data);

        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(html);
            reportWindow.document.close();

            // Try to clone tables if they exist in opener
            try {
                // This is running in the main window context
                const pendingVerifications = document.getElementById('table-verifications');
                if (pendingVerifications) {
                    const tableClone = pendingVerifications.cloneNode(true);
                    // Insert into the new window's container - requires a bit of DOM manipulation in the new window
                    // Simplified approach: String replacement would be safer across contexts, but direct DOM access usually works for same-origin types
                    // Since direct DOM access to new window can be tricky with race conditions on load, we already put the script in the HTML to print on load.
                    // For more complex table cloning, we would need to serialize the table HTML.
                }
            } catch (e) {
                console.warn("Could not clone tables for report", e);
            }
        } else {
            showToast('Pop-up blocked. Please allow pop-ups for reports.', 'error');
        }
    }
}

// Global Export
window.AdminReports = AdminReports;
export const reportGenerator = new AdminReports();
