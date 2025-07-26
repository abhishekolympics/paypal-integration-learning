const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Generate PDF from HTML
const generatePDFFromHTML = async (htmlContent, filename) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                bottom: '10mm', 
                left: '10mm',
                right: '10mm'
            },
            displayHeaderFooter: false,
            preferCSSPageSize: true
        });
        
        return pdfBuffer;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

// FIXED: Transform order data with PROPER item consolidation and fixing kit handling
// const transformOrderData = (order) => {
//     const baseData = {
//         orderId: order.orderId,
//         customer: {
//             firstName: order.customer?.firstName || 'Customer',
//             lastName: order.customer?.lastName || '',
//             email: order.customer?.email || 'customer@example.com',
//             phone: order.customer?.phone || '',
//             address: order.customer?.address || 'Not provided',
//             city: order.customer?.city || 'Not provided',
//             postcode: order.customer?.postcode || 'Not provided',
//             country: order.customer?.country || 'GB'
//         },
//         orderStatus: order.orderStatus || 'processing',
//         paymentStatus: order.paymentStatus || 'paid',
//         pricing: {
//             subtotal: order.pricing?.subtotal || 0,
//             discount: order.pricing?.discount || 0,
//             discountCode: order.pricing?.discountCode || '',
//             shipping: order.pricing?.shipping || 0,
//             tax: order.pricing?.tax || 0,
//             taxRate: order.pricing?.taxRate || 0.20,
//             total: order.pricing?.total || order.payment?.amount || 0
//         },
//         payment: {
//             provider: order.payment?.provider || 'paypal',
//             transactionId: order.payment?.transactionId || order.payment?.paypalPaymentId || 'N/A',
//             amount: order.payment?.amount || order.pricing?.total || 0,
//             currency: order.payment?.currency || 'GBP'
//         },
//         dates: {
//             ordered: order.dates?.ordered || order.createdAt || new Date(),
//             paid: order.dates?.paid || new Date()
//         },
//         notes: order.notes || ''
//     };

//     // FIXED: Process items correctly
//     const rawItems = (order.items || []).map(item => {
//         // FIXED: Handle fixing kit items differently
//         if (item.type === 'fixing-kit') {
//             return {
//                 name: item.name || 'Fixing Kit',
//                 type: 'fixing-kit',
//                 price: item.price || 0,
//                 quantity: item.quantity || 1,
//                 subtotal: item.subtotal || 0,
//                 kitConfiguration: {
//                     contents: 'Sticky Pads & Screws',
//                     compatibility: 'Universal fit for all plate sizes',
//                     installation: 'Easy DIY installation',
//                     warranty: '12 months'
//                 }
//             };
//         } else {
//             // Handle plate items
//             return {
//                 name: item.name || 'Number Plate',
//                 type: item.type || 'plate',
//                 price: item.price || 0,
//                 quantity: item.quantity || 1,
//                 subtotal: item.subtotal || 0,
//                 plateConfiguration: {
//                     text: item.plateConfiguration?.text || item.registration || 'UNKNOWN',
//                     spacing: item.plateConfiguration?.spacing || 'legal',
//                     side: item.plateConfiguration?.side || 'front',
//                     size: {
//                         label: item.plateConfiguration?.size?.label || 'Standard Size'
//                     },
//                     plateStyle: {
//                         label: item.plateConfiguration?.plateStyle?.label || 'Standard Plate'
//                     },
//                     fontColor: {
//                         name: item.plateConfiguration?.fontColor?.name || 'Black'
//                     },
//                     border: {
//                         name: item.plateConfiguration?.border?.name || 'No Border'
//                     },
//                     finish: {
//                         label: item.plateConfiguration?.finish?.label || 'Standard Finish'
//                     },
//                     roadLegal: item.plateConfiguration?.roadLegal || 'No'
//                 }
//             };
//         }
//     });

//     // FIXED: Group ONLY plates with same text and side, keep fixing kits separate
//     const groupedItems = {};
    
//     rawItems.forEach(item => {
//         if (item.type === 'fixing-kit') {
//             // Don't group fixing kits, each one is unique
//             const uniqueKey = `fixing-kit-${Date.now()}-${Math.random()}`;
//             groupedItems[uniqueKey] = { ...item };
//         } else {
//             // Group plates only by text, side, and style (not name)
//             const groupKey = JSON.stringify({
//                 type: item.type,
//                 text: item.plateConfiguration.text,
//                 side: item.plateConfiguration.side,
//                 style: item.plateConfiguration.plateStyle.label
//             });
            
//             if (groupedItems[groupKey]) {
//                 // Combine quantities and prices
//                 groupedItems[groupKey].quantity += item.quantity;
//                 groupedItems[groupKey].subtotal += item.subtotal;
//             } else {
//                 // First occurrence of this item
//                 groupedItems[groupKey] = { ...item };
//             }
//         }
//     });

