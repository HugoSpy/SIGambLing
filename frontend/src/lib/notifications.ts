import toast from "react-hot-toast";

export function getErrorMessage(error: unknown, fallback = "Une erreur est survenue.") {
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
