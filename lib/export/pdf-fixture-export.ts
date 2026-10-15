import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { KnockoutBracket, KnockoutMatch } from '@/types/knockout';

export interface PDFExportOptions {
  tournamentTitle?: string;
  organizerName?: string;
  tournamentDate?: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Format participant or placeholder into a clean text string for printing
 */
function formatSideText(side: KnockoutMatch['sideA']): string {
  if (side.participant) {
    const teamName = side.participant.team.replace(' Team', '');
    return `${teamName} — ${side.participant.displayName}`;
  }
  return side.placeholderText || 'TBD';
}

/**
 * Format match result string
 */
function formatResultText(match: KnockoutMatch): string {
  if (match.isByeMatch) {
    const adv = match.sideA.participant || match.sideB.participant;
    return `BYE (Advances: ${adv?.displayName || 'TBD'})`;
  }

  if (match.status === 'Completed' || match.status === 'Walkover') {
    const winnerName = match.sideA.isWinner
      ? match.sideA.participant?.displayName || 'Side A'
      : match.sideB.participant?.displayName || 'Side B';
    const scoreStr = match.sideA.score ? ` (${match.sideA.score})` : '';
    const walkoverStr = match.status === 'Walkover' ? ' [Walkover]' : '';
    return `Won by ${winnerName}${scoreStr}${walkoverStr}`;
  }

  // Blank line for manual scoring on printed paper
  return '____________________';
}

/**
 * Generates an official printable PDF Fixture List for a single bracket (Singles or Doubles)
 */
export function generateKnockoutFixtureListPDF(
  bracket: KnockoutBracket,
  options: PDFExportOptions = {}
): jsPDF {
  const {
    tournamentTitle = 'BADMINTON TOURNAMENT',
    organizerName = 'Solidpro Team Studio Sports Championship',
    tournamentDate = new Date().toISOString().split('T')[0],
    orientation = 'portrait',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 18;

  // Header Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(tournamentTitle.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });

  currentY += 7;
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text(`${bracket.category.toUpperCase()} KNOCKOUT FIXTURE LIST`, pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`${organizerName}  •  Scheduled Date: ${tournamentDate}`, pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 3;
  // Decorative separator line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);

  currentY += 8;

  // Render each round
  bracket.rounds.forEach((round) => {
    // Check if we need a page break before starting a new round header
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }

    // Round Heading
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(round.roundName.toUpperCase(), 14, currentY);

    currentY += 2;

    // Table rows for this round
    const tableBody = round.matches.map((match) => [
      match.id,
      formatSideText(match.sideA),
      formatSideText(match.sideB),
      `${match.court} (${match.scheduledTime})`,
      formatResultText(match),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Match', 'Team / Side A', 'Opponent / Side B', 'Court & Time', 'Result / Score']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249], // slate-100 (ink-friendly)
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 9,
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      bodyStyles: {
        textColor: [30, 41, 59],
        fontSize: 8.5,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 50 },
        3: { cellWidth: 28, halign: 'center', fontSize: 8 },
        4: { cellWidth: 'auto', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Page footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Team Studio Badminton Championship  •  Notice Board Official Fixture List  •  Page ${doc.internal.pages.length - 1}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      },
    });

    // Update currentY to position below the rendered table
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;
  });

  // Champion Section
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('TOURNAMENT CHAMPION', 14, currentY);

  currentY += 6;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, pageWidth - 28, 16, 2, 2, 'FD');

  doc.setFontSize(10);
  if (bracket.champion) {
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(
      `★ CHAMPION: ${bracket.champion.displayName} (${bracket.champion.team}) ★`,
      pageWidth / 2,
      currentY + 10,
      { align: 'center' }
    );
  } else {
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Champion: __________________________________________________',
      20,
      currentY + 10
    );
  }

  return doc;
}

/**
 * Generates Combined Fixture List PDF containing both Singles and Doubles Knockout Brackets
 */
