import { doc as fsDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, Transaction, SiteSettings } from "../types";
import { formatCurrency, formatWarranty } from "./utils";

function amountToWords(num: number): string {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";

  const numStr = Math.floor(num).toString();
  if (numStr.length > 9) return "Amount too large";

  const n = ("000000000" + numStr)
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{3})$/);
  if (!n) return "";

  let str = "";

  let crore = parseInt(n[1]);
  if (crore > 0) {
    if (crore < 20) str += a[crore];
    else str += b[Math.floor(crore / 10)] + " " + a[crore % 10];
    str += "Crore ";
  }

  let lakh = parseInt(n[2]);
  if (lakh > 0) {
    if (lakh < 20) str += a[lakh];
    else str += b[Math.floor(lakh / 10)] + " " + a[lakh % 10];
    str += "Lakh ";
  }

  let thousand = parseInt(n[3]);
  if (thousand > 0) {
    if (thousand < 20) str += a[thousand];
    else str += b[Math.floor(thousand / 10)] + " " + a[thousand % 10];
    str += "Thousand ";
  }

  let units = parseInt(n[4]);
  if (units > 0) {
    let hundred = Math.floor(units / 100);
    let rem = units % 100;

    if (hundred > 0) {
      str += a[hundred] + "Hundred ";
    }
    if (rem > 0) {
      if (rem < 20) str += a[rem];
      else str += b[Math.floor(rem / 10)] + " " + (rem % 10 ? a[rem % 10] : "");
    }
  }

  return str.trim();
}