//     // Convert back to array and sort properly
//     const consolidatedItems = Object.values(groupedItems).sort((a, b) => {
//         // First, separate plates from fixing kits
//         if (a.type !== b.type) {
//             return a.type === 'plate' ? -1 : 1; // Plates first, then fixing kits
//         }
        
//         // For plates, sort by side (front first, then rear)
//         if (a.type === 'plate' && b.type === 'plate') {
//             const sideOrder = { 'FRONT': 0, 'front': 0, 'REAR': 1, 'rear': 1, 'both': 2 };
//             const sideA = sideOrder[a.plateConfiguration?.side] || 3;
//             const sideB = sideOrder[b.plateConfiguration?.side] || 3;
            
//             if (sideA !== sideB) return sideA - sideB;
            
//             // If same side, sort by text
//             return (a.plateConfiguration?.text || '').localeCompare(b.plateConfiguration?.text || '');
//         }
        
//         // For fixing kits, sort by name
//         return a.name.localeCompare(b.name);
//     });

//     console.log('🔍 Transformed Items:', consolidatedItems.map(item => ({
//         name: item.name,
//         type: item.type,
//         side: item.plateConfiguration?.side || 'N/A',
//         text: item.plateConfiguration?.text || item.kitConfiguration?.contents || 'N/A',
//         quantity: item.quantity
//     })));

//     return {
//         ...baseData,
//         items: consolidatedItems
//     };
// };