export function generateCombinedKnockoutFixtureListPDF(
  singlesBracket: KnockoutBracket | null,
  doublesBracket: KnockoutBracket | null,
  options: PDFExportOptions = {}
): jsPDF {
  const {
    tournamentTitle = 'BADMINTON TOURNAMENT',
    organizerName = 'Solidpro Team Studio Sports Championship',
    tournamentDate = new Date().toISOString().split('T')[0],
    orientation = 'portrait',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 18;

  // Master Title Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(tournamentTitle.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });

  currentY += 7;
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text('COMPLETE KNOCKOUT FIXTURE LIST (SINGLES & DOUBLES)', pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${organizerName}  •  Scheduled Date: ${tournamentDate}`, pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 3;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 8;

  const renderBracketSection = (bracket: KnockoutBracket, titlePrefix: string) => {
    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(titlePrefix.toUpperCase(), 14, currentY);
    currentY += 6;

    bracket.rounds.forEach((round) => {
      if (currentY > pageHeight - 45) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`${round.roundName.toUpperCase()}`, 14, currentY);
      currentY += 2;

      const tableBody = round.matches.map((match) => [
        match.id,
        formatSideText(match.sideA),
        formatSideText(match.sideB),
        `${match.court} (${match.scheduledTime})`,
        formatResultText(match),
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Match', 'Team / Side A', 'Opponent / Side B', 'Court & Time', 'Result / Score']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8.5,
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
        },
        bodyStyles: {
          textColor: [30, 41, 59],
          fontSize: 8,
          cellPadding: 2.8,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
          3: { cellWidth: 28, halign: 'center', fontSize: 7.5 },
          4: { cellWidth: 'auto', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
      });

      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 6;
    });

    // Champion card for section
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${bracket.category.toUpperCase()} CHAMPION:`, 14, currentY);

    if (bracket.champion) {
      doc.setTextColor(5, 150, 105);
      doc.text(
        `★ ${bracket.champion.displayName} (${bracket.champion.team}) ★`,
        65,
        currentY
      );
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('____________________________________________________', 65, currentY);
    }

    currentY += 12;
  };

  if (singlesBracket) {
    renderBracketSection(singlesBracket, '1. Singles Knockout Championship');
  }

  if (doublesBracket) {
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }
    renderBracketSection(doublesBracket, '2. Doubles Knockout Championship');
  }

  // Add footer to all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Team Studio Badminton Championship  •  Official Tournament Fixtures  •  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Triggers browser print view for direct printing onto a physical notice board
 */
