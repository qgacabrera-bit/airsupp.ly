/**
 * AirSupp.ly - Client-Side Environmental Health Export Utilities
 * ==============================================================
 * Provides professional client-side document and data exports:
 *  1. exportToPDF: Official branded Philippine Air Quality Historical Report via jsPDF & autoTable
 *  2. exportToExcel: Formatted multi-column spreadsheet via SheetJS (xlsx)
 *  3. exportToCSV: Comma-separated values export for data analysis & modeling
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Generates and downloads a branded PDF Air Quality Historical Report
 * @param {Array} data - Array of telemetry history points
 * @param {Object} metadata - { city, startDate, endDate }
 */
export function exportToPDF(data = [], { city = 'All Cities', startDate = '', endDate = '' } = {}) {
  if (!data || data.length === 0) {
    alert('No telemetry data available to export.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8);

  // Compute summary statistics
  const count = data.length;
  const avgPM25 = (data.reduce((acc, cur) => acc + (cur.pm25 || 0), 0) / count).toFixed(1);
  const avgAQI = Math.round(data.reduce((acc, cur) => acc + (cur.aqi || 0), 0) / count);
  const maxAQI = Math.max(...data.map(d => d.aqi || 0));
  const minAQI = Math.min(...data.map(d => d.aqi || 0));

  // --- Document Header ---
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, doc.internal.pageSize.width, 70, 'F');

  // Title & Brand
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('AirSupp.ly', 40, 38);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(56, 189, 248); // Cyan-400
  doc.text('All Out of Smog | Philippine Real-Time Environmental Health Platform', 150, 36);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`Generated: ${dateStr} ${timeStr} UTC`, doc.internal.pageSize.width - 200, 36);

  // --- Report Subheading & Metadata Box ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Air Quality Historical Report — ${city}`, 40, 95);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const rangeText = startDate || endDate
    ? `Date Filter: ${startDate || 'Earliest'} to ${endDate || 'Latest'}`
    : `Date Filter: Continuous 15s Streaming Window (Last ${count} cycles)`;
  doc.text(rangeText, 40, 110);

  // Summary Cards Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(40, 120, doc.internal.pageSize.width - 80, 42, 4, 4, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  const colWidth = (doc.internal.pageSize.width - 80) / 4;
  doc.text(`Total Records: ${count}`, 55, 145);
  doc.text(`Average PM2.5: ${avgPM25} ug/m3`, 55 + colWidth, 145);
  doc.text(`Average AQI: ${avgAQI}`, 55 + colWidth * 2, 145);
  doc.text(`AQI Peak Range: ${minAQI} - ${maxAQI}`, 55 + colWidth * 3, 145);

  // --- Data Table ---
  const tableRows = data.map((item) => {
    const timeFormatted = item.window_start
      ? item.window_start.replace('T', ' ').replace('Z', '')
      : 'N/A';
    return [
      timeFormatted,
      item.city || city,
      item.aqi ?? 'N/A',
      item.category || 'N/A',
      item.pm25 !== undefined ? Number(item.pm25).toFixed(1) : 'N/A',
      item.pm10 !== undefined ? Number(item.pm10).toFixed(1) : 'N/A',
      item.temperature !== undefined ? `${Number(item.temperature).toFixed(1)} C` : 'N/A',
      item.humidity !== undefined ? `${Number(item.humidity).toFixed(1)} %` : 'N/A'
    ];
  });

  autoTable(doc, {
    startY: 175,
    margin: { left: 40, right: 40, bottom: 40 },
    head: [[
      'Timestamp (UTC)',
      'City',
      'AQI',
      'Category',
      'PM2.5 (ug/m3)',
      'PM10 (ug/m3)',
      'Temp',
      'Humidity'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 120 },
      1: { halign: 'left', cellWidth: 80 },
      3: { cellWidth: 120 }
    },
    didDrawPage: (dataInfo) => {
      // Footer page numbering
      const pageStr = `Page ${dataInfo.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'AirSupp.ly 🇵🇭 — DENR & EPA Standard Breakpoints',
        40,
        doc.internal.pageSize.height - 20
      );
      doc.text(
        pageStr,
        doc.internal.pageSize.width - 60,
        doc.internal.pageSize.height - 20
      );
    }
  });

  const sanitizedCity = city.replace(/\s+/g, '_');
  doc.save(`AirSupply_${sanitizedCity}_${dateStr}.pdf`);
}

/**
 * Prepares clean human-readable records for Excel and CSV exports
 */
function prepareFormattedRows(data = []) {
  return data.map((item) => ({
    'Timestamp (UTC)': item.window_start || item.updated_at || '',
    'City': item.city || '',
    'Air Quality Index (AQI)': item.aqi ?? '',
    'AQI Category': item.category || '',
    'PM2.5 (ug/m3)': item.pm25 !== undefined ? Number(item.pm25).toFixed(1) : '',
    'PM10 (ug/m3)': item.pm10 !== undefined ? Number(item.pm10).toFixed(1) : '',
    'Temperature (C)': item.temperature !== undefined ? Number(item.temperature).toFixed(1) : '',
    'Relative Humidity (%)': item.humidity !== undefined ? Number(item.humidity).toFixed(1) : '',
    'Health Advisory': item.health_advisory || ''
  }));
}

/**
 * Exports data to Microsoft Excel (.xlsx) workbook
 * @param {Array} data - Array of telemetry history points
 * @param {Object} metadata - { city }
 */
export function exportToExcel(data = [], { city = 'All_Cities' } = {}) {
  if (!data || data.length === 0) {
    alert('No telemetry data available to export.');
    return;
  }

  const cleanRows = prepareFormattedRows(data);
  const worksheet = XLSX.utils.json_to_sheet(cleanRows);

  // Auto-fit column widths
  const colProps = Object.keys(cleanRows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...cleanRows.slice(0, 50).map((r) => String(r[key] || '').length)
    );
    return { wch: Math.min(maxLen + 3, 40) };
  });
  worksheet['!cols'] = colProps;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Air Quality History');

  const sanitizedCity = city.replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `AirSupply_${sanitizedCity}_${dateStr}.xlsx`);
}

/**
 * Exports data to CSV (.csv) file
 * @param {Array} data - Array of telemetry history points
 * @param {Object} metadata - { city }
 */
export function exportToCSV(data = [], { city = 'All_Cities' } = {}) {
  if (!data || data.length === 0) {
    alert('No telemetry data available to export.');
    return;
  }

  const cleanRows = prepareFormattedRows(data);
  const worksheet = XLSX.utils.json_to_sheet(cleanRows);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const sanitizedCity = city.replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  link.setAttribute('href', url);
  link.setAttribute('download', `AirSupply_${sanitizedCity}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