// FIXED: Transform order data with PROPER nested structure extraction
const transformOrderData = (order) => {
    const baseData = {
        orderId: order.orderId,
        customer: {
            firstName: order.customer?.firstName || 'Customer',
            lastName: order.customer?.lastName || '',
            email: order.customer?.email || 'customer@example.com',
            phone: order.customer?.phone || '',
            address: order.customer?.address || 'Not provided',
            city: order.customer?.city || 'Not provided',
            postcode: order.customer?.postcode || 'Not provided',
            country: order.customer?.country || 'GB'
        },
        orderStatus: order.orderStatus || 'processing',
        paymentStatus: order.paymentStatus || 'paid',
        pricing: {
            subtotal: order.pricing?.subtotal || 0,
            discount: order.pricing?.discount || 0,
            discountCode: order.pricing?.discountCode || '',
            shipping: order.pricing?.shipping || 0,
            tax: order.pricing?.tax || 0,
            taxRate: order.pricing?.taxRate || 0.20,
            total: order.pricing?.total || order.payment?.amount || 0
        },
        payment: {
            provider: order.payment?.provider || 'paypal',
            transactionId: order.payment?.transactionId || order.payment?.paypalPaymentId || 'N/A',
            amount: order.payment?.amount || order.pricing?.total || 0,
            currency: order.payment?.currency || 'GBP'
        },
        dates: {
            ordered: order.dates?.ordered || order.createdAt || new Date(),
            paid: order.dates?.paid || new Date()
        },
        notes: order.notes || ''
    };

    // FIXED: Process items with CORRECT nested structure extraction
    const rawItems = (order.items || []).map(item => {
        // FIXED: Handle fixing kit items differently
        if (item.type === 'fixing-kit') {
            return {
                name: item.name || 'Fixing Kit',
                type: 'fixing-kit',
                price: item.price || 0,
                quantity: item.quantity || 1,
                subtotal: item.subtotal || 0,
                kitConfiguration: {
                    contents: 'Sticky Pads & Screws',
                    compatibility: 'Universal fit for all plate sizes',
                    installation: 'Easy DIY installation',
                    warranty: '12 months'
                }
            };
        } else {
            // FIXED: Properly extract ALL plateConfiguration nested data
            const plateConfig = item.plateConfiguration || {};
            
            return {
                name: item.name || 'Number Plate',
                type: item.type || 'plate',
                price: item.price || 0,
                quantity: item.quantity || 1,
                subtotal: item.subtotal || 0,
                plateConfiguration: {
                    // ✅ FIXED: Extract text properly
                    text: plateConfig.text || item.registration || 'UNKNOWN',
                    spacing: plateConfig.spacing || 'legal',
                    side: plateConfig.side || 'front',
                    
                    // ✅ FIXED: Extract size object properly - THIS WAS THE MAIN ISSUE
                    size: {
                        key: plateConfig.size?.key || 'standard',
                        label: plateConfig.size?.label || 'Standard Size',
                        dimensions: plateConfig.size?.dimensions || '520mm x 111mm'
                    },
                    
                    // ✅ FIXED: Extract plateStyle object properly
                    plateStyle: {
                        key: plateConfig.plateStyle?.key || 'standard',
                        label: plateConfig.plateStyle?.label || 'Standard Plate',
                        font: plateConfig.plateStyle?.font || 'Charles Wright',
                        fontSize: plateConfig.plateStyle?.fontSize || 79,
                        price: plateConfig.plateStyle?.price || 0
                    },
                    
                    // ✅ FIXED: Extract fontColor object properly
                    fontColor: {
                        key: plateConfig.fontColor?.key || 'black',
                        name: plateConfig.fontColor?.name || 'Black',
                        color: plateConfig.fontColor?.color || '#000000',
                        price: plateConfig.fontColor?.price || 0
                    },
                    
                    // ✅ FIXED: Extract border object properly - THIS WAS MISSING
                    border: {
                        key: plateConfig.border?.key || 'none',
                        name: plateConfig.border?.name || 'No Border',
                        type: plateConfig.border?.type || 'none',
                        color: plateConfig.border?.color || '',
                        borderWidth: plateConfig.border?.borderWidth || 0,
                        price: plateConfig.border?.price || 0
                    },
                    
                    // ✅ FIXED: Extract countryBadge object properly - THIS WAS MISSING
                    countryBadge: {
                        key: plateConfig.countryBadge?.key || 'none',
                        name: plateConfig.countryBadge?.name || 'No Badge',
                        country: plateConfig.countryBadge?.country || 'none',
                        flagImage: plateConfig.countryBadge?.flagImage || '',
                        position: plateConfig.countryBadge?.position || 'left',
                        price: plateConfig.countryBadge?.price || 0
                    },
                    
                    // ✅ FIXED: Extract finish object properly - THIS WAS MISSING
                    finish: {
                        key: plateConfig.finish?.key || 'standard',
                        label: plateConfig.finish?.label || 'Standard Finish',
                        description: plateConfig.finish?.description || '',
                        price: plateConfig.finish?.price || 0
                    },
                    
                    // ✅ FIXED: Extract thickness object properly
                    thickness: {
                        key: plateConfig.thickness?.key || '3mm',
                        label: plateConfig.thickness?.label || '3mm Standard',
                        value: plateConfig.thickness?.value || 3,
                        price: plateConfig.thickness?.price || 0
                    },
                    
                    // ✅ FIXED: Extract shadowEffect object properly
                    shadowEffect: {
                        key: plateConfig.shadowEffect?.key || 'none',
                        name: plateConfig.shadowEffect?.name || 'No Effect',
                        description: plateConfig.shadowEffect?.description || '',
                        price: plateConfig.shadowEffect?.price || 0
                    },
                    
                    roadLegal: plateConfig.roadLegal || 'No',
                    legalNotes: plateConfig.legalNotes || (plateConfig.roadLegal === 'No' ? 'Show plates only - not for road use' : '')
                }
            };
        }
    });

    // FIXED: Group ONLY plates with same text, side, and ALL configuration details
    const groupedItems = {};
    
    rawItems.forEach(item => {
        if (item.type === 'fixing-kit') {
            // Don't group fixing kits, each one is unique
            const uniqueKey = `fixing-kit-${Date.now()}-${Math.random()}`;
            groupedItems[uniqueKey] = { ...item };
        } else {
            // ✅ FIXED: Create detailed grouping key that includes ALL configuration
            const groupKey = JSON.stringify({
                type: item.type,
                text: item.plateConfiguration.text,
                side: item.plateConfiguration.side,
                sizeKey: item.plateConfiguration.size.key,           // ✅ Include size key
                styleKey: item.plateConfiguration.plateStyle.key,    // ✅ Include style key
                borderKey: item.plateConfiguration.border.key,       // ✅ Include border key
                badgeKey: item.plateConfiguration.countryBadge.key,  // ✅ Include badge key
                finishKey: item.plateConfiguration.finish.key,       // ✅ Include finish key
                thicknessKey: item.plateConfiguration.thickness.key  // ✅ Include thickness key
            });
            
            if (groupedItems[groupKey]) {
                // Combine quantities and prices for IDENTICAL configurations
                groupedItems[groupKey].quantity += item.quantity;
                groupedItems[groupKey].subtotal += item.subtotal;
            } else {
                // First occurrence of this exact configuration
                groupedItems[groupKey] = { ...item };
            }
        }
    });

    // Convert back to array and sort properly
    const consolidatedItems = Object.values(groupedItems).sort((a, b) => {
        // First, separate plates from fixing kits
        if (a.type !== b.type) {
            return a.type === 'plate' ? -1 : 1; // Plates first, then fixing kits
        }
        
        // For plates, sort by side (front first, then rear)
        if (a.type === 'plate' && b.type === 'plate') {
            const sideOrder = { 'FRONT': 0, 'front': 0, 'REAR': 1, 'rear': 1, 'both': 2 };
            const sideA = sideOrder[a.plateConfiguration?.side] || 3;
            const sideB = sideOrder[b.plateConfiguration?.side] || 3;
            
            if (sideA !== sideB) return sideA - sideB;
            
            // If same side, sort by text
            return (a.plateConfiguration?.text || '').localeCompare(b.plateConfiguration?.text || '');
        }
        
        // For fixing kits, sort by name
        return a.name.localeCompare(b.name);
    });

    console.log('🔍 FIXED Transformed Items:', consolidatedItems.map(item => ({
        name: item.name,
        type: item.type,
        side: item.plateConfiguration?.side || 'N/A',
        text: item.plateConfiguration?.text || item.kitConfiguration?.contents || 'N/A',
        size: item.plateConfiguration?.size?.label || 'N/A',          // ✅ Now shows correct size
        border: item.plateConfiguration?.border?.name || 'N/A',       // ✅ Now shows correct border
        badge: item.plateConfiguration?.countryBadge?.name || 'N/A',  // ✅ Now shows correct badge
        finish: item.plateConfiguration?.finish?.label || 'N/A',      // ✅ Now shows correct finish
        quantity: item.quantity,
        price: item.subtotal
    })));

    return {
        ...baseData,
        items: consolidatedItems
    };
};