export const generatePDF = async (
  order: Order | Transaction,
  type: "invoice" | "quotation" | "challan" | "receipt",
  settings: SiteSettings,
  action: "download" | "doc" = "download",
): Promise<any> => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  let currentY = 20;

  // Header Title
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(type === "receipt" ? "MONEY RECEIPT" : type.toUpperCase(), 15, currentY + 10);

  // Company Info (Right Aligned)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);

  try {
    const urlsToTry = [settings?.logoUrl, "/logo.png", "/logo.jpeg"].filter(Boolean);
    let dataUrl = "";
    let loadedImg: HTMLImageElement | null = null;

    for (const url of urlsToTry) {
      if (!url) continue;
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(true);
          img.onerror = reject;
          img.src = url;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          dataUrl = canvas.toDataURL("image/png");
          loadedImg = img;
          break; // successfully loaded
        }
      } catch (e) {
        console.warn(`Failed to load logo from ${url}`, e);
      }
    }

    const businessNameText = settings?.businessName || settings?.brandName || "CLICK2IT BD";
    
    if (loadedImg && dataUrl) {
      const textWidth = doc.getTextWidth(businessNameText);
      const logoHeight = 16;
      const logoWidth = (loadedImg.width / loadedImg.height) * logoHeight;
      doc.addImage(
        dataUrl,
        "PNG",
        pageWidth - 15 - textWidth - logoWidth - 5,
        currentY - 11,
        logoWidth,
        logoHeight,
      );
    }
  } catch (err) {
    console.error("Error in logo processing for PDF", err);
  }

  doc.text(settings?.businessName || settings?.brandName || "CLICK2IT BD", pageWidth - 15, currentY, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  
    let finalAddress = settings?.address || "Shop No. 1072, Level 10, Multiplan Center\n69-71, New Elephant Road, Dhaka-1205";
    if (finalAddress.trim() === 'Dhaka, Bangladesh') {
      finalAddress = "Shop No. 1072, Level 10, Multiplan Center\n69-71, New Elephant Road, Dhaka-1205";
    }
    
    let finalPhone = settings?.contactPhone || "+8809640887777, +8801729887777";
    if (finalPhone.trim() === '+8809640887777' || finalPhone.trim() === '+880 123456789') {
      finalPhone = "+8809640887777, +8801729887777";
    }

    const addressLines = doc.splitTextToSize(finalAddress.replace(/\\n/g, '\n'), 80);

  
  let addrY = currentY + 6;
  addressLines.forEach((line) => {
    doc.text(line, pageWidth - 15, addrY, { align: "right" });
    addrY += 5;
  });
  
  doc.text(finalPhone, pageWidth - 15, addrY, { align: "right" });
  doc.text(settings.website || "www.click2itbd.com", pageWidth - 15, addrY + 5, { align: "right" });

  currentY = Math.max(currentY + 15, addrY + 5);

  if (type === "receipt") {
      const tx = order as Transaction;

      // --- Info Boxes (same as Invoice) ---
      const boxHeight = 32;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY, (pageWidth - 30) / 2, boxHeight, "F");
      doc.rect(15 + (pageWidth - 30) / 2, currentY, (pageWidth - 30) / 2, boxHeight, "F");

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15 + (pageWidth - 30) / 2, currentY, 15 + (pageWidth - 30) / 2, currentY + boxHeight);

      // Left box
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("Bill To:", 20, currentY + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(tx.entityName || "N/A", 20, currentY + 18);

      // Right box
      const rightX = 15 + (pageWidth - 30) / 2 + 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("Receipt Details:", rightX, currentY + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Receipt No:  ${tx.referenceId || "N/A"}`, rightX, currentY + 18);
      doc.setFont("helvetica", "normal");
      doc.text(`Date:  ${new Date(tx.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, rightX, currentY + 25);

      currentY += boxHeight + 5;

      // --- Payment Table (matching Invoice table style) ---
      autoTable(doc, {
        startY: currentY,
        head: [["S.N.", "Description / Ref", "Payment Method", "Amount"]],
        body: [
          [
            "1",
            tx.description || `Payment received from ${tx.entityName}`,
            tx.paymentMethod ? tx.paymentMethod.charAt(0).toUpperCase() + tx.paymentMethod.slice(1).toLowerCase() : "Cash",
            formatCurrency(tx.amount, settings),
          ],
        ],
        theme: "plain",
        headStyles: {
          fillColor: [15, 22, 33],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          cellPadding: 4,
        },
        bodyStyles: {
          textColor: [15, 23, 42],
          fontSize: 10,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 40 },
          3: { halign: "right", cellWidth: 35 },
        },
        didParseCell: (data: any) => {
          if (data.section === "head" && data.column.index === 3) {
            data.cell.styles.halign = "right";
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY;

      // --- Total row ---
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY, pageWidth - 30, 12, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Total TK.", pageWidth - 50, currentY + 8);
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(tx.amount, settings), pageWidth - 15, currentY + 8, { align: "right" });

      currentY += 20;

      // --- Taka In Word box ---
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(15, currentY, pageWidth - 30, 12, "FD");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Taka In Word: ", 20, currentY + 8);
      const words = amountToWords(tx.amount);
      if (words) {
        doc.setFont("helvetica", "normal");
        doc.text(`Taka ${words} Only`, 52, currentY + 8);
      }

      currentY += 30;
    } else {
    const o = order as Order;

    // Light Grey Box Backgrounds
    doc.setFillColor(248, 250, 252);
    
    // Calculate dynamic box height based on address length
    const splitAddr = doc.splitTextToSize(
      o.shippingAddress || o.customerPhone || "N/A",
      (pageWidth - 30) / 2 - 10,
    );
    // Base lines + extra for address + extra for workOrder
    let rightSideLines = 2; // Details No, Date
    if (o.workOrderNumber) rightSideLines++;
    
    const leftSideHeight = 18 + (splitAddr.length * 5) + 3; // 22 is start of addr, + height, + bottom padding
    const rightSideHeight = 13 + (rightSideLines * 6) + 3; 
    
    const boxHeight = Math.max(leftSideHeight, rightSideHeight, 26); // minimum 32 height

    // Left Box - Bill To
    doc.rect(15, currentY, (pageWidth - 30) / 2, boxHeight, "F");
    // Right Box - Details
    doc.rect(
      15 + (pageWidth - 30) / 2,
      currentY,
      (pageWidth - 30) / 2,
      boxHeight,
      "F",
    );

    // Vertical Divider Line (Subtle)
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(
      15 + (pageWidth - 30) / 2,
      currentY,
      15 + (pageWidth - 30) / 2,
      currentY + boxHeight,
    );

    // Box 1 (Left) Content
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(type === "challan" ? "Ship To:" : "Bill To:", 20, currentY + 7);

      doc.text(o.customerName || "N/A", 20, currentY + 13);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(splitAddr, 20, currentY + 18);

    // Box 2 (Right) Content
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(
      type.charAt(0).toUpperCase() + type.slice(1) + " Details:",
      15 + (pageWidth - 30) / 2 + 5,
      currentY + 8,
    );

    doc.setFontSize(9.5);
      doc.text(
        `${type.charAt(0).toUpperCase() + type.slice(1)} No: `,
        15 + (pageWidth - 30) / 2 + 5,
        currentY + 13,
      );
      doc.setFont("helvetica", "normal");
      doc.text(
        `${o.documentNumber || o.id.substring(0, 8).toUpperCase()}`,
        15 + (pageWidth - 30) / 2 + 30,
        currentY + 13,
      );

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text("Date: ", 15 + (pageWidth - 30) / 2 + 5, currentY + 18);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${new Date(o.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        15 + (pageWidth - 30) / 2 + 16,
        currentY + 18,
      );
      
      let currentRightY = currentY + 23;

      doc.setFont("helvetica", "bold");
      doc.text("Prepared By: ", 15 + (pageWidth - 30) / 2 + 5, currentRightY);
      doc.setFont("helvetica", "normal");
      doc.text(o.createdBy || "Admin", 15 + (pageWidth - 30) / 2 + 28, currentRightY);
      currentRightY += 6;
      
      if (o.workOrderNumber) {
          doc.setFont("helvetica", "bold");
          doc.text("Work Order: ", 15 + (pageWidth - 30) / 2 + 5, currentRightY);
          doc.setFont("helvetica", "normal");
          doc.text(o.workOrderNumber, 15 + (pageWidth - 30) / 2 + 28, currentRightY);
      }

    currentY += boxHeight + 5;

    // Table Data
    const isChallan = type === "challan";
    const tableHeaders = isChallan
      ? ["S.N.", "Product Name", "Brand", "Unit", "Warranty"]
      : ["S.N.", "Product Name", "Brand", "Unit", "Unit Price", "Warranty", "Total (TK.)"];

        // Enrich items with brand and warranty from DB if missing
    if (o.items && Array.isArray(o.items)) {
      const enrichedItems: any[] = [];
      for (let i = 0; i < o.items.length; i++) {
        let item: any = { ...o.items[i] };
        const pId = item.productId || item.id;
        if (pId && (!item.brand || (!item.warranty && !item.warrantyMonths && !item.specs?.Warranty))) {
          try {
            const pDoc = await getDoc(fsDoc(db, 'products', pId));
            if (pDoc.exists()) {
              const pData: any = pDoc.data();
              if (!item.brand && pData.brand) item.brand = pData.brand;
              if (!item.brand && !pData.brand) item.brand = pData.category || pData.vendorName || '-';
              if (!item.warranty && !item.warrantyMonths && !item.specs?.Warranty) {
                if (pData.specs?.Warranty) item.warranty = pData.specs.Warranty;
                else if (pData.warrantyMonths) { item.warrantyMonths = pData.warrantyMonths; item.warrantyUnit = item.warrantyUnit || pData.warrantyUnit; }
              }
            }
          } catch(e) {}
        }
        enrichedItems.push(item);
      }
      o.items = enrichedItems;
    }

    const tableData = o.items.map((item: any, idx: number) => {
      let warranty = "-";
      if (item.warranty) {
        warranty = item.warranty;
        if (/^\d+$/.test(warranty)) warranty += ' Years';
      } else if (item.warrantyMonths) {
        warranty = formatWarranty(item.warrantyMonths, item.warrantyUnit);
      } else if (item.specs?.Warranty) {
        warranty = item.specs.Warranty;
      }

      const row = [
        (idx + 1).toString(),
        item.name,
        item.brand || "-",
        item.quantity + ' ' + (item.unit || 'pcs')
      ];
      
      if (!isChallan) {
        row.push((Number(item.price) || 0).toFixed(2));
      }
      
      row.push(warranty);
      
      if (!isChallan) {
        row.push(((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2));
      }

      return row;
    });

    autoTable(doc, {
      startY: currentY,
      head: [tableHeaders],
      body: tableData,
      theme: "plain",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [15, 23, 42] },
      columnStyles: isChallan ? {
        0: { halign: "center", cellWidth: 12 },
        1: { halign: "left", cellWidth: 95 },
        2: { halign: "center", cellWidth: 28 },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "center", cellWidth: 25 },
      } : {
        0: { halign: "center", cellWidth: 12 },
        1: { halign: "left", cellWidth: 73 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "center", cellWidth: 15 },
        4: { halign: "right", cellWidth: 20 },
        5: { halign: "center", cellWidth: 18 },
        6: { halign: "right", cellWidth: 24 },
      },
      didDrawCell: (data: any) => {
        // Draw bottom border for rows
        if (data.row.section === "body") {
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.1);
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height,
          );
        }
      },
    });

    if (type !== "challan") {
        let finalY = (doc as any).lastAutoTable.finalY + 5;
        
        // Ensure enough space for summary, terms, and signatures
        if (finalY > doc.internal.pageSize.getHeight() - 80) {
          doc.addPage();
          finalY = 20;
        }

      const subtotal = o.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );
      const itemDiscounts = o.items.reduce(
        (acc, item) => acc + (Number(item.discount) || 0),
        0
      );
      const discount = (Number(o.discountAmount) || 0) + itemDiscounts;

      const alignRightX = pageWidth - 15;
      const labelX = pageWidth - 90;

      doc.setFontSize(11);

      if (discount > 0) {
        doc.setFont("helvetica", "normal");
        doc.text("Subtotal:", labelX, finalY);
        doc.text(subtotal.toFixed(2), alignRightX, finalY, { align: "right" });
        finalY += 7;

        doc.text("Discount:", labelX, finalY);
        doc.text(`-${discount.toFixed(2)}`, alignRightX, finalY, {
          align: "right",
        });
        finalY += 7;
      }

      const billTotal = Number(o.total || 0);
      const paidVal = Number(o.paidAmount || 0);
      const billRemainingDue = Math.max(0, billTotal - paidVal);
      const isPaid = o.paymentStatus === 'paid' || (paidVal >= billTotal && billTotal > 0);

      // Right side bill summary (Strictly for this invoice)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Total TK.", labelX, finalY);
      doc.text(billTotal.toFixed(2), alignRightX, finalY, { align: "right" });
      finalY += 7;

      if (isPaid) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(22, 163, 74);
        doc.text("Paid Amount:", labelX, finalY);
        doc.text((paidVal > 0 ? paidVal : billTotal).toFixed(2), alignRightX, finalY, { align: "right" });
        finalY += 7;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text("Payment Status:", labelX, finalY);
        doc.text("PAID", alignRightX, finalY, { align: "right" });
        doc.setTextColor(15, 23, 42);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(22, 163, 74);
        doc.text("Paid Amount:", labelX, finalY);
        doc.text(paidVal.toFixed(2), alignRightX, finalY, { align: "right" });
        finalY += 7;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("Remaining Due:", labelX, finalY);
        doc.text(billRemainingDue.toFixed(2), alignRightX, finalY, { align: "right" });
        doc.setTextColor(15, 23, 42);
      }

      finalY += 8;

      // Amount in words Box (strictly for billTotal)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(15, finalY, pageWidth - 30, 12, "FD");

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Taka In Word: ", 20, finalY + 8);

      const words = amountToWords(billTotal);
      if (words) {
        doc.setFont("helvetica", "normal");
        doc.text(`Taka ${words} Only`, 48, finalY + 8);
      }
      currentY = finalY + 14; // Update global currentY
    } else {
      currentY = (doc as any).lastAutoTable?.finalY + 20 || currentY + 20;
    }
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  const footerReservedHeight = 36; // Total footer height needed (preparedBy, lines, labels, note, thank you)
  const ord = order as any;

  // Terms and Conditions Section (For Quotations, Invoices, etc.)
  if (ord.termsAndConditions || ord.notes) {
    currentY += 4;
    const termsTitle = ord.termsAndConditions ? "Terms & Conditions" : "Notes";
    const termsContent = ord.termsAndConditions || ord.notes;
    const splitTerms = doc.splitTextToSize(termsContent || "", pageWidth - 30);
    const termsHeight = 6 + (splitTerms.length * 4);

    // If terms will collide with the footer space, move terms to next page
    if (currentY + termsHeight > pageHeight - footerReservedHeight - 10) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(termsTitle + ":", 15, currentY);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(splitTerms, 15, currentY + 5);
    currentY += 5 + (splitTerms.length * 4);
  }

  // Check if currentY leaves enough space for footer on this page
  // If not, add a new page so it never overlaps or gets cut off!
  if (currentY > pageHeight - footerReservedHeight - 8) {
    doc.addPage();
    currentY = 20;
  }

  // Lift the bottom section up:
  // Signature line at pageHeight - 34 (e.g. 263mm on A4)
  const standardSignatureY = pageHeight - 34;
  let bottomY = Math.max(standardSignatureY, currentY + 12);

  // Safety check: ensure bottomY + 20 doesn't push off the page
  if (bottomY + 20 > pageHeight - 8) {
    doc.addPage();
    currentY = 20;
    bottomY = standardSignatureY;
  }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);

  // Authorized Signature
  if (ord?.preparedBy) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(71, 85, 105);
    doc.text(`Prepared By: ${ord.preparedBy}`, 15, bottomY - 4);
  }
  doc.line(15, bottomY, 70, bottomY);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text("Authorized Signature", 15, bottomY + 4.5);

  // Customer Signature
  if (type === "invoice" || type === "challan" || type === "quotation" || type === "receipt") {
    doc.line(pageWidth - 70, bottomY, pageWidth - 15, bottomY);
    doc.text("Customer Signature", pageWidth - 15, bottomY + 4.5, {
      align: "right",
    });
  }

  // Warranty Note (lifted to bottomY + 11.5)
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "* Note: There is no warranty in case of Burning or Physical Damages.",
    15,
    bottomY + 11.5,
  );

  // THANK YOU FOR YOUR BUSINESS (lifted to bottomY + 18.5, well above page edge)
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("THANK YOU FOR YOUR BUSINESS", pageWidth / 2, bottomY + 18.5, {
    align: "center",
  });

  // Page numbering in a corner (Bottom-Right corner) for multi-page documents
  const totalPages = ((doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : (doc as any).getNumberOfPages()) || 1;
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Page-${i} / ${totalPages}`, pageWidth - 15, pageHeight - 6, {
        align: "right",
      });
    }
  }

  if ((order as any)._autoPrint) {
    doc.autoPrint();
    const blobURL = URL.createObjectURL(doc.output("blob"));
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    iframe.src = blobURL;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 100);
    };
  } else if (action === "download") {
    const docName = (order as any).documentNumber || (order as any).invoiceNumber || order.id || "document";
    doc.save(`${type.charAt(0).toUpperCase() + type.slice(1)}_${docName}.pdf`);
  }

  return doc;
};

// Basic number to words converter (up to cores/millions)
const numberToWords = (num: number): string => {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  const numberString = String(Math.trunc(Math.abs(num)));
  if (numberString.length > 9) return 'Overflow';
  const n = ('000000000' + numberString).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] !== '00') ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] !== '00') ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] !== '00') ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] !== '0') ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] !== '00') ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
  return str;
};

export const printMoneyReceipt = async (transaction: any, settings: any) => {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', [210, 148]); // A5 size (half A4) is standard for receipts
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 15;

    // Draw border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
    doc.rect(6, 6, pageWidth - 12, pageHeight - 12); // Double border

    // Header Logo & Company Info
    try {
      const urlsToTry = [settings?.logoUrl, "/logo.png", "/logo.jpeg"].filter(Boolean);
      let dataUrl = "";
      let loadedImg: any = null;
      for (const url of urlsToTry) {
        if (!url) continue;
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          await new Promise((resolve, reject) => {
            img.onload = () => resolve(true);
            img.onerror = () => reject(new Error("Load failed"));
            img.src = url;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            dataUrl = canvas.toDataURL("image/png");
            loadedImg = img;
            break;
          }
        } catch (e) {}
      }
      const businessNameText = settings?.businessName || settings?.brandName || "CLICK2IT BD";
      if (loadedImg && dataUrl) {
        const logoHeight = 12;
        const logoWidth = (loadedImg.width / loadedImg.height) * logoHeight;
        doc.addImage(dataUrl, "PNG", 15, currentY - 5, logoWidth, logoHeight);
      }
    } catch (err) {}

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(settings?.businessName || settings?.brandName || "CLICK2IT BD", pageWidth / 2, currentY, { align: "center" });
    
    currentY += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const address = settings?.address || "Dhaka, Bangladesh";
    doc.text(String(address), pageWidth / 2, currentY, { align: "center" });

    currentY += 4;
    const phone = settings?.contactPhone || "+880";
    doc.text(`Phone: ${phone}`, pageWidth / 2, currentY, { align: "center" });

    currentY += 10;
    
    // Receipt Title Badge
    doc.setFillColor("#000000");
    doc.rect((pageWidth/2) - 25, currentY, 50, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("MONEY RECEIPT", pageWidth / 2, currentY + 6, { align: "center" });
    
    doc.setTextColor(0);
    currentY += 15;

    // Receipt details
    doc.setFontSize(10);
    doc.text(`Receipt No: MR-${transaction.id.slice(-6).toUpperCase()}`, 15, currentY);
    doc.text(`Date: ${new Date(transaction.date).toLocaleDateString()}`, pageWidth - 15, currentY, { align: "right" });

    currentY += 12;
    doc.text(`Received with thanks from:`, 15, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(transaction.entityName || "Walk-in Customer", 65, currentY);
    doc.setLineWidth(0.2);
    doc.line(62, currentY + 1, pageWidth - 15, currentY + 1); // underline

    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`The sum of BDT:`, 15, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(`${Number(transaction.amount).toLocaleString()}`, 45, currentY);
    doc.line(42, currentY + 1, 80, currentY + 1); // underline
    
    doc.setFont("helvetica", "normal");
    doc.text(`By Cash/Cheque/Bkash:`, 85, currentY);
    doc.setFont("helvetica", "bold");
    doc.text((transaction.paymentMethod || "Cash").toUpperCase(), 125, currentY);
    doc.line(122, currentY + 1, pageWidth - 15, currentY + 1); // underline

    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Amount (in words):`, 15, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(`${numberToWords(Number(transaction.amount))} Taka Only`, 48, currentY);
    doc.line(46, currentY + 1, pageWidth - 15, currentY + 1); // underline

    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`On account of:`, 15, currentY);
    doc.text(transaction.description || "Due Payment", 42, currentY);
    doc.line(40, currentY + 1, pageWidth - 15, currentY + 1); // underline

    // Amount Box
    currentY += 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.rect(15, currentY - 6, 45, 12);
    doc.text(`BDT ${Number(transaction.amount).toLocaleString()}/-`, 37.5, currentY + 2, { align: "center" });

    // Signatures
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.line(pageWidth - 55, currentY + 5, pageWidth - 15, currentY + 5);
    doc.text("Authorized Signature", pageWidth - 35, currentY + 10, { align: "center" });

    doc.save(`Money_Receipt_${transaction.id.slice(-6)}.pdf`);
  } catch (err) {
    console.error("Failed to generate Money Receipt", err);
  }
};
