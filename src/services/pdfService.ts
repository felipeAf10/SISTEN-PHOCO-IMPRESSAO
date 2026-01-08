import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quote, Customer, User, QuoteItem, Product } from '../types';

export const generateQuotePDF = async (
    quote: Quote,
    customer: Customer,
    user: User,
    products: Product[] // Needed to get product names if not in items
) => {
    const doc = new jsPDF();

    // --- Config ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const primaryColor = [40, 40, 40] as [number, number, number]; // Dark Grey/Black for professionalism
    const accentColor = [63, 81, 181] as [number, number, number]; // Indigo branding

    // --- Helper: Centered Text ---
    const centerText = (text: string, y: number, fontSize: number = 10, color: [number, number, number] = [0, 0, 0], font: string = 'normal') => {
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        doc.setFont('helvetica', font);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // --- Header ---
    // Background Strip
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 4, 'F');

    let currentY = 20;

    // Logo & Company Name
    try {
        const logoUrl = '/logo-phoco-black.png';
        const logoImg = new Image();
        logoImg.src = logoUrl;
        await new Promise((resolve) => { logoImg.onload = resolve; logoImg.onerror = resolve; }); // Safe load
        doc.addImage(logoImg, 'PNG', margin, 12, 40, 0, undefined, 'FAST');
    } catch (e) {
        doc.setFontSize(24);
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'bold');
        doc.text("PHOCO", margin, 25);
    }

    // Company Details (Right aligned)
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.setFont('helvetica', 'normal');
    const companyInfo = [
        "PHOCO IMPRESSÃO DIGITAL",
        "CNPJ: 49.978.712/0001-79",
        "Av. João Gomes Cardoso, 435 - Jd. Laguna",
        "Contagem - MG | CEP: 32.140-172",
        "(31) 97217-8464 | phocoimpressaodigital@gmail.com"
    ];
    doc.text(companyInfo, pageWidth - margin, 18, { align: 'right', lineHeightFactor: 1.3 });

    currentY = 45;

    // --- Quote Title & Stats ---
    doc.setFillColor(245, 247, 250); // Very light grey bg
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 2, 2, 'F');

    doc.setFontSize(18);
    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`ORÇAMENTO #${quote.id.replace('PH-', '')}`, margin + 5, currentY + 12);

    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Emissão: ${new Date(quote.date).toLocaleDateString()}`, margin + 5, currentY + 20);

    // Status/Validity
    doc.setFont('helvetica', 'bold');
    doc.text(`Validade: 7 dias`, pageWidth - margin - 50, currentY + 12);
    doc.text(`Vendedor: ${user.name.split(' ')[0]}`, pageWidth - margin - 50, currentY + 20);

    currentY += 35;

    // --- Client Section ---
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text("DESTINATÁRIO", margin, currentY);

    doc.setDrawColor(200);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

    currentY += 10;

    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.name, margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    const clientDetails = [
        customer.document ? `CPF/CNPJ: ${customer.document}` : '',
        customer.email,
        customer.phone,
        customer.address ? `${customer.address}` : ''
    ].filter(Boolean);

    doc.text(clientDetails, margin, currentY + 5, { lineHeightFactor: 1.4 });

    currentY += 25;

    // --- Items Table ---
    const tableHeaders = [['IT', 'DESCRIÇÃO DETALHADA', 'QTD', 'R$ UNIT.', 'SUBTOTAL']];
    const tableData = quote.items.map((item, index) => {
        const product = products.find(p => p.id === item.productId);
        let name = product?.name || item.productName || 'Produto';
        let desc = '';

        // Build detailed description
        if (item.labelData) {
            desc = `${item.labelData.totalLabels} un. de ${item.labelData.singleWidth}x${item.labelData.singleHeight}cm`;
        } else if (item.width && item.height) {
            desc = `Dimensões: ${item.width.toFixed(2)}m x ${item.height.toFixed(2)}m (${(item.width * item.height).toFixed(2)}m²)`;
        } else if (product?.unitType) {
            desc = `Unidade: ${product.unitType}`;
        }

        return [
            (index + 1).toString(),
            { content: name, styles: { fontStyle: 'bold' } }, // Bold product name
            { content: desc ? `\n${desc}` : '' },             // Row 2 of cell is desc
            item.quantity,
            `R$ ${item.unitPrice.toFixed(2)}`,
            `R$ ${item.subtotal.toFixed(2)}`
        ];
    });

    // We need to flatten the content for autoTable if we used object above, 
    // BUT autoTable supports content objects. Let's simplify to avoid type errors if versions mismatch.
    const simpleTableData = quote.items.map((item, index) => {
        const product = products.find(p => p.id === item.productId);
        let name = (product?.name || item.productName || 'Produto').toUpperCase();
        let details = '';

        // Build detailed description for KIT or standard item
        if (product?.isComposite && product.composition && product.composition.length > 0) {
            const compList = product.composition.map(c => {
                const cName = products.find(p => p.id === c.productId)?.name || 'Item';
                return `• ${c.quantity}x ${cName}`;
            }).join('\n');
            details = `KIT COMPORTO POR:\n${compList}`;
        } else if (item.labelData) {
            details = `Rota de Etiquetas: ${item.labelData.totalLabels} un. (${item.labelData.singleWidth}x${item.labelData.singleHeight}cm)`;
        } else if (item.width && item.height) {
            details = `Medidas: ${item.width.toFixed(2)}m Largura x ${item.height.toFixed(2)}m Altura`;
        } else {
            // Fallback for simple units
            details = product?.unitType ? `Unidade: ${product.unitType}` : '';
        }

        return [
            (index + 1).toString(),
            `${name}\n${details}`,
            item.quantity,
            `R$ ${item.unitPrice.toFixed(2)}`,
            `R$ ${item.subtotal.toFixed(2)}`
        ];
    });

    autoTable(doc, {
        startY: currentY,
        head: tableHeaders,
        body: simpleTableData,
        theme: 'plain',
        headStyles: {
            fillColor: [245, 245, 245],
            textColor: 40,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: 230,
            lineWidth: { bottom: 0.1 }
        },
        foot: [['', '', '', 'Total Itens:', `R$ ${quote.totalAmount.toFixed(2)}`]],
        footStyles: {
            fillColor: [255, 255, 255],
            textColor: accentColor,
            fontStyle: 'bold',
            halign: 'right'
        }
    });

    // --- Summary & Totals ---
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY + 10;

    // Check page break
    if (finalY > pageHeight - 60) {
        doc.addPage();
        finalY = 20;
    }

    const summaryW = 80;
    const summaryX = pageWidth - margin - summaryW;

    // Background for summary
    doc.setFillColor(250, 250, 250);
    doc.rect(summaryX - 5, finalY - 5, summaryW + 20, 45, 'F');

    // Values
    const rawTotal = quote.totalAmount + (quote.discount ? (quote.totalAmount * (quote.discount / 100)) : 0);
    const discountVal = quote.discount ? (quote.totalAmount * (quote.discount / 100)) : 0;

    doc.setFontSize(10);
    doc.setTextColor(60);

    const addSummaryLine = (label: string, value: string, y: number, isBold = false, color: [number, number, number] = [60, 60, 60]) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        doc.text(label, summaryX, y);
        doc.text(value, pageWidth - margin, y, { align: 'right' });
    };

    addSummaryLine("Subtotal:", `R$ ${rawTotal.toFixed(2)}`, finalY);

    if (discountVal > 0) {
        addSummaryLine(`Desconto (${quote.discount}%):`, `- R$ ${discountVal.toFixed(2)}`, finalY + 7, false, [220, 38, 38]);
    }

    finalY += 15;
    doc.setDrawColor(200);
    doc.line(summaryX, finalY, pageWidth - margin, finalY);

    finalY += 10;
    doc.setFontSize(16);
    addSummaryLine("TOTAL:", `R$ ${quote.totalAmount.toFixed(2)}`, finalY, true, accentColor);

    // --- Terms & Footer ---
    const footerY = pageHeight - 50;

    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text("Termos e Condições", margin, footerY);

    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.setFont('helvetica', 'normal');

    const terms = [
        `• Pagamento: ${quote.paymentMethod || 'A combinar'} ${quote.downPayment ? `(Sinal: R$ ${quote.downPayment.toFixed(2)})` : ''}`,
        `• Prazo de Entrega: ${quote.deadlineDays} dias úteis após aprovação de arte e pagamento do sinal.`,
        `• Este orçamento é válido por 7 dias.`,
        `• A empresa não se responsabiliza por erros de ortografia em artes aprovadas pelo cliente.`
    ];

    let termY = footerY + 5;
    terms.forEach(term => {
        doc.text(term, margin, termY);
        termY += 4;
    });

    // Signature Area
    doc.setDrawColor(150);
    doc.line(pageHeight / 2, footerY + 25, pageWidth - margin, footerY + 25);
    doc.setFontSize(7);
    doc.text("Assinatura do Responsável / Cliente", pageWidth - margin - 35, footerY + 29, { align: 'center' });

    // Save
    const cleanName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Orcamento_Phoco_${quote.id}_${cleanName}.pdf`);
};