// FIXED: Generate Premium Invoice HTML with proper fixing kit handling
const generateReceiptHTML = (order, status = 'success') => {
    const isSuccess = status === 'success';
    const transformedOrder = transformOrderData(order);
    
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long', 
            year: 'numeric'
        });
    };
    
    const formatDateTime = (date) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Group items into pages (2 items per page with better spacing)
    const itemsPerPage = 2;
    const allItems = transformedOrder.items;
    
    const itemPages = [];
    for (let i = 0; i < allItems.length; i += itemsPerPage) {
        itemPages.push(allItems.slice(i, i + itemsPerPage));
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Premium Invoice - ${transformedOrder.orderId}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #1a1a1a;
                background: #ffffff;
                margin: 0;
                padding: 0;
            }
            
            /* PAGE SYSTEM - REDUCED MARGINS */
            .page {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                background: #ffffff;
                position: relative;
                page-break-after: always;
                padding: 0;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            
            .page:last-child {
                page-break-after: avoid;
            }
            
            .page-content {
                position: relative;
                z-index: 1;
                height: 100%;
                display: flex;
                flex-direction: column;
                padding: 30px;
                min-height: calc(297mm - 60px);
            }
            
            /* SMALLER MAIN HEADER */
            .main-header {
                background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
                color: white;
                padding: 25px 40px;
                margin: -30px -30px 30px -30px;
                position: relative;
                overflow: hidden;
            }
            
            .main-header::before {
                content: '';
                position: absolute;
                top: -50%;
                right: -20%;
                width: 300px;
                height: 300px;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                border-radius: 50%;
            }
            
            .main-header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 50%, #3b82f6 100%);
            }
            
            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: relative;
                z-index: 2;
            }
            
            .company-brand {
                display: flex;
                flex-direction: column;
            }
            
            .company-logo {
                font-size: 32px;
                font-weight: 900;
                letter-spacing: -2px;
                margin-bottom: 8px;
                background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                text-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            
            .company-tagline {
                font-size: 12px;
                opacity: 0.9;
                font-weight: 300;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                color: #cbd5e1;
            }
            
            .invoice-type-section {
                text-align: right;
            }
            
            .invoice-type-section h1 {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                letter-spacing: -1px;
            }
            
            .invoice-subtitle {
                font-size: 12px;
                opacity: 0.8;
                font-weight: 300;
                letter-spacing: 1px;
            }
            
            /* CONTINUATION HEADER FOR PAGES 2+ */
            .continuation-header {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border-bottom: 3px solid #3b82f6;
                padding: 15px 30px;
                margin: -30px -30px 20px -30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            .continuation-brand {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .continuation-logo {
                font-size: 20px;
                font-weight: 900;
                color: #1e293b;
                letter-spacing: -1px;
            }
            
            .continuation-order-info {
                color: #64748b;
                font-size: 11px;
                line-height: 1.4;
            }
            
            .continuation-order-info div {
                margin-bottom: 2px;
            }
            
            .continuation-order-info strong {
                color: #1e293b;
                font-weight: 600;
            }
            
            .page-indicator {
                text-align: right;
                color: #64748b;
                font-size: 11px;
            }
            
            .page-number {
                font-size: 16px;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 4px;
            }
            
            .page-description {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 500;
            }
            
            /* VERTICAL ORDER INFO */
            .order-info-section {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border: 2px solid #0ea5e9;
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 30px;
                box-shadow: 0 8px 20px rgba(14, 165, 233, 0.15);
            }
            
            .info-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid rgba(14, 165, 233, 0.2);
                margin-bottom: 12px;
            }
            
            .info-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            
            .info-label {
                font-size: 11px;
                color: #0c4a6e;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                font-weight: 700;
                flex: 0 0 140px;
            }
            
            .info-value {
                font-size: 14px;
                font-weight: 800;
                color: #1e293b;
                flex: 1;
                text-align: right;
                word-break: break-word;
            }
            
            .order-id {
                font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
                font-size: 12px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                font-weight: 700;
                letter-spacing: 1px;
                box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
                word-break: break-all;
            }
            
            .status-success {
                color: #059669;
                font-weight: 800;
                background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border: 2px solid #059669;
            }
            
            .status-failed {
                color: #dc2626;
                font-weight: 800;
                background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border: 2px solid #dc2626;
            }
            
            .amount-highlight {
                color: #059669;
                font-weight: 900;
                font-size: 18px;
                text-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
            }
            
            /* CONTENT SECTIONS */
            .content-section {
                margin: 30px 0;
                position: relative;
                flex: 1;
            }
            
            .section-header {
                font-size: 16px;
                font-weight: 800;
                color: #1e293b;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 2px;
                position: relative;
                padding-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .section-header::before {
                content: '';
                width: 4px;
                height: 20px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border-radius: 2px;
                flex-shrink: 0;
            }
            
            .section-header::after {
                content: '';
                flex: 1;
                height: 2px;
                background: linear-gradient(90deg, #3b82f6 0%, transparent 100%);
                border-radius: 1px;
            }
            
            /* COMPACT SHIPPING SECTION */
            .shipping-section {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border: 2px solid #e2e8f0;
                border-radius: 15px;
                padding: 25px;
                position: relative;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
                overflow: hidden;
            }
            
            .shipping-section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
            }
            
            .shipping-title {
                font-size: 14px;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 1px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .shipping-icon {
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                color: white;
                box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
            }
            
            .customer-name {
                font-weight: 800;
                font-size: 18px;
                color: #1e293b;
                margin-bottom: 15px;
                line-height: 1.3;
                letter-spacing: -0.5px;
            }
            
            .address-details {
                margin-bottom: 15px;
            }
            
            .address-line {
                color: #475569;
                margin-bottom: 6px;
                line-height: 1.5;
                font-size: 14px;
                padding-left: 15px;
                position: relative;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            .address-line::before {
                content: '•';
                position: absolute;
                left: 0;
                color: #3b82f6;
                font-weight: bold;
            }
            
            .contact-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 2px solid #f1f5f9;
            }
            
            .contact-item {
                display: flex;
                flex-direction: column;
                padding: 12px;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }
            
            .contact-label {
                font-weight: 700;
                color: #1e293b;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
            }
            
            .contact-value {
                color: #475569;
                font-weight: 500;
                font-size: 12px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            
            /* PLATE CARDS - PREMIUM SPACING (2 PER PAGE) */
            .plates-container {
                display: flex;
                flex-direction: column;
                gap: 60px;
                flex: 1;
                min-height: 500px;
                justify-content: space-evenly;
            }
            
            .plate-card {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 2px solid #f59e0b;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 12px 30px rgba(245, 158, 11, 0.2);
                page-break-inside: avoid;
                transition: all 0.3s ease;
                min-height: 180px;
            }
            
            .plate-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 20px 40px rgba(245, 158, 11, 0.3);
            }
            
            .plate-header {
                font-size: 16px;
                font-weight: 800;
                color: #92400e;
                margin-bottom: 25px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .plate-text-display {
                font-family: 'Courier New', monospace;
                background: #1e293b;
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                font-size: 20px;
                font-weight: bold;
                text-align: center;
                letter-spacing: 4px;
                margin-bottom: 25px;
                box-shadow: 0 6px 15px rgba(30, 41, 59, 0.4);
            }
            
            .plate-config-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 15px;
            }
            
            .config-item {
                background: rgba(255, 255, 255, 0.8);
                padding: 12px 15px;
                border-radius: 10px;
                border: 1px solid rgba(245, 158, 11, 0.3);
                font-size: 12px;
                color: #78350f;
                transition: all 0.2s ease;
            }
            
            .config-item:hover {
                background: rgba(255, 255, 255, 0.95);
                transform: translateY(-1px);
            }
            
            .config-label {
                font-weight: 700;
                margin-right: 8px;
                color: #92400e;
            }
            
            /* FIXING KIT STYLES - DIFFERENT FROM PLATES */
            .fixing-kit-card {
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border: 2px solid #0ea5e9;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 12px 30px rgba(14, 165, 233, 0.2);
                page-break-inside: avoid;
                min-height: 180px;
                transition: all 0.3s ease;
            }
            
            .fixing-kit-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 20px 40px rgba(14, 165, 233, 0.3);
            }
            
            .fixing-kit-header {
                font-size: 16px;
                font-weight: 800;
                color: #0c4a6e;
                margin-bottom: 25px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            /* FIXING KIT SPECIFIC GRID */
            .kit-config-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 15px;
            }
            
            .kit-config-item {
                background: rgba(255, 255, 255, 0.8);
                padding: 12px 15px;
                border-radius: 10px;
                border: 1px solid rgba(14, 165, 233, 0.3);
                font-size: 12px;
                color: #0c4a6e;
                transition: all 0.2s ease;
            }
            
            .kit-config-item:hover {
                background: rgba(255, 255, 255, 0.95);
                transform: translateY(-1px);
            }
            
            .kit-config-label {
                font-weight: 700;
                margin-right: 8px;
                color: #0369a1;
            }
            
            /* NO TEXT DISPLAY FOR FIXING KITS */
            .fixing-kit-card .plate-text-display {
                display: none;
            }
            
            /* FOOTER */
            .page-footer {
                margin-top: auto;
                padding-top: 20px;
                border-top: 2px solid #e2e8f0;
                text-align: center;
                color: #64748b;
                font-size: 10px;
                line-height: 1.5;
            }
            
            .footer-brand {
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 5px;
            }
            
            /* FAILURE STYLES */
            ${!isSuccess ? `
            .failure-notice {
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border: 2px solid #f87171;
                color: #7f1d1d;
                padding: 20px 30px;
                margin: 0 -30px 20px -30px;
                text-align: center;
                position: relative;
            }
            
            .failure-notice::before {
                content: '⚠️';
                font-size: 32px;
                position: absolute;
                top: 15px;
                left: 30px;
                opacity: 0.3;
            }
            
            .failure-title {
                font-size: 16px;
                font-weight: 700;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .failure-message {
                font-size: 12px;
                line-height: 1.6;
                margin-left: 60px;
            }
            ` : ''}
            
            /* PRINT OPTIMIZATIONS */
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                }
                
                .page {
                    box-shadow: none;
                    page-break-after: always;
                    padding: 20px;
                }
                
                .page:last-child {
                    page-break-after: avoid;
                }
                
                .plate-card, .fixing-kit-card {
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body>
        <!-- PAGE 1: ORDER OVERVIEW + SHIPPING -->
        <div class="page">
            <div class="page-content">
                <!-- Main Header -->
                <div class="main-header">
                    <div class="header-content">
                        <div class="company-brand">
                            <div class="company-logo">PlateForge</div>
                            <div class="company-tagline">Premium Number Plates</div>
                        </div>
                        <div class="invoice-type-section">
                            <h1>${isSuccess ? 'Invoice' : 'Order Details'}</h1>
                            <div class="invoice-subtitle">${isSuccess ? 'Original for Recipient' : 'Payment Processing Failed'}</div>
                        </div>
                    </div>
                </div>
                
                ${!isSuccess ? `
                <div class="failure-notice">
                    <div class="failure-title">Payment Could Not Be Processed</div>
                    <div class="failure-message">
                        ${transformedOrder.notes || 'Your payment was not completed successfully. Please try again or contact our support team for assistance.'}<br><br>
                        Your cart items have been securely saved and you can retry the payment at any time.
                    </div>
                </div>
                ` : ''}
                
                <!-- Order Info -->
                <div class="order-info-section">
                    <div class="info-row">
                        <div class="info-label">Order Number</div>
                        <div class="info-value">
                            <span class="order-id">${transformedOrder.orderId}</span>
                        </div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Order Date & Time</div>
                        <div class="info-value">${formatDateTime(transformedOrder.dates.ordered)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Payment Status</div>
                        <div class="info-value">
                            <span class="${isSuccess ? 'status-success' : 'status-failed'}">
                                ${isSuccess ? 'PAID' : 'FAILED'}
                            </span>
                        </div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Total Amount</div>
                        <div class="info-value amount-highlight">£${transformedOrder.pricing.total.toFixed(2)}</div>
                    </div>
                </div>
                
                <!-- Complete Shipping Information -->
                <div class="content-section">
                    <div class="section-header">🚚 Shipping Information</div>
                    <div class="shipping-section">
                        <div class="shipping-title">
                            <div class="shipping-icon">🚚</div>
                            Delivery Address
                        </div>
                        <div class="customer-name">${transformedOrder.customer.firstName} ${transformedOrder.customer.lastName}</div>
                        <div class="address-details">
                            <div class="address-line">${transformedOrder.customer.address}</div>
                            <div class="address-line">${transformedOrder.customer.city}, ${transformedOrder.customer.postcode}</div>
                            <div class="address-line">${transformedOrder.customer.country}</div>
                        </div>
                        
                        <div class="contact-grid">
                            <div class="contact-item">
                                <span class="contact-label">Email Address</span>
                                <span class="contact-value">${transformedOrder.customer.email}</span>
                            </div>
                            <div class="contact-item">
                                <span class="contact-label">Phone Number</span>
                                <span class="contact-value">${transformedOrder.customer.phone || 'Not provided'}</span>
                            </div>
                            <div class="contact-item">
                                <span class="contact-label">Delivery Method</span>
                                <span class="contact-value">Express Delivery</span>
                            </div>
                            <div class="contact-item">
                                <span class="contact-label">Estimated Delivery</span>
                                <span class="contact-value">${isSuccess ? '2-3 Business Days' : 'Pending Payment'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="page-footer">
                    <div class="footer-brand">PlateForge Ltd • Premium Number Plates</div>
                    <div>This is an automated invoice • For support: support@plateforge.com</div>
                </div>
            </div>
        </div>
        
        ${itemPages.map((pageItems, pageIndex) => `
        <!-- PAGE ${pageIndex + 2}: ITEMS DETAILS -->
        <div class="page">
            <div class="page-content">
                <!-- Continuation Header -->
                <div class="continuation-header">
                    <div class="continuation-brand">
                        <div class="continuation-logo">PlateForge</div>
                        <div class="continuation-order-info">
                            <div><strong>Order:</strong> ${transformedOrder.orderId}</div>
                            <div><strong>Customer:</strong> ${transformedOrder.customer.firstName} ${transformedOrder.customer.lastName}</div>
                            <div><strong>Date:</strong> ${formatDate(transformedOrder.dates.ordered)}</div>
                        </div>
                    </div>
                    <div class="page-indicator">
                        <div class="page-number">Page ${pageIndex + 2} of ${itemPages.length + 1}</div>
                        <div class="page-description">Product Details</div>
                    </div>
                </div>
                
                <!-- Items Container -->
                <div class="content-section">
                    <div class="section-header">🏁 Items Ordered</div>
                    <div class="plates-container">
                        ${pageItems.map(item => {
                            const isFixingKit = item.type === 'fixing-kit';
                            return `
                            <div class="${isFixingKit ? 'fixing-kit-card' : 'plate-card'}">
                                <div class="${isFixingKit ? 'fixing-kit-header' : 'plate-header'}">
                                    ${isFixingKit ? 
                                        item.name : 
                                        `${item.name} (${item.plateConfiguration.side.toUpperCase()} Plate)`
                                    }
                                </div>
                                
                                ${!isFixingKit ? `
                                <div class="plate-text-display">${item.plateConfiguration.text}</div>
                                ` : ''}
                                
                                <div class="${isFixingKit ? 'kit-config-grid' : 'plate-config-grid'}">
                                    ${isFixingKit ? `
                                        <div class="kit-config-item">
                                            <span class="kit-config-label">Contents:</span>
                                            <span>${item.kitConfiguration.contents}</span>
                                        </div>
                                        <div class="kit-config-item">
                                            <span class="kit-config-label">Compatibility:</span>
                                            <span>${item.kitConfiguration.compatibility}</span>
                                        </div>
                                        <div class="kit-config-item">
                                            <span class="kit-config-label">Installation:</span>
                                            <span>${item.kitConfiguration.installation}</span>
                                        </div>
                                        <div class="kit-config-item">
                                            <span class="kit-config-label">Warranty:</span>
                                            <span>${item.kitConfiguration.warranty}</span>
                                        </div>
                                        <div class="kit-config-item">
                                            <span class="kit-config-label">Quantity:</span>
                                            <span>${item.quantity}</span>
                                        </div>
                                        <div class="kit-config-item">
                                            <span class="kit-config-label">Price:</span>
                                            <span>£${item.subtotal.toFixed(2)}</span>
                                        </div>
                                    ` : `
                                        <div class="config-item">
                                            <span class="config-label">Size:</span>
                                            <span>${item.plateConfiguration.size.label}</span>
                                        </div>
                                        <div class="config-item">
                                            <span class="config-label">Style:</span>
                                            <span>${item.plateConfiguration.plateStyle.label}</span>
                                        </div>
                                        <div class="config-item">
                                            <span class="config-label">Color:</span>
                                            <span>${item.plateConfiguration.fontColor.name}</span>
                                        </div>
                                        <div class="config-item">
                                            <span class="config-label">Border:</span>
                                            <span>${item.plateConfiguration.border.name}</span>
                                        </div>
                                        <div class="config-item">
                                            <span class="config-label">Finish:</span>
                                            <span>${item.plateConfiguration.finish.label}</span>
                                        </div>
                                        <div class="config-item">
                                            <span class="config-label">Road Legal:</span>
                                            <span>${item.plateConfiguration.roadLegal}</span>
                                        </div>
                                        <div class="config-item">
                                            <span class="config-label">Quantity:</span>
                                            <span>${item.quantity}</span>
                                        </div>
                                        <div class="config-item">
                                            <span class="config-label">Price:</span>
                                            <span>£${item.subtotal.toFixed(2)}</span>
                                        </div>
                                    `}
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="page-footer">
                    <div class="footer-brand">PlateForge Ltd • Premium Number Plates</div>
                    <div>This is an automated invoice • For support: support@plateforge.com</div>
                </div>
            </div>
        </div>
        `).join('')}
    </body>
    </html>
    `;
};

// Send Success Email
const sendSuccessEmail = async (order) => {
    try {
        const transporter = createTransporter();
        const htmlContent = generateReceiptHTML(order, 'success');
        const pdfBuffer = await generatePDFFromHTML(htmlContent, `invoice-${order.orderId}.pdf`);
        
        const mailOptions = {
            from: {
                name: 'PlateForge Premium',
                address: process.env.EMAIL_USER
            },
            to: order.customer.email,
            subject: `✅ Order Confirmed - ${order.orderId} - Payment Successful`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
                    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3748 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">PlateForge</h1>
                        <p style="margin: 8px 0 0 0; opacity: 0.9;">Premium Number Plates</p>
                    </div>
                    
                    <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h2 style="color: #1a2332; margin: 0 0 20px 0;">🎉 Order Confirmed Successfully!</h2>
                        
                        <p style="margin: 0 0 20px 0; color: #4b5563; line-height: 1.6;">
                            Dear ${order.customer.firstName} ${order.customer.lastName},<br><br>
                            Thank you for your order! Your payment has been successfully processed and your custom number plates are now in production.
                        </p>
                        
                        <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <div style="font-weight: 600; margin-bottom: 10px;">📋 Order Summary:</div>
                            <div style="font-size: 14px; color: #0c4a6e;">
                                <strong>Order ID:</strong> ${order.orderId}<br>
                                <strong>Total Amount:</strong> £${order.pricing?.total?.toFixed(2) || '0.00'}<br>
                                <strong>Items:</strong> ${order.items?.length || 0} ${(order.items?.length || 0) === 1 ? 'item' : 'items'}<br>
                                <strong>Delivery:</strong> 2-3 Business Days
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 15px 30px; border-radius: 8px; display: inline-block; font-weight: 600;">
                                ✅ Order Status: Confirmed & Processing
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 12px;">
                        PlateForge Ltd • Premium Number Plates<br>
                        This is an automated confirmation email.
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `PlateForge-Invoice-${order.orderId}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Success email sent with invoice:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Error sending success email:', error);
        return { success: false, error: error.message };
    }
};

// Send Failure Email
const sendFailureEmail = async (order) => {
    try {
        const transporter = createTransporter();
        const htmlContent = generateReceiptHTML(order, 'failure');
        const pdfBuffer = await generatePDFFromHTML(htmlContent, `order-details-${order.orderId}.pdf`);
        
        const mailOptions = {
            from: {
                name: 'PlateForge Support',
                address: process.env.EMAIL_USER
            },
            to: order.customer.email,
            subject: `⚠️ Payment Issue - ${order.orderId} - We're Here to Help`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fef2f2; padding: 40px 20px;">
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">PlateForge</h1>
                        <p style="margin: 8px 0 0 0; opacity: 0.9;">Premium Number Plates</p>
                    </div>
                    
                    <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h2 style="color: #dc2626; margin: 0 0 20px 0;">⚠️ Payment Processing Issue</h2>
                        
                        <p style="margin: 0 0 20px 0; color: #4b5563; line-height: 1.6;">
                            Dear ${order.customer.firstName} ${order.customer.lastName},<br><br>
                            We encountered an issue processing your payment for order ${order.orderId}. Don't worry - your cart items have been securely saved and you can easily retry your purchase.
                        </p>
                        
                        <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <div style="font-weight: 600; margin-bottom: 10px;">📋 Order Details:</div>
                            <div style="font-size: 14px; color: #92400e;">
                                <strong>Order ID:</strong> ${order.orderId}<br>
                                <strong>Issue:</strong> ${order.notes || 'Payment could not be processed'}<br>
                                <strong>Amount:</strong> £${order.pricing?.total?.toFixed(2) || '0.00'}<br>
                                <strong>Items:</strong> ${order.items?.length || 0} ${(order.items?.length || 0) === 1 ? 'item' : 'items'} (saved)
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 15px 30px; border-radius: 8px; display: inline-block; font-weight: 600;">
                                ❌ Payment Status: Processing Failed
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 12px;">
                        PlateForge Ltd • Premium Number Plates<br>
                        Need immediate help? Contact us at support@plateforge.com
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `PlateForge-Order-Details-${order.orderId}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Failure email sent with order details:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Error sending failure email:', error);
        return { success: false, error: error.message };
    }
};

// Test email configuration
const testEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('✅ Email configuration is valid');
        return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
        console.error('❌ Email configuration error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendSuccessEmail,
    sendFailureEmail,
    testEmailConfig,
    generateReceiptHTML,
    generatePDFFromHTML
};