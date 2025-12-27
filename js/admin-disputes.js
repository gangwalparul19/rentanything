
// ==========================================
// DISPUTE MANAGEMENT
// ==========================================
window.loadDisputes = async function () {
    console.log("Loading disputes...");
    const tableBody = document.getElementById('disputes-table');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const q = query(collection(db, "disputes"), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        if (snap.empty) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #94a3b8;">No disputes found.</td></tr>';
            return;
        }

        let html = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Unknown';
            const statusClass = data.status === 'resolved' ? 'verified' : (data.status === 'dismissed' ? 'rejected' : 'pending');

            html += `
                <tr>
                    <td>${docSnap.id.substring(0, 8)}...</td>
                    <td>${data.bookingId || '-'}</td>
                    <td>
                        <div>${data.reporterName || 'Unknown'}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${data.reporterEmail || ''}</div>
                    </td>
                    <td>${data.issueType || 'General'}</td>
                    <td><span class="badge ${statusClass}">${data.status || 'open'}</span></td>
                    <td>${data.priority || 'Medium'}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-sm btn-view" onclick="viewDisputeEvidence('${docSnap.id}')">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                    </td>
                    <td>
                        ${data.status !== 'resolved' ? `
                            <button class="btn-sm btn-approve" onclick="resolveDispute('${docSnap.id}')" title="Resolve">
                                <i class="fa-solid fa-check"></i>
                            </button>
                        ` : ''}
                        ${data.status !== 'dismissed' ? `
                            <button class="btn-sm" style="background:#fee2e2; color:#991b1b;" onclick="dismissDispute('${docSnap.id}')" title="Dismiss">
                                <i class="fa-solid fa-ban"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

    } catch (error) {
        console.error("Error loading disputes:", error);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
    }
}

window.resolveDispute = async function (id) {
    if (!confirm("Mark this dispute as RESOLVED?")) return;
    try {
        await updateDoc(doc(db, "disputes", id), {
            status: 'resolved',
            resolvedAt: serverTimestamp(),
            resolvedBy: auth.currentUser.email
        });
        showToast("Dispute marked as resolved", "success");
        loadDisputes();
    } catch (error) {
        console.error("Error resolving dispute:", error);
        showToast("Action failed", "error");
    }
};

window.dismissDispute = async function (id) {
    if (!confirm("DISMISS this dispute?")) return;
    try {
        await updateDoc(doc(db, "disputes", id), {
            status: 'dismissed',
            dismissedAt: serverTimestamp(),
            dismissedBy: auth.currentUser.email
        });
        showToast("Dispute dismissed", "info");
        loadDisputes();
    } catch (error) {
        console.error("Error dismissing dispute:", error);
        showToast("Action failed", "error");
    }
};

window.viewDisputeEvidence = function (id) {
    alert("Full evidence view coming soon for ID: " + id);
};

// ==========================================
// REPORT MANAGEMENT (Content Moderation)
// ==========================================
window.loadReports = async function () {
    console.log("Loading reports...");
    // This targets the dashboard widget or a main reports section if it exists
    const tableBody = document.getElementById('report-list-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        // Fetch reports (content flags)
        const q = query(collection(db, "reports"), orderBy('createdAt', 'desc'), limit(10));
        const snap = await getDocs(q);

        if (snap.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #94a3b8;">No active reports.</td></tr>';
            return;
        }

        let html = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            html += `
                <tr>
                    <td>${data.reportedBy || 'Anonymous'}</td>
                    <td>${data.reason || 'Other'}</td>
                    <td>${data.details || '-'}</td>
                    <td><span class="badge pending">${data.status || 'Review'}</span></td>
                    <td>
                        <button class="btn-sm btn-view" onclick="viewReport('${docSnap.id}')">View</button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

    } catch (error) {
        console.error("Error loading reports:", error);
        // Fallback: If 'reports' collection doesn't exist yet, show empty
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No reports found.</td></tr>';
    }
};

window.viewReport = function (id) {
    alert("Report details for " + id);
};
