import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnitCRUD } from "@/hooks/useUnifiedCRUD";
import { unitSchema, UnitFormData } from "@/lib/validation-schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FeatureGuard } from '@/components/FeatureGuard';



type UnitRecord = {
  id: string;
  name: string;
  abbreviation: string;
  code: string;
  is_base_unit: boolean;
  base_unit_id: string | null;
  conversion_factor: number | null;
  is_active: boolean | null;
};

function UnitForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  baseUnits,
  existingCodes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData?: Partial<UnitFormData>;
  onSubmit: (data: UnitFormData) => void;
  baseUnits: UnitRecord[];
  existingCodes: string[];
}) {
  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      code: "",
      is_base_unit: false,
      base_unit_id: null,
      conversion_factor: 1,
      is_active: true,
    },
  });

  // Reset form when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        abbreviation: initialData.abbreviation || "",
        code: initialData.code || "",
        is_base_unit: initialData.is_base_unit || false,
        base_unit_id: initialData.base_unit_id || null,
        conversion_factor: initialData.conversion_factor || 1,
        is_active: initialData.is_active ?? true,
      });
    } else {
      // Reset to defaults for new unit
      form.reset({
        name: "",
        abbreviation: "",
        code: "",
        is_base_unit: false,
        base_unit_id: null,
        conversion_factor: 1,
        is_active: true,
      });
    }
  }, [initialData, form]);

  const isBase = form.watch("is_base_unit");

  const codeReg = form.register("code");
  const [manualCode, setManualCode] = useState(false);
  const nameVal = form.watch("name");
  const abbrVal = form.watch("abbreviation");
  const reservedCodes = useMemo(
    () => (existingCodes || []).filter((c) => c !== (initialData?.code || "")),
    [existingCodes, initialData?.code]
  );

  const makeUniqueCode = useCallback(
    (base: string) => {
      const fromAbbr = abbrVal?.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const clean = base.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const root = (fromAbbr && fromAbbr.length >= 2)
        ? fromAbbr
        : clean.slice(0, 3) || "U";
      let candidate = root;
      let idx = 2;
      const exists = (val: string) => reservedCodes.includes(val);
      while (exists(candidate)) {
        candidate = `${root}-${idx++}`;
      }
      return candidate;
    },
    [abbrVal, reservedCodes]
  );

  useEffect(() => {
    if (manualCode) return;
    const base = abbrVal || nameVal;
    if (!base) return;
    const current = form.getValues("code");
    if (!current || current === (initialData?.code || "")) {
      form.setValue("code", makeUniqueCode(String(base)));
    }
  }, [abbrVal, nameVal, manualCode, makeUniqueCode, form, initialData?.code]);

  // Reset manual code flag when form is reset
  useEffect(() => {
    if (initialData?.code) {
      setManualCode(true);
    } else {
      setManualCode(false);
    }
  }, [initialData?.code]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData?.id ? "Edit Unit" : "New Unit"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="abbreviation">Abbreviation</Label>
              <Input id="abbreviation" {...form.register("abbreviation")} />
              {form.formState.errors.abbreviation && (
                <p className="text-sm text-red-500">{form.formState.errors.abbreviation.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code (unique)</Label>
              <Input id="code" {...codeReg} onChange={(e) => { setManualCode(true); codeReg.onChange(e); }} />
              {form.formState.errors.code && (
                <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label htmlFor="is_base_unit">Is Base Unit</Label>
              <div className="flex items-center gap-3">
                <Switch id="is_base_unit" checked={isBase} onCheckedChange={(v) => {
                  form.setValue("is_base_unit", v);
                  if (v) {
                    form.setValue("base_unit_id", null);
                    form.setValue("conversion_factor", 1);
                  }
                }} />
                <span className="text-sm opacity-80">Base units have conversion factor 1</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active">Active</Label>
              <Switch id="is_active" checked={form.watch("is_active")} onCheckedChange={(v) => form.setValue("is_active", v)} />
            </div>
          </div>

          {!isBase && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Unit</Label>
                <Select
                  value={form.watch("base_unit_id") || undefined}
                  onValueChange={(v) => form.setValue("base_unit_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select base unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {baseUnits.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conversion_factor">Conversion Factor</Label>
                <Input id="conversion_factor" type="number" step="0.0001" min={0.000001} {...form.register("conversion_factor", { valueAsNumber: true })} />
                {form.formState.errors.conversion_factor && (
                  <p className="text-sm text-red-500">{form.formState.errors.conversion_factor.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button 
            onClick={form.handleSubmit((data) => onSubmit(data))}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting 
              ? "Saving..." 
              : initialData?.id 
                ? "Save Changes" 
                : "Create Unit"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UnitsManagement() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UnitRecord | null>(null);

  const { data: units = [], isLoading } = useQuery<UnitRecord[]>({
    queryKey: ["product_units", tenantId],
    queryFn: async () => {
const { data, error } = await supabase
        .from("product_units")
        .select("id, name, abbreviation, code, base_unit_id, conversion_factor, is_active")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      const withComputed = (data || []).map((d: any) => ({
        ...d,
        is_base_unit: !d.base_unit_id,
      }));
      return withComputed as UnitRecord[];
    },
    enabled: !!tenantId,
  });

  const baseUnits = useMemo(() => units.filter(u => !!u.is_base_unit), [units]);

  // Use unified CRUD hook
  const { create: createUnit, update: updateUnit, delete: deleteUnit, isCreating, isUpdating, isDeleting } = useUnitCRUD();

  const startCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const startEdit = (u: UnitRecord) => {
    setEditing(u);
    setDialogOpen(true);
  };

  const handleSubmit = (data: UnitFormData) => {
    if (editing?.id) {
      updateUnit({ id: editing.id, data });
      setDialogOpen(false);
      setEditing(null);
    } else {
      createUnit(data);
      setDialogOpen(false);
    }
  };

  return (
    <FeatureGuard featureName="enable_product_units">
      <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Units of Measure</CardTitle>
          <CardDescription>Manage base and derived units for your products</CardDescription>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Unit
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center opacity-80">Loading units…</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
<TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Abbr.</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Base Unit</TableHead>
                  <TableHead>Factor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((u) => (
                  <TableRow key={u.id}>
<TableCell>{u.name}</TableCell>
                    <TableCell>{u.abbreviation}</TableCell>
                    <TableCell>{u.code}</TableCell>
                    <TableCell>{u.is_base_unit ? "Base" : "Derived"}</TableCell>
                    <TableCell>{u.is_base_unit ? "—" : (units.find(x => x.id === u.base_unit_id)?.abbreviation || "—")}</TableCell>
                    <TableCell>{u.is_base_unit ? 1 : (u.conversion_factor || 1)}</TableCell>
                    <TableCell>{u.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => startEdit(u)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteUnit(u.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {units.length === 0 && (
                  <TableRow>
<TableCell colSpan={8} className="text-center py-10 opacity-80">
                      No units yet. Create your first one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <UnitForm
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
initialData={editing ? {
          id: editing.id,
          name: editing.name,
          abbreviation: editing.abbreviation,
          code: editing.code,
          is_base_unit: !!editing.is_base_unit,
          base_unit_id: editing.base_unit_id,
          conversion_factor: editing.conversion_factor ?? (editing.is_base_unit ? 1 : 1),
          is_active: !!editing.is_active,
        } : undefined}
        onSubmit={handleSubmit}
        baseUnits={baseUnits}
        existingCodes={units.map(u => u.code)}
      />
    </Card>
    </FeatureGuard>
  );
}