export function printKnockoutFixtureList(
  bracket: KnockoutBracket,
  options: PDFExportOptions = {}
): void {
  const {
    tournamentTitle = 'BADMINTON TOURNAMENT',
    organizerName = 'Solidpro Team Studio Sports Championship',
    tournamentDate = new Date().toISOString().split('T')[0],
  } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the printable fixture list.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${tournamentTitle} - ${bracket.category} Knockout Fixture List</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.4;
          margin: 0;
          padding: 20px;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 12px;
        }
        .title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 14px;
          font-weight: 700;
          color: #1e40af;
          margin: 0 0 4px 0;
          text-transform: uppercase;
        }
        .meta {
          font-size: 11px;
          color: #64748b;
          margin: 0;
        }
        .round-section {
          margin-bottom: 24px;
          page-break-inside: avoid;
        }
        .round-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #e2e8f0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-bottom: 12px;
        }
        th {
          background-color: #f1f5f9;
          text-align: left;
          padding: 8px 10px;
          font-weight: 700;
          border: 1px solid #cbd5e1;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        td {
          padding: 8px 10px;
          border: 1px solid #cbd5e1;
        }
        .match-id {
          font-family: monospace;
          font-weight: 700;
          text-align: center;
          width: 60px;
        }
        .court {
          text-align: center;
          font-size: 11px;
          color: #475569;
          width: 110px;
        }
        .result-col {
          font-weight: 700;
          width: 180px;
        }
        .champion-box {
          margin-top: 30px;
          padding: 16px;
          border: 2px dashed #94a3b8;
          border-radius: 8px;
          background: #f8fafc;
          text-align: center;
          font-size: 14px;
          font-weight: 800;
          page-break-inside: avoid;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }
        @media print {
          body {
            padding: 0;
          }
          button {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 16px;">
        <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
          🖨️ Print Fixture List
        </button>
      </div>

      <div class="header">
        <h1 class="title">${tournamentTitle}</h1>
        <h2 class="subtitle">${bracket.category} Knockout Fixture List</h2>
        <p class="meta">${organizerName} • Scheduled Date: ${tournamentDate}</p>
      </div>

      ${bracket.rounds
        .map(
          (round) => `
        <div class="round-section">
          <div class="round-title">${round.roundName}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">Match</th>
                <th>Team / Side A</th>
                <th>Opponent / Side B</th>
                <th style="width: 110px; text-align: center;">Court &amp; Time</th>
                <th style="width: 180px;">Result / Score</th>
              </tr>
            </thead>
            <tbody>
              ${round.matches
                .map(
                  (match) => `
                <tr>
                  <td class="match-id">${match.id}</td>
                  <td><strong>${formatSideText(match.sideA)}</strong></td>
                  <td><strong>${formatSideText(match.sideB)}</strong></td>
                  <td class="court">${match.court}<br><small>${match.scheduledTime}</small></td>
                  <td class="result-col">${formatResultText(match)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
        )
        .join('')}

      <div class="champion-box">
        ${
          bracket.champion
            ? `🏆 CHAMPION: ${bracket.champion.displayName} (${bracket.champion.team})`
            : `Champion: ____________________________________________________`
        }
      </div>

      <div class="footer">
        Team Studio Badminton Championship • Official Notice Board Tournament Schedule
      </div>

      <script>
        window.onload = function() {
          // Optional auto-print trigger
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Direct download helper for single bracket fixture list PDF
 */
export function downloadKnockoutFixtureListPDF(
  bracket: KnockoutBracket,
  options: PDFExportOptions = {},
  filename?: string
): void {
  const doc = generateKnockoutFixtureListPDF(bracket, options);
  const outName =
    filename || `badminton_${bracket.category.toLowerCase()}_fixture_list.pdf`;
  doc.save(outName);
}

/**
 * Direct download helper for combined tournament fixture list PDF
 */
export function downloadCombinedKnockoutFixtureListPDF(
  singlesBracket: KnockoutBracket | null,
  doublesBracket: KnockoutBracket | null,
  options: PDFExportOptions = {},
  filename?: string
): void {
  const doc = generateCombinedKnockoutFixtureListPDF(singlesBracket, doublesBracket, options);
  const outName = filename || 'badminton_tournament_combined_fixture_list.pdf';
  doc.save(outName);
}

/**
 * Triggers browser print view for both Singles & Doubles together
 */
export function printCombinedKnockoutFixtureList(
  singlesBracket: KnockoutBracket | null,
  doublesBracket: KnockoutBracket | null,
  options: PDFExportOptions = {}
): void {
  const {
    tournamentTitle = 'BADMINTON TOURNAMENT',
    organizerName = 'Solidpro Team Studio Sports Championship',
    tournamentDate = new Date().toISOString().split('T')[0],
  } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the printable fixture list.');
    return;
  }

  const renderSectionHtml = (bracket: KnockoutBracket) => `
    <div style="margin-top: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 6px;">
      <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #1e40af; text-transform: uppercase;">
        ${bracket.category} Knockout Fixture List
      </h2>
    </div>
    ${bracket.rounds
      .map(
        (round) => `
      <div class="round-section">
        <div class="round-title">${round.roundName}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">Match</th>
              <th>Team / Side A</th>
              <th>Opponent / Side B</th>
              <th style="width: 110px; text-align: center;">Court &amp; Time</th>
              <th style="width: 180px;">Result / Score</th>
            </tr>
          </thead>
          <tbody>
            ${round.matches
              .map(
                (match) => `
              <tr>
                <td class="match-id">${match.id}</td>
                <td><strong>${formatSideText(match.sideA)}</strong></td>
                <td><strong>${formatSideText(match.sideB)}</strong></td>
                <td class="court">${match.court}<br><small>${match.scheduledTime}</small></td>
                <td class="result-col">${formatResultText(match)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
      )
      .join('')}
    <div class="champion-box">
      ${
        bracket.champion
          ? `🏆 CHAMPION: ${bracket.champion.displayName} (${bracket.champion.team})`
          : `${bracket.category} Champion: ____________________________________________________`
      }
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${tournamentTitle} - Complete Tournament Fixtures</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.4;
          margin: 0;
          padding: 20px;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 12px;
        }
        .title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          margin: 0 0 4px 0;
        }
        .meta {
          font-size: 11px;
          color: #64748b;
          margin: 0;
        }
        .round-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .round-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #e2e8f0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-bottom: 12px;
        }
        th {
          background-color: #f1f5f9;
          text-align: left;
          padding: 8px 10px;
          font-weight: 700;
          border: 1px solid #cbd5e1;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        td {
          padding: 8px 10px;
          border: 1px solid #cbd5e1;
        }
        .match-id {
          font-family: monospace;
          font-weight: 700;
          text-align: center;
          width: 60px;
        }
        .court {
          text-align: center;
          font-size: 11px;
          color: #475569;
          width: 110px;
        }
        .result-col {
          font-weight: 700;
          width: 180px;
        }
        .champion-box {
          margin-top: 20px;
          margin-bottom: 28px;
          padding: 14px;
          border: 2px dashed #94a3b8;
          border-radius: 8px;
          background: #f8fafc;
          text-align: center;
          font-size: 13px;
          font-weight: 800;
          page-break-inside: avoid;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }
        @media print {
          body {
            padding: 0;
          }
          button {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 16px;">
        <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
          🖨️ Print Complete Tournament
        </button>
      </div>

      <div class="header">
        <h1 class="title">${tournamentTitle}</h1>
        <h2 class="subtitle">Complete Official Tournament Fixture List</h2>
        <p class="meta">${organizerName} • Scheduled Date: ${tournamentDate}</p>
      </div>

      ${singlesBracket ? renderSectionHtml(singlesBracket) : ''}
      ${doublesBracket ? renderSectionHtml(doublesBracket) : ''}

      <div class="footer">
        Team Studio Badminton Championship • Official Notice Board Tournament Schedule
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
