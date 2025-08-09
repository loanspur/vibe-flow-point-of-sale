import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

const unitSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  abbreviation: z.string().min(1, "Abbreviation is required"),
  code: z.string().min(1, "Code is required"),
  is_base_unit: z.boolean().default(false),
  base_unit_id: z.string().nullable().optional(),
  conversion_factor: z.coerce.number().positive().default(1),
  is_active: z.boolean().default(true),
});

type UnitFormData = z.infer<typeof unitSchema>;

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
      ...initialData,
    },
  });

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
  }, [abbrVal, nameVal, manualCode, makeUniqueCode]);

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
            </div>
            <div className="space-y-2">
              <Label htmlFor="abbreviation">Abbreviation</Label>
              <Input id="abbreviation" {...form.register("abbreviation")} />
            </div>
          </div>

<div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code (unique)</Label>
              <Input id="code" {...codeReg} onChange={(e) => { setManualCode(true); codeReg.onChange(e); }} />
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
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={form.handleSubmit((data) => onSubmit(data))}>
            {initialData?.id ? "Save Changes" : "Create Unit"}
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

  const createMutation = useMutation({
    mutationFn: async (payload: UnitFormData) => {
const insertData = {
        tenant_id: tenantId,
        name: payload.name,
        abbreviation: payload.abbreviation,
        code: payload.code,
        is_base_unit: payload.is_base_unit,
        base_unit_id: payload.is_base_unit ? null : (payload.base_unit_id || null),
        conversion_factor: payload.is_base_unit ? 1 : (payload.conversion_factor || 1),
        is_active: payload.is_active,
      };
      const { error } = await supabase.from("product_units").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product_units", tenantId] });
      toast({ title: "Unit created" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Failed to create unit", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UnitFormData) => {
      if (!payload.id) throw new Error("Missing unit id");
const updateData = {
        name: payload.name,
        abbreviation: payload.abbreviation,
        code: payload.code,
        is_base_unit: payload.is_base_unit,
        base_unit_id: payload.is_base_unit ? null : (payload.base_unit_id || null),
        conversion_factor: payload.is_base_unit ? 1 : (payload.conversion_factor || 1),
        is_active: payload.is_active,
      };
      const { error } = await supabase
        .from("product_units")
        .update(updateData)
        .eq("id", payload.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product_units", tenantId] });
      toast({ title: "Unit updated" });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Failed to update unit", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_units")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product_units", tenantId] });
      toast({ title: "Unit deleted" });
    },
    onError: (e: any) => toast({ title: "Unable to delete unit", description: e.message, variant: "destructive" }),
  });

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
      updateMutation.mutate({ ...data, id: editing.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
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
                          onClick={() => deleteMutation.mutate(u.id)}
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
  );
}
