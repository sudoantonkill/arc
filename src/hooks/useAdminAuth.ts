import * as React from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useSession } from "./useSession";
import { useMyRoles } from "./useMyRoles";

export function useAdminAuth() {
    const { session, isLoading: isSessionLoading } = useSession();
    const { roles, isLoading: isRolesLoading } = useMyRoles(!!session);
    const [isMasterAdmin, setIsMasterAdmin] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const checkAuth = () => {
            // Check for master admin session in localStorage
            const masterSession = localStorage.getItem('master_admin_session');
            if (masterSession) {
                const { expires_at } = JSON.parse(masterSession);
                if (new Date(expires_at) > new Date()) {
                    setIsMasterAdmin(true);
                    setIsLoading(false);
                    return;
                } else {
                    localStorage.removeItem('master_admin_session');
                }
            }

            setIsMasterAdmin(false);
            if (!isSessionLoading && !isRolesLoading) {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [isSessionLoading, isRolesLoading]);

    const loginAsMaster = (password: string) => {
        if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
            const session = {
                email: import.meta.env.VITE_ADMIN_EMAIL,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            };
            localStorage.setItem('master_admin_session', JSON.stringify(session));
            setIsMasterAdmin(true);
            return true;
        }
        return false;
    };

    const logoutMaster = () => {
        localStorage.removeItem('master_admin_session');
        setIsMasterAdmin(false);
    };

    const isSubAdmin = roles.includes('admin');
    const isAdmin = isMasterAdmin || isSubAdmin;

    return {
        isAdmin,
        isMasterAdmin,
        isSubAdmin,
        isLoading,
        loginAsMaster,
        logoutMaster
    };
}
