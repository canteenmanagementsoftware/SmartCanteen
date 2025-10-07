// src/components/Layout/Sidebar.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const Sidebar = () => {
  const { user } = useAuth();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTextProfileOpen, setIsTextProfileOpen] = useState(false);

  // Get user role and type
  const userRole = user?.role || user?.userType || 'admin';
  const userType = user?.type || user?.userType || userRole;
  const isSuperAdmin = userRole === 'superadmin';
  const isAdmin = userType === 'admin';
  const isManager = userType === 'manager';
  const isMealCollector = userType === 'meal_collector';
  


  return (
    <div className="w-64 shrink-0 flex-none min-h-screen bg-gray-800 text-white p-4 sticky top-0 h-screen overflow-y-auto no-scrollbar">
      
      <nav className="space-y-1">
        {/* Dashboard - Different for different roles */}
        {isAdmin && (
          <Link to="/admin/dashboard" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-chart-line mr-2"></i>
              Admin Dashboard
            </span>
          </Link>
        )}
        
        {isManager && (
          <Link to="/manager/dashboard" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-chart-line mr-2"></i>
              Manager Dashboard
            </span>
          </Link>
        )}
        
        {isSuperAdmin && (
          <Link to="/superadmin/dashboard" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-chart-line mr-2"></i>
              Super Admin Dashboard
            </span>
          </Link>
        )}

        {/* Meal Collector Dashboard */}
        {isMealCollector && (
          <Link to="/meal-collector/dashboard" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-utensils mr-2"></i>
              Meal Collector Dashboard
            </span>
          </Link>
        )}

        {/* User meal collection - Removed since user login is disabled */}
        {/* {isUser && (
          <Link to="/mealCollection" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-utensils mr-2"></i>
              Meal Collection
            </span>
          </Link>
        )} */}
        
        {/* Company Management - Only for Super Admin */}
        {isSuperAdmin && (
          <Link to="/company" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-building mr-2"></i>
              Company Master
            </span>
          </Link>
        )}

        {/* Place Master - For Admin and Super Admin (not Manager) */}
        {(isAdmin || isSuperAdmin) && !isManager && (
          <Link to="/places" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-map mr-2"></i>
              Place Master
            </span>
          </Link>
        )}

        {/* Location Management - For Admin, Super Admin, and Manager */}
        {(isAdmin || isSuperAdmin || isManager) && (
          <Link to="/locations" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-map-marker-alt mr-2"></i>
              Location 
            </span>
          </Link>
        )}

        {/* User Management - For Admin, Super Admin, and Manager */}
        {(isAdmin || isSuperAdmin || isManager) && (
          <Link to="/users" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-users mr-2"></i>
              Location User Master
            </span>
          </Link>
        )}

        {/* Admin User Management - For Admin and Super Admin (not Manager) */}
        {(isAdmin || isSuperAdmin) && !isManager && (
          <Link to="/admin-users" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-user-shield mr-2"></i>
              Admin User Master
            </span>
          </Link>
        )}
     
        {/* Package Management - For Admin, Super Admin, and Manager */}
        {(isAdmin || isSuperAdmin || isManager) && (
          <Link to="/packages" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-box mr-2"></i>
              Package 
            </span>
          </Link>
        )}

        {/* Device Management - Only for Super Admin */}
        {isSuperAdmin && (
          <Link to="/devices" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-laptop mr-2"></i>
              Device 
            </span>
          </Link>
        )}

        {/* Batch Management - For Admin, Super Admin, and Manager */}
        {(isAdmin || isSuperAdmin || isManager) && (
          <Link to="/batches" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-layer-group mr-2"></i>
              Batch Management
            </span>
          </Link>
        )}

        {/* Fees Management - For Admin, Super Admin, and Manager */}
        {(isAdmin || isSuperAdmin || isManager) && (
          <Link to="/fees" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-layer-group mr-2"></i>
              Fees History
            </span>
          </Link>
        )}

        {/* Meal Collection - For Admin, Super Admin, Manager, and Meal Collector */}
        {(isAdmin || isSuperAdmin || isManager || isMealCollector) && (
          <Link to="/meal-capture" className="block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
            <span className="flex items-center">
              <i className="fas fa-utensils mr-2"></i>
              Meal Collection
            </span>
          </Link>
        )}

        {/* TextProfile Master - Only for Super Admin */}
        {isSuperAdmin && (
          <>
            <button 
              onClick={() => setIsTextProfileOpen(!isTextProfileOpen)}
              className="w-full text-left block hover:bg-gray-700 px-3 py-2 rounded transition-colors">
              <span className="flex items-center">
                <i className="fas fa-file-alt mr-2"></i>
                Tax Master
              </span>
              <i className={`fas fa-chevron-${isTextProfileOpen ? 'up' : 'down'} ml-auto`}></i>
            </button>

            {isTextProfileOpen && (
              <div className="ml-8 space-y-4">
                <Link to="/text-profile/tex-profile-master" className="block hover:text-blue-400 transition-colors">
                  Tax Profile Master
                </Link>

                <Link to="/text-profile/tex-List-master" className="block hover:text-blue-400 transition-colors">
                  Tax List Master
                </Link>
              </div>
            )}
          </>
        )}

        {/* Reports - For Admin, Super Admin, and Manager */}
        {(isAdmin || isSuperAdmin || isManager) && (
          <>
            <button 
              onClick={() => setIsReportOpen(!isReportOpen)}
              className="w-full text-left block hover:bg-gray-700 px-3 py-2 rounded transition-colors">

              <span className="flex items-center">
                <i className="fas fa-file-alt mr-2"></i>
                Report
              </span>
                <i className={`fas fa-chevron-${isReportOpen ? 'up' : 'down'} ml-auto`}></i>
            </button>

            {isReportOpen && (
              <div className="ml-8 space-y-4">

              <Link to="/report/visitor" className="block hover:text-blue-400 transition-colors">
                Meal Collection Report
              </Link>

              <Link to="/report/fees" className="block hover:text-blue-400 transition-colors">
                Fees Report
              </Link>

              <Link to="/report/panding-fees" className="block hover:text-blue-400 transition-colors">
                Panding Fees Report
              </Link>

              <Link to="/report/daily-utilized" className="block hover:text-blue-400 transition-colors">
                  Daily Utilized Report
                </Link>
                
                <Link to="/report/utilized" className="block hover:text-blue-400 transition-colors">
                  Utilized Report
                </Link>

                <Link to="/report/user" className="block hover:text-blue-400 transition-colors">
                  User Report
                </Link>

                {/* <Link to="/report/unremove-user" className="block hover:text-blue-400 transition-colors">
                  Unremove User Report
                </Link> */}

                <Link to="/report/exceptional" className="block hover:text-blue-400 transition-colors">
                  Exceptional Report
                </Link>

                <Link to="/report/hourly" className="block hover:text-blue-400 transition-colors">
                  Hourly Report
                </Link>

              </div>
            )}
          </>
        )}
        


      </nav>
    </div>
  );
};

export default Sidebar;
