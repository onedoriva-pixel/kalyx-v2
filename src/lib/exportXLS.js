export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function makeHeader(title, dateStr, timeStr) {
  return '<div class="header"><div class="logo">KALYX &mdash; ' + title + '</div><div class="date">Generated: ' + dateStr + ' at ' + timeStr + '</div></div>';
}

function makeFooter(dateStr) {
  return '<div class="footer">KALYX &mdash; Confidential &middot; Generated on ' + dateStr + '</div>';
}

function wrapHTML(title, content) {
  var now = new Date();
  var dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  var timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
  '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>' + title + '</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
  '<style>' +
  'body{font-family:Calibri,Segoe UI,Arial,sans-serif;padding:20px;color:#1e1b4d}' +
  '.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #4f46e5;padding-bottom:12px;margin-bottom:20px}' +
  '.header .logo{font-size:22px;font-weight:800;color:#4f46e5;letter-spacing:-0.03em}' +
  '.header .date{font-size:10px;color:#6b7280}' +
  '.summary-row{display:flex;gap:6px;margin-bottom:12px}' +
  '.summary-card{border:1px solid #e2e8f0;border-radius:6px;padding:8px 6px;text-align:center;flex:1;background:#faf8f5}' +
  '.summary-card .num{font-size:16px;font-weight:800;color:#1e1b4d}' +
  '.summary-card .lbl{font-size:7px;text-transform:uppercase;color:#6b7280;letter-spacing:.06em;font-weight:600;margin-top:2px}' +
  '.section-title{font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #4f46e5;padding-bottom:4px;margin:20px 0 8px}' +
  'table{border-collapse:collapse;width:100%;font-size:10px}' +
  'th{background:#4f46e5;color:#fff;padding:7px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;border:1px solid #3730a3}' +
  'td{padding:4px 8px;border:1px solid #d1d5db}' +
  'tr:nth-child(even){background:#f8fafc}' +
  '.footer{text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;margin-top:20px}' +
  '.sub-header{font-size:10px;font-weight:700;color:#4f46e5;padding:6px 0 2px}' +
  '</style></head><body>' +
  content +
  '</body></html>';
}

