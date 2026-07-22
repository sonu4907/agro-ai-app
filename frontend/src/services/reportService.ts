import { jsPDF } from 'jspdf';
import type { AgroAIResponse } from '../types';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

let devanagariRegularBase64: string | null = null;
let devanagariBoldBase64: string | null = null;

async function loadDevanagariFonts(): Promise<{ regular: string; bold: string } | null> {
  if (devanagariRegularBase64 && devanagariBoldBase64) {
    return { regular: devanagariRegularBase64, bold: devanagariBoldBase64 };
  }

  const cachedReg = localStorage.getItem('agro_font_devanagari_regular');
  const cachedBold = localStorage.getItem('agro_font_devanagari_bold');
  if (cachedReg && cachedBold) {
    devanagariRegularBase64 = cachedReg;
    devanagariBoldBase64 = cachedBold;
    return { regular: cachedReg, bold: cachedBold };
  }

  try {
    const regUrl = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf';
    const boldUrl = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf';

    const [regRes, boldRes] = await Promise.all([
      fetch(regUrl),
      fetch(boldUrl)
    ]);

    if (!regRes.ok || !boldRes.ok) throw new Error('Failed to fetch font files');

    const [regBuffer, boldBuffer] = await Promise.all([
      regRes.arrayBuffer(),
      boldRes.arrayBuffer()
    ]);

    const regB64 = arrayBufferToBase64(regBuffer);
    const boldB64 = arrayBufferToBase64(boldBuffer);

    localStorage.setItem('agro_font_devanagari_regular', regB64);
    localStorage.setItem('agro_font_devanagari_bold', boldB64);

    devanagariRegularBase64 = regB64;
    devanagariBoldBase64 = boldB64;

    return { regular: regB64, bold: boldB64 };
  } catch (e) {
    console.error('Failed loading Devanagari fonts:', e);
    return null;
  }
}

export function cleanText(txt: string | undefined | null): string {
  if (!txt) return '';
  // Removes standard emoji ranges and symbols that corrupt standard fonts in jsPDF
  return txt.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
}

export const imageUriToBase64 = (uri: string): Promise<string> => {
  return new Promise((resolve) => {
    if (uri.startsWith('data:')) {
      resolve(uri);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve('');
      }
    };
    img.onerror = () => {
      resolve('');
    };
    img.src = uri;
  });
};

