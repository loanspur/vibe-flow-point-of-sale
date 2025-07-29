import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banknote } from "lucide-react";

interface CashChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amountPaid: number;
  totalAmount: number;
  formatAmount: (amount: number) => string;
}

export function CashChangeModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  amountPaid, 
  totalAmount, 
  formatAmount 
}: CashChangeModalProps) {
  const changeAmount = amountPaid - totalAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Cash Payment - Change Due
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span>Total Amount:</span>
              <span className="font-semibold">{formatAmount(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Amount Paid:</span>
              <span className="font-semibold">{formatAmount(amountPaid)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-xl font-bold text-green-600">
              <span>Change Due:</span>
              <span>{formatAmount(changeAmount)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            Complete Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}