export const generateWorkOrderPDF = async (
    quote: Quote,
    customer: Customer,
    products: Product[]
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // --- QR Code ---
    // URL to open the quote in the system (assuming localhost or deployed url)
    // If the app is local-only, this will only work on the same machine/network.
    // Ideally we encode a deep link or just the ID.
    const quoteUrl = `${window.location.origin}/quotes?id=${quote.id}`;

    let qrDataUrl = '';
    try {
        // Dynaically import QRCode to avoid issues if it was not imported at top level yet (though I should add import)
        const QRCode = (await import('qrcode')).default;
        qrDataUrl = await QRCode.toDataURL(quoteUrl, { width: 200, margin: 1 });
    } catch (e) {
        console.error("QR Generation failed", e);
    }

    // --- Header ---
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("ORDEM DE PRODUÇÃO", margin, 17);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const deadlineDate = new Date();
    deadlineDate.setDate(new Date(quote.date).getDate() + quote.deadlineDays);
    doc.text(`Entrega: ${deadlineDate.toLocaleDateString()}`, pageWidth - margin, 17, { align: 'right' });

    // --- QR Code Placement ---
    if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', pageWidth - 45, 30, 35, 35);
    }

    // --- Info Block ---
    let currentY = 40;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text(`#${quote.id.replace('PH-', '')}`, margin, currentY + 10);

    currentY += 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("CLIENTE:", margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${customer.name.slice(0, 30)}`, margin + 30, currentY);

    currentY += 10;
    if (quote.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text("OBS:", margin, currentY);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(11);
        const splitNotes = doc.splitTextToSize(quote.notes, pageWidth - margin - 50); // Avoid QR
        doc.text(splitNotes, margin + 15, currentY);
        currentY += (splitNotes.length * 5) + 5;
    }

    // Move below QR Code for table
    currentY = Math.max(currentY, 70);

    // --- Items for Production ---
    const tableHeaders = [['IT', 'PRODUTO / ACABAMENTO', 'MEDIDAS', 'QTD', 'CHECK']];
    const tableData = quote.items.map((item, index) => {
        const product = products.find(p => p.id === item.productId);
        let name = (product?.name || item.productName || 'Produto').toUpperCase();
        let details = '';

        if (product?.isComposite && product.composition && product.composition.length > 0) {
            const compList = product.composition.map(c => {
                const cName = products.find(p => p.id === c.productId)?.name || 'Item';
                return `• ${c.quantity}x ${cName}`;
            }).join('\n');
            details = `KIT / COMPOSIÇÃO:\n${compList}`;
        } else if (item.labelData) {
            details = `ADESIVO: ${item.labelData.type}\nQTD RÓTULOS: ${item.labelData.totalLabels}\nTAM: ${item.labelData.singleWidth}x${item.labelData.singleHeight}cm`;
        } else if (item.width && item.height) {
            details = `LARG: ${item.width.toFixed(2)}m  x  ALT: ${item.height.toFixed(2)}m\nÁREA: ${(item.width * item.height).toFixed(2)}m²`;
        }

        // Add specific production notes if any (not in type yet, but good to have)

        return [
            (index + 1).toString(),
            `${name}\n${details}`,
            item.width ? `${item.width}x${item.height}` : '-',
            item.quantity,
            '[   ]'
        ];
    });

    autoTable(doc, {
        startY: currentY,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [50, 50, 50],
            textColor: 255,
            fontSize: 11,
            halign: 'center',
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', valign: 'middle' },
            1: { cellWidth: 'auto', valign: 'middle' },
            2: { cellWidth: 30, halign: 'center', valign: 'middle' },
            3: { cellWidth: 15, halign: 'center', valign: 'middle', fontSize: 14, fontStyle: 'bold' },
            4: { cellWidth: 20, halign: 'center', valign: 'middle' }
        },
        styles: {
            fontSize: 10,
            cellPadding: 6,
            lineColor: 200,
            minCellHeight: 15
        }
    });

    // --- Footer ---
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gerado em ${new Date().toLocaleString()} - PriceFlow System`, margin, footerY);

    // Save
    doc.save(`OS_Producao_${quote.id}.pdf`);
};