export const generatePDFDocument = async (res: AgroAIResponse, preview: string | null) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isHealthy = res.health?.is_healthy ?? true;
  const brandColor = isHealthy ? [30, 61, 47] : [107, 45, 45];

  const textToCheck = [
    res.plant?.common_name || '',
    res.health?.disease || '',
    res.recommendation || '',
    res.disease_information?.description || ''
  ].join(' ');

  const useDevanagari = /[\u0900-\u097F]/.test(textToCheck);
  let fontNormal = 'helvetica';
  let fontBold = 'helvetica';
  let fontItalic = 'helvetica';

  if (useDevanagari) {
    const fonts = await loadDevanagariFonts();
    if (fonts) {
      try {
        doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', fonts.regular);
        doc.addFont('NotoSansDevanagari-Regular.ttf', 'Devanagari', 'normal');
        doc.addFileToVFS('NotoSansDevanagari-Bold.ttf', fonts.bold);
        doc.addFont('NotoSansDevanagari-Bold.ttf', 'Devanagari', 'bold');
        fontNormal = 'Devanagari';
        fontBold = 'Devanagari';
        fontItalic = 'Devanagari';
      } catch (e) {
        console.error("Failed adding Devanagari fonts to jsPDF:", e);
      }
    }
  }

  // Header banner
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(0, 0, 210, 35, 'F');

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontBold, 'bold');
  doc.setFontSize(22);
  doc.text('AgroAI Plant Health Report', 15, 22);

  doc.setFont(fontNormal, 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 15, 29);

  let yCursor = 48;
  const pageHeight = 297;
  const margin = 15;

  const checkPageBreak = (neededHeight: number) => {
    if (yCursor + neededHeight > pageHeight - margin) {
      doc.addPage();
      yCursor = 20;
    }
  };

  // Embed Image & Plant Details
  let base64Img = '';
  if (preview) {
    try {
      base64Img = await imageUriToBase64(preview);
    } catch (e) {
      console.error("Failed to convert image for PDF:", e);
    }
  }

  if (base64Img) {
    checkPageBreak(55);
    doc.setDrawColor(200, 200, 200);
    doc.rect(14.5, yCursor - 0.5, 51, 51);
    doc.addImage(base64Img, 'JPEG', 15, yCursor, 50, 50);

    // Metadata
    doc.setTextColor(50, 50, 50);
    doc.setFont(fontBold, 'bold');
    doc.setFontSize(14);
    doc.text('Plant Details', 75, yCursor + 5);

    doc.setFontSize(10);
    doc.text('Common Name: ', 75, yCursor + 13);
    doc.setFont(fontNormal, 'normal');
    doc.text(cleanText(res.plant?.common_name || 'Unknown'), 105, yCursor + 13);

    doc.setFont(fontBold, 'bold');
    doc.text('Scientific Name: ', 75, yCursor + 20);
    doc.setFont(fontItalic, 'italic');
    doc.text(cleanText(res.plant?.scientific_name || 'N/A'), 105, yCursor + 20);

    doc.setFont(fontBold, 'bold');
    doc.text('Family: ', 75, yCursor + 27);
    doc.setFont(fontNormal, 'normal');
    doc.text(cleanText(res.plant?.family || 'N/A'), 105, yCursor + 27);

    doc.setFont(fontBold, 'bold');
    doc.text('Crop Type: ', 75, yCursor + 34);
    doc.setFont(fontNormal, 'normal');
    doc.text(cleanText(res.plant?.crop_type || 'N/A'), 105, yCursor + 34);

    doc.setFont(fontBold, 'bold');
    doc.text('Growth Stage: ', 75, yCursor + 41);
    doc.setFont(fontNormal, 'normal');
    doc.text(cleanText(res.plant?.growth_stage || 'N/A'), 105, yCursor + 41);

    yCursor += 56;
  } else {
    checkPageBreak(40);
    doc.setTextColor(50, 50, 50);
    doc.setFont(fontBold, 'bold');
    doc.setFontSize(14);
    doc.text('Plant Details', 15, yCursor + 5);

    doc.setFontSize(10);
    doc.text('Common Name: ', 15, yCursor + 13);
    doc.setFont(fontNormal, 'normal');
    doc.text(cleanText(res.plant?.common_name || 'Unknown'), 45, yCursor + 13);

    doc.setFont(fontBold, 'bold');
    doc.text('Scientific Name: ', 15, yCursor + 20);
    doc.setFont(fontItalic, 'italic');
    doc.text(cleanText(res.plant?.scientific_name || 'N/A'), 45, yCursor + 20);

    doc.setFont(fontBold, 'bold');
    doc.text('Family: ', 15, yCursor + 27);
    doc.setFont(fontNormal, 'normal');
    doc.text(cleanText(res.plant?.family || 'N/A'), 45, yCursor + 27);

    doc.setFont(fontBold, 'bold');
    doc.text('Crop Type: ', 15, yCursor + 34);
    doc.setFont(fontNormal, 'normal');
    doc.text(cleanText(res.plant?.crop_type || 'N/A'), 45, yCursor + 34);

    yCursor += 40;
  }

  // Health Assessment
  checkPageBreak(30);
  doc.setDrawColor(220, 220, 220);
  doc.line(15, yCursor, 195, yCursor);
  yCursor += 8;

  doc.setFont(fontBold, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text('Health Assessment', 15, yCursor);
  yCursor += 8;

  doc.setFillColor(isHealthy ? 220 : 253, isHealthy ? 252 : 230, isHealthy ? 231 : 230);
  doc.rect(15, yCursor, 180, 15, 'F');

  doc.setFontSize(11);
  doc.setTextColor(isHealthy ? 4 : 120, isHealthy ? 120 : 38, isHealthy ? 87 : 38);
  const statusText = isHealthy 
    ? `HEALTHY (Confidence: ${Math.round((res.health?.confidence || 0) * 100)}%)` 
    : `DISEASED: ${cleanText(res.health?.disease || 'Unknown Disease')} (Severity: ${res.health?.severity || 'N/A'}, Confidence: ${Math.round((res.health?.confidence || 0) * 100)}%)`;
  doc.text(statusText, 20, yCursor + 9.5);
  yCursor += 22;

  // Disease Breakdown
  if (res.disease_information && !isHealthy) {
    const desc = cleanText(res.disease_information.description || '');
    const splitDesc = doc.splitTextToSize(desc, 180);
    const descH = splitDesc.length * 5;

    checkPageBreak(descH + 15);
    doc.setFont(fontBold, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text('Disease Description', 15, yCursor);
    yCursor += 6;

    doc.setFont(fontNormal, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(splitDesc, 15, yCursor);
    yCursor += descH + 8;

    const symptoms = res.disease_information.symptoms || [];
    if (symptoms.length > 0) {
      let symH = 6;
      symptoms.forEach(s => { symH += doc.splitTextToSize(`• ${cleanText(s)}`, 180).length * 5; });
      checkPageBreak(symH + 5);

      doc.setFont(fontBold, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('Symptoms', 15, yCursor);
      yCursor += 6;

      doc.setFont(fontNormal, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      symptoms.forEach(sym => {
        const splitSym = doc.splitTextToSize(`• ${cleanText(sym)}`, 180);
        doc.text(splitSym, 18, yCursor);
        yCursor += splitSym.length * 5;
      });
      yCursor += 4;
    }

    const causes = res.disease_information.causes || [];
    if (causes.length > 0) {
      let causeH = 6;
      causes.forEach(c => { causeH += doc.splitTextToSize(`• ${cleanText(c)}`, 180).length * 5; });
      checkPageBreak(causeH + 5);

      doc.setFont(fontBold, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('Causes', 15, yCursor);
      yCursor += 6;

      doc.setFont(fontNormal, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      causes.forEach(cause => {
        const splitCause = doc.splitTextToSize(`• ${cleanText(cause)}`, 180);
        doc.text(splitCause, 18, yCursor);
        yCursor += splitCause.length * 5;
      });
      yCursor += 4;
    }
  }

  // Treatments & Care Protocol
  if (res.treatment) {
    checkPageBreak(30);
    doc.setDrawColor(220, 220, 220);
    doc.line(15, yCursor, 195, yCursor);
    yCursor += 8;

    doc.setFont(fontBold, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Treatment & Care Protocol', 15, yCursor);
    yCursor += 8;

    const organic = res.treatment.organic || [];
    if (organic.length > 0) {
      let orgH = 6;
      organic.forEach(o => { orgH += doc.splitTextToSize(`• ${cleanText(o)}`, 180).length * 5; });
      checkPageBreak(orgH + 5);

      doc.setFont(fontBold, 'bold');
      doc.setFontSize(11);
      doc.text('Organic Remedies', 15, yCursor);
      yCursor += 6;

      doc.setFont(fontNormal, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      organic.forEach(org => {
        const splitOrg = doc.splitTextToSize(`• ${cleanText(org)}`, 180);
        doc.text(splitOrg, 18, yCursor);
        yCursor += splitOrg.length * 5;
      });
      yCursor += 4;
    }

    const chemical = res.treatment.chemical || [];
    if (chemical.length > 0) {
      let chemH = 6;
      chemical.forEach(c => { chemH += doc.splitTextToSize(`• ${cleanText(c)}`, 180).length * 5; });
      checkPageBreak(chemH + 5);

      doc.setFont(fontBold, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('Chemical Solutions', 15, yCursor);
      yCursor += 6;

      doc.setFont(fontNormal, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      chemical.forEach(chem => {
        const splitChem = doc.splitTextToSize(`• ${cleanText(chem)}`, 180);
        doc.text(splitChem, 18, yCursor);
        yCursor += splitChem.length * 5;
      });
      yCursor += 4;
    }

    const fertilizer = res.treatment.fertilizer || [];
    if (fertilizer.length > 0) {
      let fertH = 6;
      fertilizer.forEach(f => { fertH += doc.splitTextToSize(`• ${cleanText(f)}`, 180).length * 5; });
      checkPageBreak(fertH + 5);

      doc.setFont(fontBold, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('Fertilizer Recommendation', 15, yCursor);
      yCursor += 6;

      doc.setFont(fontNormal, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      fertilizer.forEach(fert => {
        const splitFert = doc.splitTextToSize(`• ${cleanText(fert)}`, 180);
        doc.text(splitFert, 18, yCursor);
        yCursor += splitFert.length * 5;
      });
      yCursor += 4;
    }

    checkPageBreak(35);
    doc.setFont(fontBold, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('Environmental Guidelines', 15, yCursor);
    yCursor += 6;

    doc.setFont(fontNormal, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(`Watering: ${cleanText(res.treatment.watering || 'N/A')}`, 18, yCursor);
    yCursor += 6;
    doc.text(`Sunlight: ${cleanText(res.treatment.sunlight || 'N/A')}`, 18, yCursor);
    yCursor += 6;
    doc.text(`Soil: ${cleanText(res.treatment.soil || 'N/A')}`, 18, yCursor);
    yCursor += 6;
    doc.text(`Temperature: ${cleanText(res.treatment.temperature || 'N/A')}`, 18, yCursor);
    yCursor += 10;
  }

  // Prevention
  if (res.prevention && res.prevention.length > 0) {
    let prevH = 14;
    res.prevention.forEach(p => { prevH += doc.splitTextToSize(`1. ${cleanText(p)}`, 180).length * 5; });
    checkPageBreak(prevH);

    doc.setDrawColor(220, 220, 220);
    doc.line(15, yCursor, 195, yCursor);
    yCursor += 8;

    doc.setFont(fontBold, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('Long-term Prevention', 15, yCursor);
    yCursor += 6;

    doc.setFont(fontNormal, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    res.prevention.forEach((prev, idx) => {
      const splitPrev = doc.splitTextToSize(`${idx + 1}. ${cleanText(prev)}`, 180);
      doc.text(splitPrev, 15, yCursor);
      yCursor += splitPrev.length * 5;
    });
    yCursor += 4;
  }

  // Farmer Pro-Advice
  if (res.farmer_advice && res.farmer_advice.length > 0) {
    let advH = 14;
    res.farmer_advice.forEach(a => { advH += doc.splitTextToSize(`1. ${cleanText(a)}`, 180).length * 5; });
    checkPageBreak(advH);

    doc.setFont(fontBold, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('Farmer Pro-Advice', 15, yCursor);
    yCursor += 6;

    doc.setFont(fontNormal, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    res.farmer_advice.forEach((adv, idx) => {
      const splitAdv = doc.splitTextToSize(`${idx + 1}. ${cleanText(adv)}`, 180);
      doc.text(splitAdv, 15, yCursor);
      yCursor += splitAdv.length * 5;
    });
    yCursor += 4;
  }

  // Disclaimer
  if (res.disclaimer) {
    const splitDisc = doc.splitTextToSize(`Disclaimer: ${cleanText(res.disclaimer)}`, 180);
    checkPageBreak(splitDisc.length * 4 + 10);
    doc.setDrawColor(220, 220, 220);
    doc.line(15, yCursor, 195, yCursor);
    yCursor += 8;

    doc.setFont(fontItalic, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(splitDisc, 15, yCursor);
  }

  // Add page numbers & footers
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont(fontNormal, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: 'right' });
    doc.text('AgroAI Plant Medic - Smart Agriculture Report © 2026', 15, 290);
    doc.setDrawColor(230, 230, 230);
    doc.line(15, 287, 195, 287);
  }

  return doc;
};

export const getTextReportForSharing = (res: AgroAIResponse) => {
  const isHealthy = res.health?.is_healthy ?? true;
  let reportText = `🌿 *AgroAI Plant Health Report* 🌿\n\n`;
  reportText += `📅 Date: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}\n`;
  reportText += `🌱 Plant: ${res.plant?.common_name || 'Unknown'} (${res.plant?.scientific_name || 'N/A'})\n`;
  reportText += `📊 Status: ${isHealthy ? '🟢 Healthy' : '🔴 Disease Detected: ' + (res.health?.disease || 'Unknown')}\n`;
  if (res.health?.severity) {
    reportText += `⚡ Severity: ${res.health.severity}\n`;
  }
  reportText += `🎯 Confidence: ${Math.round((res.health?.confidence || 0) * 100)}%\n\n`;

  if (res.recommendation) {
    reportText += `💡 *Recommendation:* ${res.recommendation}\n\n`;
  }

  if (res.disease_information && !isHealthy) {
    reportText += `🦠 *Disease Details:*\n${res.disease_information.description}\n\n`;
  }

  if (res.treatment) {
    reportText += `💊 *Treatment Protocol:*\n`;
    if (res.treatment.organic?.length) {
      reportText += `- Organic Remedies: ${res.treatment.organic.join(', ')}\n`;
    }
    if (res.treatment.chemical?.length) {
      reportText += `- Chemical Solutions: ${res.treatment.chemical.join(', ')}\n`;
    }
    if (res.treatment.fertilizer?.length) {
      reportText += `- Fertilizer: ${res.treatment.fertilizer.join(', ')}\n`;
    }
    reportText += `- Watering: ${res.treatment.watering}\n`;
    reportText += `- Sunlight: ${res.treatment.sunlight}\n\n`;
  }

  reportText += `Generated using AgroAI Plant Medic.`;
  return reportText;
};

export const sharePDFReport = async (res: AgroAIResponse, preview: string | null, onShowFallback: () => void) => {
  try {
    const doc = await generatePDFDocument(res, preview);
    const pdfBlob = doc.output('blob');
    const filename = `${res.plant?.common_name.replace(/\s+/g, '_') || 'plant'}_health_report.pdf`;
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${res.plant?.common_name || 'Plant'} Health Report`,
        text: `Check out this Plant Health Report from AgroAI. Plant: ${res.plant?.common_name || 'Unknown'}, Status: ${res.health?.is_healthy ? 'Healthy' : 'Disease Detected: ' + (res.health?.disease || '')}`,
      });
    } else {
      onShowFallback();
    }
  } catch (e) {
    console.error("Web Share API failed or cancelled", e);
    onShowFallback();
  }
};
