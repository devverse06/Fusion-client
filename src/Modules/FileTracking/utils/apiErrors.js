export function getApiErrorMessage(error, fallbackMessage = "Something went wrong. Please try again.") {
    if (error?.code === "ERR_NETWORK") {
        return "Unable to reach server. Check your connection and try again.";
    }

    const data = error?.response?.data;

    if (typeof data === "string" && data.trim()) {
        return data.trim();
    }

    if (data && typeof data === "object") {
        if (typeof data.error === "string" && data.error.trim()) {
            return data.error.trim();
        }

        if (typeof data.message === "string" && data.message.trim()) {
            return data.message.trim();
        }

        if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
            return String(data.non_field_errors[0]);
        }

        for (const value of Object.values(data)) {
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
            if (Array.isArray(value) && value.length > 0) {
                return String(value[0]);
            }
        }
    }

    if (typeof error?.message === "string" && error.message.trim()) {
        return error.message.trim();
    }

    return fallbackMessage;
}
