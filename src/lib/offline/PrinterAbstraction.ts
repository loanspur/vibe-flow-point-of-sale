// Printer abstraction layer for cross-platform printing support

export interface Printer {
  id: string;
  name: string;
  type: 'thermal' | 'inkjet' | 'laser' | 'label' | 'receipt';
  connection: 'usb' | 'bluetooth' | 'network' | 'wifi' | 'serial';
  status: 'online' | 'offline' | 'error' | 'paper_out' | 'ink_low';
  capabilities: PrinterCapabilities;
  settings: PrinterSettings;
}

export interface PrinterCapabilities {
  paperSizes: string[];
  resolutions: number[];
  colors: boolean;
  duplex: boolean;
  autoCut: boolean;
  autoFeed: boolean;
  barcodeSupport: boolean;
  qrCodeSupport: boolean;
}

export interface PrinterSettings {
  paperSize: string;
  resolution: number;
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  copies: number;
}

export interface PrintJob {
  id: string;
  printerId: string;
  type: 'receipt' | 'label' | 'report' | 'invoice';
  content: PrintContent;
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface PrintContent {
  type: 'text' | 'html' | 'raw' | 'template';
  data: string | ReceiptTemplate | LabelTemplate;
  format?: 'escpos' | 'zpl' | 'epcl' | 'html';
}

export interface ReceiptTemplate {
  header: {
    logo?: string;
    businessName: string;
    address?: string;
    phone?: string;
    taxId?: string;
  };
  items: ReceiptItem[];
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paid: number;
    change: number;
  };
  footer: {
    thankYouMessage?: string;
    returnPolicy?: string;
    website?: string;
    socialMedia?: string[];
  };
  metadata: {
    receiptNumber: string;
    date: string;
    cashier: string;
    paymentMethod: string;
  };
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  barcode?: string;
}

export interface LabelTemplate {
  type: 'product' | 'price' | 'barcode' | 'qr' | 'custom';
  content: {
    text?: string;
    barcode?: string;
    qrCode?: string;
    image?: string;
  };
  size: {
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
}

export interface PrintResult {
  success: boolean;
  jobId?: string;
  error?: string;
  printerStatus?: string;
}

// ESC/POS commands for thermal printers
export const ESCPOS_COMMANDS = {
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_LEFT: '\x1B\x61\x00',
  FEED_LINE: '\x0A',
  CUT_PAPER: '\x1D\x56\x00',
  INIT: '\x1B\x40'
};

export class PrinterAbstraction {
  private printers: Map<string, Printer> = new Map();
  private printQueue: PrintJob[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.initializeDefaultPrinters();
  }

  // Initialize default printers
  private initializeDefaultPrinters(): void {
    // Default web printer
    const webPrinter: Printer = {
      id: 'web_printer',
      name: 'Browser Print',
      type: 'laser',
      connection: 'network',
      status: 'online',
      capabilities: {
        paperSizes: ['A4', 'Letter', 'Legal'],
        resolutions: [300, 600],
        colors: true,
        duplex: true,
        autoCut: false,
        autoFeed: true,
        barcodeSupport: false,
        qrCodeSupport: false
      },
      settings: {
        paperSize: 'A4',
        resolution: 300,
        orientation: 'portrait',
        margins: { top: 10, bottom: 10, left: 10, right: 10 },
        copies: 1
      }
    };

    this.printers.set(webPrinter.id, webPrinter);
  }

  // Discover available printers
  async discoverPrinters(): Promise<Printer[]> {
    const printers: Printer[] = [];

    try {
      // Add default web printer
      printers.push(this.printers.get('web_printer')!);

      // Simulate discovering additional printers
      const mockPrinters: Printer[] = [
        {
          id: 'thermal_1',
          name: 'Thermal Receipt Printer',
          type: 'thermal',
          connection: 'usb',
          status: 'online',
          capabilities: {
            paperSizes: ['80mm', '58mm'],
            resolutions: [203, 300],
            colors: false,
            duplex: false,
            autoCut: true,
            autoFeed: true,
            barcodeSupport: true,
            qrCodeSupport: true
          },
          settings: {
            paperSize: '80mm',
            resolution: 203,
            orientation: 'portrait',
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            copies: 1
          }
        },
        {
          id: 'label_1',
          name: 'Label Printer',
          type: 'label',
          connection: 'bluetooth',
          status: 'online',
          capabilities: {
            paperSizes: ['50mm', '100mm'],
            resolutions: [203, 300],
            colors: false,
            duplex: false,
            autoCut: true,
            autoFeed: true,
            barcodeSupport: true,
            qrCodeSupport: true
          },
          settings: {
            paperSize: '50mm',
            resolution: 203,
            orientation: 'portrait',
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            copies: 1
          }
        }
      ];

      mockPrinters.forEach(printer => {
        this.printers.set(printer.id, printer);
        printers.push(printer);
      });

      console.log(`Discovered ${printers.length} printers`);
    } catch (error) {
      console.error('Error discovering printers:', error);
    }

    return printers;
  }

  // Connect to a printer
  async connectPrinter(printerId: string): Promise<boolean> {
    try {
      const printer = this.printers.get(printerId);
      if (!printer) {
        throw new Error(`Printer ${printerId} not found`);
      }

      console.log(`Connected to printer: ${printer.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to connect to printer ${printerId}:`, error);
      return false;
    }
  }