export function downloadXLS(filename, title, content) {
  var html = wrapHTML(title, content);
  var blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadITServicesXLS(items) {
  if (!items || items.length === 0) { alert('No IT services to export.'); return; }

  var sorted = [...items].sort(function(a, b) {
    var da = a.incidentDate || a.createdAt || '';
    var db = b.incidentDate || b.createdAt || '';
    return db.localeCompare(da);
  });

  var total = sorted.length;
  var open = sorted.filter(function(s) { return s.status === 'open' || s.status === 'in-progress'; }).length;
  var resolved = sorted.filter(function(s) { return s.status === 'resolved' || s.status === 'closed'; }).length;
  var critical = sorted.filter(function(s) { return s.severity === 'Critical' || s.severity === 'High'; }).length;
  var high = sorted.filter(function(s) { return s.severity === 'High'; }).length;
  var medium = sorted.filter(function(s) { return s.severity === 'Medium'; }).length;
  var low = sorted.filter(function(s) { return s.severity === 'Low'; }).length;

  var departments = {};
  sorted.forEach(function(s) {
    var d = s.department || 'Other';
    departments[d] = (departments[d] || 0) + 1;
  });
  var deptRows = Object.keys(departments).sort().map(function(d) {
    return '<tr><td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px">' + escapeHtml(d) + '</td><td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px;font-weight:700;text-align:center">' + departments[d] + '</td></tr>';
  }).join('');

  var rows = sorted.map(function(item, i) {
    var sev = item.severity || 'Medium';
    var stat = item.status || 'open';
    var sevColor = sev === 'Critical' ? '#dc2626' : sev === 'High' ? '#ea580c' : sev === 'Low' ? '#16a34a' : '#ca8a04';
    var statColor = stat === 'open' ? '#2563eb' : stat === 'in-progress' ? '#d97706' : stat === 'resolved' || stat === 'completed' ? '#059669' : '#6b7280';
    return '<tr>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;text-align:center;color:#6b7280">' + (i + 1) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;font-weight:600;color:#1e1b4d">' + escapeHtml(item.name) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.requestorName || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.department || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;font-weight:600;color:' + sevColor + ';text-align:center">' + escapeHtml(sev) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;font-weight:600;color:' + statColor + ';text-align:center">' + escapeHtml(stat) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml((item.incidentDate || '').replace('T', ' ')) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.category || 'General') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.cost || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;max-width:200px;word-wrap:break-word">' + escapeHtml(item.description || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;max-width:200px;word-wrap:break-word">' + escapeHtml(item.resolution || '\u2014') + '</td>' +
      '</tr>';
  }).join('');

  var now = new Date();
  var dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  var timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  var content =
    makeHeader('IT Services Report', dateStr, timeStr) +
    '<div class="summary-row">' +
      '<div class="summary-card"><div class="num">' + total + '</div><div class="lbl">Total Services</div></div>' +
      '<div class="summary-card" style="border-color:#bfdbfe;background:#eff6ff"><div class="num" style="color:#2563eb">' + open + '</div><div class="lbl">Open / In Progress</div></div>' +
      '<div class="summary-card" style="border-color:#a7f3d0;background:#ecfdf5"><div class="num" style="color:#059669">' + resolved + '</div><div class="lbl">Resolved / Closed</div></div>' +
      '<div class="summary-card" style="border-color:#fecaca;background:#fef2f2"><div class="num" style="color:#dc2626">' + critical + '</div><div class="lbl">Critical Severity</div></div>' +
    '</div>' +
    '<div class="summary-row">' +
      '<div class="summary-card"><div class="num">' + high + '</div><div class="lbl">High Severity</div></div>' +
      '<div class="summary-card"><div class="num">' + medium + '</div><div class="lbl">Medium Severity</div></div>' +
      '<div class="summary-card"><div class="num">' + low + '</div><div class="lbl">Low Severity</div></div>' +
      '<div class="summary-card"><div class="num">' + Object.keys(departments).length + '</div><div class="lbl">Departments Served</div></div>' +
    '</div>' +
    '<div class="section-title">Department Breakdown</div>' +
    '<table><thead><tr><th style="width:70%">Department</th><th style="width:30%">Service Requests</th></tr></thead><tbody>' + deptRows + '</tbody></table>' +
    '<div class="section-title">Detailed Service List</div>' +
    '<table><thead><tr>' +
      '<th style="width:30px">#</th><th>Service / Issue</th><th>Requestor</th><th>Department</th><th>Severity</th><th>Status</th><th>Date Reported</th><th>Category</th><th>Cost</th><th>Description</th><th>Resolution</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    makeFooter(dateStr);

  downloadXLS('IT_Services_Report_' + now.toISOString().split('T')[0] + '.xls', 'IT Services', content);
}

export function downloadITMaintenanceXLS(items) {
  if (!items || items.length === 0) { alert('No maintenance records to export.'); return; }

  var total = items.length;
  var scheduled = items.filter(function(m) { return m.status === 'scheduled'; }).length;
  var inProgress = items.filter(function(m) { return m.status === 'in-progress'; }).length;
  var completed = items.filter(function(m) { return m.status === 'completed'; }).length;
  var cancelled = items.filter(function(m) { return m.status === 'cancelled'; }).length;

  var freqCounts = {};
  items.forEach(function(m) {
    var f = m.frequency || 'Quarterly';
    freqCounts[f] = (freqCounts[f] || 0) + 1;
  });
  var freqRows = Object.keys(freqCounts).sort(function(a, b) {
    var order = { Weekly: 0, Monthly: 1, Quarterly: 2, Annually: 3 };
    return (order[a] || 99) - (order[b] || 99);
  }).map(function(f) {
    return '<tr><td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px">' + escapeHtml(f) + '</td><td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px;font-weight:700;text-align:center">' + freqCounts[f] + '</td></tr>';
  }).join('');

  var now = new Date();
  var dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  var timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  var rows = items.map(function(item, i) {
    var checks = item.checks || {};
    var equipName = item.equipment || item.asset || item.name || item.title || '\u2014';
    var equipInfo = [item.brand, item.model].filter(Boolean).join(' / ') || '\u2014';
    var dateVal = item.inspectionDate || item.scheduledDate || '\u2014';
    var stat = item.status || 'scheduled';
    var statColor = stat === 'scheduled' ? '#2563eb' : stat === 'in-progress' ? '#d97706' : stat === 'completed' ? '#059669' : '#6b7280';
    var checkParts = checks.checkParts ? '\u2713' : '\u2014';
    var cleanInt = checks.cleanInteriors ? '\u2713' : '\u2014';
    var operCond = checks.operatingCondition ? '\u2713' : '\u2014';
    var electWir = checks.electricalWires ? '\u2713' : '\u2014';
    var tonerLevel = item.tonerLevel || '\u2014';
    var tonerPct = item.tonerPercent != null ? ' (' + item.tonerPercent + '%)' : '';
    var tonerColor = tonerLevel === 'Full' ? '#059669' : tonerLevel === 'Medium' ? '#d97706' : tonerLevel === 'Low' ? '#dc2626' : tonerLevel === 'Empty' ? '#7f1d1d' : '#6b7280';
    return '<tr>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;text-align:center;color:#6b7280">' + (i + 1) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;font-weight:600;color:#1e1b4d">' + escapeHtml(equipName) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(equipInfo) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.serial || item.serialNumber || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.location || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.frequency || 'Quarterly') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.period || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(dateVal) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.inspectedBy || item.technician || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;font-weight:600;color:' + tonerColor + ';text-align:center">' + escapeHtml(tonerLevel + tonerPct) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;max-width:150px;word-wrap:break-word">' + escapeHtml(item.tonerNotes || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;font-weight:600;color:' + statColor + ';text-align:center">' + escapeHtml(stat) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;text-align:center">' + checkParts + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;text-align:center">' + cleanInt + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;text-align:center">' + operCond + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;text-align:center">' + electWir + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;max-width:200px;word-wrap:break-word">' + escapeHtml(item.description || '\u2014') + '</td>' +
      '</tr>';
  }).join('');

  var content =
    makeHeader('IT Maintenance Report', dateStr, timeStr) +
    '<div class="summary-row">' +
      '<div class="summary-card"><div class="num">' + total + '</div><div class="lbl">Total Records</div></div>' +
      '<div class="summary-card" style="border-color:#bfdbfe;background:#eff6ff"><div class="num" style="color:#2563eb">' + scheduled + '</div><div class="lbl">Scheduled</div></div>' +
      '<div class="summary-card" style="border-color:#fde68a;background:#fffbeb"><div class="num" style="color:#d97706">' + inProgress + '</div><div class="lbl">In Progress</div></div>' +
      '<div class="summary-card" style="border-color:#a7f3d0;background:#ecfdf5"><div class="num" style="color:#059669">' + completed + '</div><div class="lbl">Completed</div></div>' +
    '</div>' +
    '<div class="summary-row">' +
      '<div class="summary-card"><div class="num">' + cancelled + '</div><div class="lbl">Cancelled</div></div>' +
      '<div class="summary-card"><div class="num">' + Object.keys(freqCounts).length + '</div><div class="lbl">Frequencies</div></div>' +
      '<div class="summary-card"><div class="num">' + items.filter(function(m) { return m.checks && (m.checks.checkParts || m.checks.cleanInteriors || m.checks.operatingCondition || m.checks.electricalWires); }).length + '</div><div class="lbl">Inspections Done</div></div>' +
      '<div class="summary-card"><div class="num">' + items.filter(function(m) { return m.description && m.description.length > 0; }).length + '</div><div class="lbl">With Recommendations</div></div>' +
      '<div class="summary-card" style="border-color:#fde68a;background:#fffbeb"><div class="num" style="color:#d97706">' + items.filter(function(m) { return m.tonerLevel === 'Low' || m.tonerLevel === 'Empty'; }).length + '</div><div class="lbl">Low/Empty Toner</div></div>' +
    '</div>' +
    '<div class="section-title">Maintenance Frequency Breakdown</div>' +
    '<table><thead><tr><th style="width:70%">Frequency</th><th style="width:30%">Count</th></tr></thead><tbody>' + freqRows + '</tbody></table>' +
    '<div class="section-title">Toner / Ink Level Breakdown</div>' +
    '<table><thead><tr><th style="width:70%">Level</th><th style="width:30%">Count</th></tr></thead><tbody>' +
    ['Full','Medium','Low','Empty','N/A'].map(function(lvl) {
      var c = items.filter(function(m) { return (m.tonerLevel || 'Full') === lvl; }).length;
      return '<tr' + (lvl === 'Low' || lvl === 'Empty' ? ' style="background:#fef2f2"' : '') + '><td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px;font-weight:' + (lvl === 'Low' || lvl === 'Empty' ? '700' : '400') + '">' + lvl + '</td><td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px;font-weight:700;text-align:center">' + c + '</td></tr>';
    }).join('') +
    '</tbody></table>' +
    '<div class="section-title">Detailed Maintenance Records</div>' +
    '<table><thead><tr>' +
      '<th style="width:30px">#</th><th>Equipment</th><th>Brand / Model</th><th>Serial No.</th><th>Location</th><th>Frequency</th><th>Period</th><th>Date</th><th>Inspected By</th><th>Toner/Ink Level</th><th>Toner/Ink Notes</th><th>Status</th><th>Parts</th><th>Clean</th><th>Oper.</th><th>Elec.</th><th>Recommendations</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    makeFooter(dateStr);

  downloadXLS('IT_Maintenance_Report_' + now.toISOString().split('T')[0] + '.xls', 'IT Maintenance', content);
}

export function downloadITAccomplishmentsXLS(items) {
  if (!items || items.length === 0) { alert('No accomplishments to export.'); return; }

  var sorted = [...items].sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });

  var total = sorted.length;
  var pending = sorted.filter(function(a) { return a.status === 'pending'; }).length;
  var inProgress = sorted.filter(function(a) { return a.status === 'in-progress'; }).length;
  var completed = sorted.filter(function(a) { return a.status === 'completed' || a.status === 'done'; }).length;

  var techSupport = sorted.filter(function(a) { return a.category === 'Technical Support'; });
  var uploadEncoding = sorted.filter(function(a) { return a.category === 'Uploading/Encoding'; });
  var other = sorted.filter(function(a) { return a.category !== 'Technical Support' && a.category !== 'Uploading/Encoding'; });

  function makeRows(arr, includeDetails) {
    return arr.map(function(item, i) {
      var stat = item.status || 'pending';
      var statColor = stat === 'pending' ? '#d97706' : stat === 'in-progress' ? '#2563eb' : '#059669';
      var desc = item.description || '';
      if (desc.length > 100) desc = desc.substring(0, 100) + '...';
      var cols =
        '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;text-align:center;color:#6b7280">' + (i + 1) + '</td>' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.date || '\u2014') + '</td>' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;font-weight:600;color:#1e1b4d">' + escapeHtml(item.title || item.reportTitle || '\u2014') + '</td>' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;font-weight:600;color:' + statColor + ';text-align:center">' + escapeHtml(stat) + '</td>' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;max-width:250px;word-wrap:break-word">' + escapeHtml(desc) + '</td>';
      if (includeDetails) {
        cols +=
          (item.requestorName ? '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.requestorName) + '</td>' : '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">\u2014</td>') +
          (item.severity ? '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.severity) + '</td>' : '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">\u2014</td>') +
          (item.department ? '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.department) + '</td>' : '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">\u2014</td>') +
          (item.branch ? '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.branch) + '</td>' : '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">\u2014</td>') +
          (item.incidentDate ? '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.incidentDate.replace('T', ' ')) + '</td>' : '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">\u2014</td>') +
          (item.dateResolve ? '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.dateResolve.replace('T', ' ')) + '</td>' : '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">\u2014</td>') +
          (item.resolution ? '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.resolution) + '</td>' : '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">\u2014</td>') +
          '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;font-weight:600;color:#1e1b4d">Staff</td>';
      }
      return '<tr>' + cols + '</tr>';
    }).join('');
  }

  var now = new Date();
  var dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  var timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  var techRows = makeRows(techSupport, true);
  var uploadRows = makeRows(uploadEncoding, false);
  var otherRows = makeRows(other, false);

  var content =
    makeHeader('Daily Accomplishments Report', dateStr, timeStr) +
    '<div class="summary-row">' +
      '<div class="summary-card"><div class="num">' + total + '</div><div class="lbl">Total Entries</div></div>' +
      '<div class="summary-card" style="border-color:#fde68a;background:#fffbeb"><div class="num" style="color:#d97706">' + pending + '</div><div class="lbl">Pending</div></div>' +
      '<div class="summary-card" style="border-color:#bfdbfe;background:#eff6ff"><div class="num" style="color:#2563eb">' + inProgress + '</div><div class="lbl">In Progress</div></div>' +
      '<div class="summary-card" style="border-color:#a7f3d0;background:#ecfdf5"><div class="num" style="color:#059669">' + completed + '</div><div class="lbl">Completed</div></div>' +
    '</div>' +
    '<div class="section-title">Technical Support (' + techSupport.length + ' entries)</div>' +
    (techSupport.length > 0
      ? '<table><thead><tr><th style="width:30px">#</th><th>Date</th><th>Title</th><th>Status</th><th>Description</th><th>Requestor</th><th>Severity</th><th>Department</th><th>Branch</th><th>Incident Date</th><th>Date Resolve</th><th>Resolution</th><th>IT Staff</th></tr></thead><tbody>' + techRows + '</tbody></table>'
      : '<div class="sub-header">No Technical Support entries.</div>') +
    '<div class="section-title">Uploading/Encoding (' + uploadEncoding.length + ' entries)</div>' +
    (uploadEncoding.length > 0
      ? '<table><thead><tr><th style="width:30px">#</th><th>Date</th><th>Title</th><th>Status</th><th>Description</th></tr></thead><tbody>' + uploadRows + '</tbody></table>'
      : '<div class="sub-header">No Uploading/Encoding entries.</div>') +
    (other.length > 0
      ? '<div class="section-title">Other (' + other.length + ' entries)</div>' +
        '<table><thead><tr><th style="width:30px">#</th><th>Date</th><th>Title</th><th>Status</th><th>Description</th></tr></thead><tbody>' + otherRows + '</tbody></table>'
      : '') +
    makeFooter(dateStr);

  downloadXLS('Daily_Accomplishments_' + now.toISOString().split('T')[0] + '.xls', 'Daily Accomplishments', content);
}

export function downloadTripsXLS(items) {
  if (!items || items.length === 0) { alert('No trips to export.'); return; }

  var total = items.length;
  var active = items.filter(function(t) { return t.status === 'active'; }).length;
  var completed = items.filter(function(t) { return t.status === 'completed'; }).length;
  var cancelled = items.filter(function(t) { return t.status === 'cancelled'; }).length;

  var destCounts = {};
  items.forEach(function(t) {
    var d = t.destination || 'Unknown';
    destCounts[d] = (destCounts[d] || 0) + 1;
  });

  var now = new Date();
  var dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  var timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  var rows = items.map(function(item, i) {
    var statusColors = { active: '#2563eb', completed: '#059669', cancelled: '#dc2626', pending: '#d97706' };
    return '<tr>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;text-align:center;color:#6b7280">' + (i + 1) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;font-weight:600;color:#1e1b4d">' + escapeHtml(item.name) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.requestor || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.destination || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.date || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.assignedVan || item.van || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.assignedDriver || item.driver || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.purpose || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;font-weight:600;color:' + (statusColors[item.status] || '#6b7280') + ';text-align:center">' + escapeHtml(item.status || 'active') + '</td>' +
      '</tr>';
  }).join('');

  var content =
    makeHeader('Trips Report', dateStr, timeStr) +
    '<div class="summary-row">' +
      '<div class="summary-card"><div class="num">' + total + '</div><div class="lbl">Total Trips</div></div>' +
      '<div class="summary-card" style="border-color:#bfdbfe;background:#eff6ff"><div class="num" style="color:#2563eb">' + active + '</div><div class="lbl">Active</div></div>' +
      '<div class="summary-card" style="border-color:#a7f3d0;background:#ecfdf5"><div class="num" style="color:#059669">' + completed + '</div><div class="lbl">Completed</div></div>' +
      '<div class="summary-card" style="border-color:#fecaca;background:#fef2f2"><div class="num" style="color:#dc2626">' + cancelled + '</div><div class="lbl">Cancelled</div></div>' +
    '</div>' +
    '<div class="section-title">Top Destinations</div>' +
    '<table><thead><tr><th style="width:70%">Destination</th><th style="width:30%">Trips</th></tr></thead><tbody>' +
    Object.keys(destCounts).sort(function(a, b) { return destCounts[b] - destCounts[a]; }).slice(0, 10).map(function(d) {
      return '<tr><td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px">' + escapeHtml(d) + '</td><td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px;font-weight:700;text-align:center">' + destCounts[d] + '</td></tr>';
    }).join('') +
    '</tbody></table>' +
    '<div class="section-title">Detailed Trip List</div>' +
    '<table><thead><tr>' +
      '<th style="width:30px">#</th><th>Trip Name</th><th>Requestor</th><th>Destination</th><th>Date</th><th>Vehicle</th><th>Driver</th><th>Purpose</th><th>Status</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    makeFooter(dateStr);

  downloadXLS('Trips_Report_' + now.toISOString().split('T')[0] + '.xls', 'Trips Report', content);
}

export function downloadTasksXLS(items) {
  if (!items || items.length === 0) { alert('No tasks to export.'); return; }

  var total = items.length;
  var todo = items.filter(function(t) { return t.status === 'todo'; }).length;
  var inProgress = items.filter(function(t) { return t.status === 'in_progress' || t.status === 'in-progress'; }).length;
  var done = items.filter(function(t) { return t.status === 'done' || t.status === 'completed'; }).length;

  var now = new Date();
  var dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  var timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  var rows = items.map(function(item, i) {
    var statusColors = { todo: '#6b7280', in_progress: '#d97706', 'in-progress': '#d97706', done: '#059669', completed: '#059669' };
    var priorityColors = { High: '#dc2626', Medium: '#ca8a04', Low: '#16a34a' };
    return '<tr>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;text-align:center;color:#6b7280">' + (i + 1) + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;font-weight:600;color:#1e1b4d">' + escapeHtml(item.title || item.name || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.priority || 'Medium') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;font-weight:600;color:' + (statusColors[item.status] || '#6b7280') + ';text-align:center">' + escapeHtml(item.status || 'todo') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px">' + escapeHtml(item.assignedBy || '\u2014') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid #d1d5db;font-size:10px;max-width:250px;word-wrap:break-word">' + escapeHtml(item.desc || item.description || '\u2014') + '</td>' +
      '</tr>';
  }).join('');

  var content =
    makeHeader('Tasks Report', dateStr, timeStr) +
    '<div class="summary-row">' +
      '<div class="summary-card"><div class="num">' + total + '</div><div class="lbl">Total Tasks</div></div>' +
      '<div class="summary-card" style="border-color:#fde68a;background:#fffbeb"><div class="num" style="color:#d97706">' + todo + '</div><div class="lbl">To Do</div></div>' +
      '<div class="summary-card" style="border-color:#bfdbfe;background:#eff6ff"><div class="num" style="color:#2563eb">' + inProgress + '</div><div class="lbl">In Progress</div></div>' +
      '<div class="summary-card" style="border-color:#a7f3d0;background:#ecfdf5"><div class="num" style="color:#059669">' + done + '</div><div class="lbl">Done</div></div>' +
    '</div>' +
    '<div class="section-title">Detailed Task List</div>' +
    '<table><thead><tr>' +
      '<th style="width:30px">#</th><th>Task Title</th><th>Priority</th><th>Status</th><th>Assigned By</th><th>Description</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    makeFooter(dateStr);

  downloadXLS('Tasks_Report_' + now.toISOString().split('T')[0] + '.xls', 'Tasks Report', content);
}
