import { supabase } from "@/integrations/supabase/client";
import { handleError } from "./errorHandler";

export const duplicateRecord = async (
  table: string, 
  record: any, 
  nameField: string = 'name'
) => {
  try {
    const duplicatedRecord = {
      ...record,
      id: undefined,
      [nameField]: `${record[nameField]} (Copy)`
    };
    
    const { data, error } = await supabase
      .from(table)
      .insert([duplicatedRecord])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleError(error, `duplicateRecord for table ${table}`);
    throw error;
  }
};