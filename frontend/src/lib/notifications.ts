import type { AxiosError } from "axios";
import toast from "react-hot-toast";

type ZodFlattenDetails = {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
};

export function getErrorMessage(error: unknown, fallback = "Une erreur est survenue.") {
  const axiosError = error as AxiosError<{ message?: string; details?: ZodFlattenDetails }>;
  if (axiosError?.response?.data) {
    const { message, details } = axiosError.response.data;

    // Zod validation error — extract human-readable field messages
    if (message === "Validation error" && details) {
      const fieldErrors = Object.values(details.fieldErrors ?? {})
        .flat()
        .filter(Boolean) as string[];
      const formErrors = details.formErrors ?? [];
      const all = [...formErrors, ...fieldErrors];
      if (all.length > 0) return all.join(" · ");
      return "Données invalides. Vérifiez les valeurs saisies.";
    }

    if (message) return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export const notify = {
  success(message: string) {
    return toast.success(message, { duration: 3600 });
  },
  error(message: string) {
    return toast.error(message, { duration: 4200 });
  },
  info(message: string) {
    return toast(message, { duration: 3200 });
  },
};
