// components/invoice/DiscountInput.jsx
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function DiscountInput({ discount, onChange, total }) {
  const calculateDiscount = (type, value) => {
    if (type === "percent") {
      return total * (value / 100);
    }
    return value;
  };

  return (
    <div className="space-y-2">
      <Label>Apply Discount</Label>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Amount"
          value={discount.value}
          onChange={(e) =>
            onChange({ ...discount, value: parseFloat(e.target.value) || 0 })
          }
          className="flex-1"
        />
        <Select
          value={discount.type}
          onValueChange={(value) => onChange({ ...discount, type: value })}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flat">₹</SelectItem>
            <SelectItem value="percent">%</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {discount.value > 0 && (
        <p className="text-sm text-muted-foreground">
          Discount: ₹
          {calculateDiscount(discount.type, discount.value).toFixed(2)}
        </p>
      )}
    </div>
  );
}
