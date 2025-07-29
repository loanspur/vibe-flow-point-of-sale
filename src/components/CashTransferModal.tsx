import { useState } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CashDrawer } from '@/hooks/useCashDrawer';
import { ArrowRightLeft } from 'lucide-react';

interface CashTransferModalProps {
  allDrawers: CashDrawer[];
  currentDrawer: CashDrawer;
  onTransfer: (toDrawerId: string, amount: number, reason?: string) => Promise<void>;
  onClose: () => void;
  formatAmount: (amount: number) => string;
}

export function CashTransferModal({
  allDrawers,
  currentDrawer,
  onTransfer,
  onClose,
  formatAmount
}: CashTransferModalProps) {
  const [selectedDrawerId, setSelectedDrawerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableDrawers = allDrawers.filter(
    drawer => drawer.id !== currentDrawer.id && drawer.status === 'open'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawerId || !amount) return;

    const transferAmount = Number(amount);
    if (transferAmount <= 0 || transferAmount > currentDrawer.current_balance) {
      alert('Invalid transfer amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await onTransfer(selectedDrawerId, transferAmount, reason || undefined);
      onClose();
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Transfer Cash
        </DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Current Balance</Label>
          <div className="p-3 bg-muted rounded-lg font-medium">
            {formatAmount(currentDrawer.current_balance)}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="drawer">Transfer To</Label>
          <Select value={selectedDrawerId} onValueChange={setSelectedDrawerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a cash drawer" />
            </SelectTrigger>
            <SelectContent>
              {availableDrawers.map((drawer) => (
                <SelectItem key={drawer.id} value={drawer.id}>
                  {drawer.drawer_name} - {formatAmount(drawer.current_balance)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={currentDrawer.current_balance}
            step="0.01"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason (Optional)</Label>
          <Textarea
            id="reason"
            placeholder="Reason for transfer..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!selectedDrawerId || !amount || isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Create Transfer Request'}
          </Button>
        </div>
      </form>
    </>
  );
}