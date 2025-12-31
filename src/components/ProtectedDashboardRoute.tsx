
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedDashboardRoute = () => {
    // Check if the user has authenticated via the dashboard
    const isAuthenticated = localStorage.getItem('dashboard_auth') === 'true';

    if (!isAuthenticated) {
        // Redirect to dashboard login if not authenticated
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedDashboardRoute;
