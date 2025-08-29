import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banknote } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface CashChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amountPaid: number;
  totalAmount: number;
  // Remove formatAmount from props since we'll use useApp
}

export function CashChangeModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  amountPaid, 
  totalAmount
}: CashChangeModalProps) {
  const { formatCurrency } = useApp();
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
              <span className="font-semibold">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Amount Received:</span>
              <span className="font-semibold">{formatCurrency(amountPaid)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-xl font-bold text-green-600">
              <span>Change Issued:</span>
              <span>{formatCurrency(changeAmount)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            Issue Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}