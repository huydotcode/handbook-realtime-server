let isMaintenanceActive = process.env.MAINTENANCE_MODE === 'true';

export const getMaintenanceStatus = () => isMaintenanceActive;

export const setMaintenanceStatus = (active: boolean) => {
    isMaintenanceActive = active;
};
