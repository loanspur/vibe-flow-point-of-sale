export const isAuthPath = (p: string): boolean => p.startsWith("/auth");

export const onAuthPath = (): boolean => {
	try {
		return typeof window !== "undefined" && isAuthPath(window.location.pathname);
	} catch {
		return false;
	}
};
