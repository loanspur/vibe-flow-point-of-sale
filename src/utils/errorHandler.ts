import { toast } from "@/hooks/use-toast";

export const handleError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  const message = error?.message || "An unexpected error occurred.";
  
  toast({
    title: "Error",
    description: message,
    variant: "destructive"
  });
};

export const handleSuccess = (message: string) => {
  toast({
    title: "Success",
    description: message,
  });
};