  // Print receipt
  async printReceipt(receipt: ReceiptTemplate): Promise<PrintResult> {
    try {
      const job: PrintJob = {
        id: `receipt_${Date.now()}`,
        printerId: 'web_printer',
        type: 'receipt',
        content: {
          type: 'template',
          data: receipt,
          format: 'html'
        },
        status: 'pending',
        priority: 'normal',
        created_at: new Date().toISOString()
      };

      this.printQueue.push(job);
      this.processPrintQueue();

      return {
        success: true,
        jobId: job.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Print label
  async printLabel(label: LabelTemplate): Promise<PrintResult> {
    try {
      const job: PrintJob = {
        id: `label_${Date.now()}`,
        printerId: 'web_printer',
        type: 'label',
        content: {
          type: 'template',
          data: label,
          format: 'html'
        },
        status: 'pending',
        priority: 'normal',
        created_at: new Date().toISOString()
      };

      this.printQueue.push(job);
      this.processPrintQueue();

      return {
        success: true,
        jobId: job.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Process print queue
  private async processPrintQueue(): Promise<void> {
    if (this.isProcessing || this.printQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift();
      if (!job) continue;

      try {
        job.status = 'printing';
        job.started_at = new Date().toISOString();

        await this.executePrintJob(job);

        job.status = 'completed';
        job.completed_at = new Date().toISOString();
      } catch (error) {
        job.status = 'failed';
        job.error_message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Print job ${job.id} failed:`, error);
      }
    }

    this.isProcessing = false;
  }

  // Execute a print job
  private async executePrintJob(job: PrintJob): Promise<void> {
    const printer = this.printers.get(job.printerId);
    if (!printer) {
      throw new Error(`Printer ${job.printerId} not found`);
    }

    // Use browser print API for web printer
    if (printer.id === 'web_printer') {
      await this.executeWebPrintJob(job, printer);
    } else {
      // Simulate printing for other printer types
      console.log(`Executing print job ${job.id} on ${printer.name}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Execute web print job
  private async executeWebPrintJob(job: PrintJob, printer: Printer): Promise<void> {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Job ${job.id}</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              .receipt { max-width: 300px; margin: 0 auto; }
              .header { text-align: center; font-weight: bold; }
              .items { margin: 20px 0; }
              .totals { border-top: 1px solid #000; padding-top: 10px; }
              .footer { text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="receipt">
              ${this.generateReceiptHTML(job.content.data as ReceiptTemplate)}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  }

  // Generate receipt HTML for web printing
  private generateReceiptHTML(receipt: ReceiptTemplate): string {
    return `
      <div class="header">
        <h2>${receipt.header.businessName}</h2>
        ${receipt.header.address ? `<p>${receipt.header.address}</p>` : ''}
        ${receipt.header.phone ? `<p>${receipt.header.phone}</p>` : ''}
        ${receipt.header.taxId ? `<p>Tax ID: ${receipt.header.taxId}</p>` : ''}
      </div>
      
      <hr>
      
      <div class="metadata">
        <p><strong>Receipt:</strong> ${receipt.metadata.receiptNumber}</p>
        <p><strong>Date:</strong> ${receipt.metadata.date}</p>
        <p><strong>Cashier:</strong> ${receipt.metadata.cashier}</p>
      </div>
      
      <hr>
      
      <div class="items">
        ${receipt.items.map(item => `
          <div class="item">
            <p><strong>${item.name}</strong></p>
            <p>${item.quantity} x ${item.unitPrice.toFixed(2)} = ${item.totalPrice.toFixed(2)}</p>
            ${item.discount ? `<p>Discount: -${item.discount.toFixed(2)}</p>` : ''}
          </div>
        `).join('')}
      </div>
      
      <div class="totals">
        <p><strong>Subtotal:</strong> ${receipt.totals.subtotal.toFixed(2)}</p>
        <p><strong>Tax:</strong> ${receipt.totals.tax.toFixed(2)}</p>
        ${receipt.totals.discount > 0 ? `<p><strong>Discount:</strong> -${receipt.totals.discount.toFixed(2)}</p>` : ''}
        <h3><strong>TOTAL:</strong> ${receipt.totals.total.toFixed(2)}</h3>
        <p><strong>Paid:</strong> ${receipt.totals.paid.toFixed(2)}</p>
        <p><strong>Change:</strong> ${receipt.totals.change.toFixed(2)}</p>
        <p><strong>Payment:</strong> ${receipt.metadata.paymentMethod}</p>
      </div>
      
      <hr>
      
      <div class="footer">
        ${receipt.footer.thankYouMessage ? `<p>${receipt.footer.thankYouMessage}</p>` : ''}
        ${receipt.footer.website ? `<p>${receipt.footer.website}</p>` : ''}
      </div>
    `;
  }

  // Get printer status
  async getPrinterStatus(printerId: string): Promise<string> {
    const printer = this.printers.get(printerId);
    return printer?.status || 'unknown';
  }

  // Get print queue
  async getPrintQueue(): Promise<PrintJob[]> {
    return [...this.printQueue];
  }

  // Cancel print job
  async cancelPrintJob(jobId: string): Promise<boolean> {
    const jobIndex = this.printQueue.findIndex(job => job.id === jobId);
    if (jobIndex !== -1) {
      const job = this.printQueue[jobIndex];
      job.status = 'cancelled';
      this.printQueue.splice(jobIndex, 1);
      return true;
    }
    return false;
  }
}
