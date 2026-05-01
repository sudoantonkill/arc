import * as React from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useSession } from "./useSession";
import { useMyRoles } from "./useMyRoles";

/**
 * Admin authentication hook
 * 
 * SECURITY: In production, admin access should be managed through Supabase Auth + user_roles table.
 * The master admin password is kept ONLY as a fallback for initial setup before any admin accounts exist.
 * 
 * Recommended setup:
 * 1. Create first admin user through Supabase Auth
 * 2. Insert into user_roles: INSERT INTO user_roles (user_id, role) VALUES ('<user_id>', 'admin')
 * 3. Remove VITE_ADMIN_PASSWORD from env
 */
export function useAdminAuth() {
    const { session, isLoading: isSessionLoading } = useSession();
    const { roles, isLoading: isRolesLoading } = useMyRoles(!!session);
    const [isMasterAdmin, setIsMasterAdmin] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const checkAuth = () => {
            // Check for master admin session in localStorage (fallback only)
            const masterSession = localStorage.getItem('master_admin_session');
            if (masterSession) {
                try {
                    const { expires_at } = JSON.parse(masterSession);
                    if (new Date(expires_at) > new Date()) {
                        setIsMasterAdmin(true);
                        setIsLoading(false);
                        return;
                    } else {
                        localStorage.removeItem('master_admin_session');
                    }
                } catch {
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

    /**
     * Master login - FALLBACK ONLY for initial setup
     * This should be disabled in production once proper admin accounts exist
     */
    const loginAsMaster = (password: string): boolean => {
        const masterPassword = import.meta.env.VITE_ADMIN_PASSWORD;

        // Security check: Don't allow if no password is set
        if (!masterPassword) {
            console.warn('Master admin login disabled - no VITE_ADMIN_PASSWORD set');
            return false;
        }

        // Security check: Warn if using in production
        if (import.meta.env.PROD) {
            console.warn('WARNING: Master admin login should not be used in production. Set up proper admin accounts instead.');
        }

        if (password === masterPassword) {
            const session = {
                email: import.meta.env.VITE_ADMIN_EMAIL || 'admin@arcinterview.com',
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

    /**
     * Check if user has admin role in database
     * This is the recommended way to manage admin access
     */
    const isSubAdmin = roles.includes('admin');

    /**
     * User is admin if:
     * 1. They're authenticated as a sub-admin (proper way) OR
     * 2. They've used master password (fallback for initial setup)
     */
    const isAdmin = isMasterAdmin || isSubAdmin;

    /**
     * Sign in sub-admin via Supabase Auth
     * This uses the standard auth flow - admin role is checked via user_roles table
     */
    const signInAsAdmin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return { success: false, error: 'Supabase not configured' };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        // Role check will happen via useMyRoles after session updates
        return { success: true };
    };

    const signOut = async () => {
        const supabase = getSupabaseClient();
        if (supabase) {
            await supabase.auth.signOut();
        }
        logoutMaster();
    };

    return {
        isAdmin,
        isMasterAdmin,
        isSubAdmin,
        isLoading,
        session,
        loginAsMaster,   // Fallback for initial setup
        logoutMaster,
        signInAsAdmin,   // Recommended: proper auth
        signOut,
    };
}
