import { useToast } from "@/components/ui/use-toast";

export function useToaster() {
  const { toast } = useToast();

  return {
    success: (message: string) => {
      toast({
        title: "Success",
        description: message,
      });
    },
    error: (message: string) => {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
    info: (message: string) => {
      toast({
        title: "Info",
        description: message,
      });
    },
    warning: (message: string) => {
      toast({
        title: "Warning",
        description: message,
      });
    },
  };
}
